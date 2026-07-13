import type { AuthSession } from "@sisg/types";
import type {
  AgentHealthStatus,
  AgentIncident,
  AgentIncidentSeverity,
  AgentMonitorItem,
  AgentRunState,
  AgentsOverviewStats,
} from "../components/agents/types";

type RequestOptions = {
  baseUrl: string;
  session: AuthSession;
};

type RawAgent = {
  id: string;
  slug: string;
  name: string;
  handle?: string | null;
  channels?: string[];
  capabilities?: string[];
  description?: string;
  category?: string;
  status?: string;
  schedule?: string;
  lastRun?: string;
  nextRun?: string;
  lastResult?: string;
  errorCount?: number;
  successCount?: number;
  totalRuns?: number;
};

type RawRunOutput = {
  title?: string;
  message?: string;
  severity?: string;
};

type RawRun = {
  id: string;
  agentSlug: string;
  status?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  output?: RawRunOutput[];
};

export type AgentsMonitorSnapshot = {
  agents: AgentMonitorItem[];
  incidents: AgentIncident[];
  summary: AgentsOverviewStats;
};

async function requestJson(path: string, options: RequestOptions): Promise<any> {
  const response = await fetch(new URL(path, options.baseUrl.endsWith("/") ? options.baseUrl : `${options.baseUrl}/`).toString(), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${options.session.accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : `Request failed with status ${response.status}`);
  }

  return response.json();
}

export async function fetchAgentsMonitorSnapshot(options: RequestOptions): Promise<AgentsMonitorSnapshot> {
  const [dashboardPayload, runsPayload] = await Promise.all([
    requestJson("/api/admin/agents/dashboard", options),
    requestJson("/api/admin/agents/runs/all?limit=24", options).catch(() => ({ data: { runs: [] } })),
  ]);

  const dashboard = dashboardPayload?.data ?? {};
  const rawAgents = Array.isArray(dashboard.agents) ? (dashboard.agents as RawAgent[]) : [];
  const latestRuns = dashboard.latestRuns && typeof dashboard.latestRuns === "object" ? dashboard.latestRuns as Record<string, RawRun | null> : {};
  const rawRuns = Array.isArray(runsPayload?.data?.runs) ? (runsPayload.data.runs as RawRun[]) : [];
  const schedulerRunning = Boolean(dashboard.scheduler?.running);
  const updatedLabel = formatRelativeTime(dashboardPayload?.timestamp || new Date().toISOString());

  const agents = rawAgents.map((agent) => mapAgent(agent, latestRuns[agent.slug] || null));
  const incidents = buildIncidents({ agents: rawAgents, latestRuns, rawRuns, schedulerRunning });
  const attentionCount = agents.filter((agent) => agent.status !== "healthy").length;

  return {
    agents,
    incidents,
    summary: {
      total: rawAgents.length,
      deployed: rawAgents.filter((agent) => agent.status === "deployed").length,
      attentionCount,
      totalRuns: rawAgents.reduce((sum, agent) => sum + Math.max(0, Number(agent.totalRuns || 0)), 0),
      schedulerLabel: schedulerRunning ? `Scheduler live · ${dashboard.scheduler?.agents || 0} scheduled` : "Scheduler paused",
      updatedLabel,
    },
  };
}

