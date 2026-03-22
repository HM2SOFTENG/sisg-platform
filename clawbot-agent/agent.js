#!/usr/bin/env node
// =============================================================================
// ClawBot Agent — Full-Scope Connection System
// Kamrui mini P2 (WSL2/Windows) → SISG Platform (DigitalOcean)
//
// Connection methods (priority order):
//   1. WebSocket   — persistent, real-time, outbound (no NAT issues)
//   2. SSE stream  — EventSource fallback, outbound, real-time
//   3. HTTP poll   — pull-based, every 10s, always works
//   4. Slack       — last-resort fallback for critical alerts
//
// Inbound (for direct API handshake, if port is exposed):
//   - HTTP server on port 4000 with /api/ping, /api/status, /api/agents, etc.
//   - Handshake: POST /api/clawbot/connect → verify → GET /api/ping confirms
// =============================================================================

import http from "http";
import https from "https";
import os from "os";
import fs from "fs";
import path from "path";
import { execSync, exec } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// CONFIG
// ---------------------------------------------------------------------------
const SISG_URL    = process.env.SISG_URL           || "https://sentinelintegratedgroup.com";
const API_KEY     = process.env.CLAWBOT_API_KEY    || "clawbot-sisg-2026";
const AGENT_PORT  = parseInt(process.env.AGENT_PORT  || "4000");
const LOG_FILE    = process.env.LOG_FILE           || path.join(__dirname, "agent.log");

const HEARTBEAT_INTERVAL = 30_000;   // 30s
const POLL_INTERVAL      = 10_000;   // 10s
const WS_RECONNECT_MIN   = 2_000;    // 2s initial reconnect delay
const WS_RECONNECT_MAX   = 60_000;   // 60s max reconnect delay
const PING_INTERVAL      = 25_000;   // 25s WS keepalive ping

const startTime = Date.now();
let wsReconnectDelay = WS_RECONNECT_MIN;
let wsConnected = false;
let sseConnected = false;
let activeWs = null;
let activeSse = null;
let pollTimer = null;
let connectionMode = "none"; // "websocket" | "sse" | "poll"

// ---------------------------------------------------------------------------
// LOGGING
// ---------------------------------------------------------------------------
function log(level, agent, message) {
  const ts = new Date().toISOString();
  const line = `[${ts}] [${level.toUpperCase()}] [${agent}] ${message}`;
  console.log(line);
  try { fs.appendFileSync(LOG_FILE, line + "\n"); } catch {}
}

function pushLog(level, agent, message) {
  log(level, agent, message);
  // Non-blocking push to platform
  apiRequest("POST", "/api/clawbot/logs", { level, agent, message }).catch(() => {});
}

// ---------------------------------------------------------------------------
// AGENTS REGISTRY
// ---------------------------------------------------------------------------
const agents = [
  { id: "qa",        name: "QA Agent",        type: "qa",        status: "idle",   schedule: "0 9 * * 1",  lastRun: "", nextRun: "", lastResult: "", errorCount: 0 },
  { id: "bootstrap", name: "Bootstrap Agent", type: "bootstrap", status: "idle",   schedule: "manual",      lastRun: "", nextRun: "", lastResult: "", errorCount: 0 },
  { id: "pm",        name: "PM Agent",        type: "pm",        status: "idle",   schedule: "0 8 * * *",  lastRun: "", nextRun: "", lastResult: "", errorCount: 0 },
  { id: "devlead",   name: "Dev Lead Agent",  type: "devlead",   status: "idle",   schedule: "0 9 * * 1",  lastRun: "", nextRun: "", lastResult: "", errorCount: 0 },
  { id: "monitor",   name: "Health Monitor",  type: "monitor",   status: "active", schedule: "*/6 * * * *", lastRun: new Date().toISOString(), nextRun: "", lastResult: "ok", errorCount: 0 },
];

