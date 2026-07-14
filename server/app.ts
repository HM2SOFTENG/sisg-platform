import express, { Request, Response, NextFunction } from "express";
import { createServer, IncomingMessage, Server as HttpServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { slack } from "./services/slack.js";
import { clawbot } from "./services/clawbot.js";
import adminRouter from "./routes/admin.js";
import clawbotRouter from "./routes/clawbot.js";
import agentsRouter from "./routes/sisg-agents.js";
import gatewayRouter from "./routes/gateway.js";
import messagesRouter from "./routes/messages.js";
import { sisgAgents } from "./services/sisg-agents.js";
import { ensurePublicContentSeeds } from "./services/public-content-seeds.js";
import { storage } from "./services/storage.js";
import { ensureBootstrapAdmin } from "./services/auth-store.js";
import { createRateLimit } from "./middleware/rate-limit.js";
import {
  getClawbotApiKey,
  hasConfiguredClawbotApiKey,
  validateClawbotApiKey,
} from "./services/clawbot-auth.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type BuildAppOptions = {
  includeStatic?: boolean;
};

export function buildApp(options: BuildAppOptions = {}): { app: express.Express; server: HttpServer } {
  const { includeStatic = true } = options;
  const app = express();
  const server = createServer(app);
  const publicWriteRateLimit = createRateLimit({
    key: "public-write",
    windowMs: 10 * 60 * 1000,
    maxRequests: 20,
    message: "Too many public write requests. Try again later.",
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket: any, head: Buffer) => {
    if (req.url?.startsWith("/api/clawbot/ws")) {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const apiKey = urlObj.searchParams.get("key") || (req.headers["x-api-key"] as string);
      if (!validateClawbotApiKey(apiKey)) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }
      wss.handleUpgrade(req, socket, head, (ws) => {
        clawbot.registerWsClient(ws);
      });
    } else {
      socket.destroy();
    }
  });

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header("X-Content-Type-Options", "nosniff");
    res.header("X-Frame-Options", "DENY");
    res.header("Referrer-Policy", "no-referrer");
    res.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    if (process.env.NODE_ENV === "production") {
      res.header(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
      );
    }
    next();
  });

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = process.env.CORS_ORIGIN || "https://sentinelintegratedgroup.com";
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.post("/api/contact", publicWriteRateLimit, async (req: Request, res: Response) => {
    try {
      const { name, email, phone, org, subject, message } = req.body;

      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          error: "Missing required fields: name, email, subject, message",
        });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      storage.add("submissions", { name, email, phone, org, subject, message, status: "new" });

      await slack.notifyFormSubmission({
        name,
        email,
        phone,
        subject,
        message,
      });

      await slack.notifyUserActivity({
        type: "other",
        user: { email, name },
        details: org
          ? `Submitted contact form: "${subject}" for ${org}`
          : `Submitted contact form: "${subject}"`,
      });

      res.json({
        success: true,
        message: "Your message has been received. We'll get back to you soon!",
      });
    } catch (error) {
      console.error("Contact form error:", error);
      await slack.notifyError({
        title: "Contact Form Error",
        message: `Failed to process contact form: ${error instanceof Error ? error.message : String(error)}`,
        severity: "warning",
        context: {
          endpoint: "/api/contact",
          userEmail: req.body.email || "unknown",
        },
      });
      res.status(500).json({ error: "Failed to submit form" });
    }
  });

  app.post("/api/errors", publicWriteRateLimit, async (req: Request, res: Response) => {
    try {
      const { title, message, context, severity } = req.body;

      await slack.notifyError({
        title: title || "Client-Side Error",
        message: message || "Unknown error",
        severity: severity || "warning",
        context: {
          ...context,
          userAgent: req.get("user-agent") || "unknown",
        },
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking failed:", error);
      res.status(500).json({ error: "Failed to log error" });
    }
  });

  app.use(adminRouter);
  app.use(clawbotRouter);
  app.use(agentsRouter);
  app.use(gatewayRouter);
  app.use(messagesRouter);

  if (includeStatic) {
    const staticPath =
      process.env.NODE_ENV === "production"
        ? path.resolve(__dirname, "public")
        : path.resolve(__dirname, "..", "dist", "public");

    app.use(express.static(staticPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  return { app, server };
}

export async function startServer() {
  const { server } = buildApp();
  const port = process.env.PORT || 3000;

  server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`API endpoints available at http://localhost:${port}/api/`);
    if (!hasConfiguredClawbotApiKey() && process.env.NODE_ENV !== "production") {
      console.warn("[CLAWBOT] Using local development fallback API key. Set CLAWBOT_API_KEY to remove this fallback.");
    }

    try {
      getClawbotApiKey();
    } catch (error) {
      console.error("Failed to initialize ClawBot API key:", error);
    }

    try {
      await ensureBootstrapAdmin();
    } catch (error) {
      console.error("Failed to initialize auth bootstrap:", error);
    }

    try {
      ensurePublicContentSeeds();
    } catch (error) {
      console.error("Failed to initialize public content seeds:", error);
    }

    try {
      await sisgAgents.initialize();
      sisgAgents.startScheduler();
      console.log("🤖 SISG Agents initialized and scheduler started");
    } catch (error) {
      console.error("Failed to initialize SISG agents:", error);
    }
  });
}
