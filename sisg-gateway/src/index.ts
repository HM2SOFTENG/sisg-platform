import express from "express";
import cors from "cors";
import { config, validateConfig } from "./config";
import { authMiddleware } from "./middleware/auth";
import { loggerMiddleware } from "./middleware/logger";
import { rateLimiter } from "./middleware/rateLimit";
import { openclaw } from "./services/openclaw";
import { taskQueue } from "./services/taskQueue";
import { automationManager } from "./services/automation";

// Routes
import healthRoutes from "./routes/health";
import executeRoutes from "./routes/execute";
import chatRoutes from "./routes/chat";
import agentRoutes from "./routes/agents";
import automationRoutes from "./routes/automation";

// ============================================================================
// SISG Gateway — Express Server
// ============================================================================
//
// Local microservice running on the Kamrui mini PC.
// Bridges the SISG platform (DigitalOcean) with OpenClaw (local AI).
//
// Endpoints:
//   GET  /health              — Health check (no auth)
//   GET  /status              — Detailed status
//   POST /api/execute          — Execute a task
//   GET  /api/tasks            — List tasks
//   GET  /api/tasks/:id        — Get task by ID
//   POST /api/chat             — AI chat via OpenClaw
//   POST /api/agents/run       — Queue an agent action
//   POST /api/agents/run/sync  — Run an agent action synchronously
//   GET  /api/automations      — List automation jobs
//   POST /api/automations      — Create/update automation job
//   PATCH /api/automations/:n  — Toggle automation on/off
//   DELETE /api/automations/:n — Delete automation job
//
// ============================================================================

const BANNER = `
╔══════════════════════════════════════════════╗
║           SISG Gateway v1.0.0               ║
║      Sentinel Integrated Solutions Group     ║
╚══════════════════════════════════════════════╝
`;

async function main() {
  console.log(BANNER);

  // 1. Validate configuration
  validateConfig();
  console.log(`🔧 Config loaded — port ${config.port}, max concurrent tasks: ${config.maxConcurrentTasks}`);

  // 2. Create Express app
  const app = express();

  // 3. Global middleware
  app.use(cors({
    origin: config.allowedOrigins,
    credentials: true,
  }));
  app.use(express.json({ limit: "10mb" }));
  app.use(loggerMiddleware);
  app.use(rateLimiter);
  app.use(authMiddleware);

  // 4. Mount routes
  app.use(healthRoutes);
  app.use(executeRoutes);
  app.use(chatRoutes);
  app.use(agentRoutes);
  app.use(automationRoutes);

  // 5. 404 handler
  app.use((_req, res) => {
    res.status(404).json({
      success: false,
      error: "Not found",
      code: "NOT_FOUND",
      endpoints: [
        "GET  /health",
        "GET  /status",
        "POST /api/execute",
        "GET  /api/tasks",
        "GET  /api/tasks/:id",
        "POST /api/chat",
        "POST /api/agents/run",
        "POST /api/agents/run/sync",
        "GET  /api/automations",
        "POST /api/automations",
        "PATCH /api/automations/:name",
        "DELETE /api/automations/:name",
      ],
    });
  });

  // 6. Error handler
  app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
      code: "INTERNAL",
    });
  });

  // 7. Initialize services
  console.log("\n--- Initializing services ---");

  await openclaw.initialize();
  await taskQueue.initialize();
  await automationManager.initialize();

  console.log("--- Services initialized ---\n");

  // 8. Start server
  const server = app.listen(config.port, "0.0.0.0", () => {
    console.log(`🚀 SISG Gateway listening on http://0.0.0.0:${config.port}`);
    console.log(`📡 Allowed origins: ${config.allowedOrigins.join(", ")}`);
    console.log(`🔑 Auth: Bearer token required on all endpoints except /health`);
    console.log("");
  });

  // 9. Graceful shutdown
  const shutdown = (signal: string) => {
    console.log(`\n⏹  Received ${signal} — shutting down gracefully...`);

    server.close(() => {
      console.log("   HTTP server closed");
    });

    openclaw.shutdown();
    console.log("   OpenClaw connection closed");

    automationManager.shutdown();
    console.log("   Automation scheduler stopped");

    console.log("   Goodbye!\n");
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  // Handle uncaught errors
  process.on("uncaughtException", (err) => {
    console.error("UNCAUGHT EXCEPTION:", err);
  });
  process.on("unhandledRejection", (reason) => {
    console.error("UNHANDLED REJECTION:", reason);
  });
}

// Run
main().catch((err) => {
  console.error("FATAL — Failed to start SISG Gateway:", err);
  process.exit(1);
});