function mapAgent(agent: RawAgent, latestRun: RawRun | null): AgentMonitorItem {
  const successCount = Math.max(0, Number(agent.successCount || 0));
  const errorCount = Math.max(0, Number(agent.errorCount || 0));
  const totalRuns = Math.max(0, Number(agent.totalRuns || 0));
  const automationRate = totalRuns > 0 ? Math.round((successCount / totalRuns) * 100) : 0;
  const criticalCount = countOutputs(latestRun, "critical");
  const warningCount = countOutputs(latestRun, "warning");
  const infoCount = countOutputs(latestRun, "info");
  const health = deriveHealth(agent, latestRun);
  const latestRunState = deriveRunState(agent, latestRun);
  const lastRunLabel = formatRunMoment(agent.lastRun);
  const nextRunLabel = formatNextRun(agent.schedule, agent.nextRun, agent.status);
  const latestResult =
    (typeof latestRun?.error === "string" && latestRun.error) ||
    summarizeRun(latestRun) ||
    agent.lastResult ||
    "No executions recorded yet.";

  return {
    id: String(agent.id || agent.slug),
    slug: agent.slug,
    name: agent.name || agent.slug,
    owner: `${formatCategory(agent.category)} · ${agent.handle || "@operator"}`,
    summary: agent.description || "No description available.",
    status: health,
    queueDepth: criticalCount + warningCount,
    automationRate,
    lastRunLabel,
    uptimeLabel: agent.schedule === "manual" ? "Manual only" : formatSchedule(agent.schedule),
    capabilities: Array.isArray(agent.capabilities) ? agent.capabilities : [],
    categoryLabel: formatCategory(agent.category),
    handleLabel: agent.handle || agent.slug,
    scheduleLabel: formatSchedule(agent.schedule),
    nextRunLabel,
    latestResult,
    latestRunState,
    channels: Array.isArray(agent.channels) ? agent.channels.map(formatChannel) : [],
    criticalCount,
    warningCount,
    infoCount,
    successCount,
    errorCount,
    totalRuns,
    activeTask:
      latestRunState === "running"
        ? {
            title: summarizeRun(latestRun) || "Execution in progress",
            queue: "Live run",
            etaLabel: `Started ${formatRelativeTime(latestRun?.startedAt)}`,
          }
        : undefined,
  };
}

function buildIncidents({
  agents,
  latestRuns,
  rawRuns,
  schedulerRunning,
}: {
  agents: RawAgent[];
  latestRuns: Record<string, RawRun | null>;
  rawRuns: RawRun[];
  schedulerRunning: boolean;
}): AgentIncident[] {
  const incidents: AgentIncident[] = [];

  if (!schedulerRunning) {
    incidents.push({
      id: "scheduler-paused",
      title: "Scheduler not running",
      severity: "critical",
      summary: "Scheduled SISG agent execution is paused. Automatic sweeps will not fire until the scheduler resumes.",
      timeLabel: "Live",
      detailLabel: "Control plane",
    });
  }

  for (const agent of agents) {
    const latestRun = latestRuns[agent.slug] || null;

    if (agent.status === "error") {
      incidents.push({
        id: `agent-error-${agent.slug}`,
        title: `${agent.name || agent.slug} marked in error`,
        severity: "critical",
        summary: agent.lastResult || latestRun?.error || "This agent needs operator review before it can be trusted again.",
        timeLabel: formatRelativeTime(agent.lastRun),
        agentLabel: agent.name || agent.slug,
        detailLabel: "Lifecycle",
      });
    } else if (agent.status === "stopped" || agent.status === "undeployed") {
      incidents.push({
        id: `agent-paused-${agent.slug}`,
        title: `${agent.name || agent.slug} is not deployed`,
        severity: "warning",
        summary: "This agent is currently read-only from mobile because it is not deployed on the backend scheduler.",
        timeLabel: formatNextRun(agent.schedule, agent.nextRun, agent.status),
        agentLabel: agent.name || agent.slug,
        detailLabel: "Coverage gap",
      });
    }
  }

  for (const run of rawRuns) {
    const outputs = Array.isArray(run.output) ? run.output : [];
    const severeOutput = outputs.find((output) => output.severity === "critical" || output.severity === "warning");
    if (!severeOutput) {
      continue;
    }

    incidents.push({
      id: `run-${run.id}-${severeOutput.severity}`,
      title: severeOutput.title || `${run.agentSlug} emitted a ${severeOutput.severity} signal`,
      severity: normalizeSeverity(severeOutput.severity),
      summary: severeOutput.message || run.error || "Recent run requires attention.",
      timeLabel: formatRelativeTime(run.completedAt || run.startedAt),
      agentLabel: formatAgentLabel(run.agentSlug),
      detailLabel: latestRuns[run.agentSlug]?.status === "failed" ? "Latest run failed" : "Recent run signal",
    });
  }

  return dedupeIncidents(incidents)
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || compareTimeLabel(a.timeLabel, b.timeLabel))
    .slice(0, 6);
}

