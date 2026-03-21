import express, { Request, Response, NextFunction } from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { slack } from "./services/slack.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // CORS headers for API endpoints
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

  // Health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Contact form submission endpoint
  app.post("/api/contact", async (req: Request, res: Response) => {
    try {
      const { name, email, phone, subject, message } = req.body;

      // Validation
      if (!name || !email || !subject || !message) {
        return res.status(400).json({
          error: "Missing required fields: name, email, subject, message",
        });
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ error: "Invalid email address" });
      }

      // Send to Slack
      await slack.notifyFormSubmission({
        name,
        email,
        phone,
        subject,
        message,
      });

      // Log activity
      await slack.notifyUserActivity({
        type: "other",
        user: { email, name },
        details: `Submitted contact form: "${subject}"`,
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

  // Error tracking endpoint (for frontend errors)
  app.post("/api/errors", async (req: Request, res: Response) => {
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

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`API endpoints available at http://localhost:${port}/api/`);
  });
}

startServer().catch(console.error);
