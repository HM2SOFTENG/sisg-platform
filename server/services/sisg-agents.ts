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
    const apiKey = process.env.SAM_GOV_API_KEY;
    if (!apiKey) {
      outputs.push({
        type: "alert",
        title: "SAM.gov API Check",
        message: "SAM_GOV_API_KEY not configured. Add it to environment variables to enable contract monitoring.",
        severity: "warning",
      });
      return outputs;
    }

    const naicsCodes = agent.config.naicsCodes || ["541512", "541511"];
    const setAsides = agent.config.setAsides || ["SDVOSBC", "SBA", "8A"];
    const now = new Date();

    // Date formatting helper (MM/dd/yyyy)
    const toMDY = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;

    // Scan last 14 days for broader coverage
    const from = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const fromStr = toMDY(from);
    const toStr = toMDY(now);

    // Fetch opportunities across ALL configured NAICS codes
    let allOpportunities: any[] = [];
    let totalRecordsSum = 0;
    const fetchErrors: string[] = [];
    const seenNoticeIds = new Set<string>();

    // Helper: delay between API calls to avoid rate limiting (SAM.gov free tier)
    const rateLimitDelay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    for (let i = 0; i < naicsCodes.length; i++) {
      const ncode = naicsCodes[i];
      // Wait 1.5s between requests to stay within SAM.gov rate limits
      if (i > 0) await rateLimitDelay(1500);
      const url = `https://api.sam.gov/opportunities/v2/search?api_key=${apiKey}&limit=25&offset=0&postedFrom=${fromStr}&postedTo=${toStr}&ncode=${ncode}`;
      const response = await fetchWithTimeout(url, {}, 20000);

      if (response?.ok) {
        const data = await response.json() as any;
        totalRecordsSum += data.totalRecords || 0;
        const opps = data.opportunitiesData || [];
        for (const opp of opps) {
          if (!seenNoticeIds.has(opp.noticeId)) {
            seenNoticeIds.add(opp.noticeId);
            allOpportunities.push(opp);
          }
        }
      } else if (response?.status === 429) {
        // Rate limited — stop making more requests, use what we have
        let errBody = "";
        try { errBody = (await response?.text() || "").substring(0, 100); } catch {}
        fetchErrors.push(`NAICS ${ncode}: HTTP 429 (rate limited) ${errBody}`);
        console.warn(`SAM.gov rate limited on NAICS ${ncode} — stopping further NAICS queries`);
        break;
      } else {
        const status = response?.status || "timeout";
        let errBody = "";
        try { errBody = (await response?.text() || "").substring(0, 100); } catch {}
        fetchErrors.push(`NAICS ${ncode}: HTTP ${status} ${errBody}`);
      }
    }

    // Also do a set-aside-specific search for SDVOSB opportunities
    for (let i = 0; i < Math.min(setAsides.length, 2); i++) {
      const setAside = setAsides[i];
      // Wait between requests to avoid rate limiting
      await rateLimitDelay(1500);
      const url = `https://api.sam.gov/opportunities/v2/search?api_key=${apiKey}&limit=15&offset=0&postedFrom=${fromStr}&postedTo=${toStr}&typeOfSetAside=${setAside}`;
      const response = await fetchWithTimeout(url, {}, 20000);
      if (response?.ok) {
        const data = await response.json() as any;
        const opps = data.opportunitiesData || [];
        for (const opp of opps) {
          if (!seenNoticeIds.has(opp.noticeId)) {
            seenNoticeIds.add(opp.noticeId);
            allOpportunities.push(opp);
          }
        }
      } else if (response?.status === 429) {
        console.warn(`SAM.gov rate limited on set-aside ${setAside} — stopping`);
        break;
      }
    }

    // Score and categorize opportunities
    const scored = allOpportunities.map((opp: any) => {
      let score = 0;
      const reasons: string[] = [];
      const naics = opp.naicsCode || "";
      const setAside = opp.typeOfSetAside || "";
      const title = (opp.title || "").toLowerCase();
      const type = opp.type || opp.baseType || "";

      // NAICS match
      if (naicsCodes.includes(naics)) { score += 30; reasons.push(`NAICS ${naics} match`); }
      // Set-aside match (SDVOSB is highest priority for veteran-owned)
      if (setAside === "SDVOSBC" || setAside === "SDVOSBS") { score += 25; reasons.push("SDVOSB set-aside"); }
      else if (setAsides.includes(setAside)) { score += 15; reasons.push(`${setAside} set-aside`); }
      // Keyword relevance
      const keywords = ["software", "it ", "information technology", "cybersecurity", "cloud", "devops",
        "system integration", "application", "development", "engineering", "security", "data",
        "network", "infrastructure", "migration", "modernization", "agile", "scrum"];
      const matched = keywords.filter(kw => title.includes(kw));
      if (matched.length > 0) { score += matched.length * 5; reasons.push(`Keywords: ${matched.join(", ")}`); }
      // Solicitation type bonus
      if (type === "Solicitation" || type === "Combined Synopsis/Solicitation") { score += 10; reasons.push("Active solicitation"); }
      else if (type === "Sources Sought") { score += 5; reasons.push("Sources sought — early positioning"); }
      else if (type === "Pre solicitation") { score += 8; reasons.push("Pre-solicitation — upcoming"); }
      // Deadline urgency
      if (opp.responseDeadLine) {
        const deadline = new Date(opp.responseDeadLine);
        const daysLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        if (daysLeft > 0 && daysLeft <= 14) { score += 10; reasons.push(`Deadline in ${Math.round(daysLeft)} days`); }
        else if (daysLeft > 14 && daysLeft <= 30) { score += 5; reasons.push(`Deadline in ${Math.round(daysLeft)} days`); }
      }

      return { ...opp, _score: score, _reasons: reasons };
    });

    // Sort by score descending
    scored.sort((a: any, b: any) => b._score - a._score);
    const highValue = scored.filter((s: any) => s._score >= 30);
    const medValue = scored.filter((s: any) => s._score >= 15 && s._score < 30);

    // Persist opportunities to storage — merge with existing data to avoid duplicates
    // Uses upsert: new opportunities are added, existing ones are updated with fresh scores/data
    // Expired opportunities (past deadline + 7-day grace period) are pruned automatically
    if (scored.length > 0) {
      const newOpps = scored.slice(0, 50).map((opp: any) => ({
        id: opp.noticeId,
        noticeId: opp.noticeId,
        title: opp.title || "Untitled",
        solicitationNumber: opp.solicitationNumber || "",
        type: opp.type || opp.baseType || "Unknown",
        postedDate: opp.postedDate || "",
        responseDeadline: opp.responseDeadLine || null,
        archiveDate: opp.archiveDate || null,
        naicsCode: opp.naicsCode || "",
        classificationCode: opp.classificationCode || "",
        setAside: opp.typeOfSetAside || "",
        setAsideDescription: opp.typeOfSetAsideDescription || "",
        organization: opp.fullParentPathName || opp.department || "",
        department: opp.department || opp.fullParentPathName?.split(".")?.[0] || "",
        subTier: opp.subtierAgency || opp.fullParentPathName?.split(".")?.slice(1).join(".") || "",
        office: opp.office || "",
        placeOfPerformance: opp.placeOfPerformance?.state?.code || "",
        placeOfPerformanceCity: opp.placeOfPerformance?.city?.name || "",
        placeOfPerformanceCountry: opp.placeOfPerformance?.country?.code || "US",
        awardAmount: opp.award?.amount || null,
        awardDate: opp.award?.date || null,
        awardNumber: opp.award?.number || null,
        awardee: opp.award?.awardee?.name || null,
        score: opp._score,
        reasons: opp._reasons,
        description: opp.description || "",
        additionalInfo: opp.additionalInfoLink || null,
        uiLink: opp.uiLink || "",
        pointOfContact: opp.pointOfContact?.[0] || null,
        additionalContacts: opp.pointOfContact?.slice(1) || [],
        active: opp.active,
        organizationType: opp.organizationType || "",
        officeAddress: opp.officeAddress || null,
        resourceLinks: opp.resourceLinks || [],
        fetchedAt: now.toISOString(),
      }));

      // Merge strategy: read existing opps, upsert new ones by noticeId, prune expired
      const existingOpps = storage.read("sam_opportunities") as any[];
      const mergedMap = new Map<string, any>();

      // Load existing opportunities into map
      for (const opp of existingOpps) {
        if (opp.id || opp.noticeId) {
          mergedMap.set(opp.id || opp.noticeId, opp);
        }
      }

      // Upsert new/updated opportunities (overwrites stale data for same noticeId)
      for (const opp of newOpps) {
        mergedMap.set(opp.id, opp);
      }

      // Prune expired opportunities (deadline passed + 7-day grace period)
      const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const mergedOpps = Array.from(mergedMap.values()).filter((opp: any) => {
        if (!opp.responseDeadline) return true; // keep if no deadline
        const deadline = new Date(opp.responseDeadline);
        return deadline.getTime() > cutoff.getTime(); // keep if not expired beyond grace
      });

      // Sort by score and cap total stored at 200 to control DB size
      mergedOpps.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));
      const finalOpps = mergedOpps.slice(0, 200);

      storage.write("sam_opportunities", finalOpps);
    } else if (fetchErrors.length > 0) {
      // API calls failed — don't overwrite stored opportunities, just log the failure
      outputs.push({
        type: "alert",
        title: "SAM.gov API Temporarily Unavailable",
        message: `Failed to fetch new opportunities due to API errors. Using previously cached opportunities instead to ensure proposals can be generated.`,
        severity: "warning",
        data: {
          api_errors: fetchErrors,
          note: "This is expected if SAM.gov API is down. Cached data will be reused.",
        },
      });
    }

    // Build comprehensive report
    outputs.push({
      type: "report",
      title: `SAM.gov Intelligence Report — ${allOpportunities.length} Opportunities Analyzed`,
      message: `Scanned ${naicsCodes.length} NAICS codes and ${setAsides.length} set-aside types across 14 days. ${highValue.length} high-value, ${medValue.length} medium-value opportunities identified.`,
      severity: highValue.length > 0 ? "success" : "info",
      data: {
        scan_summary: {
          period: `${fromStr} — ${toStr}`,
          naics_codes: naicsCodes,
          set_asides_monitored: setAsides,
          total_unique_opportunities: allOpportunities.length,
          high_value_matches: highValue.length,
          medium_value_matches: medValue.length,
          api_errors: fetchErrors.length > 0 ? fetchErrors : "none",
        },
        top_opportunities: scored.slice(0, 10).map((opp: any) => ({
          score: opp._score,
          match_reasons: opp._reasons,
          title: opp.title || "Untitled",
          solicitation_number: opp.solicitationNumber || "N/A",
          type: opp.type || opp.baseType || "Unknown",
          posted_date: opp.postedDate || "N/A",
          response_deadline: opp.responseDeadLine || "Open",
          naics_code: opp.naicsCode || "N/A",
          set_aside: opp.typeOfSetAsideDescription || "Full & Open",
          organization: opp.fullParentPathName || "N/A",
          place_of_performance: opp.placeOfPerformance?.state?.code || "N/A",
          contact: opp.pointOfContact?.[0] ? {
            name: opp.pointOfContact[0].fullName,
            email: opp.pointOfContact[0].email,
            phone: opp.pointOfContact[0].phone,
          } : null,
          award: opp.award?.amount ? { amount: `$${Number(opp.award.amount).toLocaleString()}`, date: opp.award.date } : null,
        })),
        opportunity_types: Object.entries(
          allOpportunities.reduce((acc: any, opp: any) => {
            const t = opp.type || opp.baseType || "Unknown";
            acc[t] = (acc[t] || 0) + 1;
            return acc;
          }, {})
        ).map(([type, count]) => ({ type, count })),
      },
    });

    // Alert for high-urgency deadlines
    const urgentDeadlines = scored.filter((opp: any) => {
      if (!opp.responseDeadLine) return false;
      const daysLeft = (new Date(opp.responseDeadLine).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysLeft > 0 && daysLeft <= 7 && opp._score >= 20;
    });

    if (urgentDeadlines.length > 0) {
      outputs.push({
        type: "alert",
        title: `URGENT: ${urgentDeadlines.length} High-Value Deadlines Within 7 Days`,
        message: `${urgentDeadlines.length} scored opportunities have response deadlines this week. Immediate review recommended.`,
        severity: "critical",
        data: urgentDeadlines.slice(0, 5).map((opp: any) => ({
          title: opp.title,
          deadline: opp.responseDeadLine,
          score: opp._score,
          solicitation: opp.solicitationNumber,
        })),
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
 * @proposals - Generate proposal briefs from stored SAM.gov opportunities
 * Reads opportunities persisted by the contracts agent, scores them for bid/no-bid,
 * and generates proposal outline summaries for the highest-value targets.
 */
async function executeProposals(agent: SisgAgent): Promise<AgentOutput[]> {
  const outputs: AgentOutput[] = [];

  try {
    const now = new Date();
    // Read SAM.gov opportunities stored by contracts agent
    const samOpps = storage.read("sam_opportunities") as any[];

    if (samOpps.length === 0) {
      outputs.push({
        type: "notification",
        title: "Proposals Agent",
        message: "No SAM.gov opportunities in pipeline. Run the Contracts agent first to populate the opportunity database.",
        severity: "info",
      });
      return outputs;
    }

    // Filter for actionable opportunities (solicitations with deadlines)
    const actionable = samOpps.filter((opp: any) => {
      if (!opp.responseDeadline) return opp.score >= 25; // Include high-scored even without deadline
      const deadline = new Date(opp.responseDeadline);
      const daysLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysLeft > 0 && opp.score >= 15;
    }).sort((a: any, b: any) => b.score - a.score);

    // Generate proposal briefs for top opportunities
    const proposalBriefs = actionable.slice(0, 8).map((opp: any) => {
      const daysLeft = opp.responseDeadline
        ? Math.round((new Date(opp.responseDeadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : null;

      // Determine bid recommendation
      let bidRecommendation = "REVIEW";
      let bidRationale = "";
      if (opp.score >= 40) {
        bidRecommendation = "STRONG BID";
        bidRationale = "High NAICS + set-aside alignment with SISG core competencies.";
      } else if (opp.score >= 25) {
        bidRecommendation = "RECOMMENDED";
        bidRationale = "Good alignment with capabilities. Review scope and past performance fit.";
      } else {
        bidRecommendation = "EVALUATE";
        bidRationale = "Partial match — assess teaming or subcontracting potential.";
      }

      // Generate capability alignment assessment
      const capabilities: string[] = [];
      const titleLower = (opp.title || "").toLowerCase();
      if (titleLower.match(/software|application|development|devops/)) capabilities.push("Custom Software Development");
      if (titleLower.match(/cyber|security|cmmc|nist/)) capabilities.push("Cybersecurity & CMMC Compliance");
      if (titleLower.match(/cloud|aws|azure|migration/)) capabilities.push("Cloud Migration & Infrastructure");
      if (titleLower.match(/data|analytics|ai|machine learning/)) capabilities.push("Data Analytics & AI/ML");
      if (titleLower.match(/network|infrastructure|system/)) capabilities.push("IT Systems Integration");
      if (titleLower.match(/support|help desk|maintenance/)) capabilities.push("IT Support & Managed Services");
      if (titleLower.match(/agile|scrum|project management/)) capabilities.push("Agile Program Management");
      if (capabilities.length === 0) capabilities.push("General IT Services — review scope for alignment");

      // Determine approach strategy
      let strategy = "Prime Contractor";
      if (opp.setAside === "SDVOSBC" || opp.setAside === "SDVOSBS") {
        strategy = "Prime Contractor (SDVOSB Set-Aside — SISG eligible)";
      } else if (opp.score < 25) {
        strategy = "Subcontractor / Teaming Partner — identify prime";
      }

      return {
        opportunity: {
          title: opp.title,
          solicitation: opp.solicitationNumber || "N/A",
          organization: opp.organization || "N/A",
          naics: opp.naicsCode,
          set_aside: opp.setAsideDescription || "Full & Open",
          posted: opp.postedDate,
          deadline: opp.responseDeadline || "TBD",
          days_remaining: daysLeft,
          score: opp.score,
        },
        proposal_brief: {
          bid_recommendation: bidRecommendation,
          rationale: bidRationale,
          capability_alignment: capabilities,
          pursuit_strategy: strategy,
          key_personnel_needed: capabilities.length > 2 ? "Project Manager, Technical Lead, Subject Matter Experts" : "Project Manager, Technical Lead",
          estimated_level_of_effort: daysLeft && daysLeft < 14 ? "EXPEDITED — fast-track proposal development" : "Standard proposal timeline",
          past_performance_relevance: "Review SISG past performance database for similar NAICS/scope",
        },
        next_steps: [
          daysLeft && daysLeft <= 7 ? "IMMEDIATE: Bid/No-Bid decision required today" : "Schedule Bid/No-Bid review meeting",
          "Download full solicitation documents from SAM.gov",
          "Identify key personnel and subcontractors",
          "Review compliance requirements (FAR/DFARS clauses)",
          opp.pointOfContact ? `Contact: ${opp.pointOfContact.fullName} (${opp.pointOfContact.email})` : "Identify contracting officer",
        ],
      };
    });

    // Pipeline summary
    const strongBids = proposalBriefs.filter(b => b.proposal_brief.bid_recommendation === "STRONG BID");
    const recommended = proposalBriefs.filter(b => b.proposal_brief.bid_recommendation === "RECOMMENDED");

    outputs.push({
      type: "report",
      title: `Proposal Pipeline — ${proposalBriefs.length} Opportunities Briefed`,
      message: `Generated proposal briefs for ${proposalBriefs.length} opportunities. ${strongBids.length} strong bid recommendations, ${recommended.length} recommended for pursuit. ${samOpps.length} total opportunities in database.`,
      severity: strongBids.length > 0 ? "success" : "info",
      data: {
        pipeline_summary: {
          total_in_database: samOpps.length,
          actionable_opportunities: actionable.length,
          briefs_generated: proposalBriefs.length,
          strong_bids: strongBids.length,
          recommended_bids: recommended.length,
          evaluate: proposalBriefs.length - strongBids.length - recommended.length,
        },
        proposal_briefs: proposalBriefs,
      },
    });

    // Deadline alerts
    const deadlineAlerts = proposalBriefs.filter(b =>
      b.opportunity.days_remaining !== null && b.opportunity.days_remaining <= 14
    );

    if (deadlineAlerts.length > 0) {
      outputs.push({
        type: "alert",
        title: `Proposal Deadlines: ${deadlineAlerts.length} Due Within 14 Days`,
        message: `${deadlineAlerts.length} proposal-worthy opportunities have response deadlines within 2 weeks.`,
        severity: "critical",
        data: deadlineAlerts.map(b => ({
          title: b.opportunity.title,
          deadline: b.opportunity.deadline,
          days_left: b.opportunity.days_remaining,
          recommendation: b.proposal_brief.bid_recommendation,
        })),
      });
    }

    // Also check locally tracked RFPs from manual entries
    const contracts = storage.read("contracts") as any[];
    const manualRfps = contracts.filter((c: any) => {
      if (c.status !== "rfp") return false;
      const deadline = new Date(c.deadline);
      const daysLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysLeft > 0 && daysLeft <= 30;
    });

    if (manualRfps.length > 0) {
      outputs.push({
        type: "report",
        title: `Manually Tracked RFPs: ${manualRfps.length}`,
        message: `${manualRfps.length} manually-entered RFP(s) with upcoming deadlines.`,
        severity: "warning",
        data: manualRfps.slice(0, 5).map((rfp: any) => ({
          title: rfp.title,
          deadline: rfp.deadline,
          value: rfp.value,
        })),
      });
    }
  } catch (error) {
    outputs.push({
      type: "alert",
      title: "Proposals Error",
      message: `Failed to generate proposal briefs: ${error instanceof Error ? error.message : "Unknown error"}`,
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

    // Fetch CVEs from NVD API (two calls: CRITICAL and HIGH, since cvssV3Severity only accepts one value)
    const severities = ["CRITICAL", "HIGH"];
    const nvdHeaders: Record<string, string> = {};
    const hasNvdKey = !!process.env.NVD_API_KEY;
    if (hasNvdKey) {
      nvdHeaders["apiKey"] = process.env.NVD_API_KEY!;
    }

    let allVulnerabilities: any[] = [];
    let apiError = false;
    let lastStatus = "";

    for (const severity of severities) {
      const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?resultsPerPage=5&pubStartDate=${pubStartDate}T00:00:00&pubEndDate=${pubEndDate}T23:59:59&cvssV3Severity=${severity}`;
      const response = await fetchWithTimeout(url, { headers: nvdHeaders }, 15000);

      if (response?.ok) {
        const data = await response.json() as any;
        allVulnerabilities = allVulnerabilities.concat(data.vulnerabilities || []);
      } else {
        apiError = true;
        lastStatus = String(response?.status || "no response");
      }
    }

    if (apiError && allVulnerabilities.length === 0) {
      outputs.push({
        type: "alert",
        title: "NVD API Error",
        message: `CVE check failed (status ${lastStatus}).${hasNvdKey ? " API key may be invalid." : " No API key configured."} Will retry next cycle.`,
        severity: "warning",
      });
    } else {
      // Filter for keywords relevant to typical IT/DoD stack
      const keywords = ["linux", "windows", "node", "express", "sql", "database", "network", "ssh", "ssl", "crypto", "docker", "nginx", "apache", "react", "javascript", "typescript", "postgresql", "api", "authentication", "authorization", "firewall", "vpn", "dns", "tls"];
      const relevantCves = allVulnerabilities.filter((v: any) => {
        const desc = (v.cve?.descriptions?.[0]?.value || "").toLowerCase();
        return keywords.some(kw => desc.includes(kw));
      });

      // Build detailed report
      outputs.push({
        type: "report",
        title: `Cybersecurity Scan — ${allVulnerabilities.length} CVEs Analyzed`,
        message: `Scanned NVD for CRITICAL and HIGH severity CVEs published ${pubStartDate} to ${pubEndDate}. ${allVulnerabilities.length} total CVEs found, ${relevantCves.length} match your tech stack.${hasNvdKey ? " (Authenticated API)" : " (Public API — rate limited)"}`,
        severity: relevantCves.length > 0 ? "critical" : "success",
        data: {
          summary: {
            scan_period: `${pubStartDate} to ${pubEndDate}`,
            total_cves_found: allVulnerabilities.length,
            relevant_to_stack: relevantCves.length,
            api_mode: hasNvdKey ? "authenticated" : "public (rate-limited)",
            keywords_monitored: keywords.slice(0, 10).join(", ") + "...",
          },
          critical_findings: relevantCves.slice(0, 5).map((v: any) => ({
            cve_id: v.cve?.id,
            severity: v.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity || v.cve?.metrics?.cvssMetricV30?.[0]?.cvssData?.baseSeverity || "HIGH",
            cvss_score: v.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || v.cve?.metrics?.cvssMetricV30?.[0]?.cvssData?.baseScore || "N/A",
            description: (v.cve?.descriptions?.[0]?.value || "").substring(0, 200),
            published: v.cve?.published || "N/A",
            references: (v.cve?.references || []).slice(0, 2).map((r: any) => r.url),
          })),
          all_cves_summary: allVulnerabilities.slice(0, 10).map((v: any) => ({
            id: v.cve?.id,
            severity: v.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseSeverity || "Unknown",
            score: v.cve?.metrics?.cvssMetricV31?.[0]?.cvssData?.baseScore || "N/A",
          })),
        },
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
      const headers = {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
      };

      // Fetch open PRs
      const prResponse = await fetchWithTimeout(
        "https://api.github.com/repos/HM2SOFTENG/sisg-platform/pulls?state=open&per_page=10",
        { headers },
        15000
      );

      // Fetch recent commits
      const commitsResponse = await fetchWithTimeout(
        "https://api.github.com/repos/HM2SOFTENG/sisg-platform/commits?per_page=5",
        { headers },
        15000
      );

      // Fetch open issues
      const issuesResponse = await fetchWithTimeout(
        "https://api.github.com/repos/HM2SOFTENG/sisg-platform/issues?state=open&per_page=10",
        { headers },
        15000
      );

      const prs = prResponse?.ok ? await prResponse.json() as any[] : [];
      const commits = commitsResponse?.ok ? await commitsResponse.json() as any[] : [];
      const issues = issuesResponse?.ok ? await issuesResponse.json() as any[] : [];
      // Filter out PRs from issues (GitHub API returns PRs as issues too)
      const realIssues = issues.filter((i: any) => !i.pull_request);

      outputs.push({
        type: "report",
        title: `Dev Report — ${prs.length} PRs, ${realIssues.length} Issues, ${commits.length} Recent Commits`,
        message: `GitHub repository HM2SOFTENG/sisg-platform: ${prs.length} open PR(s), ${realIssues.length} open issue(s), ${commits.length} recent commit(s).`,
        severity: prs.length > 3 ? "warning" : "info",
        data: {
          summary: {
            open_prs: prs.length,
            open_issues: realIssues.length,
            recent_commits: commits.length,
          },
          pull_requests: prs.slice(0, 5).map((pr: any) => ({
            title: pr.title,
            number: pr.number,
            author: pr.user?.login,
            created: pr.created_at,
            labels: (pr.labels || []).map((l: any) => l.name).join(", ") || "none",
            draft: pr.draft || false,
          })),
          recent_commits: commits.slice(0, 5).map((c: any) => ({
            sha: c.sha?.substring(0, 7),
            message: (c.commit?.message || "").split("\n")[0].substring(0, 80),
            author: c.commit?.author?.name || c.author?.login,
            date: c.commit?.author?.date,
          })),
          open_issues: realIssues.slice(0, 5).map((i: any) => ({
            title: i.title,
            number: i.number,
            labels: (i.labels || []).map((l: any) => l.name).join(", ") || "none",
            created: i.created_at,
          })),
        },
      });
    } else {
      outputs.push({
        type: "alert",
        title: "GitHub Monitoring",
        message: "GITHUB_TOKEN not configured. Add it to environment variables to enable dev monitoring.",
        severity: "warning",
      });
    }

    // Read projects from storage for local tracking
    const projects = storage.read("projects") as any[];
    const activeProjects = projects.filter((p: any) => p.status === "active");

    if (activeProjects.length > 0) {
      outputs.push({
        type: "report",
        title: `Active Projects: ${activeProjects.length}`,
        message: `${activeProjects.length} project(s) in active development.`,
        severity: "info",
        data: activeProjects.slice(0, 5).map((p: any) => ({
          name: p.name,
          status: p.status,
          progress: p.progress || 0,
        })),
      });
    }
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
 * Generate comprehensive daily opportunity digest
 * Runs contracts + proposals agents, then aggregates into a single executive report
 */
async function generateDailyDigest(): Promise<{
  generatedAt: string;
  executive_summary: any;
  opportunity_intelligence: any;
  proposal_pipeline: any;
  action_items: any[];
  agent_status: any;
}> {
  const now = new Date();
  const agents = storage.read("sisg_agents") as SisgAgent[];

  // Run contracts agent to refresh SAM.gov data
  const contractsAgent = agents.find(a => a.slug === "contracts");
  let contractsOutput: AgentOutput[] = [];
  if (contractsAgent) {
    contractsOutput = await executeContracts(contractsAgent);
  }

  // Run proposals agent to generate briefs from fresh data
  const proposalsAgent = agents.find(a => a.slug === "proposals");
  let proposalsOutput: AgentOutput[] = [];
  if (proposalsAgent) {
    proposalsOutput = await executeProposals(proposalsAgent);
  }

  // Read stored opportunities
  const samOpps = storage.read("sam_opportunities") as any[];

  // Build executive summary
  const highValue = samOpps.filter((o: any) => o.score >= 30);
  const sdvosbOpps = samOpps.filter((o: any) => o.setAside === "SDVOSBC" || o.setAside === "SDVOSBS");
  const urgentDeadlines = samOpps.filter((o: any) => {
    if (!o.responseDeadline) return false;
    const daysLeft = (new Date(o.responseDeadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysLeft > 0 && daysLeft <= 7;
  });

  // Extract proposal briefs from proposals output
  const proposalReport = proposalsOutput.find(o => o.title?.includes("Proposal Pipeline"));
  const proposalBriefs = proposalReport?.data?.proposal_briefs || [];
  const strongBids = proposalBriefs.filter((b: any) => b.proposal_brief?.bid_recommendation === "STRONG BID");

  // Build action items
  const actionItems: any[] = [];

  // Urgent deadlines
  urgentDeadlines.forEach((opp: any) => {
    const daysLeft = Math.round((new Date(opp.responseDeadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    actionItems.push({
      priority: "URGENT",
      action: `Respond to "${opp.title}" — deadline in ${daysLeft} day(s)`,
      solicitation: opp.solicitationNumber,
      deadline: opp.responseDeadline,
      contact: opp.pointOfContact ? `${opp.pointOfContact.fullName} (${opp.pointOfContact.email})` : "See SAM.gov",
    });
  });

  // Strong bid recommendations
  strongBids.forEach((brief: any) => {
    if (!urgentDeadlines.find((u: any) => u.title === brief.opportunity?.title)) {
      actionItems.push({
        priority: "HIGH",
        action: `Initiate proposal development for "${brief.opportunity?.title}"`,
        solicitation: brief.opportunity?.solicitation,
        recommendation: brief.proposal_brief?.bid_recommendation,
        strategy: brief.proposal_brief?.pursuit_strategy,
      });
    }
  });

  // SDVOSB opportunities needing review
  sdvosbOpps.filter((o: any) => o.score >= 20).slice(0, 3).forEach((opp: any) => {
    if (!actionItems.find(a => a.solicitation === opp.solicitationNumber)) {
      actionItems.push({
        priority: "MEDIUM",
        action: `Review SDVOSB opportunity: "${opp.title}"`,
        solicitation: opp.solicitationNumber || "N/A",
        naics: opp.naicsCode,
        score: opp.score,
      });
    }
  });

  // Get latest agent runs for status
  const runs = storage.read("sisg_agent_runs") as AgentRun[];
  const agentStatus = agents.map(a => {
    const latestRun = runs
      .filter(r => r.agentSlug === a.slug)
      .sort((x, y) => new Date(y.startedAt).getTime() - new Date(x.startedAt).getTime())[0];
    return {
      agent: a.slug,
      name: a.name,
      status: a.status,
      last_run: latestRun?.completedAt || "never",
      last_result: latestRun?.status || "no runs",
      outputs: latestRun?.output?.length || 0,
    };
  });

  // Persist the digest
  const digest = {
    generatedAt: now.toISOString(),
    executive_summary: {
      date: now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      total_opportunities_tracked: samOpps.length,
      high_value_opportunities: highValue.length,
      sdvosb_opportunities: sdvosbOpps.length,
      urgent_deadlines: urgentDeadlines.length,
      proposal_briefs_generated: proposalBriefs.length,
      strong_bid_recommendations: strongBids.length,
      action_items_count: actionItems.length,
    },
    opportunity_intelligence: contractsOutput.find(o => o.type === "report")?.data || {},
    proposal_pipeline: proposalReport?.data || {},
    action_items: actionItems,
    agent_status: agentStatus,
  };

  storage.add("daily_digests", { ...digest, id: `digest-${now.toISOString().split("T")[0]}` });

  return digest;
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

  /**
   * Generate a comprehensive daily opportunity digest
   * Runs contracts + proposals agents, aggregates into executive report
   */
  async getDailyDigest() {
    return generateDailyDigest();
  },

  /**
   * Get stored SAM.gov opportunities (persisted by contracts agent)
   */
  async getOpportunities(options?: { minScore?: number; setAside?: string; limit?: number }) {
    // Use SQL-level filtering via queryOpportunities for better performance
    return storage.queryOpportunities(options);
  },

  /**
   * Get past daily digests
   */
  async getDigestHistory(limit: number = 7) {
    const digests = storage.read("daily_digests") as any[];
    return digests
      .sort((a: any, b: any) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
      .slice(0, limit);
  },
};

export default sisgAgents;
