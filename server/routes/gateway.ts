import express, { Router, Request, Response } from "express";
import { adminAuth } from "../middleware/auth.js";

const router: Router = express.Router();

const GATEWAY_URL = process.env.CLAWBOT_URL || "https://claw.sentinelintegratedgroup.com";
const GATEWAY_API_KEY = process.env.CLAWBOT_API_KEY || "";

// =============================================================================
// GATEWAY PROXY ROUTES
// =============================================================================

// Helper function to proxy requests to the gateway
async function proxyRequest(
  method: "GET" | "POST" | "PATCH" | "DELETE",
  path: string,
  body?: any,
  queryParams?: Record<string, string>
): Promise<any> {
  try {
    const url = new URL(`${GATEWAY_URL}${path}`);
    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const options: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GATEWAY_API_KEY}`,
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gateway error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    }
    return await response.text();
  } catch (error: any) {
    throw new Error(`Failed to reach gateway at ${GATEWAY_URL}: ${error.message}`);
  }
}

// ---- EXECUTE ----
router.post("/api/admin/gateway/execute", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyRequest("POST", "/api/execute", req.body);
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to execute on gateway" });
  }
});

// ---- CHAT ----
router.post("/api/admin/gateway/chat", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyRequest("POST", "/api/chat", req.body);
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to chat with gateway" });
  }
});

// ---- AGENTS RUN ----
router.post("/api/admin/gateway/agents/run", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyRequest("POST", "/api/agents/run", req.body);
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to run agent on gateway" });
  }
});

// ---- AGENTS RUN SYNC ----
router.post("/api/admin/gateway/agents/run/sync", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyRequest("POST", "/api/agents/run/sync", req.body);
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to run sync agent on gateway" });
  }
});

// ---- HEALTH ----
router.get("/api/admin/gateway/health", adminAuth, async (_req: Request, res: Response) => {
  try {
    const result = await proxyRequest("GET", "/health");
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Gateway health check failed" });
  }
});

// ---- STATUS ----
router.get("/api/admin/gateway/status", adminAuth, async (_req: Request, res: Response) => {
  try {
    const result = await proxyRequest("GET", "/status");
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to fetch gateway status" });
  }
});

// ---- TASKS ----
router.get("/api/admin/gateway/tasks", adminAuth, async (req: Request, res: Response) => {
  try {
    const queryParams: Record<string, string> = {};
    if (req.query.status) queryParams.status = req.query.status as string;
    if (req.query.limit) queryParams.limit = req.query.limit as string;
    if (req.query.offset) queryParams.offset = req.query.offset as string;

    const result = await proxyRequest("GET", "/api/tasks", undefined, queryParams);
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to fetch tasks from gateway" });
  }
});

router.get("/api/admin/gateway/tasks/:id", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyRequest("GET", `/api/tasks/${req.params.id}`);
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to fetch task from gateway" });
  }
});

// ---- AUTOMATIONS ----
router.get("/api/admin/gateway/automations", adminAuth, async (req: Request, res: Response) => {
  try {
    const queryParams: Record<string, string> = {};
    if (req.query.status) queryParams.status = req.query.status as string;
    if (req.query.limit) queryParams.limit = req.query.limit as string;
    if (req.query.offset) queryParams.offset = req.query.offset as string;

    const result = await proxyRequest("GET", "/api/automations", undefined, queryParams);
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to fetch automations from gateway" });
  }
});

router.post("/api/admin/gateway/automations", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyRequest("POST", "/api/automations", req.body);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to create automation on gateway" });
  }
});

router.patch("/api/admin/gateway/automations/:name", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyRequest("PATCH", `/api/automations/${req.params.name}`, req.body);
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to update automation on gateway" });
  }
});

router.delete("/api/admin/gateway/automations/:name", adminAuth, async (req: Request, res: Response) => {
  try {
    const result = await proxyRequest("DELETE", `/api/automations/${req.params.name}`);
    res.json(result);
  } catch (error: any) {
    res.status(503).json({ error: error.message || "Failed to delete automation from gateway" });
  }
});

export default router;
