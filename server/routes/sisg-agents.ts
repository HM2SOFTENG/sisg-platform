import express, { Router, Request, Response } from "express";
import crypto from "crypto";
import { adminAuth } from "../middleware/auth.js";
import { sisgAgents } from "../services/sisg-agents.js";

const router: Router = express.Router();

// =============================================================================
// SISG AGENTS API ROUTES
// All routes use Bearer token auth (same as ClawBot admin routes)
// =============================================================================

// ---- BULK / NON-PARAMETERIZED ROUTES (must come BEFORE :slug routes) ----

/**
 * POST /api/admin/agents/deploy-all
 * Deploy all agents in priority order
 */
router.post("/api/admin/agents/deploy-all", adminAuth, async (_req: Request, res: Response) => {
  try {
    const agents = await sisgAgents.getAgents();
    const sorted = [...agents].sort((a, b) => a.priority - b.priority);
    let deployed = 0;
    let skipped = 0;
    for (const agent of sorted) {
      if (agent.status === "deployed") { skipped++; continue; }
      await sisgAgents.deployAgent(agent.slug);
      deployed++;
    }
    res.json({ success: true, data: { deployed, skipped, total: agents.length }, message: `Deployed ${deployed} agents` });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to deploy all agents" });
  }
});

/**
 * POST /api/admin/agents/stop-all
 * Stop all deployed agents
 */
router.post("/api/admin/agents/stop-all", adminAuth, async (_req: Request, res: Response) => {
  try {
    const agents = await sisgAgents.getAgents();
    let stopped = 0;
    let alreadyStopped = 0;
    for (const agent of agents) {
      if (agent.status !== "deployed" && agent.status !== "error") { alreadyStopped++; continue; }
      await sisgAgents.stopAgent(agent.slug);
      stopped++;
    }
    res.json({ success: true, data: { stopped, alreadyStopped }, message: `Stopped ${stopped} agents` });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to stop all agents" });
  }
});

/**
 * GET /api/admin/agents/scheduler/status
 */
router.get("/api/admin/agents/scheduler/status", adminAuth, async (_req: Request, res: Response) => {
  try {
    const status = sisgAgents.getSchedulerStatus();
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch scheduler status" });
  }
});

/**
 * GET /api/admin/agents/dashboard
 * Aggregated dashboard data
 */
