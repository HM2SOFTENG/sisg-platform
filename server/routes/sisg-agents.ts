import express, { Router, Request, Response } from "express";
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

export default router;
