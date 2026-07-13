import crypto from "crypto";
import express, { Router, Request, Response } from "express";
import {
  createOperatorAccountRequestSchema,
  storageMutationPayloadSchema,
  updateOperatorAccountRequestSchema,
  userPostCreateRequestSchema,
  userPostLikeToggleRequestSchema,
} from "@sisg/schemas";
import {
  adminAuth,
  loginHandler,
  refreshHandler,
  logoutHandler,
  requireRoles,
  verifyHandler,
} from "../middleware/auth.js";
import { createRateLimit } from "../middleware/rate-limit.js";
import {
  createOperatorAccount,
  listOperatorAccounts,
  updateOperatorAccount,
} from "../services/auth-service.js";
import { getAuthRepository, hashPassword } from "../services/auth-store.js";
import { auditAdminAction } from "../services/security-audit.js";
import { storage } from "../services/storage.js";
import { slack } from "../services/slack.js";

const router: Router = express.Router();
const authReadWriteRateLimit = createRateLimit({
  key: "admin-auth-readwrite",
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  message: "Too many authentication requests. Try again later.",
});

function parseStorageMutationPayload(res: Response, body: unknown) {
  const parsed = storageMutationPayloadSchema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: "Request body must be a JSON object with non-reserved fields" });
    return null;
  }

  return parsed.data;
}

