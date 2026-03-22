import axios from "axios";
import crypto from "crypto";
import { WebSocket } from "ws";
import { storage } from "./storage.js";
import { slack } from "./slack.js";

// =============================================================================
// ClawBot Command Center — Service Layer
// Manages bot status, commands, agents, logs, and communication
// Supports Direct API (webhook) + Slack Fallback
// =============================================================================

export interface BotStatus {
  online: boolean;
  lastHeartbeat: string;
  uptime: number; // seconds
  system: {
    cpu: number;
    memory: number;
    disk: number;
    hostname: string;
    platform: string;
  };
  version: string;
}

export interface BotAgent {
  id: string;
  name: string;
  type: "qa" | "bootstrap" | "pm" | "devlead" | "monitor" | "custom";
  status: "active" | "idle" | "error" | "disabled";
  lastRun: string;
  nextRun: string;
  schedule: string; // cron expression or "manual"
  lastResult: string;
  errorCount: number;
}

export interface BotTask {
  id: string;
  command: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  priority: "low" | "normal" | "high" | "critical";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: string;
  error?: string;
  source: "dashboard" | "slack" | "schedule" | "api";
  agent?: string;
}

export interface BotLog {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  agent: string;
  message: string;
  details?: string;
}

export interface BotCommand {
  id: string;
  command: string;
  args?: Record<string, any>;
  priority: "low" | "normal" | "high" | "critical";
  source: "dashboard" | "slack";
  createdAt: string;
}

// Bot connection config
const BOT_DIRECT_URL = process.env.CLAWBOT_URL || "http://localhost:4000";
const BOT_API_KEY = process.env.CLAWBOT_API_KEY || "clawbot-sisg-2026";
const SLACK_BOT_CHANNEL = "software-development"; // fallback channel

// Verified connection state
interface DirectConnection {
  url: string;
  verifiedAt: string;
  capabilities: string[];
  challengeToken?: string;
  lastPingAt?: string;
}

// WebSocket connections from ClawBot (outbound from ClawBot, received here)
let wsClients: Set<WebSocket> = new Set();
// SSE clients (for EventSource-based fallback)
let sseClients: Set<any> = new Set();

let activeConnection: DirectConnection | null = null;
let pendingChallenge: { token: string; expiresAt: number } | null = null;

// Track connection state
let lastDirectSuccess = 0;
let directAvailable = false;

