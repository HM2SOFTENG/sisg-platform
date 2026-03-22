import { Router, Request, Response } from "express";
import { openclaw } from "../services/openclaw";
import { taskQueue } from "../services/taskQueue";
import { automationManager } from "../services/automation";
import { HealthResponse, StatusResponse } from "../types";

// ============================================================================
// Health & Status Routes
// ============================================================================

const router = Router();
const startTime = Date.now();
const VERSION = process.env.npm_package_version || "1.0.0";

/**
 * GET /health — Lightweight health check (no auth required).
 */
router.get("/health", (_req: Request, res: Response) => {
  const ocStatus = openclaw.getStatus();
  const taskStats = taskQueue.getStats();

  const health: HealthResponse = {
    status: ocStatus.connected ? "ok" : "degraded",
    service: "sisg-gateway",
    version: VERSION,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    openclawConnected: ocStatus.connected,
    activeTasks: taskStats.active,
    timestamp: new Date().toISOString(),
  };

  res.json(health);
});

/**
 * GET /status — Detailed status (requires auth).
 */
router.get("/status", (_req: Request, res: Response) => {
  const ocStatus = openclaw.getStatus();
  const taskStats = taskQueue.getStats();
  const autoStats = automationManager.getStats();
  const memUsage = process.memoryUsage();
  const uptimeSec = Math.floor((Date.now() - startTime) / 1000);

  const formatUptime = (s: number): string => {
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
  };

  const status: StatusResponse = {
    status: ocStatus.connected ? "ok" : "degraded",
    service: "sisg-gateway",
    version: VERSION,
    uptime: uptimeSec,
    openclawConnected: ocStatus.connected,
    activeTasks: taskStats.active,
    timestamp: new Date().toISOString(),
    openclaw: {
      connected: ocStatus.connected,
      url: ocStatus.url,
      lastPing: ocStatus.lastPing,
    },
    tasks: {
      active: taskStats.active,
      completed: taskStats.completed,
      failed: taskStats.failed,
      queued: taskStats.queued,
    },
    system: {
      memoryMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      uptime: formatUptime(uptimeSec),
      nodeVersion: process.version,
    },
    automations: {
      total: autoStats.total,
      enabled: autoStats.enabled,
    },
  };

  res.json({ success: true, data: status });
});

export default router;