type AdminConfigRecord = {
  companyName: string;
  contactEmail: string;
  timezone: string;
  updatedAt?: string;
  updatedBy?: string;
};

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatUptime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}m`;
}

function getAdminConfig(): AdminConfigRecord {
  const [storedConfig] = storage.getCollection("admin_config") || [];
  return {
    companyName: storedConfig?.companyName || "SISG Platform",
    contactEmail: storedConfig?.contactEmail || "admin@sisg.io",
    timezone: storedConfig?.timezone || "UTC",
    updatedAt: storedConfig?.updatedAt,
    updatedBy: storedConfig?.updatedBy,
  };
}

function aggregateMonthlyFinancials() {
  const contracts = storage.getCollection("contracts") || [];
  const projects = storage.getCollection("projects") || [];
  const marketing = storage.getCollection("marketing") || [];
  const monthMap = new Map<string, { month: string; revenue: number; expenses: number; sortKey: number }>();

  const ensureMonth = (value: unknown) => {
    if (!value) return null;
    const parsedDate = new Date(String(value));
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }
    const sortKey = Date.UTC(parsedDate.getUTCFullYear(), parsedDate.getUTCMonth(), 1);
    const month = parsedDate.toLocaleString("en-US", {
      month: "short",
      year: "2-digit",
      timeZone: "UTC",
    });
    if (!monthMap.has(month)) {
      monthMap.set(month, { month, revenue: 0, expenses: 0, sortKey });
    }
    return monthMap.get(month)!;
  };

  contracts.forEach((contract: any) => {
    const bucket = ensureMonth(
      contract.signedAt || contract.startDate || contract.createdAt || contract.updatedAt,
    );
    if (!bucket) return;
    bucket.revenue += Number(contract.value || 0);
  });

  const applyExpense = (entry: any) => {
    const bucket = ensureMonth(entry.spentAt || entry.endDate || entry.date || entry.createdAt || entry.updatedAt);
    if (!bucket) return;
    bucket.expenses += Number(entry.spent || entry.cost || entry.budgetSpent || 0);
  };

  projects.forEach(applyExpense);
  marketing.forEach(applyExpense);

  return Array.from(monthMap.values())
    .sort((a, b) => a.sortKey - b.sortKey)
    .map(({ sortKey, ...item }) => item);
}

// ============================================================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================================================

router.post("/api/admin/login", loginHandler);
router.post("/api/admin/refresh", authReadWriteRateLimit, refreshHandler);
router.post("/api/admin/logout", authReadWriteRateLimit, logoutHandler);
router.get("/api/admin/verify", authReadWriteRateLimit, verifyHandler);

router.get("/api/public/projects", async (_req: Request, res: Response) => {
  try {
    const projects = (storage.getCollection("projects") || []).map((project: any) => ({
      id: project.id,
      name: project.name || project.title || "Untitled Project",
      title: project.title || project.name || "Untitled Project",
      client: project.client || project.customer || "Confidential Client",
      status: project.status || "Active",
      priority: project.priority || null,
      budget: project.budget || project.value || null,
      team: project.team || project.teamSize || null,
      due: project.due || project.endDate || null,
      progress: typeof project.progress === "number" ? project.progress : 0,
      color: project.color || null,
      description: project.description || project.summary || "",
      summary: project.summary || project.description || "",
      capabilities: project.capabilities || project.services || [],
    }));
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch public projects" });
  }
});

router.get("/api/public/team", async (_req: Request, res: Response) => {
  try {
    const team = (storage.getCollection("team") || []).map((member: any) => ({
      id: member.id,
      name: member.name || member.displayName || "Unnamed Team Member",
      role: member.role || member.position || "Team Member",
      dept: member.dept || member.department || "Operations",
      clearance: member.clearance || null,
      utilization: typeof member.utilization === "number" ? member.utilization : 0,
      color: member.color || null,
      initials: member.initials || null,
      bio: member.bio || member.summary || "",
      certifications: member.certifications || member.skills || [],
    }));
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch public team" });
  }
});

// ============================================================================
// PROTECTED ROUTES (Admin Auth Required)
// ============================================================================

router.get("/api/admin/me", adminAuth, async (req: Request, res: Response) => {
  res.json({
    user: req.auth?.user || null,
    roles: req.auth?.roles || [],
  });
});

router.get("/api/admin/auth/accounts", adminAuth, requireRoles("admin"), async (_req: Request, res: Response) => {
  try {
    const accounts = await listOperatorAccounts();
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch operator accounts" });
  }
});

router.post("/api/admin/auth/accounts", adminAuth, requireRoles("admin"), async (req: Request, res: Response) => {
  const parsed = createOperatorAccountRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "A valid email, displayName, password, and roles are required" });
  }

  try {
    const account = await createOperatorAccount(parsed.data);
    res.status(201).json(account);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create operator account";
    const statusCode = message.includes("already exists") ? 409 : 500;
    res.status(statusCode).json({ error: message });
  }
});

router.patch("/api/admin/auth/accounts/:accountId", adminAuth, requireRoles("admin"), async (req: Request, res: Response) => {
  const parsed = updateOperatorAccountRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "At least one valid operator account field is required" });
  }

  const { accountId } = req.params;
  if (req.auth?.user.id === accountId && parsed.data.status === "disabled") {
    return res.status(400).json({ error: "You cannot disable your current account" });
  }

  try {
    const account = await updateOperatorAccount(accountId, parsed.data);
    if (!account) {
      return res.status(404).json({ error: "Operator account not found" });
    }
    res.json(account);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update operator account";
    const statusCode = message.includes("already exists") ? 409 : 500;
    res.status(statusCode).json({ error: message });
  }
});

// ---- STATS ENDPOINT ----
router.get("/api/admin/stats", adminAuth, async (req: Request, res: Response) => {
  try {
    const submissions = storage.getCollection("submissions");
    const contracts = storage.getCollection("contracts");
    const team = storage.getCollection("team");
    const projects = storage.getCollection("projects");
    const marketing = storage.getCollection("marketing");
    const partnerships = storage.getCollection("partnerships");
    const content = storage.getCollection("content");
    const activity = storage.getCollection("activity");

    const activeProjects = (projects || []).filter(
      (p: any) => ["active", "in progress"].includes(String(p.status || "").toLowerCase())
    ).length;
    const contractsTotal = (contracts || []).reduce(
      (sum: number, c: any) => sum + (c.value || 0),
      0
    );
    const recentActivity = (activity || []).slice(-10);

    res.json({
      version: process.env.APP_VERSION || process.env.npm_package_version || "dev",
      environment: process.env.NODE_ENV || "development",
      nodeVersion: process.version,
      uptime: formatUptime(process.uptime()),
      submissions: submissions?.length || 0,
      contracts: contracts?.length || 0,
      team: team?.length || 0,
      projects: projects?.length || 0,
      marketing: marketing?.length || 0,
      partnerships: partnerships?.length || 0,
      content: content?.length || 0,
      activity: activity?.length || 0,
      activeProjects,
      contractsTotal,
      recentActivity,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

// ---- FINANCIALS ENDPOINT ----
async function handleFinancialsRequest(_req: Request, res: Response) {
  try {
    const contracts = storage.getCollection("contracts") || [];
    const projects = storage.getCollection("projects") || [];
    const marketing = storage.getCollection("marketing") || [];

    const totalRevenue = contracts
      .filter((contract: any) => String(contract.status || "").toLowerCase() === "active")
      .reduce((sum: number, contract: any) => sum + Number(contract.value || 0), 0);

    const totalExpenses =
      projects.reduce((sum: number, project: any) => sum + Number(project.spent || 0), 0) +
      marketing.reduce((sum: number, item: any) => sum + Number(item.spent || 0), 0);

    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    const contractsByStatus = contracts.reduce(
      (acc: Record<string, number>, contract: any) => {
        const status = String(contract.status || "unknown");
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {}
    );
    const monthlyData = aggregateMonthlyFinancials();

    res.json({
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      contractsByStatus,
      monthlyRevenue: monthlyData.map(({ month, revenue }) => ({ month, revenue })),
      monthlyData,
      totalRevenueYtd: formatCurrency(totalRevenue),
      totalExpensesYtd: formatCurrency(totalExpenses),
      pipelineValue: formatCurrency(
        contracts
          .filter((contract: any) => !["active", "completed", "signed"].includes(String(contract.status || "").toLowerCase()))
          .reduce((sum: number, contract: any) => sum + Number(contract.value || 0), 0)
      ),
      revenueDelta: "+0%",
      expensesDelta: "+0%",
      profitDelta: "+0%",
      pipelineDelta: "+0%",
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch financials" });
  }
}

router.get("/api/admin/financials", adminAuth, handleFinancialsRequest);
router.get("/financials", adminAuth, handleFinancialsRequest);

router.get("/api/admin/config", adminAuth, async (_req: Request, res: Response) => {
  try {
    res.json(getAdminConfig());
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin configuration" });
  }
});

router.put("/api/admin/config", adminAuth, auditAdminAction("admin.config.update"), async (req: Request, res: Response) => {
  const companyName = typeof req.body?.companyName === "string" ? req.body.companyName.trim() : "";
  const contactEmail = typeof req.body?.contactEmail === "string" ? req.body.contactEmail.trim() : "";
  const timezone = typeof req.body?.timezone === "string" ? req.body.timezone.trim() : "";

  if (!companyName || !contactEmail || !timezone) {
    return res.status(400).json({ error: "companyName, contactEmail, and timezone are required" });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    return res.status(400).json({ error: "contactEmail must be a valid email address" });
  }

  try {
    const currentConfig = getAdminConfig();
    const updatedConfig = {
      ...currentConfig,
      companyName,
      contactEmail,
      timezone,
      updatedAt: new Date().toISOString(),
      updatedBy: req.auth?.user.email || req.auth?.user.id || "unknown",
    };

    if ((storage.getCollection("admin_config") || []).length > 0) {
      const currentId = (storage.getCollection("admin_config") || [])[0]?.id;
      if (currentId) {
        storage.updateInCollection("admin_config", currentId, updatedConfig);
      } else {
        storage.write("admin_config", [updatedConfig]);
      }
    } else {
      storage.addToCollection("admin_config", updatedConfig);
    }

    res.json(getAdminConfig());
  } catch (error) {
    res.status(500).json({ error: "Failed to save admin configuration" });
  }
});

router.put("/api/admin/password", adminAuth, auditAdminAction("admin.password.update"), async (req: Request, res: Response) => {
  const currentPassword = typeof req.body?.currentPassword === "string" ? req.body.currentPassword : "";
  const newPassword = typeof req.body?.newPassword === "string" ? req.body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: "newPassword must be at least 8 characters" });
  }

  try {
    const repo = await getAuthRepository();
    const user = req.auth?.user?.id ? await repo.getUserById(req.auth.user.id) : null;
    if (!user) {
      return res.status(404).json({ error: "Authenticated operator account not found" });
    }

    const candidateHash = hashPassword(currentPassword, user.passwordSalt);
    const passwordsMatch = crypto.timingSafeEqual(
      Buffer.from(user.passwordHash, "hex"),
      Buffer.from(candidateHash, "hex"),
    );

    if (!passwordsMatch) {
      return res.status(400).json({ error: "Current password is incorrect" });
    }

    await updateOperatorAccount(user.id, { password: newPassword });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update password" });
  }
});

// ============================================================================
// SUBMISSIONS CRUD
// ============================================================================

router.get("/api/admin/submissions", adminAuth, async (req: Request, res: Response) => {
  try {
    const submissions = storage.getCollection("submissions") || [];
    res.json(submissions);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

router.post("/api/admin/submissions", adminAuth, auditAdminAction("admin.submissions.create"), async (req: Request, res: Response) => {
  const payload = parseStorageMutationPayload(res, req.body);
  if (!payload) return;
  try {
    const submission = storage.addToCollection("submissions", payload);
    res.status(201).json(submission);
  } catch (error) {
    res.status(500).json({ error: "Failed to create submission" });
  }
});

router.get(
  "/submissions/:id",
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const submissions = storage.getCollection("submissions") || [];
      const submission = submissions.find((s: any) => s.id === req.params.id);
      if (!submission) {
        return res.status(404).json({ error: "Submission not found" });
      }
      res.json(submission);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submission" });
    }
  }
);

router.put(
  "/submissions/:id",
  adminAuth,
  auditAdminAction("admin.submissions.update"),
  async (req: Request, res: Response) => {
    const payload = parseStorageMutationPayload(res, req.body);
    if (!payload) return;
    try {
      const updated = storage.updateInCollection("submissions", req.params.id, payload);
      if (!updated) {
        return res.status(404).json({ error: "Submission not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update submission" });
    }
  }
);

router.delete(
  "/submissions/:id",
  adminAuth,
  auditAdminAction("admin.submissions.delete"),
  async (req: Request, res: Response) => {
    try {
      const success = storage.deleteFromCollection("submissions", req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Submission not found" });
      }
      res.json({ message: "Submission deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete submission" });
    }
  }
);

// ============================================================================
// CONTRACTS CRUD
// ============================================================================

router.get("/api/admin/contracts", adminAuth, async (req: Request, res: Response) => {
  try {
    const contracts = storage.getCollection("contracts") || [];
    res.json(contracts);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch contracts" });
  }
});

router.post("/api/admin/contracts", adminAuth, auditAdminAction("admin.contracts.create"), async (req: Request, res: Response) => {
  const payload = parseStorageMutationPayload(res, req.body);
  if (!payload) return;
  try {
    const contract = storage.addToCollection("contracts", payload);

    // Slack notification
    await slack.notify("activity", {
      text: `New contract created: ${contract.name || "Unnamed"} - $${contract.value || 0}`,
    });

    res.status(201).json(contract);
  } catch (error) {
    res.status(500).json({ error: "Failed to create contract" });
  }
});

router.get(
  "/contracts/:id",
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const contracts = storage.getCollection("contracts") || [];
      const contract = contracts.find((c: any) => c.id === req.params.id);
      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.json(contract);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch contract" });
    }
  }
);

router.put(
  "/contracts/:id",
  adminAuth,
  auditAdminAction("admin.contracts.update"),
  async (req: Request, res: Response) => {
    const payload = parseStorageMutationPayload(res, req.body);
    if (!payload) return;
    try {
      const contracts = storage.getCollection("contracts") || [];
      const oldContract = contracts.find((c: any) => c.id === req.params.id);

      const updated = storage.updateInCollection("contracts", req.params.id, payload);

      if (!updated) {
        return res.status(404).json({ error: "Contract not found" });
      }

      // Slack notification for status change
      if (oldContract?.status !== updated.status) {
        await slack.notify("activity", {
          text: `Contract status changed: ${updated.name || "Unnamed"} - ${oldContract?.status} → ${updated.status}`,
        });
      }

      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update contract" });
    }
  }
);

router.delete(
  "/contracts/:id",
  adminAuth,
  auditAdminAction("admin.contracts.delete"),
  async (req: Request, res: Response) => {
    try {
      const success = storage.deleteFromCollection("contracts", req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Contract not found" });
      }
      res.json({ message: "Contract deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete contract" });
    }
  }
);

// ---- CONTRACT GENERATION ENDPOINT ----
router.post(
  "/contracts/:id/generate",
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const contracts = storage.getCollection("contracts") || [];
      const contract = contracts.find((c: any) => c.id === req.params.id);

      if (!contract) {
        return res.status(404).json({ error: "Contract not found" });
      }

      const template = `