router.get("/api/admin/agents/dashboard", adminAuth, async (_req: Request, res: Response) => {
  try {
    const agents = await sisgAgents.getAgents();
    const scheduler = sisgAgents.getSchedulerStatus();

    // Get latest run for each agent
    const latestRuns: Record<string, any> = {};
    for (const agent of agents) {
      const run = await sisgAgents.getLatestRun(agent.slug);
      if (run) latestRuns[agent.slug] = run;
    }

    // Summary stats
    const deployed = agents.filter(a => a.status === "deployed").length;
    const errors = agents.filter(a => a.status === "error").length;
    const totalRuns = agents.reduce((sum, a) => sum + a.totalRuns, 0);
    const totalSuccess = agents.reduce((sum, a) => sum + a.successCount, 0);
    const totalErrors = agents.reduce((sum, a) => sum + a.errorCount, 0);

    res.json({
      success: true,
      data: {
        agents,
        latestRuns,
        scheduler,
        summary: { total: agents.length, deployed, stopped: agents.filter(a => a.status === "stopped").length, errors, undeployed: agents.filter(a => a.status === "undeployed").length, totalRuns, totalSuccess, totalErrors },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch dashboard data" });
  }
});

/**
 * GET /api/admin/agents/runs/latest
 * Get latest run for each agent
 */
router.get("/api/admin/agents/runs/latest", adminAuth, async (_req: Request, res: Response) => {
  try {
    const agents = await sisgAgents.getAgents();
    const results: Record<string, any> = {};
    for (const agent of agents) {
      const run = await sisgAgents.getLatestRun(agent.slug);
      if (run) results[agent.slug] = run;
    }
    res.json({ success: true, data: results });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch latest runs" });
  }
});

/**
 * GET /api/admin/agents/runs/all
 * Get all agent runs across all agents with optional filtering
 * Query params:
 *   - limit: max number of runs (default 50, max 500)
 *   - agent: filter by agent slug
 *   - severity: filter outputs by severity (info|warning|critical|success)
 */
router.get("/api/admin/agents/runs/all", adminAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
    const agentFilter = req.query.agent as string | undefined;
    const severityFilter = req.query.severity as string | undefined;

    const agents = await sisgAgents.getAgents();
    const allRuns: any[] = [];

    // Collect runs from all agents (or specific agent if filtered)
    for (const agent of agents) {
      if (agentFilter && agent.slug !== agentFilter) continue;

      const runs = await sisgAgents.getAgentRuns(agent.slug, 500); // Get max, then filter/limit
      allRuns.push(...runs);
    }

    // Sort by startedAt descending (most recent first)
    allRuns.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    // Filter by severity if specified (checks outputs array)
    let filtered = allRuns;
    if (severityFilter) {
      filtered = allRuns.filter(run =>
        run.output && run.output.some((output: any) => output.severity === severityFilter)
      );
    }

    // Apply limit
    const results = filtered.slice(0, limit);

    res.json({
      success: true,
      data: {
        runs: results,
        total: filtered.length,
        limit,
        filters: {
          agent: agentFilter || null,
          severity: severityFilter || null,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch all runs" });
  }
});

/**
 * GET /api/admin/agents
 * List all agents with optional ?category filter
 */
router.get("/api/admin/agents", adminAuth, async (req: Request, res: Response) => {
  try {
    let agents = await sisgAgents.getAgents();
    const category = req.query.category as string | undefined;
    if (category) {
      agents = agents.filter(a => a.category === category);
    }
    res.json({ success: true, data: agents, count: agents.length });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to list agents" });
  }
});

/**
 * GET /api/admin/agents/digest
 * Generate and return a comprehensive daily opportunity digest
 */
router.get("/api/admin/agents/digest", adminAuth, async (_req: Request, res: Response) => {
  try {
    const digest = await sisgAgents.getDailyDigest();
    res.json({ success: true, data: digest });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to generate daily digest" });
  }
});

/**
 * GET /api/admin/agents/opportunities
 * Get stored SAM.gov opportunities with optional filtering
 */
router.get("/api/admin/agents/opportunities", adminAuth, async (req: Request, res: Response) => {
  try {
    const minScore = req.query.minScore ? parseInt(req.query.minScore as string) : undefined;
    const setAside = req.query.setAside as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const opps = await sisgAgents.getOpportunities({ minScore, setAside, limit });
    res.json({ success: true, data: opps, count: opps.length });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch opportunities" });
  }
});

/**
 * GET /api/admin/agents/digest/history
 * Get past daily digests
 */
router.get("/api/admin/agents/digest/history", adminAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 7, 30);
    const digests = await sisgAgents.getDigestHistory(limit);
    res.json({ success: true, data: digests, count: digests.length });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch digest history" });
  }
});

/**
 * POST /api/admin/agents/generate-proposal
 * Generate a full bid proposal from a SAM.gov opportunity with user inputs
 */
router.post("/api/admin/agents/generate-proposal", adminAuth, async (req: Request, res: Response) => {
  try {
    const { opportunityId, companyProfile, teamComposition, pastPerformance, technicalApproach, pricingStrategy, additionalNotes } = req.body;
    if (!opportunityId) {
      return res.status(400).json({ success: false, error: "opportunityId is required" });
    }

    // Get the opportunity from storage
    const opps = await sisgAgents.getOpportunities({ limit: 500 });
    const opp = opps.find((o: any) => o.noticeId === opportunityId || o.id === opportunityId);
    if (!opp) {
      return res.status(404).json({ success: false, error: "Opportunity not found in stored data" });
    }

    // Build the proposal
    const now = new Date();
    const deadline = opp.responseDeadline ? new Date(opp.responseDeadline) : null;
    const daysRemaining = deadline ? Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;

    const proposal = {
      id: crypto.randomUUID(),
      generatedAt: now.toISOString(),
      opportunity: {
        noticeId: opp.noticeId,
        title: opp.title,
        solicitationNumber: opp.solicitationNumber || "TBD",
        organization: opp.organization || opp.department || "Unknown",
        naicsCode: opp.naicsCode || "",
        setAside: opp.setAside || "",
        setAsideDescription: opp.setAsideDescription || "",
        type: opp.type || "",
        postedDate: opp.postedDate || "",
        responseDeadline: opp.responseDeadline || null,
        daysRemaining,
        score: opp.score || 0,
        placeOfPerformance: opp.placeOfPerformance || "",
        description: opp.description || "",
      },
      bidDecision: {
        recommendation: (opp.score || 0) >= 30 ? "STRONG BID" : (opp.score || 0) >= 15 ? "CONDITIONAL BID" : "NO BID",
        confidence: Math.min(95, Math.max(40, (opp.score || 0) * 2 + 10)),
        rationale: generateBidRationale(opp),
        riskLevel: daysRemaining !== null && daysRemaining < 7 ? "HIGH" : daysRemaining !== null && daysRemaining < 14 ? "MEDIUM" : "LOW",
      },
      executionPlan: {
        phases: generatePhases(opp, daysRemaining),
        keyMilestones: generateMilestones(opp, daysRemaining),
        teamStructure: teamComposition || "To be determined based on contract requirements",
        technicalApproach: technicalApproach || generateDefaultTechnicalApproach(opp),
      },
      costEstimate: {
        methodology: pricingStrategy || "Time and Materials with Not-to-Exceed ceiling",
        estimatedRange: estimateCostRange(opp),
        assumptions: [
          "Pricing based on GSA Schedule rates where applicable",
          "Travel costs estimated at federal per diem rates",
          "Assumes standard government fiscal year timeline",
          `Place of performance: ${opp.placeOfPerformance || "TBD"}`,
        ],
      },
      complianceChecklist: generateComplianceChecklist(opp),
      proposalOutline: {
        volume1_technical: [
          "1.0 Executive Summary",
          "2.0 Understanding of Requirements",
          "3.0 Technical Approach & Methodology",
          "4.0 Management Plan",
          "5.0 Staffing Plan & Key Personnel",
          "6.0 Quality Assurance Plan",
          "7.0 Risk Management",
          "8.0 Phase-In / Transition Plan",
        ],
        volume2_past_performance: [
          "1.0 Past Performance Summary",
          pastPerformance ? "2.0 Relevant Contract References (provided)" : "2.0 Relevant Contract References (to be completed)",
          "3.0 Past Performance Questionnaires",
        ],
        volume3_pricing: [
          "1.0 Pricing Narrative",
          "2.0 Cost/Price Summary",
          "3.0 Basis of Estimate",
          "4.0 Rate Tables",
        ],
      },
      userInputs: {
        companyProfile: companyProfile || null,
        teamComposition: teamComposition || null,
        pastPerformance: pastPerformance || null,
        technicalApproach: technicalApproach || null,
        pricingStrategy: pricingStrategy || null,
        additionalNotes: additionalNotes || null,
      },
      nextSteps: generateNextSteps(opp, daysRemaining),
      status: "draft",
    };

    // Save to storage
    const { storage } = await import("../services/storage.js");
    const proposals = storage.read("generated_proposals") as any[] || [];
    proposals.unshift(proposal);
    // Keep last 50 proposals
    storage.write("generated_proposals", proposals.slice(0, 50));

    res.json({ success: true, data: proposal });
  } catch (error) {
    console.error("Proposal generation error:", error);
    res.status(500).json({ success: false, error: "Failed to generate proposal" });
  }
});

/**
 * GET /api/admin/agents/proposals
 * Get saved generated proposals
 */
router.get("/api/admin/agents/proposals", adminAuth, async (_req: Request, res: Response) => {
  try {
    const { storage } = await import("../services/storage.js");
    const proposals = storage.read("generated_proposals") as any[] || [];
    res.json({ success: true, data: proposals, count: proposals.length });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch proposals" });
  }
});

/**
 * PUT /api/admin/agents/proposals/update
 * Update a proposal's workflow state (task completion, milestone statuses, etc.)
 */
router.put("/api/admin/agents/proposals/update", adminAuth, async (req: Request, res: Response) => {
  try {
    const { id, workflowState } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: "Proposal id is required" });
    }
    const { storage } = await import("../services/storage.js");
    const proposals = storage.read("generated_proposals") as any[] || [];
    const idx = proposals.findIndex((p: any) => p.id === id);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Proposal not found" });
    }
    proposals[idx] = { ...proposals[idx], workflowState, updatedAt: new Date().toISOString() };
    storage.write("generated_proposals", proposals);
    res.json({ success: true, data: proposals[idx] });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update proposal" });
  }
});

