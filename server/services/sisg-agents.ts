import { storage } from "./storage.js";
import { slack } from "./slack.js";
import crypto from "crypto";

// =============================================================================
// SISG AGENTS SERVICE
// 10 Business Operations Agents with real API integrations and scheduling
// =============================================================================

// --- TYPES ---

export interface SisgAgent {
  id: string;
  slug: string;           // e.g. "sisg", "contracts", "bd"
  name: string;           // e.g. "SISG Command", "Contracts Agent"
  handle: string;         // e.g. "@sisg", "@contracts"
  channels: string[];     // Slack channels e.g. ["#general", "#leadership"]
  description: string;
  category: "core" | "technical" | "administrative" | "mission";
  status: "deployed" | "stopped" | "error" | "deploying" | "undeployed";
  schedule: string;       // cron expression e.g. "0 */6 * * *" or "manual"
  lastRun: string;        // ISO timestamp
  nextRun: string;        // ISO timestamp
  lastResult: string;     // summary of last execution
  errorCount: number;
  successCount: number;
  totalRuns: number;
  deployedAt: string;
  config: Record<string, any>; // agent-specific config
  capabilities: string[];
  priority: number;       // deploy order (1-10)
}

export interface AgentRun {
  id: string;
  agentId: string;
  agentSlug: string;
  trigger: "schedule" | "manual" | "api" | "event";
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  duration?: number;      // ms
  result?: any;
  error?: string;
  output: AgentOutput[];  // structured output items
}

export interface AgentOutput {
  type: "alert" | "report" | "notification" | "action" | "data";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical" | "success";
  data?: any;
  slackPosted?: boolean;
}

// --- CONSTANTS ---

const AGENT_DEFINITIONS: Omit<SisgAgent, "id" | "lastRun" | "nextRun" | "lastResult" | "errorCount" | "successCount" | "totalRuns" | "deployedAt" | "status">[] = [
  {
    slug: "sisg",
    name: "SISG Command",
    handle: "@sisg",
    channels: ["#general", "#leadership"],
    description: "SISG orchestrator and daily briefing coordinator",
    category: "core",
    schedule: "0 8 * * 1-5",
    config: {},
    capabilities: ["route_requests", "daily_briefing", "team_coordination"],
    priority: 1,
  },
  {
    slug: "contracts",
    name: "Contracts Agent",
    handle: "@contracts",
    channels: ["#contracts"],
    description: "SAM.gov monitoring, bid deadline tracking, capability statements",
    category: "administrative",
    schedule: "0 */6 * * *",
    config: {
      naicsCodes: ["541512", "541511", "541519", "541513", "541330", "541690"],
      setAsides: ["SDVOSB", "SDB", "8(a)"],
    },
    capabilities: ["sam_monitoring", "bid_tracking", "capability_statement_drafting"],
    priority: 2,
  },
  {
    slug: "proposals",
    name: "Proposals Agent",
    handle: "@proposals",
    channels: ["#proposals"],
    description: "RFP tracking, proposal outline generation, past performance drafting",
    category: "administrative",
    schedule: "0 */4 * * *",
    config: {},
    capabilities: ["rfp_tracking", "proposal_outline", "past_performance", "deadline_monitoring"],
    priority: 3,
  },
  {
    slug: "bd",
    name: "Business Dev Agent",
    handle: "@bd",
    channels: ["#bd"],
    description: "Lead tracking, teaming partner research, industry news, outreach",
    category: "mission",
    schedule: "0 9 * * 1-5",
    config: {},
    capabilities: ["lead_tracking", "teaming_research", "industry_news", "outreach_drafting"],
    priority: 4,
  },
  {
    slug: "cyber",
    name: "Cybersecurity Agent",
    handle: "@cyber",
    channels: ["#cybersecurity"],
    description: "CVE monitoring, CMMC compliance, security alerts, proposal support",
    category: "technical",
    schedule: "0 */2 * * *",
    config: {},
    capabilities: ["cve_monitoring", "cmmc_compliance", "security_alerts", "proposal_support"],
    priority: 5,
  },
  {
    slug: "compliance",
    name: "Compliance Agent",
    handle: "@compliance",
    channels: ["#compliance"],
    description: "FAR/DFARS monitoring, filing deadlines, compliance calendar",
    category: "administrative",
    schedule: "0 7 * * 1-5",
    config: {},
    capabilities: ["far_dfars_monitoring", "deadline_tracking", "compliance_calendar"],
    priority: 6,
  },
  {
    slug: "finance",
    name: "Finance Agent",
    handle: "@finance",
    channels: ["#finance"],
    description: "Invoice tracking, expense monitoring, payment reminders, tax deadlines",
    category: "administrative",
    schedule: "0 8 * * 1-5",
    config: {},
    capabilities: ["invoice_tracking", "expense_monitoring", "payment_reminders", "tax_deadlines"],
    priority: 7,
  },
  {
    slug: "hr",
    name: "HR Agent",
    handle: "@hr",
    channels: ["#hr"],
    description: "Subcontractor onboarding, NDA tracking, clearance monitoring, training",
    category: "administrative",
    schedule: "0 9 * * 1-5",
    config: {},
    capabilities: ["onboarding", "nda_tracking", "clearance_monitoring", "training_reminders"],
    priority: 8,
  },
  {
    slug: "dev",
    name: "Dev Agent",
    handle: "@dev",
    channels: ["#projects"],
    description: "GitHub monitoring, code review, deployment tracking, documentation",
    category: "technical",
    schedule: "*/30 * * * *",
    config: {},
    capabilities: ["github_monitoring", "code_review", "deployment_tracking", "documentation"],
    priority: 9,
  },
  {
    slug: "veterans",
    name: "Veterans Services Agent",
    handle: "@veterans",
    channels: ["#veterans-services"],
    description: "SDVOSB certification tracking, veteran set-asides, documentation",
    category: "mission",
    schedule: "0 8 * * 1-5",
    config: {},
    capabilities: ["sdvosb_tracking", "setaside_monitoring", "documentation_support"],
    priority: 10,
  },
];