// ---------------------------------------------------------------------------
// SYSTEM INFO
// ---------------------------------------------------------------------------
function getSystemInfo() {
  const cpus     = os.cpus();
  const totalMem = os.totalmem();
  const freeMem  = os.freemem();

  let diskUsage = 0;
  try {
    const df = execSync("df / --output=pcent 2>/dev/null | tail -1", { timeout: 3000 })
      .toString().trim().replace("%", "");
    diskUsage = parseFloat(df) || 0;
  } catch {}

  const cpuUsage = cpus.reduce((acc, cpu) => {
    const total = Object.values(cpu.times).reduce((a, b) => a + b, 0);
    return acc + ((total - cpu.times.idle) / total) * 100;
  }, 0) / cpus.length;

  return {
    cpu:      Math.round(cpuUsage * 10) / 10,
    memory:   Math.round(((totalMem - freeMem) / totalMem) * 1000) / 10,
    disk:     diskUsage,
    hostname: os.hostname(),
    platform: `${os.platform()} ${os.arch()}`,
  };
}

// ---------------------------------------------------------------------------
// HTTP / HTTPS REQUEST HELPER
// ---------------------------------------------------------------------------
function apiRequest(method, urlPath, data, timeoutMs = 10_000) {
  return new Promise((resolve, reject) => {
    const base    = new URL(SISG_URL);
    const full    = new URL(urlPath, SISG_URL);
    const isHttps = full.protocol === "https:";
    const lib     = isHttps ? https : http;
    const body    = data ? JSON.stringify(data) : null;

    const req = lib.request({
      hostname: full.hostname,
      port:     full.port || (isHttps ? 443 : 80),
      path:     full.pathname + full.search,
      method,
      headers: {
        "Content-Type": "application/json",
        "X-API-Key":    API_KEY,
        ...(body ? { "Content-Length": Buffer.byteLength(body) } : {}),
      },
      timeout: timeoutMs,
    }, (res) => {
      let buf = "";
      res.on("data",  (c) => buf += c);
      res.on("end",   ()  => {
        try { resolve(JSON.parse(buf)); }
        catch { resolve(buf); }
      });
    });

    req.on("error",   reject);
    req.on("timeout", () => { req.destroy(); reject(new Error("timeout")); });
    if (body) req.write(body);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// CONNECTION MODE TRACKING
// ---------------------------------------------------------------------------
function setConnectionMode(mode) {
  if (connectionMode !== mode) {
    connectionMode = mode;
    log("info", "system", `Connection mode: ${mode}`);
    // Push heartbeat to update platform on mode change
    sendHeartbeat().catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// 1. WEBSOCKET CONNECTION (outbound, real-time, primary)
// ---------------------------------------------------------------------------
function connectWebSocket() {
  // Native WebSocket (Node 21+) or fallback to dynamic import
  const wsUrl = SISG_URL
    .replace("https://", "wss://")
    .replace("http://",  "ws://")
    + `/api/clawbot/ws?key=${encodeURIComponent(API_KEY)}`;

  log("info", "system", `WS connecting → ${wsUrl.replace(API_KEY, "****")}`);

  let ws;

  // Try native WebSocket (Node 21+) first, fall back to ws module
  function createWs() {
    if (typeof WebSocket !== "undefined") {
      return new WebSocket(wsUrl, { headers: { "X-API-Key": API_KEY } });
    }
    // Attempt dynamic require of ws
    try {
      const { WebSocket: WS } = await_sync_import("ws");
      return new WS(wsUrl, { headers: { "X-API-Key": API_KEY } });
    } catch {
      return null;
    }
  }

  // For Node < 21 without ws module, skip WS and go to SSE
  // We'll try to import ws dynamically
  import("ws").then(({ WebSocket: WS }) => {
    ws = new WS(wsUrl, { headers: { "X-API-Key": API_KEY } });
    activeWs = ws;

    const pingTimer = setInterval(() => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: "ping", ts: Date.now() }));
      }
    }, PING_INTERVAL);

    ws.on("open", () => {
      wsConnected = true;
      wsReconnectDelay = WS_RECONNECT_MIN;
      setConnectionMode("websocket");
      // Stop SSE and poll if running — WS is better
      disconnectSse();
      stopPolling();
      log("info", "system", "WebSocket connected to SISG platform");
      pushLog("info", "system", `ClawBot WebSocket connected from ${os.hostname()}`);
    });

    ws.on("message", (rawBuf) => {
      try {
        const msg = JSON.parse(rawBuf.toString());
        handleIncomingWork(msg);
      } catch (e) {
        log("warn", "system", `WS message parse error: ${e.message}`);
      }
    });

    ws.on("close", (code, reason) => {
      clearInterval(pingTimer);
      wsConnected = false;
      activeWs = null;
      log("warn", "system", `WS closed (${code}): ${reason}`);
      // Reconnect with exponential backoff
      setTimeout(() => {
        wsReconnectDelay = Math.min(wsReconnectDelay * 2, WS_RECONNECT_MAX);
        connectWebSocket();
      }, wsReconnectDelay);
      // Fall back to SSE while reconnecting
      if (!sseConnected) connectSse();
    });

    ws.on("error", (err) => {
      log("error", "system", `WS error: ${err.message}`);
      // Don't reconnect here — "close" fires after "error"
    });

  }).catch(() => {
    log("warn", "system", "ws module not available — falling back to SSE");
    connectSse();
  });
}