/**
 * POST /api/admin/agents/proposals/export
 * Export a proposal as a structured document (returns JSON structure for client-side docx generation)
 */
router.post("/api/admin/agents/proposals/export", adminAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: "Proposal id is required" });
    }
    const { storage } = await import("../services/storage.js");
    const proposals = storage.read("generated_proposals") as any[] || [];
    const proposal = proposals.find((p: any) => p.id === id);
    if (!proposal) {
      return res.status(404).json({ success: false, error: "Proposal not found" });
    }

    // Build structured document content for client-side rendering
    const doc = {
      title: `Bid Proposal: ${proposal.opportunity.title}`,
      subtitle: `${proposal.opportunity.organization} — ${proposal.opportunity.solicitationNumber || "N/A"}`,
      generatedAt: proposal.generatedAt,
      sections: [
        {
          heading: "1. Executive Summary",
          content: [
            `Bid Recommendation: ${proposal.bidDecision.recommendation} (${proposal.bidDecision.confidence}% confidence)`,
            `Risk Level: ${proposal.bidDecision.riskLevel}`,
            `NAICS Code: ${proposal.opportunity.naicsCode}`,
            `Set-Aside: ${proposal.opportunity.setAsideDescription || proposal.opportunity.setAside || "None"}`,
            `Response Deadline: ${proposal.opportunity.responseDeadline || "N/A"} (${proposal.opportunity.daysRemaining !== null ? proposal.opportunity.daysRemaining + " days remaining" : "No deadline"})`,
            "",
            "Rationale:",
            ...(proposal.bidDecision.rationale || []).map((r: string) => `  • ${r}`),
          ],
        },
        {
          heading: "2. Technical Approach",
          content: [
            proposal.executionPlan.technicalApproach || "To be determined.",
            "",
            "Execution Phases:",
            ...(proposal.executionPlan.phases || []).flatMap((phase: any, i: number) => [
              `  Phase ${i + 1}: ${phase.name} (${phase.duration})`,
              ...(phase.tasks || []).map((t: string) => `    - ${t}`),
            ]),
          ],
        },
        {
          heading: "3. Key Milestones",
          content: (proposal.executionPlan.keyMilestones || []).map((m: any) => `  ${m.status === "complete" ? "✓" : "○"} ${m.name} — ${m.date}`),
        },
        {
          heading: "4. Cost Estimate",
          content: [
            `Methodology: ${proposal.costEstimate.methodology}`,
            `Estimated Range: ${proposal.costEstimate.estimatedRange.low} — ${proposal.costEstimate.estimatedRange.high} (midpoint: ${proposal.costEstimate.estimatedRange.mid})`,
            "",
            "Assumptions:",
            ...(proposal.costEstimate.assumptions || []).map((a: string) => `  • ${a}`),
          ],
        },
        {
          heading: "5. Proposal Outline",
          content: [
            "Volume 1 — Technical:",
            ...(proposal.proposalOutline.volume1_technical || []).map((s: string) => `  ${s}`),
            "",
            "Volume 2 — Past Performance:",
            ...(proposal.proposalOutline.volume2_past_performance || []).map((s: string) => `  ${s}`),
            "",
            "Volume 3 — Pricing:",
            ...(proposal.proposalOutline.volume3_pricing || []).map((s: string) => `  ${s}`),
          ],
        },
        {
          heading: "6. Compliance Checklist",
          content: (proposal.complianceChecklist || []).map((item: any) => {
            const statusIcon = item.status === "complete" ? "✓" : item.status === "ready" ? "✓" : item.status === "action_needed" ? "!" : "?";
            return `  [${statusIcon}] ${item.item} ${item.required ? "(Required)" : "(Optional)"}`;
          }),
        },
        {
          heading: "7. Next Steps",
          content: (proposal.nextSteps || []).map((step: string, i: number) => `  ${i + 1}. ${step}`),
        },
      ],
      metadata: {
        proposalId: proposal.id,
        opportunityId: proposal.opportunity.noticeId,
        score: proposal.opportunity.score,
        status: proposal.status,
        workflowState: proposal.workflowState || null,
      },
    };

    res.json({ success: true, data: doc });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to export proposal" });
  }
});