function deriveHealth(agent: RawAgent, latestRun: RawRun | null): AgentHealthStatus {
  if (agent.status === "error") {
    return "offline";
  }

  if (agent.status === "stopped" || agent.status === "undeployed") {
    return "paused";
  }

  if (agent.status === "deploying") {
    return "degraded";
  }

  if (latestRun?.status === "failed" || countOutputs(latestRun, "critical") > 0) {
    return "degraded";
  }

  return "healthy";
}

function deriveRunState(agent: RawAgent, latestRun: RawRun | null): AgentRunState {
  if (latestRun?.status === "running") {
    return "running";
  }

  if (latestRun?.status === "failed") {
    return "failed";
  }

  if (latestRun?.status === "completed") {
    return "completed";
  }

  if (agent.status === "deployed") {
    return "idle";
  }

  return "idle";
}

function countOutputs(run: RawRun | null, severity: string): number {
  if (!run?.output) {
    return 0;
  }

  return run.output.filter((output) => output.severity === severity).length;
}

function summarizeRun(run: RawRun | null): string | null {
  if (!run) {
    return null;
  }

  const outputs = Array.isArray(run.output) ? run.output : [];
  const primary = outputs[0];
  if (primary?.message) {
    return primary.message;
  }
  if (primary?.title) {
    return primary.title;
  }
  return null;
}

function formatCategory(value: string | undefined): string {
  return String(value || "general")
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatSchedule(value: string | undefined): string {
  if (!value || value === "manual") {
    return "Manual";
  }

  if (value === "*/30 * * * *") {
    return "Every 30 min";
  }

  const everyHour = value.match(/^0 \*\/(\d+) \* \* \*$/);
  if (everyHour) {
    return `Every ${everyHour[1]} hr`;
  }

  const weekdays = value.match(/^0 (\d{1,2}) \* \* 1-5$/);
  if (weekdays) {
    return `Weekdays · ${formatHour(Number(weekdays[1]))}`;
  }

  return value;
}

function formatNextRun(schedule: string | undefined, value: string | undefined, status: string | undefined): string {
  if (status === "stopped" || status === "undeployed") {
    return "Awaiting deploy";
  }

  if (!value || value === "never" || schedule === "manual") {
    return schedule === "manual" ? "Manual trigger only" : "Next run pending";
  }

  return `Next ${formatRelativeTime(value)}`;
}

function formatRunMoment(value: string | undefined): string {
  if (!value || value === "never") {
    return "No runs yet";
  }
  return formatRelativeTime(value);
}

function formatRelativeTime(value: string | undefined): string {
  if (!value) {
    return "unknown";
  }

  const deltaMs = Date.now() - new Date(value).getTime();
  const future = deltaMs < 0;
  const minutes = Math.max(1, Math.round(Math.abs(deltaMs) / 60000));

  if (minutes < 60) {
    return future ? `in ${minutes}m` : `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return future ? `in ${hours}h` : `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  return future ? `in ${days}d` : `${days}d ago`;
}

function formatHour(hour: number): string {
  const normalized = ((hour + 11) % 12) + 1;
  return `${normalized}${hour >= 12 ? " PM" : " AM"}`;
}

function formatChannel(value: string): string {
  return value.startsWith("#") ? value : `#${value}`;
}

function formatAgentLabel(slug: string): string {
  return slug
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeSeverity(value: string | undefined): AgentIncidentSeverity {
  if (value === "critical" || value === "warning") {
    return value;
  }
  return "info";
}

function dedupeIncidents(incidents: AgentIncident[]): AgentIncident[] {
  const seen = new Set<string>();
  return incidents.filter((incident) => {
    const key = `${incident.title}::${incident.summary}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function severityRank(severity: AgentIncidentSeverity): number {
  switch (severity) {
    case "critical":
      return 3;
    case "warning":
      return 2;
    default:
      return 1;
  }
}

function compareTimeLabel(left: string, right: string): number {
  const normalize = (value: string) => (value === "Live" ? 0 : value.includes("m ago") ? 1 : value.includes("h ago") ? 2 : 3);
  return normalize(left) - normalize(right);
}