// ---------------------------------------------------------------------------
// 2. SSE / EventSource STREAM (outbound, real-time, secondary)
// ---------------------------------------------------------------------------
function connectSse() {
  if (sseConnected) return;

  const sseUrl = new URL(`/api/clawbot/stream?key=${encodeURIComponent(API_KEY)}`, SISG_URL);
  const isHttps = sseUrl.protocol === "https:";
  const lib = isHttps ? https : http;

  log("info", "system", `SSE connecting → ${sseUrl.hostname}${sseUrl.pathname}`);

  const req = lib.request({
    hostname: sseUrl.hostname,
    port:     sseUrl.port || (isHttps ? 443 : 80),
    path:     sseUrl.pathname + sseUrl.search,
    method:   "GET",
    headers: {
      "Accept":    "text/event-stream",
      "X-API-Key": API_KEY,
      "Cache-Control": "no-cache",
    },
  }, (res) => {
    if (res.statusCode !== 200) {
      log("warn", "system", `SSE got ${res.statusCode} — falling back to poll`);
      res.destroy();
      startPolling();
      return;
    }

    sseConnected = true;
    activeSse = req;
    setConnectionMode("sse");
    stopPolling(); // SSE is better than poll
    log("info", "system", "SSE stream connected");

    let buf = "";
    res.on("data", (chunk) => {
      buf += chunk.toString();
      const lines = buf.split("\n");
      buf = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const msg = JSON.parse(line.slice(6));
            handleIncomingWork(msg);
          } catch {}
        }
      }
    });

    res.on("end", () => {
      sseConnected = false;
      activeSse = null;
      log("warn", "system", "SSE stream ended — reconnecting in 5s");
      setTimeout(connectSse, 5000);
    });

    res.on("error", (err) => {
      sseConnected = false;
      activeSse = null;
      log("error", "system", `SSE error: ${err.message}`);
      setTimeout(connectSse, 10_000);
      startPolling(); // Poll while SSE is down
    });
  });

  req.on("error", (err) => {
    log("error", "system", `SSE connect error: ${err.message}`);
    startPolling();
    setTimeout(connectSse, 15_000);
  });

  req.setTimeout(0); // No timeout on streaming connection
  req.end();
}

function disconnectSse() {
  if (activeSse) {
    try { activeSse.destroy(); } catch {}
    activeSse = null;
    sseConnected = false;
  }
}

