import express, { Router, Request, Response } from "express";
import {
  adminAuth,
  loginHandler,
  logoutHandler,
  verifyHandler,
} from "../middleware/auth.js";
import { storage } from "../services/storage.js";
import { slack } from "../services/slack.js";

const router: Router = express.Router();

// ============================================================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================================================

router.post("/api/admin/login", loginHandler);
router.post("/api/admin/logout", logoutHandler);
router.get("/api/admin/verify", verifyHandler);

// ============================================================================
// PROTECTED ROUTES (Admin Auth Required)
// ============================================================================

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
      (p: any) => p.status === "active"
    ).length;
    const contractsTotal = (contracts || []).reduce(
      (sum: number, c: any) => sum + (c.value || 0),
      0
    );
    const recentActivity = (activity || []).slice(-10);

    res.json({
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
router.get(
  "/financials",
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const contracts = storage.getCollection("contracts") || [];
      const projects = storage.getCollection("projects") || [];
      const marketing = storage.getCollection("marketing") || [];

      const totalRevenue = contracts
        .filter((c: any) => c.status === "active")
        .reduce((sum: number, c: any) => sum + (c.value || 0), 0);

      const totalExpenses =
        projects.reduce((sum: number, p: any) => sum + (p.spent || 0), 0) +
        marketing.reduce((sum: number, m: any) => sum + (m.spent || 0), 0);

      const contractsByStatus = contracts.reduce(
        (acc: Record<string, number>, c: any) => {
          acc[c.status || "unknown"] = (acc[c.status || "unknown"] || 0) + 1;
          return acc;
        },
        {}
      );

      res.json({
        totalRevenue,
        totalExpenses,
        contractsByStatus,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch financials" });
    }
  }
);

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

router.post("/api/admin/submissions", adminAuth, async (req: Request, res: Response) => {
  try {
    const submission = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    storage.addToCollection("submissions", submission);
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
  async (req: Request, res: Response) => {
    try {
      const updated = storage.updateInCollection("submissions", req.params.id, {
        ...req.body,
        updatedAt: new Date().toISOString(),
      });
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

router.post("/api/admin/contracts", adminAuth, async (req: Request, res: Response) => {
  try {
    const contract = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    storage.addToCollection("contracts", contract);

    // Slack notification
    await slack.notify(
      `New contract created: ${contract.name || "Unnamed"} - $${contract.value || 0}`
    );

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
  async (req: Request, res: Response) => {
    try {
      const contracts = storage.getCollection("contracts") || [];
      const oldContract = contracts.find((c: any) => c.id === req.params.id);

      const updated = storage.updateInCollection("contracts", req.params.id, {
        ...req.body,
        updatedAt: new Date().toISOString(),
      });

      if (!updated) {
        return res.status(404).json({ error: "Contract not found" });
      }

      // Slack notification for status change
      if (oldContract?.status !== updated.status) {
        await slack.notify(
          `Contract status changed: ${updated.name || "Unnamed"} - ${oldContract?.status} → ${updated.status}`
        );
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

router.post("/api/admin/team", adminAuth, async (req: Request, res: Response) => {
  try {
    const member = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    storage.addToCollection("team", member);

    // Slack notification
    await slack.notify(
      `New team member added: ${member.name || "Unnamed"} - ${member.role || "Unknown role"}`
    );

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

router.put("/api/admin/team/:id", adminAuth, async (req: Request, res: Response) => {
  try {
    const updated = storage.updateInCollection("team", req.params.id, {
      ...req.body,
      updatedAt: new Date().toISOString(),
    });
    if (!updated) {
      return res.status(404).json({ error: "Team member not found" });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: "Failed to update team member" });
  }
});

router.delete("/api/admin/team/:id", adminAuth, async (req: Request, res: Response) => {
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

router.post("/api/admin/projects", adminAuth, async (req: Request, res: Response) => {
  try {
    const project = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    storage.addToCollection("projects", project);
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

router.put("/api/admin/projects/:id", adminAuth, async (req: Request, res: Response) => {
  try {
    const updated = storage.updateInCollection("projects", req.params.id, {
      ...req.body,
      updatedAt: new Date().toISOString(),
    });
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

router.post("/api/admin/marketing", adminAuth, async (req: Request, res: Response) => {
  try {
    const item = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    storage.addToCollection("marketing", item);
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
  async (req: Request, res: Response) => {
    try {
      const updated = storage.updateInCollection("marketing", req.params.id, {
        ...req.body,
        updatedAt: new Date().toISOString(),
      });
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
  async (req: Request, res: Response) => {
    try {
      const partnership = {
        id: Date.now().toString(),
        ...req.body,
        createdAt: new Date().toISOString(),
      };
      storage.addToCollection("partnerships", partnership);

      // Slack notification
      await slack.notify(
        `New partnership created: ${partnership.partnerName || "Unnamed"}`
      );

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
  async (req: Request, res: Response) => {
    try {
      const updated = storage.updateInCollection("partnerships", req.params.id, {
        ...req.body,
        updatedAt: new Date().toISOString(),
      });
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

router.post("/api/admin/content", adminAuth, async (req: Request, res: Response) => {
  try {
    const item = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    storage.addToCollection("content", item);
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
  async (req: Request, res: Response) => {
    try {
      const updated = storage.updateInCollection("content", req.params.id, {
        ...req.body,
        updatedAt: new Date().toISOString(),
      });
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

router.post("/api/admin/activity", adminAuth, async (req: Request, res: Response) => {
  try {
    const item = {
      id: Date.now().toString(),
      ...req.body,
      createdAt: new Date().toISOString(),
    };
    storage.addToCollection("activity", item);
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
router.post("/api/admin/users/:id/posts", adminAuth, async (req: Request, res: Response) => {
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
      content: req.body.content || "",
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
router.post("/api/admin/users/:id/posts/:postId/like", adminAuth, async (req: Request, res: Response) => {
  try {
    const allPosts = storage.getCollection("user_posts") || [];
    const post = (allPosts as any[]).find((p: any) => p.id === req.params.postId);
    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }
    const { userId } = req.body as { userId: string };
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
