import { Router, Request, Response } from "express";
import { automationManager } from "../services/automation";

// ============================================================================
// Automation / Cron Job Routes
// ============================================================================

const router = Router();

/**
 * GET /api/automations — List all automation jobs.
 */
router.get("/api/automations", (_req: Request, res: Response) => {
  const jobs = automationManager.getJobs();
  const stats = automationManager.getStats();

  res.json({
    success: true,
    data: {
      jobs,
      total: stats.total,
      enabled: stats.enabled,
    },
  });
});

/**
 * GET /api/automations/:name — Get a specific automation job.
 */
router.get("/api/automations/:name", (req: Request, res: Response) => {
  const job = automationManager.getJob(req.params.name);

  if (!job) {
    res.status(404).json({ success: false, error: "Automation job not found", code: "NOT_FOUND" });
    return;
  }

  res.json({ success: true, data: job });
});

/**
 * POST /api/automations — Create or update an automation job.
 *
 * Body: { name, schedule, task, callbackUrl?, enabled? }
 *
 * schedule: cron expression (e.g., "0 * * * *" for every hour)
 * task:     same shape as a TaskRequest { type, command, context?, params? }
 */
router.post("/api/automations", (req: Request, res: Response) => {
  try {
    const { name, schedule, task, callbackUrl, enabled } = req.body;

    if (!name || typeof name !== "string") {
      res.status(400).json({ success: false, error: "Missing or invalid 'name'", code: "VALIDATION" });
      return;
    }
    if (!schedule || typeof schedule !== "string") {
      res.status(400).json({ success: false, error: "Missing or invalid 'schedule' (cron expression)", code: "VALIDATION" });
      return;
    }
    if (!task || !task.type || !task.command) {
      res.status(400).json({
        success: false,
        error: "Missing or invalid 'task' — must include type and command",
        code: "VALIDATION",
      });
      return;
    }

    const job = automationManager.upsertJob({
      name,
      schedule,
      task,
      callbackUrl,
      enabled: enabled !== false, // default to enabled
    });

    res.json({
      success: true,
      data: job,
      message: `Automation "${name}" saved and ${job.enabled ? "scheduled" : "paused"}`,
    });
  } catch (err: any) {
    // Catch cron validation errors
    if (err.message?.includes("Invalid cron")) {
      res.status(400).json({
        success: false,
        error: err.message,
        code: "VALIDATION",
      });
      return;
    }

    console.error("Automation upsert error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
      code: "INTERNAL",
    });
  }
});

/**
 * PATCH /api/automations/:name — Toggle an automation on/off.
 *
 * Body: { enabled: boolean }
 */
router.patch("/api/automations/:name", (req: Request, res: Response) => {
  const job = automationManager.getJob(req.params.name);
  if (!job) {
    res.status(404).json({ success: false, error: "Automation job not found", code: "NOT_FOUND" });
    return;
  }

  if (typeof req.body.enabled !== "boolean") {
    res.status(400).json({ success: false, error: "'enabled' must be a boolean", code: "VALIDATION" });
    return;
  }

  const updated = automationManager.upsertJob({
    ...job,
    enabled: req.body.enabled,
  });

  res.json({
    success: true,
    data: updated,
    message: `Automation "${updated.name}" ${updated.enabled ? "enabled" : "disabled"}`,
  });
});

/**
 * DELETE /api/automations/:name — Delete an automation job.
 */
router.delete("/api/automations/:name", (req: Request, res: Response) => {
  const deleted = automationManager.deleteJob(req.params.name);

  if (!deleted) {
    res.status(404).json({ success: false, error: "Automation job not found", code: "NOT_FOUND" });
    return;
  }

  res.json({
    success: true,
    message: `Automation "${req.params.name}" deleted`,
  });
});

export default router;
