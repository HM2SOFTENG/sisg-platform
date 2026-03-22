import axios from "axios";
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
  if (!req.body || typeof req.body !== 'object') {
    return res.status(400).json({ error: "Body must be a JSON object" });
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

// Task status update (called from dashboard — admin auth)
router.put("/api/admin/clawbot/tasks/:id", adminAuth, (req: Request, res: Response) => {
  try {
    const result = clawbot.updateTask(req.params.id, req.body);
    if (!result) return res.status(404).json({ error: "Task not found" });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Cancel a task (dashboard)
router.post("/api/admin/clawbot/tasks/:id/cancel", adminAuth, (req: Request, res: Response) => {
  try {
    const result = clawbot.updateTask(req.params.id, {
      status: "cancelled",
      completedAt: new Date().toISOString(),
    });
    if (!result) return res.status(404).json({ error: "Task not found" });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to cancel task" });
  }
});

// Retry a failed task (dashboard) — creates a new task with the same command
router.post("/api/admin/clawbot/tasks/:id/retry", adminAuth, async (req: Request, res: Response) => {
  try {
    const tasks = await clawbot.getTasks();
    const original = tasks.find((t: any) => t.id === req.params.id);
    if (!original) return res.status(404).json({ error: "Task not found" });

    const newTask = await clawbot.createTask({
      command: original.command,
      priority: original.priority || "normal",
      source: "dashboard",
      agent: original.agent,
    });
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: "Failed to retry task" });
  }
});

// Task status update (called BY ClawBot — API key auth)
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
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
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
  const entries = Array.isArray(req.body) ? req.body.slice(0, 100) : [req.body]; // Cap at 100 entries per request
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

// ---- DIRECT API CONNECTION HANDSHAKE ----

// Step 1: ClawBot initiates connection by providing its reachable URL
router.post("/api/clawbot/connect", async (req: Request, res: Response) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== (process.env.CLAWBOT_API_KEY || "clawbot-sisg-2026")) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  try {
    const { url, capabilities } = req.body;
    if (!url) return res.status(400).json({ error: "url is required" });
    if (typeof url !== 'string' || url.trim().length === 0) return res.status(400).json({ error: "url must be a non-empty string" });
    if (capabilities && !Array.isArray(capabilities)) return res.status(400).json({ error: "capabilities must be an array" });
    const result = await clawbot.initiateConnection(url, capabilities || []);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to initiate connection" });
  }
});

// Step 2: ClawBot verifies the challenge
router.post("/api/clawbot/verify", async (req: Request, res: Response) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== (process.env.CLAWBOT_API_KEY || "clawbot-sisg-2026")) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  try {
    const { url, challengeResponse, capabilities } = req.body;
    if (!url || !challengeResponse) {
      return res.status(400).json({ error: "url and challengeResponse are required" });
    }
    const result = await clawbot.verifyConnection(url, challengeResponse, capabilities || []);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: "Failed to verify connection" });
  }
});

// ClawBot disconnects cleanly
router.post("/api/clawbot/disconnect", (req: Request, res: Response) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== (process.env.CLAWBOT_API_KEY || "clawbot-sisg-2026")) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  const result = clawbot.disconnect();
  res.json(result);
});

// ClawBot polls for pending work (commands + queued tasks)
router.get("/api/clawbot/poll", (req: Request, res: Response) => {
  const apiKey = req.headers["x-api-key"];
  if (apiKey !== (process.env.CLAWBOT_API_KEY || "clawbot-sisg-2026")) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  clawbot.pollPendingWork().then(work => res.json(work)).catch(() => res.status(500).json({ error: "Failed to poll" }));
});

// Admin: manually test connection from dashboard
router.post("/api/admin/clawbot/test-connection", adminAuth, async (_req: Request, res: Response) => {
  try {
    const info = clawbot.getConnectionInfo();
    if (!info.activeConnection) {
      return res.json({ success: false, message: "No active direct connection. ClawBot must call /api/clawbot/connect first." });
    }
    // Try to ping ClawBot at its registered URL
    const resp = await axios.get(`${info.activeConnection.url}/api/ping`, {
      headers: { "X-API-Key": process.env.CLAWBOT_API_KEY || "clawbot-sisg-2026" },
      timeout: 5000,
    });
    if (resp.data?.pong === true) {
      res.json({ success: true, message: "Direct connection verified", latency: `${resp.headers['x-response-time'] || 'N/A'}` });
    } else {
      res.json({ success: false, message: "Ping response invalid" });
    }
  } catch (error: any) {
    res.json({ success: false, message: `Connection test failed: ${error.message}` });
  }
});

// ---- SSE ENDPOINT (EventSource fallback — ClawBot connects here for real-time push) ----
router.get("/api/clawbot/stream", (req: Request, res: Response) => {
  const apiKey = req.headers["x-api-key"] || req.query.key;
  if (apiKey !== (process.env.CLAWBOT_API_KEY || "clawbot-sisg-2026")) {
    return res.status(401).json({ error: "Invalid API key" });
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Nginx: disable buffering
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`);

  // Send keepalive every 30s
  const keepalive = setInterval(() => {
    try { res.write(`: keepalive\n\n`); } catch { clearInterval(keepalive); }
  }, 30000);

  clawbot.registerSseClient(res);

  req.on("close", () => clearInterval(keepalive));
});

// ---- CONNECTION STATUS (for dashboard — includes WS/SSE client counts) ----
router.get("/api/admin/clawbot/connection", adminAuth, (_req: Request, res: Response) => {
  const info = clawbot.getConnectionInfo();
  res.json({
    ...info,
    wsClients: clawbot.getWsClientCount(),
    sseClients: clawbot.getSseClientCount(),
  });
});

export default router;
