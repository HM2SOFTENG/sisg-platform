import type { DashboardSummary } from "@sisg/types";

export const demoSummaryFallback: DashboardSummary = {
  submissions: 18,
  contracts: 9,
  team: 24,
  projects: 14,
  marketing: 6,
  partnerships: 8,
  content: 15,
  activity: 37,
  activeProjects: 8,
  contractsTotal: 4280000,
};

export const homePriorities = [
  {
    id: "priority-1",
    label: "Proposal due today",
    title: "USACE Cyber Support renewal package",
    detail: "Compliance review missing one attachment. Final submit window closes in 3h.",
    tone: "danger",
  },
  {
    id: "priority-2",
    label: "Project at risk",
    title: "NOC uplift rollout needs milestone update",
    detail: "Delivery status has not been refreshed since Friday. PM follow-up needed.",
    tone: "warning",
  },
  {
    id: "priority-3",
    label: "Unread message",
    title: "Prime partner requesting teaming confirmation",
    detail: "Draft response prepared. Confirm role mix and send.",
    tone: "accent",
  },
] as const;

export const homeQueues = [
  { id: "queue-1", label: "Contracts due this week", value: "4", note: "2 need compliance review" },
  { id: "queue-2", label: "Projects needing update", value: "3", note: "1 marked blocked" },
  { id: "queue-3", label: "Unread conversations", value: "7", note: "2 partner threads" },
  { id: "queue-4", label: "Agent alerts", value: "2", note: "1 failed overnight run" },
] as const;

export const recentActivity = [
  { id: "activity-1", title: "Bid digest published", meta: "Contracts agent · 12m ago" },
  { id: "activity-2", title: "Project Falcon moved to 82% completion", meta: "Programs · 29m ago" },
  { id: "activity-3", title: "New contact form assigned to Ops", meta: "Inbox · 51m ago" },
  { id: "activity-4", title: "ClawBot retry succeeded", meta: "Automation · 1h ago" },
] as const;
