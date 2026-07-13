import type { AgentIncident, AgentMonitorItem } from "./types";

export const demoAgents: AgentMonitorItem[] = [
  {
    id: "atlas",
    name: "Atlas",
    owner: "Ops coordination",
    summary: "Triage, drafts, and routes inbound field requests with response recommendations.",
    status: "healthy",
    queueDepth: 4,
    automationRate: 92,
    lastRunLabel: "1m ago",
    uptimeLabel: "99.9%",
    capabilities: ["Triage", "Drafting", "Escalation"],
    activeTask: {
      title: "Overnight staffing response",
      queue: "Client Inbox",
      etaLabel: "ETA 4 min",
    },
  },
  {
    id: "watchtower",
    name: "Watchtower",
    owner: "Compliance monitoring",
    summary: "Tracks post orders, badge anomalies, and after-action recap coverage.",
    status: "degraded",
    queueDepth: 2,
    automationRate: 81,
    lastRunLabel: "6m ago",
    uptimeLabel: "97.4%",
    capabilities: ["Audit", "Reporting", "Anomaly review"],
    activeTask: {
      title: "Badge anomaly export",
      queue: "Compliance",
      etaLabel: "Needs approval",
    },
  },
  {
    id: "sentinel",
    name: "Sentinel",
    owner: "Executive visibility",
    summary: "Bundles major incidents, staffing drift, and SLA risk into operator-ready briefs.",
    status: "paused",
    queueDepth: 0,
    automationRate: 68,
    lastRunLabel: "24m ago",
    uptimeLabel: "On hold",
    capabilities: ["Briefing", "Risk scoring", "Summaries"],
  },
];

export const demoAgentIncidents: AgentIncident[] = [
  {
    id: "inc-1",
    title: "Compliance export delay",
    severity: "warning",
    summary: "Watchtower is processing slower than normal after a large visitor log sync.",
    timeLabel: "5m ago",
  },
  {
    id: "inc-2",
    title: "Executive digest paused",
    severity: "info",
    summary: "Sentinel digest is paused until the 5 PM board packet is approved.",
    timeLabel: "18m ago",
  },
];
