import express, { Router, Request, Response } from "express";
import http from "http";
import https from "https";
import { adminAuth } from "../middleware/auth.js";

const router: Router = express.Router();

const GATEWAY_URL = process.env.CLAWBOT_URL || "https://claw.sentinelintegratedgroup.com";
const GATEWAY_API_KEY = process.env.CLAWBOT_API_KEY || "";

// =============================================================================
// HTTP KEEPALIVE AGENTS — reuse TCP connections instead of opening new ones
// Eliminates TLS handshake + TCP setup overhead on every request (~100-300ms saved)
// =============================================================================
const httpAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  maxFreeSockets: 5,
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 10,
  maxFreeSockets: 5,
});

function getAgent(): http.Agent | https.Agent {
  return GATEWAY_URL.startsWith("https") ? httpsAgent : httpAgent;
}

// =============================================================================
// RESPONSE CACHE — cache GET responses to avoid redundant round trips
// Health/status checks hit this hard; caching for 5-10s smooths it out
// =============================================================================
interface CacheEntry {
  data: any;
  expiresAt: number;
}

const responseCache = new Map<string, CacheEntry>();

function getCached(key: string): any | null {
  const entry = responseCache.get(key);
  if (entry && Date.now() < entry.expiresAt) return entry.data;
  if (entry) responseCache.delete(key);
  return null;
}

function setCache(key: string, data: any, ttlMs: number): void {
  responseCache.set(key, { data, expiresAt: Date.now() + ttlMs });
  // Prevent unbounded cache growth
  if (responseCache.size > 50) {
    const now = Date.now();
    for (const [k, v] of responseCache) {
      if (now >= v.expiresAt) responseCache.delete(k);
    }
  }
}

// Cache TTLs by endpoint type
const CACHE_TTL = {
  health: 10_000,   // 10s — health status rarely changes faster
  status: 8_000,    // 8s  — status is informational
  tasks: 3_000,     // 3s  — tasks update more frequently
  automations: 5_000, // 5s
};

// =============================================================================
// PROXY REQUEST — optimized with keepalive, timeouts, and abort controller
// =============================================================================
async function proxyRequest(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: any,
  queryParams?: Record<string, string>,
  options?: { timeoutMs?: number; cacheTtlMs?: number }
): Promise<any> {
  const timeoutMs = options?.timeoutMs || 15_000; // 15s default (was unlimited)

  // Check cache for GET requests
  if (method === "GET" && options?.cacheTtlMs) {
    const cacheKey = `${path}?${JSON.stringify(queryParams || {})}`;
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = new URL(`${GATEWAY_URL}${path}`);
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const fetchOptions: any = {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GATEWAY_API_KEY}`,
        "Connection": "keep-alive",
      },
      signal: controller.signal,
      // Node.js fetch supports custom agents for connection pooling
      agent: getAgent(),
    };

    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), fetchOptions);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gateway error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const contentType = response.headers.get("content-type");
    let result: any;
    if (contentType && contentType.includes("application/json")) {
      result = await response.json();
    } else {
      result = await response.text();
    }

    // Cache GET responses
    if (method === "GET" && options?.cacheTtlMs) {
      const cacheKey = `${path}?${JSON.stringify(queryParams || {})}`;
      setCache(cacheKey, result, options.cacheTtlMs);
    }

    return result;
  } catch (error: any) {
    if (error.name === "AbortError") {
      throw new Error(`Gateway request timed out after ${timeoutMs}ms: ${method} ${path}`);
    }
    throw new Error(`Failed to reach gateway at ${GATEWAY_URL}: ${error.message}`);
  } finally {
    clearTimeout(timeout);
  }
}

// =============================================================================
// GATEWAY PROXY ROUTES
// =============================================================================

// ---- EXECUTE ----
router.post("/api/admin/gateway/execute", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyRequest("POST", "/api/execute", req.body, undefined, {
      timeoutMs: 60_000, // execute can take longer
    });
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to execute on gateway" });
  }
});

// ---- CHAT ----
router.post("/api/admin/gateway/chat", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyRequest("POST", "/api/chat", req.body, undefined, {
      timeoutMs: 120_000, // chat/LLM responses can be slow
    });
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to chat with gateway" });
  }
});

// ---- AGENTS RUN ----
router.post("/api/admin/gateway/agents/run", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyRequest("POST", "/api/agents/run", req.body, undefined, {
      timeoutMs: 60_000,
    });
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to run agent on gateway" });
  }
});

// ---- AGENTS RUN SYNC ----
router.post("/api/admin/gateway/agents/run/sync", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyRequest("POST", "/api/agents/run/sync", req.body, undefined, {
      timeoutMs: 180_000, // sync runs can take a while
    });
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to run sync agent on gateway" });
  }
});

// ---- HEALTH (cached 10s) ----
router.get("/api/admin/gateway/health", adminAuth, async (_req: Request, res: Response) => {
  try {
    const result = await proxyRequest("GET", "/health", undefined, undefined, {
      timeoutMs: 5_000,
      cacheTtlMs: CACHE_TTL.health,
    });
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Gateway health check failed" });
  }
});

// ---- STATUS (cached 8s) ----
router.get("/api/admin/gateway/status", adminAuth, async (_req: Request, res: Response) => {
  try {
    const result = await proxyRequest("GET", "/status", undefined, undefined, {
      timeoutMs: 8_000,
      cacheTtlMs: CACHE_TTL.status,
    });
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to fetch gateway status" });
  }
});

// ---- TASKS (cached 3s) ----
router.get("/api/admin/gateway/tasks", adminAuth, async (req: Request, res: Response) => {
  try {
    const queryParams: Record<string, string> = {};
    if (req.query.status) queryParams.status = req.query.status as string;
    if (req.query.limit) queryParams.limit = req.query.limit as string;
    if (req.query.offset) queryParams.offset = req.query.offset as string;

    const result = await proxyRequest("GET", "/api/tasks", undefined, queryParams, {
      timeoutMs: 10_000,
      cacheTtlMs: CACHE_TTL.tasks,
    });
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to fetch tasks from gateway" });
  }
});

router.get("/api/admin/gateway/tasks/:id", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyRequest("GET", `/api/tasks/${req.params.id}`, undefined, undefined, {
      timeoutMs: 10_000,
    });
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to fetch task from gateway" });
  }
});

// ---- AUTOMATIONS (cached 5s) ----
router.get("/api/admin/gateway/automations", adminAuth, async (req: Request, res: Response) => {
  try {
    const queryParams: Record<string, string> = {};
    if (req.query.status) queryParams.status = req.query.status as string;
    if (req.query.limit) queryParams.limit = req.query.limit as string;
    if (req.query.offset) queryParams.offset = req.query.offset as string;

    const result = await proxyRequest("GET", "/api/automations", undefined, queryParams, {
      timeoutMs: 10_000,
      cacheTtlMs: CACHE_TTL.automations,
    });
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to fetch automations from gateway" });
  }
});

router.post("/api/admin/gateway/automations", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyRequest("POST", "/api/automations", req.body, undefined, {
      timeoutMs: 15_000,
    });
    res.status(201).json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to create automation on gateway" });
  }
});

router.patch("/api/admin/gateway/automations/:name", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyRequest("PATCH", `/api/automations/${req.params.name}`, req.body, undefined, {
      timeoutMs: 15_000,
    });
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to update automation on gateway" });
  }
});

router.delete("/api/admin/gateway/automations/:name", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyRequest("DELETE", `/api/automations/${req.params.name}`, undefined, undefined, {
      timeoutMs: 15_000,
    });
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to delete automation from gateway" });
  }
});

export default router;
