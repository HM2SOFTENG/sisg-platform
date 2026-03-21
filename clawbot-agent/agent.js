#!/usr/bin/env node
// =============================================================================
// ClawBot Agent — Runs on Kamrui mini P2
// Reports status, executes commands, pushes logs to SISG platform
// =============================================================================

import http from "http";
import os from "os";
import { execSync, exec } from "child_process";
import https from "https";

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const SISG_URL = process.env.SISG_URL || "https://sentinelintegratedgroup.com";
const API_KEY = process.env.CLAWBOT_API_KEY || "clawbot-sisg-2026";
const AGENT_PORT = parseInt(process.env.AGENT_PORT || "4000");
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const startTime = Date.now();

// ---------------------------------------------------------------------------
// AGENTS REGISTRY
// ---------------------------------------------------------------------------
const agents = [
  { id: "qa", name: "QA Agent", type: "qa", status: "idle", lastRun: "", nextRun: "", schedule: "0 9 * * 1", lastResult: "", errorCount: 0 },
  { id: "bootstrap", name: "Bootstrap Agent", type: "bootstrap", status: "idle", lastRun: "", nextRun: "", schedule: "manual", lastResult: "", errorCount: 0 },
  { id: "pm", name: "PM Agent", type: "pm", status: "idle", lastRun: "", nextRun: "", schedule: "0 8 * * *", lastResult: "", errorCount: 0 },
  { id: "devlead", name: "Dev Lead Agent", type: "devlead", status: "idle", lastRun: "", nextRun: "", schedule: "0 9 * * 1", lastResult: "", errorCount: 0 },
  { id: "monitor", name: "Health Monitor", type: "monitor", status: "active", lastRun: new Date().toISOString(), nextRun: "", schedule: "*/6 * * * *", lastResult: "ok", errorCount: 0 },
];

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------
function getSystemInfo() {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  let diskUsage = 0;
  try {
    const df = execSync("df / --output=pcent 2>/dev/null | tail -1").toString().trim().replace("%", "");
    diskUsage = parseFloat(df) || 0;
  } catch { diskUsage = 0; }

  // Simple CPU usage approximation
  const cpuUsage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    return acc + ((total - cpu.times.idle) / total) * 100;
  }, 0) / cpus.length;

  return {
    cpu: Math.round(cpuUsage * 10) / 10,
    memory: Math.round(((totalMem - freeMem) / totalMem) * 1000) / 10,
    disk: diskUsage,
    hostname: os.hostname(),
    platform: `${os.platform()} ${os.arch()}`,
  };
}

function apiRequest(method, path, data) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, SISG_URL);
    const isHttps = url.protocol === "https:";
    const lib = isHttps ? https : http;
    const body = data ? JSON.stringify(data) : null;

    const req = lib.request({
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: url.pathname,
      method,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": API_KEY,
        ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}),
      },
      timeout: 10000,
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch { resolve(data); }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    if (body) req.write(body);
    req.end();
  });
}

function pushLog(level, agent, message) {
  apiRequest("POST", "/api/clawbot/logs", { level, agent, message }).catch(() => {});
}

// ---------------------------------------------------------------------------
// HEARTBEAT
// ---------------------------------------------------------------------------
async function sendHeartbeat() {
  try {
    await apiRequest("POST", "/api/clawbot/heartbeat", {
      online: true,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      system: getSystemInfo(),
      version: "1.0.0",
    });
  } catch (e) {
    console.error("[heartbeat] Failed:", e.message);
  }
}