function isAllowedUrl(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const hostname = url.hostname.toLowerCase();
    // Block private/internal ranges
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
      hostname.startsWith('169.254.') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function tryDirect<T>(path: string, method: "get" | "post" = "get", data?: any): Promise<T | null> {
  // Use verified connection URL if available, otherwise fall back to env/default
  const baseUrl = activeConnection?.url || BOT_DIRECT_URL;

  // Don't even try if URL is not allowed (private/internal)
  if (!activeConnection && !isAllowedUrl(baseUrl)) {
    return null;
  }

  try {
    const resp = await axios({
      method,
      url: `${baseUrl}${path}`,
      data,
      headers: { "X-API-Key": BOT_API_KEY, "Content-Type": "application/json" },
      timeout: 5000,
    });
    lastDirectSuccess = Date.now();
    directAvailable = true;
    return resp.data;
  } catch {
    // If verified connection fails, mark it stale but don't immediately drop
    if (activeConnection) {
      const staleMs = Date.now() - new Date(activeConnection.lastPingAt || activeConnection.verifiedAt).getTime();
      if (staleMs > 120000) { // 2 minutes with no successful contact
        activeConnection = null;
        directAvailable = false;
      }
    } else {
      directAvailable = false;
    }
    return null;
  }
}

export const clawbot = {
  // ---------------------------------------------------------------------------
  // STATUS
  // ---------------------------------------------------------------------------
  async getStatus(): Promise<BotStatus> {
    // Try direct API first
    const live = await tryDirect<BotStatus>("/api/status");
    if (live) {
      // Cache the status
      storage.write("bot_status", [{ id: "current", ...live, fetchedAt: new Date().toISOString() }]);
      return live;
    }

    // Fallback: return last cached status (from heartbeats)
    const cached = storage.read("bot_status");
    if (cached.length > 0) {
      // Consider bot online if heartbeat received within last 90 seconds
      const lastBeat = new Date(cached[0].lastHeartbeat).getTime();
      const isRecent = (Date.now() - lastBeat) < 90000;
      return { ...cached[0], online: isRecent };
    }

    return {
      online: false,
      lastHeartbeat: "never",
      uptime: 0,
      system: { cpu: 0, memory: 0, disk: 0, hostname: "unknown", platform: "unknown" },
      version: "unknown",
    };
  },

  // ---------------------------------------------------------------------------
  // HEARTBEAT (called by ClawBot agent periodically)
  // ---------------------------------------------------------------------------
  processHeartbeat(data: Partial<BotStatus>): void {
    const status = {
      id: "current",
      online: true,
      lastHeartbeat: new Date().toISOString(),
      ...data,
      fetchedAt: new Date().toISOString(),
    };
    storage.write("bot_status", [status]);
  },

  // ---------------------------------------------------------------------------
  // AGENTS
  // ---------------------------------------------------------------------------
  async getAgents(): Promise<BotAgent[]> {
    const live = await tryDirect<BotAgent[]>("/api/agents");
    if (live) {
      storage.write("bot_agents", live);
      return live;
    }
    return storage.read("bot_agents");
  },

  async createAgent(data: Omit<BotAgent, "id">): Promise<BotAgent> {
    const agent: any = {
      ...data,
    };
    return storage.add("bot_agents", agent);
  },

  async updateAgent(id: string, updates: Partial<BotAgent>): Promise<BotAgent | null> {
    // Try direct command
    const result = await tryDirect<BotAgent>(`/api/agents/${id}`, "post", updates);
    if (result) return result;

    // Fallback: queue as command via Slack
    await this.sendCommand({
      command: "agent:update",
      args: { agentId: id, ...updates },
      priority: "normal",
      source: "dashboard",
    });
    return storage.update("bot_agents", id, updates);
  },

  // ---------------------------------------------------------------------------
  // TASKS
  // ---------------------------------------------------------------------------
  async getTasks(status?: string): Promise<BotTask[]> {
    let tasks = storage.read("bot_tasks") as BotTask[];
    if (status) {
      tasks = tasks.filter((t: any) => t.status === status);
    }
    return tasks.sort((a: any, b: any) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async createTask(task: Omit<BotTask, "id" | "createdAt" | "status">): Promise<BotTask> {
    const newTask: any = {
      ...task,
      status: "queued",
      createdAt: new Date().toISOString(),
    };
    const saved = storage.add("bot_tasks", newTask);

    // Try to dispatch directly first
    const dispatched = await tryDirect<{ accepted: boolean }>("/api/tasks", "post", saved);
    if (dispatched?.accepted) {
      storage.update("bot_tasks", saved.id, { status: "running", startedAt: new Date().toISOString() });
    } else {
      // Fallback: notify via Slack
      await slack.notify("activity", {
        blocks: [{
          type: "section",
          text: { type: "mrkdwn", text: `🤖 *ClawBot Task Queued*\n\`${task.command}\`\nPriority: ${task.priority}\nSource: ${task.source}` },
        }],
      });
      // Push to real-time WS/SSE clients if direct dispatch didn't handle it
      this.pushToClients({ type: "work", commands: [], tasks: [saved] });
    }

    return saved;
  },

  updateTask(id: string, updates: Partial<BotTask>): BotTask | null {
    return storage.update("bot_tasks", id, updates);
  },

  // ---------------------------------------------------------------------------
  // LOGS
  // ---------------------------------------------------------------------------
  getLogs(limit = 100, level?: string, agent?: string): BotLog[] {
    let logs = storage.read("bot_logs") as BotLog[];
    if (level) logs = logs.filter((l: any) => l.level === level);
    if (agent) logs = logs.filter((l: any) => l.agent === agent);
    return logs
      .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  },

  addLog(log: Omit<BotLog, "id" | "timestamp">): BotLog {
    const entry: any = {
      ...log,
      timestamp: new Date().toISOString(),
    };
    return storage.add("bot_logs", entry);
  },

  // ---------------------------------------------------------------------------
  // COMMANDS (Dashboard → Bot)
  // ---------------------------------------------------------------------------
  async sendCommand(cmd: Omit<BotCommand, "id" | "createdAt">): Promise<{ sent: boolean; method: "direct" | "slack" }> {
    const command: any = {
      ...cmd,
      createdAt: new Date().toISOString(),
    };
    storage.add("bot_commands", command);

    // Try direct first
    const result = await tryDirect<{ received: boolean }>("/api/commands", "post", command);
    if (result?.received) {
      this.addLog({ level: "info", agent: "system", message: `Command sent (direct): ${cmd.command}` });
      return { sent: true, method: "direct" };
    }

    // Fallback: Slack
    try {
      await slack.notify("activity", {
        blocks: [{
          type: "section",
          text: {
            type: "mrkdwn",
            text: `🤖 *ClawBot Command*\n\`${cmd.command}\`\n${cmd.args ? "```" + JSON.stringify(cmd.args, null, 2) + "```" : ""}`,
          },
        }],
      });
      this.addLog({ level: "info", agent: "system", message: `Command sent (slack fallback): ${cmd.command}` });
      // Push to real-time WS/SSE clients if direct dispatch didn't handle it
      this.pushToClients({ type: "work", commands: [command], tasks: [] });
      return { sent: true, method: "slack" };
    } catch {
      this.addLog({ level: "error", agent: "system", message: `Failed to send command: ${cmd.command}` });
      return { sent: false, method: "slack" };
    }
  },

  // ---------------------------------------------------------------------------
  // CONNECTION HANDSHAKE
  // ---------------------------------------------------------------------------
  // Initiate connection handshake — ClawBot calls this with its reachable URL
  async initiateConnection(url: string, capabilities: string[]): Promise<{ challenge: string; expiresIn: number }> {
    // Reject if a challenge is already pending and not expired
    if (pendingChallenge && Date.now() < pendingChallenge.expiresAt) {
      return { challenge: "pending", expiresIn: Math.ceil((pendingChallenge.expiresAt - Date.now()) / 1000) };
    }

    // Generate a random challenge token
    let token: string;
    try {
      token = crypto.randomUUID() + '-' + Date.now();
    } catch {
      token = Math.random().toString(36).slice(2) + Date.now();
    }
    pendingChallenge = { token, expiresAt: Date.now() + 30000 }; // 30s to respond

    this.addLog({ level: "info", agent: "system", message: `Connection request from ${url} — challenge issued` });

    return { challenge: token, expiresIn: 30 };
  },

  // Verify the challenge — ClawBot echoes back the token from its own URL
  async verifyConnection(url: string, challengeResponse: string, capabilities: string[]): Promise<{ verified: boolean; message: string }> {
    if (!pendingChallenge) {
      return { verified: false, message: "No pending challenge" };
    }
    if (Date.now() > pendingChallenge.expiresAt) {
      pendingChallenge = null;
      return { verified: false, message: "Challenge expired" };
    }
    if (challengeResponse !== pendingChallenge.token) {
      pendingChallenge = null;
      return { verified: false, message: "Challenge mismatch" };
    }

    // SSRF protection: reject private/internal addresses
    if (!isAllowedUrl(url)) {
      return { verified: false, message: "URL rejected: private/internal addresses are not allowed" };
    }

    // Challenge passed — now verify we can actually reach ClawBot
    try {
      const resp = await axios.get(`${url}/api/ping`, {
        headers: { "X-API-Key": BOT_API_KEY },
        timeout: 5000,
      });
      if (resp.data?.pong !== true) {
        return { verified: false, message: "Ping verification failed — expected { pong: true }" };
      }
    } catch (err) {
      return { verified: false, message: `Cannot reach ClawBot at ${url}/api/ping — ensure the URL is accessible from the platform` };
    }

    // Verified!
    activeConnection = {
      url,
      verifiedAt: new Date().toISOString(),
      capabilities,
      lastPingAt: new Date().toISOString(),
    };
    pendingChallenge = null;
    directAvailable = true;
    lastDirectSuccess = Date.now();

    this.addLog({ level: "info", agent: "system", message: `Direct API verified: ${url} (capabilities: ${capabilities.join(', ')})` });

    return { verified: true, message: "Connection verified and active" };
  },

  // Disconnect
  disconnect(): { disconnected: boolean } {
    const wasActive = !!activeConnection;
    activeConnection = null;
    directAvailable = wsClients.size > 0; // Keep available if WS clients still connected
    this.addLog({ level: "info", agent: "system", message: "Direct API disconnected" });
    return { disconnected: wasActive };
  },

  // Poll endpoint — ClawBot calls this to pick up pending commands/tasks
  async pollPendingWork(): Promise<{ commands: any[]; tasks: any[] }> {
    const commands = storage.read("bot_commands").filter((c: any) => !c.dispatched);
    const tasks = (storage.read("bot_tasks") as BotTask[]).filter((t: any) => t.status === "queued");

    // Mark commands as dispatched
    commands.forEach((c: any) => storage.update("bot_commands", c.id, { dispatched: true, dispatchedAt: new Date().toISOString() }));

    // Note: polling is the fallback path — don't update direct connection ping time here

    return { commands, tasks };
  },

  // ---------------------------------------------------------------------------
  // WEBSOCKET / SSE SERVER (ClawBot connects outbound to us)
  // ---------------------------------------------------------------------------
  registerWsClient(ws: WebSocket): void {
    wsClients.add(ws);
    directAvailable = true;
    lastDirectSuccess = Date.now();
    this.addLog({ level: "info", agent: "system", message: `WebSocket client connected (total: ${wsClients.size})` });

    ws.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.type === "heartbeat") {
          this.processHeartbeat(msg.data || msg);
        } else if (msg.type === "log") {
          this.addLog(msg.data);
        } else if (msg.type === "task:update" && msg.taskId) {
          this.updateTask(msg.taskId, msg.data);
        } else if (msg.type === "pong") {
          if (activeConnection) activeConnection.lastPingAt = new Date().toISOString();
        }
      } catch {}
    });

    ws.on("close", () => {
      wsClients.delete(ws);
      if (wsClients.size === 0 && !activeConnection) {
        directAvailable = false;
      }
      this.addLog({ level: "info", agent: "system", message: `WebSocket client disconnected (remaining: ${wsClients.size})` });
    });

    ws.on("error", () => wsClients.delete(ws));

    // Send any pending work immediately on connect
    this.pollPendingWork().then(work => {
      if ((work.commands.length > 0 || work.tasks.length > 0) && ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: "work", ...work }));
      }
    });
  },

  registerSseClient(res: any): void {
    sseClients.add(res);
    this.addLog({ level: "info", agent: "system", message: `SSE client connected (total: ${sseClients.size})` });
    res.on("close", () => {
      sseClients.delete(res);
      this.addLog({ level: "info", agent: "system", message: `SSE client disconnected` });
    });
    // Send pending work immediately
    this.pollPendingWork().then(work => {
      if (work.commands.length > 0 || work.tasks.length > 0) {
        res.write(`data: ${JSON.stringify({ type: "work", ...work })}\n\n`);
      }
    });
  },

  // Push a message to all connected real-time clients
  pushToClients(payload: object): void {
    const msg = JSON.stringify(payload);
    Array.from(wsClients).forEach(ws => {
      try {
        if (ws.readyState === ws.OPEN) {
          ws.send(msg);
        }
      } catch {
        wsClients.delete(ws);
      }
    });
    Array.from(sseClients).forEach(res => {
      try { res.write(`data: ${msg}\n\n`); } catch {}
    });
  },

  getWsClientCount(): number {
    return wsClients.size;
  },

  getSseClientCount(): number {
    return sseClients.size;
  },

  // ---------------------------------------------------------------------------
  // CONNECTION INFO
  // ---------------------------------------------------------------------------
  getConnectionInfo() {
    return {
      directUrl: activeConnection?.url || BOT_DIRECT_URL,
      directAvailable,
      directVerified: !!activeConnection,
      lastDirectSuccess: lastDirectSuccess > 0 ? new Date(lastDirectSuccess).toISOString() : "never",
      activeConnection: activeConnection ? {
        url: activeConnection.url,
        verifiedAt: activeConnection.verifiedAt,
        capabilities: activeConnection.capabilities,
        lastPingAt: activeConnection.lastPingAt,
      } : null,
      slackFallback: true,
      slackChannel: SLACK_BOT_CHANNEL,
    };
  },

  // ---------------------------------------------------------------------------
  // METRICS
  // ---------------------------------------------------------------------------
  getMetrics() {
    const tasks = storage.read("bot_tasks") as BotTask[];
    const logs = storage.read("bot_logs") as BotLog[];
    const agents = storage.read("bot_agents") as BotAgent[];

    const now = Date.now();
    const last24h = now - 86400000;

    const recentTasks = tasks.filter((t: any) => new Date(t.createdAt).getTime() > last24h);
    const recentLogs = logs.filter((l: any) => new Date(l.timestamp).getTime() > last24h);
    const errorLogs = recentLogs.filter((l: any) => l.level === "error");

    return {
      totalTasks: tasks.length,
      tasksLast24h: recentTasks.length,
      completedLast24h: recentTasks.filter((t: any) => t.status === "completed").length,
      failedLast24h: recentTasks.filter((t: any) => t.status === "failed").length,
      queuedNow: tasks.filter((t: any) => t.status === "queued").length,
      runningNow: tasks.filter((t: any) => t.status === "running").length,
      totalLogs: logs.length,
      errorsLast24h: errorLogs.length,
      activeAgents: agents.filter((a: any) => a.status === "active").length,
      totalAgents: agents.length,
    };
  },
};

export default clawbot;