================================================================================
                              CONTRACT AGREEMENT
================================================================================

HEADER
------
Contract ID: ${contract.id}
Date: ${new Date().toLocaleDateString()}
Status: ${contract.status || "Draft"}

PARTIES
-------
Client: ${contract.clientName || "To be determined"}
Company: SISG Platform Inc.
Representative: ${contract.representative || "To be determined"}

SCOPE OF WORK
-------------
${contract.scope || "Scope of work to be defined"}

DURATION
--------
Start Date: ${contract.startDate || "To be determined"}
End Date: ${contract.endDate || "To be determined"}
Duration: ${contract.duration || "To be determined"}

COMPENSATION
------------
Total Value: $${contract.value || 0}
Payment Terms: ${contract.paymentTerms || "Net 30"}
Currency: ${contract.currency || "USD"}

TERMS AND CONDITIONS
--------------------
${contract.terms || "Standard terms and conditions apply"}

SIGNATURES
----------
_____________________________          _____________________________
Client Signature & Date               Company Representative & Date

_____________________________          _____________________________
Witness (if applicable)               Date

================================================================================
`;

      res.json({
        contractId: contract.id,
        generatedAt: new Date().toISOString(),
        template: template.trim(),
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to generate contract" });
    }
  }
);

// ============================================================================
// TEAM CRUD
// ============================================================================

router.get("/api/admin/team", adminAuth, async (req: Request, res: Response) => {
  try {
    const team = storage.getCollection("team") || [];
    res.json(team);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch team" });
  }
});

router.post("/api/admin/team", adminAuth, auditAdminAction("admin.team.create"), async (req: Request, res: Response) => {
  const payload = parseStorageMutationPayload(res, req.body);
  if (!payload) return;
  try {
    const member = storage.addToCollection("team", payload);

    // Slack notification
    await slack.notify("activity", {
      text: `New team member added: ${member.name || "Unnamed"} - ${member.role || "Unknown role"}`,
    });

    res.status(201).json(member);
  } catch (error) {
    res.status(500).json({ error: "Failed to create team member" });
  }
});

router.get("/api/admin/team/:id", adminAuth, async (req: Request, res: Response) => {
  try {
    const team = storage.getCollection("team") || [];
    const member = team.find((m: any) => m.id === req.params.id);
    if (!member) {
      return res.status(404).json({ error: "Team member not found" });
    }
    res.json(member);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch team member" });
  }
});

router.put("/api/admin/team/:id", adminAuth, auditAdminAction("admin.team.update"), async (req: Request, res: Response) => {
  const payload = parseStorageMutationPayload(res, req.body);
  if (!payload) return;
  try {
    const updated = storage.updateInCollection("team", req.params.id, payload);
    if (!updated) {
      return res.status(404).json({ error: "Team member not found" });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update team member" });
  }
});

router.delete("/api/admin/team/:id", adminAuth, auditAdminAction("admin.team.delete"), async (req: Request, res: Response) => {
  try {
    const success = storage.deleteFromCollection("team", req.params.id);
    if (!success) {
      return res.status(404).json({ error: "Team member not found" });
    }
    res.json({ message: "Team member deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete team member" });
  }
});

// ============================================================================
// PROJECTS CRUD
// ============================================================================

router.get("/api/admin/projects", adminAuth, async (req: Request, res: Response) => {
  try {
    const projects = storage.getCollection("projects") || [];
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch projects" });
  }
});

router.post("/api/admin/projects", adminAuth, auditAdminAction("admin.projects.create"), async (req: Request, res: Response) => {
  const payload = parseStorageMutationPayload(res, req.body);
  if (!payload) return;
  try {
    const project = storage.addToCollection("projects", payload);
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.get("/api/admin/projects/:id", adminAuth, async (req: Request, res: Response) => {
  try {
    const projects = storage.getCollection("projects") || [];
    const project = projects.find((p: any) => p.id === req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch project" });
  }
});

router.put("/api/admin/projects/:id", adminAuth, auditAdminAction("admin.projects.update"), async (req: Request, res: Response) => {
  const payload = parseStorageMutationPayload(res, req.body);
  if (!payload) return;
  try {
    const updated = storage.updateInCollection("projects", req.params.id, payload);
    if (!updated) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.delete(
  "/projects/:id",
  adminAuth,
  auditAdminAction("admin.projects.delete"),
  async (req: Request, res: Response) => {
    try {
      const success = storage.deleteFromCollection("projects", req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json({ message: "Project deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete project" });
    }
  }
);

// ============================================================================
// MARKETING CRUD
// ============================================================================

router.get("/api/admin/marketing", adminAuth, async (req: Request, res: Response) => {
  try {
    const marketing = storage.getCollection("marketing") || [];
    res.json(marketing);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch marketing" });
  }
});

router.post("/api/admin/marketing", adminAuth, auditAdminAction("admin.marketing.create"), async (req: Request, res: Response) => {
  const payload = parseStorageMutationPayload(res, req.body);
  if (!payload) return;
  try {
    const item = storage.addToCollection("marketing", payload);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to create marketing item" });
  }
});

router.get(
  "/marketing/:id",
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const marketing = storage.getCollection("marketing") || [];
      const item = marketing.find((m: any) => m.id === req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Marketing item not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch marketing item" });
    }
  }
);

router.put(
  "/marketing/:id",
  adminAuth,
  auditAdminAction("admin.marketing.update"),
  async (req: Request, res: Response) => {
    const payload = parseStorageMutationPayload(res, req.body);
    if (!payload) return;
    try {
      const updated = storage.updateInCollection("marketing", req.params.id, payload);
      if (!updated) {
        return res.status(404).json({ error: "Marketing item not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update marketing item" });
    }
  }
);

router.delete(
  "/marketing/:id",
  adminAuth,
  auditAdminAction("admin.marketing.delete"),
  async (req: Request, res: Response) => {
    try {
      const success = storage.deleteFromCollection("marketing", req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Marketing item not found" });
      }
      res.json({ message: "Marketing item deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete marketing item" });
    }
  }
);

// ============================================================================
// PARTNERSHIPS CRUD
// ============================================================================

router.get("/api/admin/partnerships", adminAuth, async (req: Request, res: Response) => {
  try {
    const partnerships = storage.getCollection("partnerships") || [];
    res.json(partnerships);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch partnerships" });
  }
});

router.post(
  "/partnerships",
  adminAuth,
  auditAdminAction("admin.partnerships.create"),
  async (req: Request, res: Response) => {
    const payload = parseStorageMutationPayload(res, req.body);
    if (!payload) return;
    try {
      const partnership = storage.addToCollection("partnerships", payload);

      // Slack notification
      await slack.notify("activity", {
        text: `New partnership created: ${partnership.partnerName || "Unnamed"}`,
      });

      res.status(201).json(partnership);
    } catch (error) {
      res.status(500).json({ error: "Failed to create partnership" });
    }
  }
);

router.get(
  "/partnerships/:id",
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const partnerships = storage.getCollection("partnerships") || [];
      const partnership = partnerships.find((p: any) => p.id === req.params.id);
      if (!partnership) {
        return res.status(404).json({ error: "Partnership not found" });
      }
      res.json(partnership);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch partnership" });
    }
  }
);

router.put(
  "/partnerships/:id",
  adminAuth,
  auditAdminAction("admin.partnerships.update"),
  async (req: Request, res: Response) => {
    const payload = parseStorageMutationPayload(res, req.body);
    if (!payload) return;
    try {
      const updated = storage.updateInCollection("partnerships", req.params.id, payload);
      if (!updated) {
        return res.status(404).json({ error: "Partnership not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update partnership" });
    }
  }
);

router.delete(
  "/partnerships/:id",
  adminAuth,
  auditAdminAction("admin.partnerships.delete"),
  async (req: Request, res: Response) => {
    try {
      const success = storage.deleteFromCollection("partnerships", req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Partnership not found" });
      }
      res.json({ message: "Partnership deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete partnership" });
    }
  }
);

// ============================================================================
// CONTENT CRUD
// ============================================================================

router.get("/api/admin/content", adminAuth, async (req: Request, res: Response) => {
  try {
    const content = storage.getCollection("content") || [];
    res.json(content);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch content" });
  }
});

router.post("/api/admin/content", adminAuth, auditAdminAction("admin.content.create"), async (req: Request, res: Response) => {
  const payload = parseStorageMutationPayload(res, req.body);
  if (!payload) return;
  try {
    const item = storage.addToCollection("content", payload);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to create content" });
  }
});

router.get(
  "/content/:id",
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const content = storage.getCollection("content") || [];
      const item = content.find((c: any) => c.id === req.params.id);
      if (!item) {
        return res.status(404).json({ error: "Content not found" });
      }
      res.json(item);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch content" });
    }
  }
);

router.put(
  "/content/:id",
  adminAuth,
  auditAdminAction("admin.content.update"),
  async (req: Request, res: Response) => {
    const payload = parseStorageMutationPayload(res, req.body);
    if (!payload) return;
    try {
      const updated = storage.updateInCollection("content", req.params.id, payload);
      if (!updated) {
        return res.status(404).json({ error: "Content not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update content" });
    }
  }
);

router.delete(
  "/content/:id",
  adminAuth,
  auditAdminAction("admin.content.delete"),
  async (req: Request, res: Response) => {
    try {
      const success = storage.deleteFromCollection("content", req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Content not found" });
      }
      res.json({ message: "Content deleted" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete content" });
    }
  }
);

// ============================================================================
// ACTIVITY CRUD
// ============================================================================

router.get("/api/admin/activity", adminAuth, async (req: Request, res: Response) => {
  try {
    let activity = storage.getCollection("activity") || [];

    // Optional type filter
    if (req.query.type && typeof req.query.type === "string") {
      activity = activity.filter((a: any) => a.type === req.query.type);
    }

    res.json(activity);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch activity" });
  }
});

router.post("/api/admin/activity", adminAuth, auditAdminAction("admin.activity.create"), async (req: Request, res: Response) => {
  const payload = parseStorageMutationPayload(res, req.body);
  if (!payload) return;
  try {
    const item = storage.addToCollection("activity", payload);
    res.status(201).json(item);
  } catch (error) {
    res.status(500).json({ error: "Failed to create activity log" });
  }
});

// ============================================================================
// USER PROFILE + POSTS
// ============================================================================

// GET /api/admin/users/:id — public profile (no adminAuth needed)
router.get("/api/admin/users/:id", async (req: Request, res: Response) => {
  try {
    const team = storage.getCollection("team") || [];
    const member = team.find((m: any) => m.id === req.params.id);
    if (!member) {
      return res.status(404).json({ error: "User not found" });
    }
    // Return public-safe fields only
    const { id, name, email, role, department, status, joinDate, skills } = member as any;
    res.json({ id, name, email, role, department, status, joinDate, skills: skills || [] });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// GET /api/admin/users/:id/posts — list posts for user
router.get("/api/admin/users/:id/posts", async (req: Request, res: Response) => {
  try {
    const allPosts = storage.getCollection("user_posts") || [];
    const posts = (allPosts as any[])
      .filter((p: any) => p.authorId === req.params.id)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

// POST /api/admin/users/:id/posts — create post
router.post("/api/admin/users/:id/posts", adminAuth, auditAdminAction("admin.user_posts.create"), async (req: Request, res: Response) => {
  const parsed = userPostCreateRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "content is required" });
  }
  try {
    const team = storage.getCollection("team") || [];
    const member = (team as any[]).find((m: any) => m.id === req.params.id);
    if (!member) {
      return res.status(404).json({ error: "User not found" });
    }
    const post = {
      id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      authorId: req.params.id,
      authorName: (member as any).name,
      authorEmail: (member as any).email,
      content: parsed.data.content,
      type: "post",
      likes: [] as string[],
      createdAt: new Date().toISOString(),
    };
    storage.addToCollection("user_posts", post);
    res.status(201).json({ post });
  } catch (error) {
    res.status(500).json({ error: "Failed to create post" });
  }
});

// POST /api/admin/users/:id/posts/:postId/like — toggle like
router.post("/api/admin/users/:id/posts/:postId/like", adminAuth, auditAdminAction("admin.user_posts.like_toggle"), async (req: Request, res: Response) => {
  const parsed = userPostLikeToggleRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "userId is required" });
  }
  try {
    const allPosts = storage.getCollection("user_posts") || [];
    const post = (allPosts as any[]).find((p: any) => p.id === req.params.postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const { userId } = parsed.data;
    const likes: string[] = post.likes || [];
    const idx = likes.indexOf(userId);
    if (idx === -1) {
      likes.push(userId);
    } else {
      likes.splice(idx, 1);
    }
    const updated = storage.updateInCollection("user_posts", req.params.postId, { likes });
    res.json({ post: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

// ============================================================================
// EXPORT
// ============================================================================

export default router;
