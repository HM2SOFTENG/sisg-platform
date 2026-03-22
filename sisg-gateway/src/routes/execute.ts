import { Router, Request, Response } from "express";
import { taskQueue } from "../services/taskQueue";
import { TaskRequest } from "../types";

// ============================================================================
// Task Execution Routes
// ============================================================================

const router = Router();

/**
 * POST /api/execute — Submit a task for execution.
 *
 * Body: { type, command, context?, params?, async? }
 *
 * - async: true  → queues the task and returns immediately with task ID
 * - async: false → runs synchronously and returns the result (default)
 */
router.post("/api/execute", async (req: Request, res: Response) => {
  try {
    const { type, command, context, params, async: isAsync } = req.body as TaskRequest & { async?: boolean };

    // Validate required fields
    if (!type) {
      res.status(400).json({ success: false, error: "Missing required field: type", code: "VALIDATION" });
      return;
    }
    if (!command) {
      res.status(400).json({ success: false, error: "Missing required field: command", code: "VALIDATION" });
      return;
    }

    const validTypes = ["shell", "browser", "file", "scrape", "analyze", "generate"];
    if (!validTypes.includes(type)) {
      res.status(400).json({
        success: false,
        error: `Invalid task type: ${type}. Valid types: ${validTypes.join(", ")}`,
        code: "VALIDATION",
      });
      return;
    }

    const taskReq: TaskRequest = { type, command, context, params };

    if (isAsync) {
      // Queue and return immediately
      const task = taskQueue.addTask(taskReq);
      res.status(202).json({
        success: true,
        data: {
          taskId: task.id,
          status: task.status,
          message: "Task queued for execution",
        },
      });
    } else {
      // Execute synchronously
      const timeoutMs = req.body.timeoutMs || 60000;
      const task = await taskQueue.executeSync(taskReq, timeoutMs);

      if (task.status === "completed") {
        res.json({
          success: true,
          data: {
            taskId: task.id,
            status: task.status,
            result: task.result,
            duration: task.duration,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          error: task.error || "Task failed",
          data: {
            taskId: task.id,
            status: task.status,
            duration: task.duration,
          },
        });
      }
    }
  } catch (err: any) {
    console.error("Execute error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
      code: "INTERNAL",
    });
  }
});

/**
 * GET /api/tasks — List recent tasks.
 *
 * Query: ?limit=50&status=completed
 */
router.get("/api/tasks", (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
  const status = req.query.status as string | undefined;

  const tasks = taskQueue.getTasks({
    limit,
    status: status as any,
  });

  res.json({
    success: true,
    data: {
      tasks,
      total: tasks.length,
      stats: taskQueue.getStats(),
    },
  });
});

/**
 * GET /api/tasks/:id — Get a specific task by ID.
 */
router.get("/api/tasks/:id", (req: Request, res: Response) => {
  const task = taskQueue.getTask(req.params.id);

  if (!task) {
    res.status(404).json({ success: false, error: "Task not found", code: "NOT_FOUND" });
    return;
  }

  res.json({ success: true, data: task });
});

export default router;