// --- SCHEDULER STATE ---

let schedulerRunning = false;
let schedulerInterval: NodeJS.Timer | null = null;
const scheduledAgents = new Map<string, { lastRun: number; nextRun: number }>();

// --- HELPER FUNCTIONS ---

// Parse simple cron expressions and calculate next run time
// Supports: "0 9 * * 1-5", "star/30 * * * *", "0 star/6 * * *", "manual"
function parseNextRun(cronExpr: string, lastRunTime?: Date): Date {
  if (cronExpr === "manual") return new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year

  const now = lastRunTime || new Date();
  const [minute, hour, dayOfMonth, month, dayOfWeek] = cronExpr.split(" ");

  let nextRun = new Date(now);
  nextRun.setSeconds(0);
  nextRun.setMilliseconds(0);

  // Simple calculation: increment minute and check if matches cron pattern
  for (let i = 0; i < 10080; i++) { // 7 days worth of minutes
    nextRun.setMinutes(nextRun.getMinutes() + 1);

    if (matchesCronPattern(nextRun, minute, hour, dayOfMonth, month, dayOfWeek)) {
      return nextRun;
    }
  }

  return new Date(now.getTime() + 60000); // fallback: next minute
}

function matchesCronPattern(date: Date, minute: string, hour: string, dayOfMonth: string, month: string, dayOfWeek: string): boolean {
  const m = date.getMinutes();
  const h = date.getHours();
  const d = date.getDate();
  const mo = date.getMonth() + 1;
  const dow = date.getDay();

  // Check minute
  if (!checkCronField(m, minute)) return false;
  // Check hour
  if (!checkCronField(h, hour)) return false;
  // Check day of month (if not *)
  if (dayOfMonth !== "*" && !checkCronField(d, dayOfMonth)) return false;
  // Check month (if not *)
  if (month !== "*" && !checkCronField(mo, month)) return false;
  // Check day of week (if not *)
  if (dayOfWeek !== "*" && !checkCronField(dow, dayOfWeek)) return false;

  return true;
}

function checkCronField(value: number, field: string): boolean {
  if (field === "*") return true;

  // Handle range: "1-5"
  if (field.includes("-")) {
    const [start, end] = field.split("-").map(Number);
    return value >= start && value <= end;
  }

  // Handle step: "*/6" or "0/6"
  if (field.includes("/")) {
    const [base, step] = field.split("/");
    const stepNum = Number(step);
    const baseNum = base === "*" ? 0 : Number(base);
    return (value - baseNum) % stepNum === 0;
  }

  // Exact match
  return value === Number(field);
}

/**
 * Make fetch request with timeout and error handling
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = 5000): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    return null;
  }
}

/**
 * Get agent-specific Slack webhook URL
 */
function getAgentWebhookUrl(slug: string): string {
  const envKey = `SLACK_AGENT_${slug.toUpperCase()}_WEBHOOK`;
  return process.env[envKey] || process.env.SLACK_ALERTS_WEBHOOK || "";
}

/**
 * Post agent output to Slack
 */