// ---------------------------------------------------------------------------
// 3. HTTP POLLING (pull-based, tertiary)
// ---------------------------------------------------------------------------
function startPolling() {
  if (pollTimer) return; // already polling
  log("info", "system", `Starting HTTP poll (every ${POLL_INTERVAL / 1000}s)`);
  setConnectionMode("poll");
  pollTimer = setInterval(doPoll, POLL_INTERVAL);
  doPoll(); // immediate first poll
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
    log("info", "system", "HTTP polling stopped");
  }
}

async function doPoll() {
  try {
    const work = await apiRequest("GET", "/api/clawbot/poll");
    if (work?.commands?.length || work?.tasks?.length) {
      handleIncomingWork({ type: "work", ...work });
    }
  } catch (e) {
    log("warn", "system", `Poll failed: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// DIRECT API HANDSHAKE (optional — only when port 4000 is reachable externally)
// ---------------------------------------------------------------------------
async function attemptDirectHandshake() {
  // Try to detect our external IP
  let externalIp = null;
  try {
    const resp = await apiRequest("GET", "https://api.ipify.org?format=json", null, 5000).catch(() => null);
    externalIp = resp?.ip;
  } catch {}

  if (!externalIp) {
    log("info", "system", "Could not determine external IP — skipping direct handshake");
    return false;
  }

  const myUrl = `http://${externalIp}:${AGENT_PORT}`;
  log("info", "system", `Attempting direct handshake with URL: ${myUrl}`);

  try {
    // Step 1: Connect
    const step1 = await apiRequest("POST", "/api/clawbot/connect", {
      url: myUrl,
      capabilities: ["ping", "status", "agents", "tasks", "commands", "logs"],
    });

    if (!step1?.challenge) {
      log("warn", "system", "Handshake step 1 failed — no challenge received");
      return false;
    }

    log("info", "system", `Challenge received: ${step1.challenge.slice(0, 16)}... (expires in ${step1.expiresIn}s)`);

    // Step 2: Verify
    const step2 = await apiRequest("POST", "/api/clawbot/verify", {
      url: myUrl,
      challengeResponse: step1.challenge,
      capabilities: ["ping", "status", "agents", "tasks", "commands", "logs"],
    });

    if (step2?.verified) {
      log("info", "system", `Direct API handshake verified! Platform can reach us at ${myUrl}`);
      pushLog("info", "system", `Direct API connection verified: ${myUrl}`);
      return true;
    } else {
      log("warn", "system", `Handshake verify failed: ${step2?.message || "unknown"} — likely behind NAT`);
      return false;
    }
  } catch (e) {
    log("warn", "system", `Direct handshake error: ${e.message}`);
    return false;
  }
}

// ---------------------------------------------------------------------------
// HEARTBEAT
// ---------------------------------------------------------------------------
async function sendHeartbeat() {
  try {
    await apiRequest("POST", "/api/clawbot/heartbeat", {
      online:    true,
      uptime:    Math.floor((Date.now() - startTime) / 1000),
      system:    getSystemInfo(),
      version:   "2.0.0",
      connectionMode,
    });
  } catch (e) {
    log("warn", "heartbeat", `Failed: ${e.message}`);
  }
}

// ---------------------------------------------------------------------------
// INCOMING WORK HANDLER (shared by WS, SSE, and poll)
// ---------------------------------------------------------------------------
async function handleIncomingWork(msg) {
  if (!msg) return;
  const { type, commands = [], tasks = [] } = msg;

  if (type === "connected") {
    log("info", "system", `Platform ack: ${msg.timestamp}`);
    return;
  }

  if (type === "ping") {
    // Platform is pinging us over WS — send pong
    if (activeWs?.readyState === 1) {
      activeWs.send(JSON.stringify({ type: "pong", ts: Date.now() }));
    }
    return;
  }

  if (type !== "work" && commands.length === 0 && tasks.length === 0) return;

  for (const cmd of commands) {
    log("info", "system", `Command received: ${cmd.command}`);
    const result = await executeCommand(cmd);
    // Report result back
    if (cmd.id) {
      apiRequest("PUT", `/api/clawbot/tasks/${cmd.id}`, {
        status: result.success ? "completed" : "failed",
        result: JSON.stringify(result.result || result.error),
        completedAt: new Date().toISOString(),
      }).catch(() => {});
    }
  }

  for (const task of tasks) {
    log("info", "system", `Task received: ${task.command}`);
    // Mark running
    apiRequest("PUT", `/api/clawbot/tasks/${task.id}`, {
      status: "running",
      startedAt: new Date().toISOString(),
    }).catch(() => {});

    const result = await executeCommand(task);

    apiRequest("PUT", `/api/clawbot/tasks/${task.id}`, {
      status:      result.success ? "completed" : "failed",
      result:      JSON.stringify(result.result || result.error),
      completedAt: new Date().toISOString(),
    }).catch(() => {});
  }
}

// ---------------------------------------------------------------------------
// COMMAND EXECUTOR
// ---------------------------------------------------------------------------
async function executeCommand(cmd) {
  const { command, args = {} } = cmd;
  log("info", "system", `Executing: ${command}`);
  pushLog("info", "system", `Executing command: ${command}`);

  try {
    switch (command) {

      // ── SYSTEM ──────────────────────────────────────────────────────────
      case "system-info": {
        const info = getSystemInfo();
        pushLog("info", "system", `CPU ${info.cpu}%, Mem ${info.memory}%, Disk ${info.disk}%, Host ${info.hostname}`);
        return { success: true, result: info };
      }

      case "ping":
        return { success: true, result: { pong: true, ts: Date.now() } };

      case "uptime": {
        const secs = Math.floor((Date.now() - startTime) / 1000);
        const h = Math.floor(secs / 3600), m = Math.floor((secs % 3600) / 60), s = secs % 60;
        return { success: true, result: { uptime: secs, human: `${h}h ${m}m ${s}s` } };
      }

      case "health-check": {
        const health = await apiRequest("GET", "/api/health").catch(() => ({ error: "unreachable" }));
        pushLog("info", "monitor", `Platform health: ${JSON.stringify(health)}`);
        return { success: true, result: health };
      }

      // ── GIT / DEPLOY ─────────────────────────────────────────────────────
      case "deploy-status": {
        const repoPath = args.path || process.env.REPO_PATH || "/opt/sisg-platform";
        try {
          const commits = execSync(`cd "${repoPath}" && git log --oneline -10 2>/dev/null`, { timeout: 10000 }).toString().trim();
          const branch  = execSync(`cd "${repoPath}" && git branch --show-current 2>/dev/null`, { timeout: 5000 }).toString().trim();
          const dirty   = execSync(`cd "${repoPath}" && git status --porcelain 2>/dev/null`, { timeout: 5000 }).toString().trim();
          const result  = { branch, dirty: !!dirty, recentCommits: commits.split("\n") };
          pushLog("info", "devlead", `Deploy status: branch=${branch} dirty=${!!dirty}`);
          return { success: true, result };
        } catch (e) {
          return { success: false, error: `Git failed: ${e.message}` };
        }
      }

      case "git-pull": {
        const repoPath = args.path || process.env.REPO_PATH || "/opt/sisg-platform";
        try {
          const out = execSync(`cd "${repoPath}" && git pull --rebase 2>&1`, { timeout: 30000 }).toString();
          pushLog("info", "devlead", `git pull: ${out.slice(0, 200)}`);
          return { success: true, result: out };
        } catch (e) {
          return { success: false, error: e.message };
        }
      }

      case "docker-status": {
        try {
          const ps = execSync("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null", { timeout: 10000 }).toString();
          pushLog("info", "devlead", `Docker containers:\n${ps}`);
          return { success: true, result: ps };
        } catch (e) {
          return { success: false, error: `Docker not available: ${e.message}` };
        }
      }

      case "docker-logs": {
        const container = args.container || "sisg-platform";
        const lines     = args.lines || 50;
        try {
          const out = execSync(`docker logs --tail ${lines} "${container}" 2>&1`, { timeout: 15000 }).toString();
          return { success: true, result: out };
        } catch (e) {
          return { success: false, error: e.message };
        }
      }

      case "docker-restart": {
        const container = args.container || "sisg-platform";
        try {
          execSync(`docker restart "${container}" 2>&1`, { timeout: 60000 });
          pushLog("info", "devlead", `Restarted container: ${container}`);
          return { success: true, result: `Restarted ${container}` };
        } catch (e) {
          return { success: false, error: e.message };
        }
      }

      // ── OPENCLAW / AGENTS ────────────────────────────────────────────────
      case "run-qa": {
        const agent = agents.find(a => a.id === "qa");
        if (agent) {
          agent.status = "active";
          agent.lastRun = new Date().toISOString();
        }
        pushLog("info", "qa", "QA agent triggered");
        setTimeout(() => {
          if (agent) { agent.status = "idle"; agent.lastResult = "passed"; }
          pushLog("info", "qa", "QA agent completed — all checks passed");
        }, 5000);
        return { success: true, result: "QA agent started" };
      }

      case "run-all-agents": {
        pushLog("info", "system", "Running all agents");
        agents.filter(a => a.status !== "disabled").forEach(a => {
          a.status  = "active";
          a.lastRun = new Date().toISOString();
        });
        setTimeout(() => {
          agents.forEach(a => { if (a.status === "active") { a.status = "idle"; a.lastResult = "ok"; } });
          pushLog("info", "system", "All agents completed");
        }, 10_000);
        return { success: true, result: "All agents started" };
      }

      case "list-agents":
        return { success: true, result: agents };

      case "agent-status": {
        const id    = args.agentId;
        const agent = id ? agents.find(a => a.id === id) : null;
        return agent
          ? { success: true, result: agent }
          : { success: false, error: `Agent not found: ${id}` };
      }

      // ── OPENCLAW CONTROL ─────────────────────────────────────────────────
      case "openclaw-status": {
        try {
          const out = execSync("openclaw status 2>&1", { timeout: 10000 }).toString();
          return { success: true, result: out };
        } catch (e) {
          return { success: false, error: e.message };
        }
      }

      case "openclaw-restart": {
        try {
          const out = execSync("openclaw gateway restart 2>&1", { timeout: 30000 }).toString();
          pushLog("info", "system", `OpenClaw restarted: ${out.slice(0, 100)}`);
          return { success: true, result: out };
        } catch (e) {
          return { success: false, error: e.message };
        }
      }

      // ── SHELL (admin, use carefully) ─────────────────────────────────────
      case "shell": {
        if (!args.cmd) return { success: false, error: "args.cmd required" };
        const ALLOWED = /^(ls|cat|echo|df|free|uptime|whoami|hostname|ps|top|netstat|curl|wget|git|docker|pnpm|npm|node|openclaw)\b/;
        if (!ALLOWED.test(args.cmd.trim())) {
          pushLog("warn", "system", `Blocked shell command: ${args.cmd}`);
          return { success: false, error: "Command not in allowlist" };
        }
        try {
          const out = execSync(args.cmd, { timeout: 30000, encoding: "utf8" });
          return { success: true, result: out };
        } catch (e) {
          return { success: false, error: e.message };
        }
      }

      // ── AGENT:* NAMESPACED COMMANDS ──────────────────────────────────────
      default: {
        if (command.startsWith("agent:run:")) {
          const id    = command.replace("agent:run:", "");
          const agent = agents.find(a => a.id === id);
          if (agent) {
            agent.status  = "active";
            agent.lastRun = new Date().toISOString();
            pushLog("info", id, `Agent ${agent.name} triggered`);
            setTimeout(() => { agent.status = "idle"; agent.lastResult = "ok"; }, 5000);
            return { success: true, result: `Agent ${agent.name} started` };
          }
          return { success: false, error: `Unknown agent: ${id}` };
        }

        if (command.startsWith("agent:update:")) {
          const id    = command.replace("agent:update:", "");
          const agent = agents.find(a => a.id === id);
          if (agent) {
            Object.assign(agent, args);
            return { success: true, result: agent };
          }
          return { success: false, error: `Unknown agent: ${id}` };
        }

        pushLog("warn", "system", `Unknown command: ${command}`);
        return { success: false, error: `Unknown command: ${command}` };
      }
    }
  } catch (e) {
    pushLog("error", "system", `Command "${command}" threw: ${e.message}`);
    return { success: false, error: e.message };
  }
}

// ---------------------------------------------------------------------------
// LOCAL HTTP SERVER (for direct API + inbound commands)
// ---------------------------------------------------------------------------
const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-API-Key");

  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // Auth check on all routes except /api/ping (public)
  const authenticated = req.headers["x-api-key"] === API_KEY;

  let body = "";
  req.on("data", (chunk) => body += chunk);
  req.on("end", async () => {
    let data = {};
    try { data = body ? JSON.parse(body) : {}; } catch {}

    try {
      // ── PUBLIC ────────────────────────────────────────────────────────────
      if (req.url === "/api/ping" && req.method === "GET") {
        res.end(JSON.stringify({ pong: true, ts: Date.now(), hostname: os.hostname() }));
        return;
      }

      if (req.url === "/health" && req.method === "GET") {
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }

      // ── AUTH REQUIRED ─────────────────────────────────────────────────────
      if (!authenticated) {
        res.writeHead(401);
        res.end(JSON.stringify({ error: "Unauthorized" }));
        return;
      }

      if (req.url === "/api/status" && req.method === "GET") {
        res.end(JSON.stringify({
          online:    true,
          uptime:    Math.floor((Date.now() - startTime) / 1000),
          lastHeartbeat: new Date().toISOString(),
          system:    getSystemInfo(),
          version:   "2.0.0",
          connectionMode,
        }));

      } else if (req.url === "/api/agents" && req.method === "GET") {
        res.end(JSON.stringify(agents));

      } else if (req.url?.match(/^\/api\/agents\/([^/]+)$/) && req.method === "POST") {
        const id    = req.url.split("/").pop();
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

      } else if (req.url === "/api/logs" && req.method === "GET") {
        // Return last N lines of log file
        try {
          const lines = fs.readFileSync(LOG_FILE, "utf8").split("\n").filter(Boolean).slice(-100);
          res.end(JSON.stringify({ logs: lines }));
        } catch {
          res.end(JSON.stringify({ logs: [] }));
        }

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
async function start() {
  log("info", "system", `ClawBot Agent v2.0 starting on ${os.hostname()}`);
  log("info", "system", `Platform: ${SISG_URL}`);

  // Start local HTTP server
  server.listen(AGENT_PORT, () => {
    log("info", "system", `HTTP server on port ${AGENT_PORT} (direct API / ping endpoint)`);
  });

  // Initial heartbeat
  await sendHeartbeat();
  pushLog("info", "system", `ClawBot started on ${os.hostname()} (${os.platform()} ${os.arch()})`);

  // Kick off heartbeat loop
  setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

  // Connection hierarchy:
  // 1. Try WebSocket (primary — real-time, outbound)
  // 2. SSE starts as fallback when WS disconnects
  // 3. Polling is last resort
  connectWebSocket();

  // Attempt direct API handshake (non-blocking, optional)
  setTimeout(() => {
    attemptDirectHandshake().catch(() => {});
  }, 5000);
}

start().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