/**
 * POST /api/admin/agents/modal/ai-assist
 * AI content generation for modals (task, milestone, compliance, nextstep)
 * Accepts: { type, taskName?, milestoneName?, itemName?, stepName?, opportunityTitle?, naicsCode?, setAside?, ... }
 */
router.post("/api/admin/agents/modal/ai-assist", adminAuth, async (req: Request, res: Response) => {
  try {
    const { type, ...context } = req.body;
    if (!type) {
      return res.status(400).json({ success: false, error: "Modal type is required (task|milestone|compliance|nextstep)" });
    }

    let generatedContent: any = {};

    if (type === "task") {
      generatedContent = generateTaskContent(context);
    } else if (type === "milestone") {
      generatedContent = generateMilestoneContent(context);
    } else if (type === "compliance") {
      generatedContent = generateComplianceContent(context);
    } else if (type === "nextstep") {
      generatedContent = generateNextStepContent(context);
    } else {
      return res.status(400).json({ success: false, error: "Invalid modal type" });
    }

    res.json({ success: true, data: generatedContent });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to generate modal content" });
  }
});

/**
 * PUT /api/admin/agents/proposals/modal-state
 * Persist modal data to a proposal
 * Accepts: { proposalId, modalType, itemKey, data }
 */
router.put("/api/admin/agents/proposals/modal-state", adminAuth, async (req: Request, res: Response) => {
  try {
    const { proposalId, modalType, itemKey, data } = req.body;
    if (!proposalId || !modalType || !itemKey) {
      return res.status(400).json({ success: false, error: "proposalId, modalType, and itemKey are required" });
    }

    const { storage } = await import("../services/storage.js");
    const proposals = storage.read("generated_proposals") as any[] || [];
    const idx = proposals.findIndex((p: any) => p.id === proposalId);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: "Proposal not found" });
    }

    const proposal = proposals[idx];
    if (!proposal.modalStates) {
      proposal.modalStates = {};
    }

    proposal.modalStates[itemKey] = {
      type: modalType,
      data,
      updatedAt: new Date().toISOString(),
    };

    proposals[idx] = { ...proposal };
    storage.write("generated_proposals", proposals);

    res.json({ success: true, data: proposals[idx] });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to save modal state" });
  }
});

/**
 * GET /api/admin/agents/proposals/:id/modal-state/:itemKey
 * Retrieve saved modal data for a specific item in a proposal
 */
router.get("/api/admin/agents/proposals/:id/modal-state/:itemKey", adminAuth, async (req: Request, res: Response) => {
  try {
    const { id, itemKey } = req.params;
    const { storage } = await import("../services/storage.js");
    const proposals = storage.read("generated_proposals") as any[] || [];
    const proposal = proposals.find((p: any) => p.id === id);
    if (!proposal) {
      return res.status(404).json({ success: false, error: "Proposal not found" });
    }

    const modalState = proposal.modalStates?.[itemKey];
    if (!modalState) {
      return res.status(404).json({ success: false, error: "Modal state not found for this item" });
    }

    res.json({ success: true, data: modalState });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to retrieve modal state" });
  }
});

// ---- PARAMETERIZED ROUTES (must come AFTER non-parameterized routes) ----

/**
 * GET /api/admin/agents/:slug
 */
router.get("/api/admin/agents/:slug", adminAuth, async (req: Request, res: Response) => {
  try {
    const agent = await sisgAgents.getAgent(req.params.slug);
    if (!agent) return res.status(404).json({ success: false, error: "Agent not found" });
    res.json({ success: true, data: agent });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch agent" });
  }
});

/**
 * POST /api/admin/agents/:slug/deploy
 */
router.post("/api/admin/agents/:slug/deploy", adminAuth, async (req: Request, res: Response) => {
  try {
    const agent = await sisgAgents.deployAgent(req.params.slug);
    res.json({ success: true, data: agent, message: `${agent.name} deployed` });
  } catch (error: any) {
    const msg = error?.message || "Failed to deploy agent";
    res.status(msg.includes("not found") ? 404 : 500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/admin/agents/:slug/stop
 */
router.post("/api/admin/agents/:slug/stop", adminAuth, async (req: Request, res: Response) => {
  try {
    const agent = await sisgAgents.stopAgent(req.params.slug);
    res.json({ success: true, data: agent, message: `${agent.name} stopped` });
  } catch (error: any) {
    const msg = error?.message || "Failed to stop agent";
    res.status(msg.includes("not found") ? 404 : 500).json({ success: false, error: msg });
  }
});

/**
 * POST /api/admin/agents/:slug/run
 * Manually trigger an agent run
 */
router.post("/api/admin/agents/:slug/run", adminAuth, async (req: Request, res: Response) => {
  try {
    const run = await sisgAgents.runAgent(req.params.slug, "manual");
    res.status(201).json({ success: true, data: run, message: "Agent run triggered" });
  } catch (error: any) {
    const msg = error?.message || "Failed to trigger agent run";
    res.status(msg.includes("not found") ? 404 : 500).json({ success: false, error: msg });
  }
});

/**
 * PUT /api/admin/agents/:slug/config
 */
router.put("/api/admin/agents/:slug/config", adminAuth, async (req: Request, res: Response) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({ success: false, error: "Request body must be a JSON object" });
    }
    const agent = await sisgAgents.updateAgentConfig(req.params.slug, req.body);
    res.json({ success: true, data: agent, message: "Configuration updated" });
  } catch (error: any) {
    const msg = error?.message || "Failed to update config";
    res.status(msg.includes("not found") ? 404 : 500).json({ success: false, error: msg });
  }
});

/**
 * PUT /api/admin/agents/:slug/schedule
 */
router.put("/api/admin/agents/:slug/schedule", adminAuth, async (req: Request, res: Response) => {
  try {
    const { schedule } = req.body;
    if (!schedule || typeof schedule !== "string") {
      return res.status(400).json({ success: false, error: "schedule (cron expression) is required" });
    }
    const agent = await sisgAgents.getAgent(req.params.slug);
    if (!agent) return res.status(404).json({ success: false, error: "Agent not found" });
    const updated = await sisgAgents.updateAgentConfig(req.params.slug, { schedule });
    res.json({ success: true, data: updated, message: "Schedule updated" });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to update schedule" });
  }
});

/**
 * GET /api/admin/agents/:slug/runs
 * Get run history for an agent
 */
router.get("/api/admin/agents/:slug/runs", adminAuth, async (req: Request, res: Response) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 500);
    const runs = await sisgAgents.getAgentRuns(req.params.slug, limit);
    res.json({ success: true, data: runs, count: runs.length });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to fetch run history" });
  }
});