async function postToSlack(agent: SisgAgent, outputs: AgentOutput[]): Promise<void> {
  if (outputs.length === 0) return;

  const webhookUrl = getAgentWebhookUrl(agent.slug);
  if (!webhookUrl) return;

  try {
    const blocks: any[] = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `${agent.handle} ${agent.name}`,
        },
      },
    ];

    for (const output of outputs) {
      const severityEmoji = {
        info: "ℹ️",
        warning: "⚠️",
        critical: "🚨",
        success: "✅",
      };

      const severityColor = {
        info: "0099FF",
        warning: "FFA500",
        critical: "FF0000",
        success: "36A64F",
      };

      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `${severityEmoji[output.severity]} *${output.title}*\n${output.message}`,
        },
      });

      if (output.data) {
        blocks.push({
          type: "section",
          text: {
            type: "mrkdwn",
            text: `\`\`\`${JSON.stringify(output.data, null, 2)}\`\`\``,
          },
        });
      }
    }

    blocks.push({
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `_${new Date().toLocaleString()}_`,
        },
      ],
    });

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
  } catch (error) {
    console.error(`Failed to post to Slack for agent ${agent.slug}:`, error);
  }
}

// --- AGENT EXECUTORS ---

/**
 * @contracts - Fetch opportunities from SAM.gov
 */
async function executeContracts(agent: SisgAgent): Promise<AgentOutput[]> {
  const outputs: AgentOutput[] = [];

  try {
    const apiKey = process.env.SAM_GOV_API_KEY || "DEMO_KEY";
    const naicsCodes = agent.config.naicsCodes || ["541512", "541511"];

    // Calculate date range (last 7 days)
    const to = new Date();
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fromStr = from.toISOString().split("T")[0];

    // Fetch from SAM.gov (demo mode: limit results)
    const naicsParam = naicsCodes[0]; // Use first NAICS code for demo
    const url = `https://api.sam.gov/opportunities/v2/search?api_key=${apiKey}&limit=10&postedFrom=${fromStr}&naicsCode=${naicsParam}`;

    const response = await fetchWithTimeout(url, {}, 8000);

    if (response?.ok) {
      const data = await response.json() as any;
      const opportunities = data.opportunitiesData || [];

      if (opportunities.length > 0) {
        const newOppCount = Math.min(opportunities.length, 3); // Report top 3
        outputs.push({
          type: "alert",
          title: "New SAM.gov Opportunities Found",
          message: `Found ${opportunities.length} opportunities matching NAICS codes. Top ${newOppCount} listed.`,
          severity: "success",
          data: opportunities.slice(0, newOppCount).map((opp: any) => ({
            title: opp.title,
            notice_id: opp.noticeId,
            deadline: opp.responseDeadLine,
            agency: opp.organizationName,
          })),
        });
      } else {
        outputs.push({
          type: "notification",
          title: "SAM.gov Check Complete",
          message: "No new opportunities found in the last 7 days.",
          severity: "info",
        });
      }
    } else {
      outputs.push({
        type: "alert",
        title: "SAM.gov API Check",
        message: "Running in DEMO mode (limited data available)",
        severity: "info",
      });
    }
  } catch (error) {
    outputs.push({
      type: "alert",
      title: "SAM.gov Error",
      message: `Failed to fetch opportunities: ${error instanceof Error ? error.message : "Unknown error"}`,
      severity: "warning",
    });
  }

  return outputs;
}

/**
 * @proposals - Check for upcoming RFP deadlines and generate reports
 */
async function executeProposals(agent: SisgAgent): Promise<AgentOutput[]> {
  const outputs: AgentOutput[] = [];

  try {
    // Read contracts from storage to find active RFPs
    const contracts = storage.read("contracts") as any[];
    const now = new Date();

    // Filter for active RFPs with deadlines in next 30 days
    const activeRfps = contracts.filter((c: any) => {
      const deadline = new Date(c.deadline);
      const daysUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return c.status === "rfp" && daysUntilDeadline > 0 && daysUntilDeadline <= 30;
    }).sort((a: any, b: any) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime());

    if (activeRfps.length > 0) {
      outputs.push({
        type: "report",
        title: `Active RFPs: ${activeRfps.length} Deadline(s) Within 30 Days`,
        message: activeRfps.length === 1
          ? `1 RFP deadline approaching: ${activeRfps[0].title}`
          : `${activeRfps.length} RFP deadlines approaching`,
        severity: activeRfps.length > 2 ? "critical" : "warning",
        data: activeRfps.slice(0, 5).map((rfp: any) => ({
          title: rfp.title,
          deadline: rfp.deadline,
          value: rfp.value,
        })),
      });
    } else {
      outputs.push({
        type: "notification",
        title: "RFP Tracking",
        message: "No active RFPs with deadlines in the next 30 days.",
        severity: "info",
      });
    }
  } catch (error) {
    outputs.push({
      type: "alert",
      title: "Proposals Error",
      message: `Failed to check RFP deadlines: ${error instanceof Error ? error.message : "Unknown error"}`,
      severity: "warning",
    });
  }

  return outputs;
}

/**
 * @bd - Business development tracking and lead monitoring
 */
