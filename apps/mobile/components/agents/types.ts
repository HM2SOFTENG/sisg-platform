export type AgentHealthStatus = "healthy" | "degraded" | "paused" | "offline";

export type AgentIncidentSeverity = "info" | "warning" | "critical";
export type AgentRunState = "idle" | "running" | "completed" | "failed";

export interface AgentTaskSnapshot {
  title: string;
  queue: string;
  etaLabel: string;
}

export interface AgentMonitorItem {
  id: string;
  name: string;
  owner: string;
  summary: string;
  status: AgentHealthStatus;
  queueDepth: number;
  automationRate: number;
  lastRunLabel: string;
  uptimeLabel: string;
  capabilities: string[];
  activeTask?: AgentTaskSnapshot;
  slug?: string;
  categoryLabel?: string;
  handleLabel?: string;
  scheduleLabel?: string;
  nextRunLabel?: string;
  latestResult?: string;
  latestRunState?: AgentRunState;
  channels?: string[];
  criticalCount?: number;
  warningCount?: number;
  infoCount?: number;
  successCount?: number;
  errorCount?: number;
  totalRuns?: number;
}

export interface AgentIncident {
  id: string;
  title: string;
  severity: AgentIncidentSeverity;
  summary: string;
  timeLabel: string;
  agentLabel?: string;
  detailLabel?: string;
}

export interface AgentsOverviewStats {
  total: number;
  deployed: number;
  attentionCount: number;
  totalRuns: number;
  schedulerLabel: string;
  updatedLabel: string;
}