// --- Proposal Generation Helpers ---

function generateBidRationale(opp: any): string[] {
  const reasons: string[] = [];
  if (opp.setAside === "SDVOSBC" || opp.setAside === "SDVOSBS") reasons.push("SDVOSB set-aside aligns with SISG's veteran-owned status");
  if (opp.score >= 30) reasons.push("High relevance score indicates strong capability alignment");
  if (opp.naicsCode?.startsWith("5415")) reasons.push("NAICS code matches SISG's core IT services competency");
  if (opp.reasons?.length > 0) reasons.push(...opp.reasons.slice(0, 3));
  if (reasons.length === 0) reasons.push("Opportunity matches general capability profile");
  return reasons;
}

function generatePhases(opp: any, daysRemaining: number | null): any[] {
  const phases = [
    { name: "Proposal Development", duration: daysRemaining ? `${Math.max(1, Math.floor((daysRemaining - 2) * 0.6))} days` : "TBD", tasks: ["Requirements analysis", "Solution architecture", "Staffing plan", "Cost modeling"] },
    { name: "Review & Refinement", duration: daysRemaining ? `${Math.max(1, Math.floor((daysRemaining - 2) * 0.25))} days` : "TBD", tasks: ["Technical review", "Compliance check", "Pricing validation", "Executive approval"] },
    { name: "Submission", duration: daysRemaining ? `${Math.max(1, Math.floor((daysRemaining - 2) * 0.15))} days` : "TBD", tasks: ["Final formatting", "Document assembly", "Electronic submission", "Confirmation receipt"] },
  ];
  return phases;
}

function generateMilestones(opp: any, daysRemaining: number | null): any[] {
  const milestones = [];
  if (daysRemaining !== null && daysRemaining > 0) {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    milestones.push({ name: "Bid/No-Bid Decision", date: new Date(now + day).toISOString().split("T")[0], status: "complete" });
    milestones.push({ name: "Draft Technical Volume", date: new Date(now + Math.floor(daysRemaining * 0.4) * day).toISOString().split("T")[0], status: "pending" });
    milestones.push({ name: "Draft Cost Volume", date: new Date(now + Math.floor(daysRemaining * 0.6) * day).toISOString().split("T")[0], status: "pending" });
    milestones.push({ name: "Internal Review Complete", date: new Date(now + Math.floor(daysRemaining * 0.8) * day).toISOString().split("T")[0], status: "pending" });
    milestones.push({ name: "Final Submission", date: opp.responseDeadline?.split("T")[0] || "TBD", status: "pending" });
  }
  return milestones;
}

function generateDefaultTechnicalApproach(opp: any): string {
  const title = (opp.title || "").toLowerCase();
  if (title.includes("cyber") || title.includes("security")) return "NIST Cybersecurity Framework-aligned approach with continuous monitoring, threat assessment, and incident response capabilities.";
  if (title.includes("cloud") || title.includes("migration")) return "Phased cloud migration using AWS/Azure best practices with zero-downtime cutover strategy and automated testing.";
  if (title.includes("software") || title.includes("development")) return "Agile/Scrum methodology with 2-week sprints, CI/CD pipeline, and DevSecOps integration for rapid, secure delivery.";
  if (title.includes("data") || title.includes("analytics")) return "Modern data engineering approach with automated ETL pipelines, real-time dashboards, and AI/ML-driven insights.";
  return "Proven methodology aligned with industry best practices, tailored to agency-specific requirements with measurable outcomes.";
}

