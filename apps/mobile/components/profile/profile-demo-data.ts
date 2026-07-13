import type {
  ProfileActivityItem,
  ProfileOperator,
  ProfileSettingSection,
  ProfileStat,
} from "./types";

export const demoProfileOperator: ProfileOperator = {
  id: "operator-1",
  name: "Derrick Ross",
  role: "Regional Operations Lead",
  email: "derrick.ross@sentinelintegratedgroup.com",
  phone: "(213) 555-0142",
  baseLabel: "Los Angeles HQ",
  shiftLabel: "Coverage lead until 7:00 PM",
  statusLabel: "Cleared for executive response",
  completionPercent: 88,
  summary: "Owns live client response, staffing escalations, and after-action signoff for west region accounts.",
};

export const demoProfileStats: ProfileStat[] = [
  { id: "stat-1", label: "Response SLA", value: "97%" },
  { id: "stat-2", label: "Escalations cleared", value: "14" },
  { id: "stat-3", label: "Compliance score", value: "A" },
];

export const demoProfileSections: ProfileSettingSection[] = [
  {
    id: "section-identity",
    title: "Identity and access",
    items: [
      {
        id: "setting-1",
        label: "Two-factor authentication",
        description: "Protect executive and field approvals with an extra verification step.",
        valueLabel: "Enabled",
        kind: "status",
      },
      {
        id: "setting-2",
        label: "Mobile command passcode",
        description: "Require a device passcode before opening active incident threads.",
        valueLabel: "Required",
        kind: "status",
      },
    ],
  },
  {
    id: "section-preferences",
    title: "Preferences",
    items: [
      {
        id: "setting-3",
        label: "Alert routing",
        description: "Direct high-priority incident alerts to SMS and in-app escalation.",
        valueLabel: "SMS + in-app",
        kind: "navigation",
      },
      {
        id: "setting-4",
        label: "Daily executive digest",
        description: "Receive a briefing of incidents, staffing drift, and unresolved actions.",
        valueLabel: "5:30 PM",
        kind: "navigation",
      },
    ],
  },
];

export const demoProfileActivity: ProfileActivityItem[] = [
  {
    id: "activity-1",
    title: "Overnight staffing approved",
    detail: "Released final operator headcount for proposal 742 and synced Atlas follow-up.",
    timeLabel: "11m ago",
    tone: "positive",
  },
  {
    id: "activity-2",
    title: "Badge audit needs review",
    detail: "Watchtower surfaced seven visitor badge anomalies awaiting outbound summary approval.",
    timeLabel: "28m ago",
    tone: "warning",
  },
  {
    id: "activity-3",
    title: "Device trust refreshed",
    detail: "Current session re-verified from Brian's iPhone with no policy drift detected.",
    timeLabel: "2h ago",
  },
];