async function executeBd(agent: SisgAgent): Promise<AgentOutput[]> {
  const outputs: AgentOutput[] = [];

  try {
    // Read partnerships and leads from storage
    const partnerships = storage.read("partnerships") as any[];
    const now = new Date();

    // Find recent/active partnerships
    const activePartnerships = partnerships.filter((p: any) => {
      const createdDate = new Date(p.createdAt);
      const ageInDays = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      return p.status === "active" && ageInDays < 180;
    });

    if (activePartnerships.length > 0) {
      outputs.push({
        type: "report",
        title: `Active Partnership Opportunities: ${activePartnerships.length}`,
        message: `Currently tracking ${activePartnerships.length} active partnership opportunities.`,
        severity: "success",
        data: activePartnerships.slice(0, 3).map((p: any) => ({
          name: p.name,
          status: p.status,
          focus: p.focus,
        })),
      });
    } else {
      outputs.push({
        type: "notification",
        title: "BD Pipeline",
        message: "No active partnership opportunities currently tracked.",
        severity: "info",
      });
    }

    // Check for upcoming follow-ups
    const upcomingFollowups = partnerships.filter((p: any) => {
      if (!p.nextFollowup) return false;
      const followupDate = new Date(p.nextFollowup);
      const daysUntil = (followupDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntil > 0 && daysUntil <= 7;
    });

    if (upcomingFollowups.length > 0) {
      outputs.push({
        type: "action",
        title: `Follow-ups Due This Week: ${upcomingFollowups.length}`,
        message: `${upcomingFollowups.length} partnership follow-up(s) due within 7 days.`,
        severity: "warning",
      });
    }
  } catch (error) {
    outputs.push({
      type: "alert",
      title: "BD Error",
      message: `Failed to check partnerships: ${error instanceof Error ? error.message : "Unknown error"}`,
      severity: "warning",
    });
  }

  return outputs;
}

/**
 * @cyber - CVE monitoring and security alerts
 */
async function executeCyber(agent: SisgAgent): Promise<AgentOutput[]> {
  const outputs: AgentOutput[] = [];

  try {
    // Calculate date range (last 24 hours)
    const to = new Date();
    const from = new Date(to.getTime() - 24 * 60 * 60 * 1000);
    const pubStartDate = from.toISOString().split("T")[0];
    const pubEndDate = to.toISOString().split("T")[0];

    // Fetch CVEs from NVD API
    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=10&pubStartDate=${pubStartDate}T00:00:00&pubEndDate=${pubEndDate}T23:59:59&cvssV3Severity=CRITICAL,HIGH`;

    const nvdHeaders: Record<string, string> = {};
    if (process.env.NVD_API_KEY) {
      nvdHeaders["apiKey"] = process.env.NVD_API_KEY;
    }
    const response = await fetchWithTimeout(url, { headers: nvdHeaders }, 8000);

    if (response?.ok) {
      const data = await response.json() as any;
      const cves = data.vulnerabilities || [];

      // Filter for keywords relevant to typical IT/DoD stack
      const keywords = ["linux", "windows", "node", "express", "sql", "database", "network", "ssh", "ssl", "crypto"];
      const relevantCves = cves.filter((v: any) => {
        const desc = (v.cve?.descriptions?.[0]?.value || "").toLowerCase();
        return keywords.some(kw => desc.includes(kw));
      });

      if (relevantCves.length > 0) {
        outputs.push({
          type: "alert",
          title: `Security Alert: ${relevantCves.length} HIGH/CRITICAL CVEs`,
          message: `${relevantCves.length} new CVEs published in the last 24h matching your tech stack.`,
          severity: "critical",
          data: relevantCves.slice(0, 3).map((v: any) => ({
            cve_id: v.cve?.id,
            severity: v.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity || "HIGH",
            description: (v.cve?.descriptions?.[0]?.value || "").substring(0, 100),
          })),
        });
      } else {
        outputs.push({
          type: "notification",
          title: "CVE Check Complete",
          message: "No critical vulnerabilities matching your tech stack in the last 24h.",
          severity: "success",
        });
      }
    } else {
      outputs.push({
        type: "notification",
        title: "CVE Monitoring",
        message: "Running in DEMO mode (limited data available)",
        severity: "info",
      });
    }
  } catch (error) {
    outputs.push({
      type: "alert",
      title: "CVE Monitoring Error",
      message: `Failed to check CVEs: ${error instanceof Error ? error.message : "Unknown error"}`,
      severity: "warning",
    });
  }

  return outputs;
}

/**
 * @compliance - FAR/DFARS and regulatory deadline tracking
 */
async function executeCompliance(agent: SisgAgent): Promise<AgentOutput[]> {
  const outputs: AgentOutput[] = [];

  try {
    const now = new Date();

    // Known compliance deadlines (hardcoded for demo)
    const deadlines = [
      { name: "SAM.gov Registration Renewal", date: new Date(2026, 4, 15), category: "federal" },
      { name: "Annual Compliance Certification", date: new Date(2026, 5, 30), category: "internal" },
      { name: "Franchise Tax Filing", date: new Date(2026, 7, 15), category: "state" },
      { name: "DFARS Training Update", date: new Date(2026, 8, 1), category: "training" },
    ];

    // Filter for upcoming deadlines (7, 14, 30 days)
    const upcoming = deadlines.filter(d => {
      const daysUntil = (d.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntil > 0 && daysUntil <= 30;
    }).sort((a, b) => a.date.getTime() - b.date.getTime());

    if (upcoming.length > 0) {
      const critical = upcoming.filter(d => {
        const daysUntil = (d.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntil <= 7;
      });

      outputs.push({
        type: "alert",
        title: `Compliance Deadlines: ${upcoming.length} Coming Due`,
        message: critical.length > 0
          ? `${critical.length} critical deadline(s) within 7 days!`
          : `${upcoming.length} deadline(s) within 30 days.`,
        severity: critical.length > 0 ? "critical" : "warning",
        data: upcoming.slice(0, 5).map(d => ({
          deadline: d.name,
          dueDate: d.date.toISOString().split("T")[0],
          daysUntil: Math.ceil((d.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
        })),
      });
    } else {
      outputs.push({
        type: "notification",
        title: "Compliance Check",
        message: "No critical compliance deadlines in the next 30 days.",
        severity: "success",
      });
    }
  } catch (error) {
    outputs.push({
      type: "alert",
      title: "Compliance Error",
      message: `Failed to check deadlines: ${error instanceof Error ? error.message : "Unknown error"}`,
      severity: "warning",
    });
  }

  return outputs;
}

/**
 * @finance - Invoice and payment tracking
 */
async function executeFinance(agent: SisgAgent): Promise<AgentOutput[]> {
  const outputs: AgentOutput[] = [];

  try {
    // Read contracts for revenue/payment tracking
    const contracts = storage.read("contracts") as any[];
    const now = new Date();

    // Find upcoming payments or invoices due
    const upcomingPayments = contracts.filter((c: any) => {
      if (!c.invoiceDate) return false;
      const invoiceDate = new Date(c.invoiceDate);
      const daysUntil = (invoiceDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntil > 0 && daysUntil <= 30;
    }).sort((a: any, b: any) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime());

    // Calculate total contract value
    const totalValue = contracts.reduce((sum: number, c: any) => sum + (c.value || 0), 0);

    if (upcomingPayments.length > 0) {
      outputs.push({
        type: "alert",
        title: `Invoice Reminders: ${upcomingPayments.length} Due`,
        message: `${upcomingPayments.length} invoice(s) due within 30 days.`,
        severity: upcomingPayments.length > 3 ? "warning" : "info",
        data: upcomingPayments.slice(0, 3).map((p: any) => ({
          contract: p.title,
          invoiceDate: p.invoiceDate,
          amount: p.value,
        })),
      });
    }

    // Monthly summary
    outputs.push({
      type: "report",
      title: "Finance Summary",
      message: `Total contract value tracked: $${totalValue.toLocaleString()}. Active contracts: ${contracts.length}.`,
      severity: "info",
    });
  } catch (error) {
    outputs.push({
      type: "alert",
      title: "Finance Error",
      message: `Failed to check finances: ${error instanceof Error ? error.message : "Unknown error"}`,
      severity: "warning",
    });
  }

  return outputs;
}

/**
 * @hr - HR operations, onboarding, clearances
 */
async function executeHr(agent: SisgAgent): Promise<AgentOutput[]> {
  const outputs: AgentOutput[] = [];

  try {
    // Read team members from storage
    const team = storage.read("team") as any[];
    const now = new Date();

    // Check for pending onboarding
    const pendingOnboarding = team.filter((t: any) => t.status === "pending_onboarding");
    if (pendingOnboarding.length > 0) {
      outputs.push({
        type: "action",
        title: `Onboarding Pending: ${pendingOnboarding.length}`,
        message: `${pendingOnboarding.length} team member(s) awaiting onboarding completion.`,
        severity: "warning",
        data: pendingOnboarding.slice(0, 3).map((t: any) => ({
          name: t.name,
          startDate: t.startDate,
          role: t.role,
        })),
      });
    }

    // Check for upcoming clearance renewals
    const upcomingClearances = team.filter((t: any) => {
      if (!t.clearanceExpiryDate) return false;
      const expiryDate = new Date(t.clearanceExpiryDate);
      const daysUntil = (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntil > 0 && daysUntil <= 90;
    });

    if (upcomingClearances.length > 0) {
      outputs.push({
        type: "alert",
        title: `Security Clearance Renewals: ${upcomingClearances.length}`,
        message: `${upcomingClearances.length} clearance(s) expiring within 90 days.`,
        severity: upcomingClearances.length > 2 ? "warning" : "info",
        data: upcomingClearances.slice(0, 3).map((t: any) => ({
          name: t.name,
          level: t.clearanceLevel,
          expiryDate: t.clearanceExpiryDate,
        })),
      });
    }

    if (pendingOnboarding.length === 0 && upcomingClearances.length === 0) {
      outputs.push({
        type: "notification",
        title: "HR Status",
        message: `Team size: ${team.length}. No pending onboarding or clearance renewals.`,
        severity: "success",
      });
    }
  } catch (error) {
    outputs.push({
      type: "alert",
      title: "HR Error",
      message: `Failed to check HR status: ${error instanceof Error ? error.message : "Unknown error"}`,
      severity: "warning",
    });
  }

  return outputs;
}

/**
 * @dev - GitHub and development monitoring
 */
async function executeDev(agent: SisgAgent): Promise<AgentOutput[]> {
  const outputs: AgentOutput[] = [];

  try {
    const githubToken = process.env.GITHUB_TOKEN;

    if (githubToken) {
      // Real GitHub API call
      const headers = {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      };

      // Fetch open PRs
      const prResponse = await fetchWithTimeout(
        "https://api.github.com/repos/HM2SOFTENG/sisg-platform/pulls?state=open&per_page=5",
        { headers },
        8000
      );

      if (prResponse?.ok) {
        const prs = await prResponse.json() as any[];
        if (prs.length > 0) {
          outputs.push({
            type: "report",
            title: `Open Pull Requests: ${prs.length}`,
            message: `${prs.length} PR(s) awaiting review.`,
            severity: prs.length > 3 ? "warning" : "info",
            data: prs.slice(0, 3).map((pr: any) => ({
              title: pr.title,
              author: pr.user.login,
              created: pr.created_at,
            })),
          });
        }
      }
    } else {
      // Fallback: mock data
      outputs.push({
        type: "notification",
        title: "GitHub Monitoring",
        message: "GitHub token not configured. Running in demo mode.",
        severity: "info",
      });
    }

    // Read projects from storage for local tracking
    const projects = storage.read("projects") as any[];
    const activeProjects = projects.filter((p: any) => p.status === "active");

    outputs.push({
      type: "report",
      title: `Active Projects: ${activeProjects.length}`,
      message: `${activeProjects.length} project(s) in active development.`,
      severity: "info",
      data: activeProjects.slice(0, 3).map((p: any) => ({
        name: p.name,
        status: p.status,
        progress: p.progress || 0,
      })),
    });
  } catch (error) {
    outputs.push({
      type: "alert",
      title: "Dev Error",
      message: `Failed to check development status: ${error instanceof Error ? error.message : "Unknown error"}`,
      severity: "warning",
    });
  }

  return outputs;
}

/**
 * @veterans - SDVOSB and veterans set-aside tracking
 */
async function executeVeterans(agent: SisgAgent): Promise<AgentOutput[]> {
  const outputs: AgentOutput[] = [];

  try {
    // Check for SDVOSB-related opportunities (from SAM.gov data or local tracking)
    const contracts = storage.read("contracts") as any[];
    const sdvosbs = contracts.filter((c: any) => c.setAsides?.includes("SDVOSB") || c.type === "sdvosb");

    if (sdvosbs.length > 0) {
      outputs.push({
        type: "report",
        title: `SDVOSB Opportunities: ${sdvosbs.length} Active`,
        message: `Tracking ${sdvosbs.length} Service-Disabled Veteran-Owned Small Business opportunity/contract.`,
        severity: "success",
        data: sdvosbs.slice(0, 3).map((s: any) => ({
          title: s.title,
          status: s.status,
          value: s.value,
        })),
      });
    }

    // Check certification status
    const certStatus = storage.read("veteran_certifications") as any[];
    const activeCerts = certStatus.filter((c: any) => c.status === "active");

    outputs.push({
      type: "report",
      title: `Veteran Certifications: ${activeCerts.length}`,
      message: `Current active veteran-related certifications: ${activeCerts.length}.`,
      severity: "info",
      data: activeCerts.slice(0, 2).map((c: any) => ({
        certification: c.name,
        expiryDate: c.expiryDate,
      })),
    });
  } catch (error) {
    outputs.push({
      type: "alert",
      title: "Veterans Error",
      message: `Failed to check veteran status: ${error instanceof Error ? error.message : "Unknown error"}`,
      severity: "warning",
    });
  }

  return outputs;
}

/**
 * @sisg - Daily briefing and coordination
 */
async function executeSisg(agent: SisgAgent): Promise<AgentOutput[]> {
  const outputs: AgentOutput[] = [];

  try {
    // Aggregate data from other agents
    const runs = storage.read("sisg_agent_runs") as AgentRun[];
    const agents = storage.read("sisg_agents") as SisgAgent[];

    // Get latest run for each agent
    const latestRuns: Record<string, AgentRun | null> = {};
    for (const a of agents) {
      const agentRuns = runs.filter(r => r.agentSlug === a.slug).sort((a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );
      latestRuns[a.slug] = agentRuns[0] || null;
    }

    // Build briefing report
    const deployedAgents = agents.filter(a => a.status === "deployed");
    const erroredAgents = agents.filter(a => a.status === "error");
    const totalAlerts = Object.values(latestRuns).reduce((sum, run) => {
      if (!run) return sum;
      return sum + (run.output?.filter(o => o.severity === "critical").length || 0);
    }, 0);

    outputs.push({
      type: "report",
      title: "Daily Briefing - SISG Operations",
      message: `${deployedAgents.length} agents deployed. ${erroredAgents.length} errors. ${totalAlerts} critical alerts.`,
      severity: totalAlerts > 0 ? "warning" : "success",
      data: {
        deployed: deployedAgents.length,
        errors: erroredAgents.length,
        critical_alerts: totalAlerts,
        recent_runs: Object.entries(latestRuns)
          .filter(([_, run]) => run !== null)
          .slice(0, 5)
          .map(([slug, run]) => ({
            agent: slug,
            status: run?.status,
            outputs: run?.output?.length || 0,
          })),
      },
    });

    // Check for any critical issues
    if (erroredAgents.length > 0) {
      outputs.push({
        type: "alert",
        title: `Agent Errors: ${erroredAgents.length}`,
        message: `${erroredAgents.map(a => a.slug).join(", ")} experiencing errors.`,
        severity: "critical",
      });
    }
  } catch (error) {
    outputs.push({
      type: "alert",
      title: "SISG Briefing Error",
      message: `Failed to generate briefing: ${error instanceof Error ? error.message : "Unknown error"}`,
      severity: "warning",
    });
  }

  return outputs;
}

/**
 * Execute an agent by slug
 */
async function executeAgentBySlug(slug: string, agent: SisgAgent): Promise<AgentOutput[]> {
  switch (slug) {
    case "sisg": return executeSisg(agent);
    case "contracts": return executeContracts(agent);
    case "proposals": return executeProposals(agent);
    case "bd": return executeBd(agent);
    case "cyber": return executeCyber(agent);
    case "compliance": return executeCompliance(agent);
    case "finance": return executeFinance(agent);
    case "hr": return executeHr(agent);
    case "dev": return executeDev(agent);
    case "veterans": return executeVeterans(agent);
    default:
      return [{ type: "alert", title: "Unknown Agent", message: `Agent '${slug}' not found.`, severity: "warning" }];
  }
}

// --- PUBLIC API ---

export const sisgAgents = {
  /**
   * Initialize agents on first run
   */
  async initialize(): Promise<void> {
    const existing = storage.read("sisg_agents") as SisgAgent[];
    if (existing.length > 0) return; // Already initialized

    const now = new Date().toISOString();
    const nextRunTime = parseNextRun(AGENT_DEFINITIONS[0].schedule);

    const agents = AGENT_DEFINITIONS.map(def => ({
      ...def,
      id: crypto.randomUUID(),
      status: "undeployed" as const,
      lastRun: "never",
      nextRun: nextRunTime.toISOString(),
      lastResult: "",
      errorCount: 0,
      successCount: 0,
      totalRuns: 0,
      deployedAt: "",
    }));

    storage.write("sisg_agents", agents);
    console.log(`✅ Initialized ${agents.length} SISG agents`);
  },

  /**
   * Get all agents
   */
  async getAgents(): Promise<SisgAgent[]> {
    return storage.read("sisg_agents") as SisgAgent[];
  },

  /**
   * Get single agent by slug or ID
   */
  async getAgent(slugOrId: string): Promise<SisgAgent | null> {
    const agents = storage.read("sisg_agents") as SisgAgent[];
    return agents.find(a => a.slug === slugOrId || a.id === slugOrId) || null;
  },

  /**
   * Deploy an agent
   */
  async deployAgent(slug: string): Promise<SisgAgent> {
    const agent = await this.getAgent(slug);
    if (!agent) throw new Error(`Agent ${slug} not found`);

    const nextRunTime = parseNextRun(agent.schedule);
    const updated = storage.update("sisg_agents", agent.id, {
      status: "deployed",
      deployedAt: new Date().toISOString(),
      nextRun: nextRunTime.toISOString(),
    }) as SisgAgent;

    console.log(`✅ Deployed agent: ${slug}`);
    return updated;
  },

  /**
   * Stop an agent
   */
  async stopAgent(slug: string): Promise<SisgAgent> {
    const agent = await this.getAgent(slug);
    if (!agent) throw new Error(`Agent ${slug} not found`);

    const updated = storage.update("sisg_agents", agent.id, {
      status: "stopped",
    }) as SisgAgent;

    console.log(`⏹️  Stopped agent: ${slug}`);
    return updated;
  },

  /**
   * Update agent config
   */
  async updateAgentConfig(slug: string, config: Record<string, any>): Promise<SisgAgent> {
    const agent = await this.getAgent(slug);
    if (!agent) throw new Error(`Agent ${slug} not found`);

    const updated = storage.update("sisg_agents", agent.id, {
      config: { ...agent.config, ...config },
    }) as SisgAgent;

    return updated;
  },

  /**
   * Run an agent manually
   */
  async runAgent(slug: string, trigger: "schedule" | "manual" | "api" | "event" = "manual"): Promise<AgentRun> {
    const agent = await this.getAgent(slug);
    if (!agent) throw new Error(`Agent ${slug} not found`);

    const runId = crypto.randomUUID();
    const startedAt = new Date().toISOString();

    // Create run record
    const run: AgentRun = {
      id: runId,
      agentId: agent.id,
      agentSlug: slug,
      trigger,
      status: "running",
      startedAt,
      output: [],
    };
    storage.add("sisg_agent_runs", run);

    try {
      // Execute agent logic
      const startMs = Date.now();
      const output = await executeAgentBySlug(slug, agent);
      const duration = Date.now() - startMs;

      // Update run with results
      const completedAt = new Date().toISOString();
      const updated = storage.update("sisg_agent_runs", runId, {
        status: "completed",
        output,
        completedAt,
        duration,
      }) as AgentRun;

      // Update agent metrics
      const agentUpdates: Partial<SisgAgent> = {
        lastRun: completedAt,
        successCount: agent.successCount + 1,
        totalRuns: agent.totalRuns + 1,
        lastResult: `Success (${duration}ms) - ${output.length} outputs`,
      };

      if (trigger === "schedule") {
        const nextRunTime = parseNextRun(agent.schedule, new Date(completedAt));
        agentUpdates.nextRun = nextRunTime.toISOString();
      }

      storage.update("sisg_agents", agent.id, agentUpdates);

      // Post to Slack
      await postToSlack(agent, output);

      console.log(`✅ Agent run complete: ${slug} (${duration}ms)`);
      return updated;
    } catch (error) {
      const completedAt = new Date().toISOString();
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      const updated = storage.update("sisg_agent_runs", runId, {
        status: "failed",
        error: errorMsg,
        completedAt,
      }) as AgentRun;

      // Update agent with error
      storage.update("sisg_agents", agent.id, {
        status: "error",
        lastRun: completedAt,
        errorCount: agent.errorCount + 1,
        totalRuns: agent.totalRuns + 1,
        lastResult: `Error: ${errorMsg}`,
      });

      console.error(`❌ Agent run failed: ${slug} - ${errorMsg}`);
      return updated;
    }
  },

  /**
   * Get agent runs with optional filtering
   */
  async getAgentRuns(slug?: string, limit: number = 50): Promise<AgentRun[]> {
    let runs = storage.read("sisg_agent_runs") as AgentRun[];

    if (slug) {
      runs = runs.filter(r => r.agentSlug === slug);
    }

    return runs
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, limit);
  },

  /**
   * Get latest run for an agent
   */
  async getLatestRun(slug: string): Promise<AgentRun | null> {
    const runs = await this.getAgentRuns(slug, 1);
    return runs[0] || null;
  },

  /**
   * Start the scheduler
   */
  startScheduler(): void {
    if (schedulerRunning) return;

    console.log("🚀 Starting SISG agent scheduler...");
    schedulerRunning = true;

    schedulerInterval = setInterval(async () => {
      try {
        const agents = storage.read("sisg_agents") as SisgAgent[];

        for (const agent of agents) {
          if (agent.status !== "deployed") continue;
          if (agent.schedule === "manual") continue;

          const nextRun = new Date(agent.nextRun);
          if (nextRun > new Date()) continue; // Not due yet

          console.log(`⏰ Running scheduled agent: ${agent.slug}`);
          await this.runAgent(agent.slug, "schedule");
        }
      } catch (error) {
        console.error("Scheduler error:", error);
      }
    }, 60000); // Check every minute
  },

  /**
   * Stop the scheduler
   */
  stopScheduler(): void {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
    }
    schedulerRunning = false;
    console.log("⏹️  Stopped SISG agent scheduler");
  },

  /**
   * Get scheduler status
   */
  getSchedulerStatus(): { running: boolean; agents: number; nextRuns: Record<string, string> } {
    const agents = storage.read("sisg_agents") as SisgAgent[];
    const deployed = agents.filter(a => a.status === "deployed" && a.schedule !== "manual");

    const nextRuns: Record<string, string> = {};
    for (const agent of deployed) {
      nextRuns[agent.slug] = agent.nextRun;
    }

    return {
      running: schedulerRunning,
      agents: deployed.length,
      nextRuns,
    };
  },
};

export default sisgAgents;
