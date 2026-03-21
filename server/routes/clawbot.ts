import express, { Router, Request, Response } from "express";
import { adminAuth } from "../middleware/auth.js";
import { clawbot } from "../services/clawbot.js";

const router: Router = express.Router();

// =============================================================================
// CLAWBOT API ROUTES
// =============================================================================

// ---- BOT STATUS ----
router.get("/api/admin/clawbot/status", adminAuth, async (_req: Request, res: Response) => {
  try {
    const status = await clawbot.getStatus();
    const connection = clawbot.getConnectionInfo();
    res.json({ ...status, connection });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bot status" });
  }
});

// ---- HEARTBEAT (called BY ClawBot, authenticated with API key) ----
router.post("/api/clawbot/heartbeat", (req: Request, res: Response) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== (process.env.CLAWBOT_API_KEY || "clawbot-sisg-2026")) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  clawbot.processHeartbeat(req.body);
  res.json({ received: true, timestamp: new Date().toISOString() });
});

// ---- AGENTS ----
router.get("/api/admin/clawbot/agents", adminAuth, async (_req: Request, res: Response) => {
  try {
    const agents = await clawbot.getAgents();
    res.json(agents);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch agents" });
  }
});

router.post("/api/admin/clawbot/agents", adminAuth, async (req: Request, res: Response) => {
  try {
    const agent = await clawbot.createAgent({
      name: req.body.name,
      type: req.body.type || "custom",
      status: req.body.status || "idle",
      lastRun: req.body.lastRun || "never",
      nextRun: req.body.nextRun || "never",
      schedule: req.body.schedule || "manual",
      lastResult: req.body.lastResult || "",
      errorCount: req.body.errorCount ?? 0,
    });
    res.status(201).json(agent);
  } catch (error) {
    res.status(500).json({ error: "Failed to create agent" });
  }
});

router.put("/api/admin/clawbot/agents/:id", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await clawbot.updateAgent(req.params.id, req.body);
    if (!result) return res.status(404).json({ error: "Agent not found" });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to update agent" });
  }
});

// ---- TASKS ----
router.get("/api/admin/clawbot/tasks", adminAuth, async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const tasks = await clawbot.getTasks(status);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

router.post("/api/admin/clawbot/tasks", adminAuth, async (req: Request, res: Response) => {
  try {
    const task = await clawbot.createTask({
      command: req.body.command,
      priority: req.body.priority || "normal",
      source: "dashboard",
      agent: req.body.agent,
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: "Failed to create task" });
  }
});

// Task status update (called BY ClawBot)
router.put("/api/clawbot/tasks/:id", (req: Request, res: Response) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== (process.env.CLAWBOT_API_KEY || "clawbot-sisg-2026")) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  const result = clawbot.updateTask(req.params.id, req.body);
  if (!result) return res.status(404).json({ error: "Task not found" });
  res.json(result);
});

// ---- COMMANDS ----
router.post("/api/admin/clawbot/commands", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await clawbot.sendCommand({
      command: req.body.command,
      args: req.body.args,
      priority: req.body.priority || "normal",
      source: "dashboard",
    });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to send command" });
  }
});

// ---- LOGS ----
router.get("/api/admin/clawbot/logs", adminAuth, (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const level = req.query.level as string | undefined;
    const agent = req.query.agent as string | undefined;
    const logs = clawbot.getLogs(limit, level, agent);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch logs" });
  }
});

// Log ingestion (called BY ClawBot)
router.post("/api/clawbot/logs", (req: Request, res: Response) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== (process.env.CLAWBOT_API_KEY || "clawbot-sisg-2026")) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  const entries = Array.isArray(req.body) ? req.body : [req.body];
  const saved = entries.map((entry: any) => clawbot.addLog(entry));
  res.json({ received: saved.length, logs: saved });
});

// ---- METRICS ----
router.get("/api/admin/clawbot/metrics", adminAuth, (_req: Request, res: Response) => {
  try {
    const metrics = clawbot.getMetrics();
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch metrics" });
  }
});

export default router;
