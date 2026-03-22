import fs from "fs";
import path from "path";
import { v4 as uuid } from "uuid";
import { config } from "../config";
import { openclaw } from "./openclaw";
import { Task, TaskRequest, TaskStatus, CallbackPayload } from "../types";

// ============================================================================
// Task Queue — In-memory with file persistence
// ============================================================================

const TASKS_FILE = path.resolve("./data/tasks.json");
const STATS_FILE = path.resolve("./data/stats.json");

interface QueueStats {
  totalCreated: number;
  totalCompleted: number;
  totalFailed: number;
}

class TaskQueue {
  private tasks: Map<string, Task> = new Map();
  private queue: string[] = []; // IDs waiting to run
  private running: Set<string> = new Set();
  private stats: QueueStats = { totalCreated: 0, totalCompleted: 0, totalFailed: 0 };

  /**
   * Initialize — load persisted tasks from disk.
   */
  async initialize(): Promise<void> {
    // Ensure data dirs exist
    const dataDir = path.dirname(TASKS_FILE);
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(config.taskResultDir)) fs.mkdirSync(config.taskResultDir, { recursive: true });

    // Load persisted tasks
    if (fs.existsSync(TASKS_FILE)) {
      try {
        const raw = fs.readFileSync(TASKS_FILE, "utf-8");
        const arr: Task[] = JSON.parse(raw);
        for (const task of arr) {
          this.tasks.set(task.id, task);
          // Re-queue any that were running when we shut down
          if (task.status === "running" || task.status === "queued") {
            task.status = "queued";
            this.queue.push(task.id);
          }
        }
        console.log(`📋 Loaded ${this.tasks.size} tasks from disk (${this.queue.length} re-queued)`);
      } catch (err) {
        console.warn("Failed to load tasks from disk:", err);
      }
    }

    // Load stats
    if (fs.existsSync(STATS_FILE)) {
      try {
        this.stats = JSON.parse(fs.readFileSync(STATS_FILE, "utf-8"));
      } catch {}
    }

    // Start the worker loop
    this.processLoop();
  }

  /**
   * Add a new task to the queue.
   */
  addTask(request: TaskRequest): Task {
    const task: Task = {
      id: request.taskId || uuid(),
      type: request.type,
      command: request.command,
      context: request.context || {},
      params: request.params || {},
      status: "queued",
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      duration: null,
    };

    this.tasks.set(task.id, task);
    this.queue.push(task.id);
    this.stats.totalCreated++;
    this.persist();

    return task;
  }

  /**
   * Execute a task synchronously (blocking, with timeout).
   */
  async executeSync(request: TaskRequest, timeoutMs: number = 30000): Promise<Task> {
    const task: Task = {
      id: request.taskId || uuid(),
      type: request.type,
      command: request.command,
      context: request.context || {},
      params: request.params || {},
      status: "running",
      result: null,
      error: null,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: null,
      duration: null,
    };

    this.tasks.set(task.id, task);

    try {
      const result = await Promise.race([
        this.runTask(task),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Task timed out")), timeoutMs)
        ),
      ]);

      task.status = "completed";
      task.result = result;
      task.completedAt = new Date().toISOString();
      task.duration = Date.now() - new Date(task.startedAt!).getTime();
      this.stats.totalCompleted++;
    } catch (err: any) {
      task.status = "failed";
      task.error = err.message || "Unknown error";
      task.completedAt = new Date().toISOString();
      task.duration = Date.now() - new Date(task.startedAt!).getTime();
      this.stats.totalFailed++;
    }

    this.persist();
    return task;
  }

  /**
   * Get a task by ID.
   */
  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get recent tasks.
   */
  getTasks(opts?: { limit?: number; status?: TaskStatus }): Task[] {
    let tasks = Array.from(this.tasks.values());

    if (opts?.status) {
      tasks = tasks.filter((t) => t.status === opts.status);
    }

    tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return tasks.slice(0, opts?.limit || 50);
  }

  /**
   * Get queue statistics.
   */
  getStats() {
    return {
      active: this.running.size,
      queued: this.queue.length,
      completed: this.stats.totalCompleted,
      failed: this.stats.totalFailed,
      total: this.tasks.size,
    };
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  /**
   * Background worker loop — picks up queued tasks.
   */
  private async processLoop(): Promise<void> {
    setInterval(async () => {
      // Don't exceed max concurrent
      while (this.queue.length > 0 && this.running.size < config.maxConcurrentTasks) {
        const taskId = this.queue.shift();
        if (!taskId) break;

        const task = this.tasks.get(taskId);
        if (!task || task.status !== "queued") continue;

        this.running.add(taskId);
        task.status = "running";
        task.startedAt = new Date().toISOString();
        this.persist();

        // Execute in background
        this.executeAndFinish(task).catch((err) => {
          console.error(`Task ${taskId} failed:`, err);
        });
      }
    }, 500); // Check every 500ms
  }

  /**
   * Execute a task and handle completion/failure.
   */
  private async executeAndFinish(task: Task): Promise<void> {
    try {
      const result = await this.runTask(task);
      task.status = "completed";
      task.result = result;
      task.completedAt = new Date().toISOString();
      task.duration = Date.now() - new Date(task.startedAt!).getTime();
      this.stats.totalCompleted++;
    } catch (err: any) {
      task.status = "failed";
      task.error = err.message || "Unknown error";
      task.completedAt = new Date().toISOString();
      task.duration = Date.now() - new Date(task.startedAt!).getTime();
      this.stats.totalFailed++;
    }

    this.running.delete(task.id);
    this.persist();

    // Fire callback if URL provided
    if (task.context.callbackUrl) {
      this.sendCallback(task).catch((err) =>
        console.error(`Callback failed for task ${task.id}:`, err)
      );
    }
  }

  /**
   * Route task to OpenClaw based on type.
   */
  private async runTask(task: Task): Promise<any> {
    if (!openclaw.isConnected()) {
      throw new Error("OpenClaw is not connected");
    }

    switch (task.type) {
      case "analyze":
      case "generate":
        // These are AI/LLM tasks — use chat
        return openclaw.chat(task.command, {
          agent: task.context.agent,
          systemPrompt: task.params.systemPrompt,
          data: task.params.data,
        });

      case "shell":
      case "browser":
      case "file":
      case "scrape":
        // These are tool execution tasks
        return openclaw.executeTool(task.type, task.command, task.params);

      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  /**
   * POST result to callback URL.
   */
  private async sendCallback(task: Task): Promise<void> {
    const payload: CallbackPayload = {
      source: "sisg-gateway",
      taskId: task.id,
      agent: task.context.agent,
      status: task.status,
      result: task.result,
      error: task.error || undefined,
      duration: task.duration,
      timestamp: new Date().toISOString(),
      gatewayKey: config.gatewayApiKey.substring(0, 8) + "...", // partial key for verification
    };

    try {
      const res = await fetch(task.context.callbackUrl!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.warn(`Callback returned ${res.status} for task ${task.id}`);
      }
    } catch (err: any) {
      console.error(`Callback POST failed for task ${task.id}: ${err.message}`);
    }
  }

  /**
   * Persist tasks and stats to disk.
   */
  private persist(): void {
    try {
      // Only persist last 500 tasks to avoid bloat
      const tasks = Array.from(this.tasks.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 500);

      fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
      fs.writeFileSync(STATS_FILE, JSON.stringify(this.stats, null, 2));
    } catch (err) {
      console.error("Failed to persist tasks:", err);
    }
  }
}

// Singleton
export const taskQueue = new TaskQueue();