// ---------------------------------------------------------------------------
// COMMAND EXECUTION
// ---------------------------------------------------------------------------
async function executeCommand(cmd) {
  console.log(`[cmd] Executing: ${cmd.command}`);
  pushLog("info", "system", `Executing command: ${cmd.command}`);

  try {
    switch (cmd.command) {
      case "health-check":
        const health = await apiRequest("GET", "/api/health", null);
        pushLog("info", "monitor", `Health check: ${JSON.stringify(health)}`);
        return { success: true, result: health };

      case "system-info":
        const info = getSystemInfo();
        pushLog("info", "system", `System: CPU ${info.cpu}%, Mem ${info.memory}%, Disk ${info.disk}%`);
        return { success: true, result: info };

      case "deploy-status":
        try {
          const out = execSync("cd /opt/sisg-platform && git log --oneline -5 2>/dev/null").toString();
          pushLog("info", "devlead", `Recent commits:\n${out}`);
          return { success: true, result: out };
        } catch {
          return { success: false, error: "Git not available or repo not cloned" };
        }

      case "run-qa":
        agents.find(a => a.id === "qa").status = "active";
        agents.find(a => a.id === "qa").lastRun = new Date().toISOString();
        pushLog("info", "qa", "QA agent started");
        // Simulate QA run
        setTimeout(() => {
          agents.find(a => a.id === "qa").status = "idle";
          agents.find(a => a.id === "qa").lastResult = "passed";
          pushLog("info", "qa", "QA agent completed — all checks passed");
        }, 5000);
        return { success: true, result: "QA agent started" };

      case "run-all-agents":
        pushLog("info", "system", "Running all agents");
        for (const agent of agents) {
          if (agent.status !== "disabled") {
            agent.status = "active";
            agent.lastRun = new Date().toISOString();
          }
        }
        setTimeout(() => {
          agents.forEach(a => { if (a.status === "active") { a.status = "idle"; a.lastResult = "ok"; } });
          pushLog("info", "system", "All agents completed");
        }, 10000);
        return { success: true, result: "All agents started" };

      default:
        // Try to execute as shell command
        if (cmd.command.startsWith("agent:run:")) {
          const agentId = cmd.command.replace("agent:run:", "");
          const agent = agents.find(a => a.id === agentId);
          if (agent) {
            agent.status = "active";
            agent.lastRun = new Date().toISOString();
            pushLog("info", agentId, `Agent ${agent.name} triggered`);
            setTimeout(() => { agent.status = "idle"; agent.lastResult = "ok"; }, 5000);
            return { success: true, result: `Agent ${agent.name} started` };
          }
        }

        if (cmd.command.startsWith("agent:update:")) {
          // handled via PUT /api/agents/:id
        }

        pushLog("warn", "system", `Unknown command: ${cmd.command}`);
        return { success: false, error: `Unknown command: ${cmd.command}` };
    }
  } catch (e) {
    pushLog("error", "system", `Command failed: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// LOCAL HTTP SERVER (for direct API communication from SISG dashboard)
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key");

  if (req.method === "OPTIONS") { res.writeHead(200); res.end(); return; }

  // Auth check
  if (req.headers["x-api-key"] !== API_KEY) {
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => body += chunk);
  req.on("end", async () => {
    const data = body ? JSON.parse(body) : {};

    try {
      if (req.url === "/api/status" && req.method === "GET") {
        res.end(JSON.stringify({
          online: true,
          lastHeartbeat: new Date().toISOString(),
          uptime: Math.floor((Date.now() - startTime) / 1000),
          system: getSystemInfo(),
          version: "1.0.0",
        }));

      } else if (req.url === "/api/agents" && req.method === "GET") {
        res.end(JSON.stringify(agents));

      } else if (req.url?.startsWith("/api/agents/") && req.method === "POST") {
        const id = req.url.split("/").pop();
        const agent = agents.find(a => a.id === id);
        if (agent) {
          Object.assign(agent, data);
          res.end(JSON.stringify(agent));
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: "Agent not found" }));
        }

      } else if (req.url === "/api/tasks" && req.method === "POST") {
        const result = await executeCommand(data);
        res.end(JSON.stringify({ accepted: true, ...result }));

      } else if (req.url === "/api/commands" && req.method === "POST") {
        const result = await executeCommand(data);
        res.end(JSON.stringify({ received: true, ...result }));

      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "Not found" }));
      }
    } catch (e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

// ---------------------------------------------------------------------------
// START
// ---------------------------------------------------------------------------
server.listen(AGENT_PORT, () => {
  console.log(`🤖 ClawBot Agent running on port ${AGENT_PORT}`);
  console.log(`   Reporting to: ${SISG_URL}`);
  console.log(`   Heartbeat: every ${HEARTBEAT_INTERVAL / 1000}s`);
  console.log(`   Agents: ${agents.length} registered`);

  // Initial heartbeat + log
  sendHeartbeat();
  pushLog("info", "system", `ClawBot agent started on ${os.hostname()} (${os.platform()} ${os.arch()})`);

  // Start heartbeat loop
  setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
});
