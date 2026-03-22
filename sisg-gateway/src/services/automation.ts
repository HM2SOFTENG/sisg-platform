import fs from "fs";
import path from "path";
import cron from "node-cron";
import { taskQueue } from "./taskQueue";
import { AutomationJob, TaskRequest } from "../types";

// ============================================================================
// Automation / Cron Job Manager
// ============================================================================

const JOBS_FILE = path.resolve("./data/automations.json");

class AutomationManager {
  private jobs: Map<string, AutomationJob> = new Map();
  private scheduledTasks: Map<string, cron.ScheduledTask> = new Map();

  /**
   * Initialize — load saved jobs and start enabled schedules.
   */
  async initialize(): Promise<void> {
    if (fs.existsSync(JOBS_FILE)) {
      try {
        const raw = fs.readFileSync(JOBS_FILE, "utf-8");
        const arr: AutomationJob[] = JSON.parse(raw);
        for (const job of arr) {
          this.jobs.set(job.name, job);
          if (job.enabled) {
            this.scheduleJob(job);
          }
        }
        console.log(`⏰ Loaded ${this.jobs.size} automation jobs (${arr.filter((j) => j.enabled).length} active)`);
      } catch (err) {
        console.warn("Failed to load automations:", err);
      }
    }
  }

  /**
   * Create or update an automation job.
   */
  upsertJob(job: Omit<AutomationJob, "runCount"> & { runCount?: number }): AutomationJob {
    if (!cron.validate(job.schedule)) {
      throw new Error(`Invalid cron expression: ${job.schedule}`);
    }

    const existing = this.jobs.get(job.name);
    const full: AutomationJob = {
      ...job,
      runCount: existing?.runCount || job.runCount || 0,
    };

    // Stop existing schedule if any
    this.unscheduleJob(job.name);

    this.jobs.set(job.name, full);

    if (full.enabled) {
      this.scheduleJob(full);
    }

    this.persist();
    return full;
  }

  /**
   * Delete a job.
   */
  deleteJob(name: string): boolean {
    this.unscheduleJob(name);
    const deleted = this.jobs.delete(name);
    if (deleted) this.persist();
    return deleted;
  }

  /**
   * Get all jobs.
   */
  getJobs(): AutomationJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get a single job.
   */
  getJob(name: string): AutomationJob | undefined {
    return this.jobs.get(name);
  }

  /**
   * Get stats.
   */
  getStats() {
    const jobs = Array.from(this.jobs.values());
    return {
      total: jobs.length,
      enabled: jobs.filter((j) => j.enabled).length,
    };
  }

  /**
   * Shut down all scheduled tasks.
   */
  shutdown(): void {
    for (const task of this.scheduledTasks.values()) {
      task.stop();
    }
    this.scheduledTasks.clear();
  }

  // --------------------------------------------------------------------------
  // Internal
  // --------------------------------------------------------------------------

  private scheduleJob(job: AutomationJob): void {
    const task = cron.schedule(job.schedule, async () => {
      console.log(`⏰ Automation "${job.name}" triggered`);
      job.lastRun = new Date().toISOString();
      job.runCount++;

      const taskReq: TaskRequest = {
        ...job.task,
        context: {
          ...job.task.context,
          callbackUrl: job.callbackUrl || job.task.context?.callbackUrl,
          source: "agents",
        },
      };

      taskQueue.addTask(taskReq);
      this.persist();
    });

    this.scheduledTasks.set(job.name, task);
  }

  private unscheduleJob(name: string): void {
    const existing = this.scheduledTasks.get(name);
    if (existing) {
      existing.stop();
      this.scheduledTasks.delete(name);
    }
  }

  private persist(): void {
    try {
      const dir = path.dirname(JOBS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const jobs = Array.from(this.jobs.values());
      fs.writeFileSync(JOBS_FILE, JSON.stringify(jobs, null, 2));
    } catch (err) {
      console.error("Failed to persist automations:", err);
    }
  }
}

// Singleton
export const automationManager = new AutomationManager();
