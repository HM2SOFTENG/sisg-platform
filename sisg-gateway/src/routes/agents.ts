import { Router, Request, Response } from "express";
import { taskQueue } from "../services/taskQueue";
import { openclaw } from "../services/openclaw";
import { AgentRunRequest, TaskRequest } from "../types";

// ============================================================================
// Agent Execution Routes
// ============================================================================

const router = Router();

/**
 * POST /api/agents/run — Trigger an agent action.
 *
 * Body: { agent, action, params?, callbackUrl? }
 *
 * This endpoint maps agent actions to tasks that get routed through OpenClaw.
 * The SISG platform's agent portal uses this to dispatch work to the Kamrui.
 */
router.post("/api/agents/run", async (req: Request, res: Response) => {
  try {
    const { agent, action, params, callbackUrl } = req.body as AgentRunRequest;

    if (!agent) {
      res.status(400).json({ success: false, error: "Missing required field: agent", code: "VALIDATION" });
      return;
    }
    if (!action) {
      res.status(400).json({ success: false, error: "Missing required field: action", code: "VALIDATION" });
      return;
    }

    if (!openclaw.isConnected()) {
      res.status(503).json({
        success: false,
        error: "OpenClaw is not connected — agent tasks cannot be processed",
        code: "OPENCLAW_OFFLINE",
      });
      return;
    }

    // Map agent action to a task
    const taskType = mapActionToTaskType(action);
    const command = buildAgentCommand(agent, action, params);

    const taskReq: TaskRequest = {
      type: taskType,
      command,
      context: {
        agent,
        source: "agents",
        callbackUrl,
      },
      params: {
        ...params,
        agentAction: action,
      },
    };

    // Agent tasks are always async — queue and return
    const task = taskQueue.addTask(taskReq);

    res.status(202).json({
      success: true,
      data: {
        taskId: task.id,
        agent,
        action,
        status: task.status,
        message: `Agent "${agent}" action "${action}" queued for execution`,
      },
    });
  } catch (err: any) {
    console.error("Agent run error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
      code: "INTERNAL",
    });
  }
});

/**
 * POST /api/agents/run/sync — Run an agent action synchronously.
 *
 * Same as /api/agents/run but waits for the result.
 */
router.post("/api/agents/run/sync", async (req: Request, res: Response) => {
  try {
    const { agent, action, params, callbackUrl } = req.body as AgentRunRequest;

    if (!agent || !action) {
      res.status(400).json({
        success: false,
        error: "Missing required fields: agent, action",
        code: "VALIDATION",
      });
      return;
    }

    if (!openclaw.isConnected()) {
      res.status(503).json({
        success: false,
        error: "OpenClaw is not connected",
        code: "OPENCLAW_OFFLINE",
      });
      return;
    }

    const taskType = mapActionToTaskType(action);
    const command = buildAgentCommand(agent, action, params);

    const taskReq: TaskRequest = {
      type: taskType,
      command,
      context: {
        agent,
        source: "agents",
        callbackUrl,
      },
      params: {
        ...params,
        agentAction: action,
      },
    };

    const timeoutMs = parseInt(req.query.timeout as string) || 120000; // 2 min default for agents
    const task = await taskQueue.executeSync(taskReq, timeoutMs);

    if (task.status === "completed") {
      res.json({
        success: true,
        data: {
          taskId: task.id,
          agent,
          action,
          status: task.status,
          result: task.result,
          duration: task.duration,
        },
      });
    } else {
      res.status(500).json({
        success: false,
        error: task.error || "Agent task failed",
        data: {
          taskId: task.id,
          agent,
          action,
          status: task.status,
          duration: task.duration,
        },
      });
    }
  } catch (err: any) {
    console.error("Agent sync run error:", err);
    res.status(500).json({
      success: false,
      error: err.message || "Internal server error",
      code: "INTERNAL",
    });
  }
});

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

/**
 * Map an agent action to a task type.
 */
function mapActionToTaskType(action: string): TaskRequest["type"] {
  const actionMap: Record<string, TaskRequest["type"]> = {
    // Analysis actions → AI processing
    analyze: "analyze",
    scan: "analyze",
    audit: "analyze",
    assess: "analyze",
    monitor: "analyze",
    review: "analyze",
    evaluate: "analyze",

    // Generation actions → AI generation
    generate: "generate",
    report: "generate",
    summarize: "generate",
    draft: "generate",
    compose: "generate",

    // Data gathering → scraping
    scrape: "scrape",
    fetch: "scrape",
    crawl: "scrape",
    collect: "scrape",

    // System actions → shell
    deploy: "shell",
    install: "shell",
    execute: "shell",
    run: "shell",

    // File actions
    read: "file",
    write: "file",
    process: "file",
  };

  return actionMap[action.toLowerCase()] || "analyze";
}

/**
 * Build the command string for OpenClaw based on agent + action.
 */
function buildAgentCommand(agent: string, action: string, params?: Record<string, any>): string {
  const paramStr = params
    ? Object.entries(params)
        .filter(([k]) => k !== "agentAction")
        .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
        .join(", ")
    : "";

  return `[Agent: ${agent}] ${action}${paramStr ? ` — ${paramStr}` : ""}`;
}

export default router;