function estimateCostRange(opp: any): { low: string; mid: string; high: string } {
  // Rough estimation based on opportunity type and scope
  const score = opp.score || 0;
  const type = (opp.type || "").toLowerCase();
  let baseLow = 50000, baseMid = 150000, baseHigh = 500000;
  if (type.includes("solicitation")) { baseLow = 100000; baseMid = 350000; baseHigh = 1000000; }
  if (type.includes("sources sought")) { baseLow = 25000; baseMid = 75000; baseHigh = 200000; }
  const fmt = (n: number) => n >= 1000000 ? `$${(n / 1000000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;
  return { low: fmt(baseLow), mid: fmt(baseMid), high: fmt(baseHigh) };
}

function generateComplianceChecklist(opp: any): any[] {
  const items = [
    { item: "SAM.gov Registration Current", required: true, status: "verify" },
    { item: "NAICS Code Certification", required: true, status: opp.naicsCode ? "ready" : "verify" },
    { item: "Past Performance References (3+)", required: true, status: "action_needed" },
    { item: "Key Personnel Resumes", required: true, status: "action_needed" },
    { item: "Organizational Conflict of Interest", required: true, status: "verify" },
    { item: "Section 508 Compliance", required: opp.title?.toLowerCase().includes("it") || opp.naicsCode?.startsWith("5415"), status: "verify" },
  ];
  if (opp.setAside === "SDVOSBC" || opp.setAside === "SDVOSBS") {
    items.push({ item: "SDVOSB CVE Certification", required: true, status: "verify" });
  }
  if (opp.setAside === "8A") {
    items.push({ item: "8(a) Program Certification", required: true, status: "verify" });
  }
  return items;
}

function generateNextSteps(opp: any, daysRemaining: number | null): string[] {
  const steps = ["Review generated proposal outline and customize sections"];
  if (daysRemaining !== null && daysRemaining <= 7) steps.unshift("URGENT: Deadline approaching — prioritize submission preparation");
  steps.push("Assign key personnel and collect resumes");
  steps.push("Draft technical approach specific to the SOW");
  steps.push("Prepare cost/pricing volume with competitive rates");
  steps.push("Conduct internal Red Team review before submission");
  if (opp.pointOfContact) steps.push(`Contact contracting officer for clarification questions`);
  return steps;
}

// --- Modal Content Generation Helpers ---

function generateTaskContent(context: any): any {
  const taskName = context.taskName || "Task";
  const phaseName = context.phaseName || "Project Phase";
  const naicsCode = context.naicsCode || "";

  // Determine task complexity and assignee based on task name
  const isCompliance = taskName.toLowerCase().includes("compliance") || taskName.toLowerCase().includes("requirement");
  const isTechnical = taskName.toLowerCase().includes("technical") || taskName.toLowerCase().includes("architecture") || taskName.toLowerCase().includes("system");
  const isAdmin = taskName.toLowerCase().includes("contract") || taskName.toLowerCase().includes("admin") || taskName.toLowerCase().includes("proposal");

  let assignee = "Project Manager";
  if (isTechnical) assignee = "Technical Lead";
  if (isCompliance) assignee = "Compliance Specialist";
  if (isAdmin) assignee = "Contracts Specialist";

  let hours = 8;
  if (isCompliance) hours = 12;
  if (taskName.toLowerCase().includes("review")) hours = 6;
  if (taskName.toLowerCase().includes("design") || taskName.toLowerCase().includes("architecture")) hours = 20;

  const subtasks = generateTaskSubtasks(taskName, naicsCode);

  return {
    subtasks,
    notes: generateTaskNotes(taskName, naicsCode),
    suggestedAssignee: assignee,
    estimatedHours: hours,
  };
}

function generateMilestoneContent(context: any): any {
  const milestoneName = context.milestoneName || "Milestone";
  const naicsCode = context.naicsCode || "";
  const opportunityTitle = context.opportunityTitle || "";

  return {
    dependencies: generateMilestoneDependencies(milestoneName, opportunityTitle),
    deliverables: generateMilestoneDeliverables(milestoneName, naicsCode),
    completionCriteria: generateCompletionCriteria(milestoneName),
    notes: generateMilestoneNotes(milestoneName, opportunityTitle),
  };
}

function generateComplianceContent(context: any): any {
  const itemName = context.itemName || "Compliance Item";
  const required = context.required !== false;
  const naicsCode = context.naicsCode || "";
  const setAside = context.setAside || "";

  return {
    verificationSteps: generateVerificationSteps(itemName, naicsCode, setAside),
    requiredDocuments: generateRequiredDocuments(itemName, setAside),
    actionItems: generateActionItems(itemName),
    guidanceNotes: generateGuidanceNotes(itemName, required),
  };
}

function generateNextStepContent(context: any): any {
  const stepName = context.stepName || "Next Step";
  const opportunityTitle = context.opportunityTitle || "";

  return {
    subtasks: generateNextStepSubtasks(stepName, opportunityTitle),
    notes: generateNextStepNotes(stepName),
  };
}

function generateTaskSubtasks(taskName: string, naicsCode: string): string[] {
  const lowerTask = taskName.toLowerCase();

  if (lowerTask.includes("review") && lowerTask.includes("rfp")) {
    return [
      "Download and review full RFP document",
      "Identify mandatory requirements and specifications",
      "Map requirements to our existing capabilities",
      "Flag potential compliance gaps or challenges",
      "Document questions for contracting officer",
    ];
  }

  if (lowerTask.includes("requirement") && (lowerTask.includes("analyze") || lowerTask.includes("analysis"))) {
    return [
      "Conduct comprehensive requirements review",
      "Identify critical success factors",
      "Assess organizational impact",
      "Evaluate resource needs",
      "Create requirements traceability matrix",
    ];
  }

  if (lowerTask.includes("technical") && lowerTask.includes("approach")) {
    return [
      "Research relevant industry standards and methodologies",
      "Develop proposed technical architecture",
      "Create solution design diagrams",
      "Document technology stack rationale",
      "Define implementation timeline",
    ];
  }

  if (lowerTask.includes("staffing") || lowerTask.includes("personnel")) {
    return [
      "Identify required skill sets and roles",
      "Map internal personnel to positions",
      "Identify staffing gaps",
      "Develop recruitment plan if needed",
      "Prepare resumes and certifications",
    ];
  }

  if (lowerTask.includes("cost") || lowerTask.includes("pricing")) {
    return [
      "Establish cost estimation methodology",
      "Develop labor rate assumptions",
      "Estimate material and overhead costs",
      "Create cost breakdown structure",
      "Validate against budget constraints",
    ];
  }

  // Default subtasks
  return [
    `Conduct initial assessment of ${taskName}`,
    "Identify resource requirements and constraints",
    `Develop execution strategy for ${taskName}`,
    "Document findings and recommendations",
    "Review with team stakeholders",
  ];
}

function generateTaskNotes(taskName: string, naicsCode: string): string {
  const isITNAICS = naicsCode.startsWith("5415") || naicsCode.startsWith("5112");
  const lowerTask = taskName.toLowerCase();

  if (lowerTask.includes("compliance")) {
    return "Ensure all compliance requirements are thoroughly documented and mapped to regulatory standards. Schedule review sessions with legal and compliance teams to identify any gaps or risks.";
  }

  if (lowerTask.includes("technical")) {
    const techFocus = isITNAICS ? "Leverage industry-leading IT methodologies and security best practices" : "Apply proven technical approach tailored to agency requirements";
    return `${techFocus}. Document all assumptions and constraints for internal review and client alignment.`;
  }

  if (lowerTask.includes("staffing")) {
    return "Coordinate with HR to identify and secure key personnel. Ensure all proposed staff meet clearance and certification requirements specified in the solicitation.";
  }

  if (lowerTask.includes("cost") || lowerTask.includes("pricing")) {
    return "Apply competitive market rates while ensuring profitability. Document all cost assumptions and get finance approval before finalizing proposal pricing.";
  }

  return `Complete this task collaboratively with stakeholders. Document all decisions and maintain clear communication throughout the execution phase.`;
}

function generateMilestoneDependencies(milestoneName: string, opportunityTitle: string): string[] {
  const lowerMilestone = milestoneName.toLowerCase();

  if (lowerMilestone.includes("draft") && lowerMilestone.includes("technical")) {
    return [
      "Requirements analysis complete",
      "Technical team assembled and briefed",
      "Architecture decision records approved",
    ];
  }

  if (lowerMilestone.includes("draft") && (lowerMilestone.includes("cost") || lowerMilestone.includes("pricing"))) {
    return [
      "Scope of work finalized",
      "Labor categories and rates defined",
      "Resource staffing plan confirmed",
    ];
  }

  if (lowerMilestone.includes("review") || lowerMilestone.includes("internal")) {
    return [
      "All technical volumes drafted",
      "Cost estimates completed",
      "Compliance checklist reviewed",
    ];
  }

  if (lowerMilestone.includes("submission") || lowerMilestone.includes("final")) {
    return [
      "Internal review and Red Team complete",
      "All sections formatted and proofed",
      "Executive approval obtained",
    ];
  }

  return [
    "Prior phase activities complete",
    "Team resources allocated",
    "Requirements documented",
  ];
}

function generateMilestoneDeliverables(milestoneName: string, naicsCode: string): string[] {
  const lowerMilestone = milestoneName.toLowerCase();

  if (lowerMilestone.includes("technical")) {
    return [
      "Technical approach document",
      "System architecture diagrams",
      "Solution implementation roadmap",
      "Risk mitigation plan",
    ];
  }

  if (lowerMilestone.includes("cost") || lowerMilestone.includes("pricing")) {
    return [
      "Detailed cost breakdown",
      "Pricing schedule",
      "Cost estimation methodology",
      "Financial assumptions document",
    ];
  }

  if (lowerMilestone.includes("review")) {
    return [
      "Red Team review report",
      "Compliance verification matrix",
      "Quality assurance checklist",
      "Recommended corrections and edits",
    ];
  }

  if (lowerMilestone.includes("submission")) {
    return [
      "Final proposal document package",
      "Electronic submission confirmation",
      "Delivery receipt documentation",
    ];
  }

  return [
    "Phase completion report",
    "Updated status documentation",
    "Risk and issue summary",
  ];
}

function generateCompletionCriteria(milestoneName: string): string[] {
  const lowerMilestone = milestoneName.toLowerCase();

  const criteria = [
    "All assigned tasks completed",
    "Quality review passed with minimal findings",
    "Stakeholder sign-off obtained",
  ];

  if (lowerMilestone.includes("technical")) {
    criteria.push("Technical architecture approved by leadership");
    criteria.push("No unresolved compliance concerns");
  }

  if (lowerMilestone.includes("cost") || lowerMilestone.includes("pricing")) {
    criteria.push("Finance approval on pricing strategy");
    criteria.push("Competitive analysis validation complete");
  }

  if (lowerMilestone.includes("review")) {
    criteria.push("All action items from review incorporated");
    criteria.push("Final formatting complete");
  }

  return criteria;
}

function generateMilestoneNotes(milestoneName: string, opportunityTitle: string): string {
  const lowerMilestone = milestoneName.toLowerCase();

  if (lowerMilestone.includes("submission")) {
    return "Ensure timely submission well before deadline to account for any technical upload issues. Maintain comprehensive documentation of submission confirmation and receipt.";
  }

  if (lowerMilestone.includes("review")) {
    return "Conduct thorough internal review with cross-functional team. Document all findings and prioritize resolution of critical items before final submission.";
  }

  return `This milestone is critical to proposal success. Monitor progress closely and escalate any blockers to the proposal manager immediately.`;
}

function generateVerificationSteps(itemName: string, naicsCode: string, setAside: string): string[] {
  const lowerItem = itemName.toLowerCase();

  if (lowerItem.includes("sam") || lowerItem.includes("registration")) {
    return [
      "Log into SAM.gov and confirm active registration",
      "Verify all company information is current and accurate",
      "Check UEI matches all proposal documents",
      "Confirm no active exclusions or suspensions",
      "Export and archive current SAM.gov confirmation",
    ];
  }

  if (lowerItem.includes("naics")) {
    return [
      "Verify NAICS code matches solicitation requirements",
      "Confirm revenue alignment with NAICS definition",
      "Check SBA size standards compliance",
      "Document business classification rationale",
      "Obtain legal review of NAICS certification",
    ];
  }

  if (lowerItem.includes("sdvosb") || lowerItem.includes("veteran")) {
    return [
      "Confirm SDVOSB CVE status is active",
      "Verify service-disabled veteran ownership percentage",
      "Check for any debarment or suspension status",
      "Ensure compliance with VOSB program requirements",
      "Document veteran status verification",
    ];
  }

  if (lowerItem.includes("past performance") || lowerItem.includes("reference")) {
    return [
      "Identify 3+ relevant contracts matching opportunity scope",
      "Contact references and confirm availability for evaluation",
      "Gather contract documentation and performance metrics",
      "Prepare past performance questionnaire responses",
      "Document contract relevance and lessons learned",
    ];
  }

  if (lowerItem.includes("conflict") || lowerItem.includes("ocoi")) {
    return [
      "Conduct organizational conflict of interest analysis",
      "Review all current contracts for potential conflicts",
      "Document findings and mitigation strategies",
      "Obtain legal review and approval",
      "Prepare conflict waiver request if necessary",
    ];
  }

  return [
    `Verify ${itemName} requirements from solicitation`,
    "Gather supporting documentation",
    "Conduct compliance assessment",
    "Document verification results",
    "Escalate any issues to compliance team",
  ];
}

function generateRequiredDocuments(itemName: string, setAside: string): string[] {
  const lowerItem = itemName.toLowerCase();

  if (lowerItem.includes("sam") || lowerItem.includes("registration")) {
    return [
      "SAM.gov registration confirmation screenshot",
      "UEI documentation",
    ];
  }

  if (lowerItem.includes("sdvosb") || lowerItem.includes("veteran")) {
    return [
      "SDVOSB CVE certification letter",
      "Service-disabled verification documentation",
    ];
  }

  if (lowerItem.includes("past performance") || lowerItem.includes("reference")) {
    return [
      "Past performance reference letters",
      "Sample contract deliverables or work products",
      "Performance evaluation summaries",
    ];
  }

  if (lowerItem.includes("personnel") || lowerItem.includes("key staff")) {
    return [
      "Current resumes for all proposed personnel",
      "Clearance documentation",
      "Professional certifications",
    ];
  }

  return [
    "Supporting documentation for the compliance item",
    "Verification records or certificates",
  ];
}

function generateActionItems(itemName: string): string[] {
  const lowerItem = itemName.toLowerCase();

  if (lowerItem.includes("sam") || lowerItem.includes("registration")) {
    return [
      "Assign owner for SAM.gov maintenance",
      "Set up quarterly review schedule",
    ];
  }

  if (lowerItem.includes("past performance")) {
    return [
      "Identify and contact past performance references",
      "Prepare detailed questionnaire responses",
    ];
  }

  if (lowerItem.includes("personnel") || lowerItem.includes("resume")) {
    return [
      "Collect updated resumes from all key staff",
      "Verify certifications and clearances",
    ];
  }

  return [
    `Assign owner responsible for ${itemName}`,
    "Schedule verification and sign-off",
  ];
}

function generateGuidanceNotes(itemName: string, required: boolean): string {
  const requiredText = required ? "This is a required compliance item." : "This is an optional compliance item.";

  if (itemName.toLowerCase().includes("conflict")) {
    return `${requiredText} Any organizational conflicts of interest must be thoroughly disclosed and mitigation strategies clearly documented.`;
  }

  if (itemName.toLowerCase().includes("past performance")) {
    return `${requiredText} Ensure all references are relevant to the current opportunity scope and that referees are available for contact.`;
  }

  if (itemName.toLowerCase().includes("section 508")) {
    return `${requiredText} Section 508 compliance is critical for government IT proposals. All deliverables must meet accessibility standards.`;
  }

  return `${requiredText} Complete this requirement early to avoid submission delays.`;
}

function generateNextStepSubtasks(stepName: string, opportunityTitle: string): string[] {
  const lowerStep = stepName.toLowerCase();

  if (lowerStep.includes("customize") || lowerStep.includes("tailor")) {
    return [
      "Review generated proposal outline",
      "Customize sections with company-specific language",
      "Incorporate past performance examples",
      "Align technical approach to specific requirements",
    ];
  }

  if (lowerStep.includes("team") || lowerStep.includes("personnel")) {
    return [
      "Assign proposal manager and key team leads",
      "Distribute responsibilities and deadlines",
      "Conduct team kickoff meeting",
      "Establish communication and review protocols",
    ];
  }

  if (lowerStep.includes("review") || lowerStep.includes("red team")) {
    return [
      "Conduct internal technical review",
      "Execute Red Team challenge and response",
      "Review for compliance and responsiveness",
      "Address all findings before submission",
    ];
  }

  if (lowerStep.includes("submit") || lowerStep.includes("submission")) {
    return [
      "Prepare final proposal documents",
      "Format for electronic submission",
      "Test upload process and file integrity",
      "Submit well before deadline",
    ];
  }

  return [
    `Execute ${stepName}`,
    "Document progress and decisions",
    "Communicate status to stakeholders",
    "Prepare for next phase",
  ];
}

function generateNextStepNotes(stepName: string): string {
  const lowerStep = stepName.toLowerCase();

  if (lowerStep.includes("customize") || lowerStep.includes("tailor")) {
    return "Work closely with subject matter experts to ensure all proposal content is accurate, compelling, and directly responsive to the solicitation requirements.";
  }

  if (lowerStep.includes("team")) {
    return "Establish clear roles, responsibilities, and communication channels early to ensure efficient execution and coordination throughout the proposal development cycle.";
  }

  if (lowerStep.includes("review")) {
    return "This critical phase identifies weaknesses and gaps. Allow sufficient time for thorough review and incorporation of feedback before final submission.";
  }

  if (lowerStep.includes("submit")) {
    return "Plan submissions for at least 24 hours before deadline to account for unexpected technical issues or corrections needed.";
  }

  return `This step is important for proposal success. Ensure adequate resources and timeline are allocated.`;
}

export default router;
