import axios from "axios";
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

// Track connection state
let lastDirectSuccess = 0;
let directAvailable = false;

async function tryDirect<T>(path: string, method: "get" | "post" = "get", data?: any): Promise<T | null> {
  try {
    const resp = await axios({
      method,
      url: `${BOT_DIRECT_URL}${path}`,
      data,
      headers: { "X-API-Key": BOT_API_KEY, "Content-Type": "application/json" },
      timeout: 5000,
    });
    lastDirectSuccess = Date.now();
    directAvailable = true;
    return resp.data;
  } catch {
    directAvailable = false;
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

    // Fallback: return last cached status
    const cached = storage.read("bot_status");
    if (cached.length > 0) {
      return { ...cached[0], online: false };
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

    // Try to dispatch directly
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
      return { sent: true, method: "slack" };
    } catch {
      this.addLog({ level: "error", agent: "system", message: `Failed to send command: ${cmd.command}` });
      return { sent: false, method: "slack" };
    }
  },

  // ---------------------------------------------------------------------------
  // CONNECTION INFO
  // ---------------------------------------------------------------------------
  getConnectionInfo() {
    return {
      directUrl: BOT_DIRECT_URL,
      directAvailable,
      lastDirectSuccess: lastDirectSuccess > 0 ? new Date(lastDirectSuccess).toISOString() : "never",
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
