import express, { Request, Response, NextFunction } from "express";
import { createServer, IncomingMessage } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from "ws";
import { slack } from "./services/slack.js";
import { clawbot } from "./services/clawbot.js";
import adminRouter from "./routes/admin.js";
import clawbotRouter from "./routes/clawbot.js";
import agentsRouter from "./routes/sisg-agents.js";
import gatewayRouter from "./routes/gateway.js";
import { sisgAgents } from "./services/sisg-agents.js";
import { storage } from "./services/storage.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // WebSocket server for ClawBot real-time connections
  const wss = new WebSocketServer({ noServer: true });

  // Upgrade handler for ClawBot WebSocket connections at /api/clawbot/ws
  server.on("upgrade", (req: IncomingMessage, socket: any, head: Buffer) => {
    if (req.url?.startsWith("/api/clawbot/ws")) {
      const urlObj = new URL(req.url, `http://${req.headers.host}`);
      const apiKey = urlObj.searchParams.get("key") || (req.headers["x-api-key"] as string);
      if (apiKey !== (process.env.CLAWBOT_API_KEY || "clawbot-sisg-2026")) {
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

      // Save to storage
      storage.add("submissions", { name, email, phone, subject, message, status: "new" });

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

  // Mount admin API routes
  app.use(adminRouter);
  app.use(clawbotRouter);
  app.use(agentsRouter);
  app.use(gatewayRouter);

  // Seed initial data if collections are empty
  const seedIfEmpty = (collection: string, data: any[]) => {
    if (storage.read(collection).length === 0) {
      storage.write(collection, data);
    }
  };

  seedIfEmpty("submissions", [
    { id: "1", name: "John Doe", email: "john@example.com", phone: "555-0101", subject: "Security Assessment Inquiry", message: "We need a comprehensive security assessment for our federal systems.", status: "new", createdAt: "2026-03-15T10:30:00Z" },
    { id: "2", name: "Sarah Chen", email: "sarah@govtech.com", phone: "555-0202", subject: "Cloud Migration Support", message: "Looking for cloud migration expertise for our agency's infrastructure.", status: "reviewed", createdAt: "2026-03-12T14:20:00Z" },
    { id: "3", name: "Mike Torres", email: "mtorres@defense.gov", phone: "555-0303", subject: "CMMC Compliance Help", message: "Need help achieving CMMC Level 2 compliance for our organization.", status: "responded", createdAt: "2026-03-10T09:15:00Z" },
  ]);

  seedIfEmpty("contracts", [
    { id: "1", title: "DoD CMMC Assessment Program", client: "Department of Defense", value: 2400000, status: "active", type: "assessment", startDate: "2026-01-15", endDate: "2026-12-31", description: "Comprehensive CMMC Level 2 assessment program across 12 DoD facilities.", progress: 45, createdAt: "2026-01-10T00:00:00Z" },
    { id: "2", title: "GSA Cloud Security Modernization", client: "General Services Administration", value: 5800000, status: "bidding", type: "modernization", startDate: "2026-04-01", endDate: "2027-03-31", description: "Full cloud security modernization initiative for GSA infrastructure.", progress: 0, createdAt: "2026-02-20T00:00:00Z" },
    { id: "3", title: "VA Healthcare Network Security", client: "Veterans Affairs", value: 3200000, status: "active", type: "security", startDate: "2026-02-01", endDate: "2026-08-31", description: "Network security overhaul for VA healthcare systems.", progress: 68, createdAt: "2026-01-25T00:00:00Z" },
    { id: "4", title: "FBI Cyber Threat Intelligence", client: "Federal Bureau of Investigation", value: 4100000, status: "review", type: "intelligence", startDate: "2026-06-01", endDate: "2027-05-31", description: "Advanced cyber threat intelligence platform development.", progress: 0, createdAt: "2026-03-01T00:00:00Z" },
    { id: "5", title: "DHS Border Security Systems", client: "Department of Homeland Security", value: 6500000, status: "bidding", type: "systems", startDate: "2026-07-01", endDate: "2027-12-31", description: "Integrated border security system modernization.", progress: 0, createdAt: "2026-03-10T00:00:00Z" },
  ]);

  seedIfEmpty("team", [
    { id: "1", name: "Brian Smith", role: "CEO & Founder", email: "brian@sisg.com", department: "Executive", status: "active", joinDate: "2020-01-15", skills: ["Leadership", "Strategy", "Cybersecurity"], createdAt: "2020-01-15T00:00:00Z" },
    { id: "2", name: "Alexandra Rivera", role: "VP of Engineering", email: "alex@sisg.com", department: "Engineering", status: "active", joinDate: "2021-03-01", skills: ["Cloud Architecture", "DevOps", "Team Leadership"], createdAt: "2021-03-01T00:00:00Z" },
    { id: "3", name: "Marcus Johnson", role: "Director of Security", email: "marcus@sisg.com", department: "Security", status: "active", joinDate: "2021-06-15", skills: ["Penetration Testing", "CMMC", "Risk Assessment"], createdAt: "2021-06-15T00:00:00Z" },
    { id: "4", name: "Priya Patel", role: "Senior Cloud Architect", email: "priya@sisg.com", department: "Engineering", status: "active", joinDate: "2022-01-10", skills: ["AWS", "Azure", "Kubernetes"], createdAt: "2022-01-10T00:00:00Z" },
    { id: "5", name: "David Kim", role: "Contract Analyst", email: "david@sisg.com", department: "Operations", status: "active", joinDate: "2022-08-01", skills: ["Federal Contracts", "FAR/DFAR", "Proposal Writing"], createdAt: "2022-08-01T00:00:00Z" },
    { id: "6", name: "Jasmine Washington", role: "Marketing Director", email: "jasmine@sisg.com", department: "Marketing", status: "active", joinDate: "2023-02-15", skills: ["Digital Marketing", "Brand Strategy", "Content"], createdAt: "2023-02-15T00:00:00Z" },
  ]);

  seedIfEmpty("projects", [
    { id: "1", name: "CMMC Level 2 Assessment Tool", status: "active", priority: "high", progress: 72, budget: 450000, spent: 324000, lead: "Marcus Johnson", team: ["Marcus Johnson", "Priya Patel"], deadline: "2026-06-30", description: "Automated CMMC Level 2 assessment and compliance tool.", createdAt: "2025-09-01T00:00:00Z" },
    { id: "2", name: "Cloud Security Dashboard", status: "active", priority: "high", progress: 45, budget: 280000, spent: 126000, lead: "Priya Patel", team: ["Priya Patel", "Alexandra Rivera"], deadline: "2026-08-15", description: "Real-time cloud security monitoring dashboard.", createdAt: "2025-11-15T00:00:00Z" },
    { id: "3", name: "Threat Intelligence Platform", status: "planning", priority: "medium", progress: 15, budget: 620000, spent: 93000, lead: "Alexandra Rivera", team: ["Alexandra Rivera", "Marcus Johnson"], deadline: "2026-12-31", description: "Advanced AI-powered threat intelligence platform.", createdAt: "2026-01-10T00:00:00Z" },
  ]);

  seedIfEmpty("marketing", [
    { id: "1", name: "Federal Cybersecurity Summit 2026", type: "event", status: "active", budget: 85000, spent: 42000, startDate: "2026-04-15", endDate: "2026-04-17", description: "Annual cybersecurity summit targeting federal agencies.", leads: 0, conversions: 0, createdAt: "2026-01-15T00:00:00Z" },
    { id: "2", name: "LinkedIn Thought Leadership Campaign", type: "digital", status: "active", budget: 15000, spent: 8500, startDate: "2026-02-01", endDate: "2026-05-31", description: "Monthly thought leadership posts and articles on federal cybersecurity.", leads: 127, conversions: 12, createdAt: "2026-02-01T00:00:00Z" },
    { id: "3", name: "GSA Schedule Website Redesign", type: "content", status: "planning", budget: 35000, spent: 0, startDate: "2026-05-01", endDate: "2026-06-30", description: "Redesign public-facing GSA schedule offerings page.", leads: 0, conversions: 0, createdAt: "2026-03-01T00:00:00Z" },
  ]);

  seedIfEmpty("partnerships", [
    { id: "1", name: "Microsoft Government Cloud", type: "technology", status: "active", value: 500000, contact: "Lisa Park", email: "lpark@microsoft.com", description: "Strategic partnership for Azure Government cloud solutions.", renewalDate: "2027-01-15", createdAt: "2024-01-15T00:00:00Z" },
    { id: "2", name: "CrowdStrike Federal", type: "security", status: "active", value: 350000, contact: "James Wright", email: "jwright@crowdstrike.com", description: "Endpoint detection and response solutions for federal clients.", renewalDate: "2026-09-30", createdAt: "2024-06-01T00:00:00Z" },
    { id: "3", name: "AWS GovCloud", type: "technology", status: "pending", value: 750000, contact: "Maria Santos", email: "msantos@aws.com", description: "AWS GovCloud infrastructure and managed services partnership.", renewalDate: "2027-03-31", createdAt: "2026-02-15T00:00:00Z" },
  ]);

  seedIfEmpty("content", [
    { id: "1", title: "Homepage Hero Section", slug: "home-hero", type: "section", status: "published", content: "Defending the Digital Frontier", lastEdited: "2026-03-15T10:00:00Z", createdAt: "2025-01-01T00:00:00Z" },
    { id: "2", title: "Services Overview", slug: "services-overview", type: "page", status: "published", content: "Comprehensive cybersecurity services for federal agencies and enterprises.", lastEdited: "2026-03-10T14:00:00Z", createdAt: "2025-01-01T00:00:00Z" },
    { id: "3", title: "CMMC Compliance Guide", slug: "cmmc-guide", type: "blog", status: "draft", content: "Understanding CMMC Level 2 requirements and how to achieve compliance.", lastEdited: "2026-03-18T09:00:00Z", createdAt: "2026-03-18T09:00:00Z" },
  ]);

  seedIfEmpty("activity", [
    { id: "1", type: "contract", action: "Contract awarded", details: "DoD CMMC Assessment Program — $2.4M", user: "Brian Smith", createdAt: "2026-03-20T14:30:00Z" },
    { id: "2", type: "team", action: "New hire onboarded", details: "Senior Cloud Architect — Priya Patel", user: "Alexandra Rivera", createdAt: "2026-03-19T09:00:00Z" },
    { id: "3", type: "security", action: "Security audit completed", details: "ISO 27001 annual audit — passed", user: "Marcus Johnson", createdAt: "2026-03-18T16:45:00Z" },
    { id: "4", type: "marketing", action: "Campaign launched", details: "LinkedIn Thought Leadership Campaign", user: "Jasmine Washington", createdAt: "2026-03-17T11:00:00Z" },
    { id: "5", type: "contract", action: "Proposal submitted", details: "GSA Schedule proposal — $5.8M", user: "David Kim", createdAt: "2026-03-16T15:30:00Z" },
  ]);

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

  server.listen(port, async () => {
    console.log(`Server running on http://localhost:${port}/`);
    console.log(`API endpoints available at http://localhost:${port}/api/`);

    // Initialize SISG business agents and start scheduler
    try {
      await sisgAgents.initialize();
      sisgAgents.startScheduler();
      console.log("🤖 SISG Agents initialized and scheduler started");
    } catch (error) {
      console.error("Failed to initialize SISG agents:", error);
    }
  });
}

startServer().catch(console.error);
