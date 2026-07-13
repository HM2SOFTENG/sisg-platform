import { getProjectsSummary } from "./helpers";
import type { ProjectDetailData, ProjectListItem, ProjectsSummary } from "./types";

export const mockProjects: ProjectListItem[] = [
  {
    id: "project-ramp-watch",
    name: "Ramp Watch Deployment",
    clientName: "Western Defense Logistics",
    site: "Long Beach, CA",
    status: "Mobilizing",
    health: "On Track",
    progressPercent: 42,
    revenue: 2140000,
    staffingFillPercent: 88,
    managerName: "Alex Kim",
    updatedAt: "2026-05-18T16:20:00Z",
    nextMilestone: "Badging and site access approval",
    tags: ["Aviation", "High Visibility"],
  },
  {
    id: "project-harbor-grid",
    name: "Harbor Grid Modernization",
    clientName: "Harbor Transit Authority",
    site: "Tacoma, WA",
    status: "Active",
    health: "Watch",
    progressPercent: 67,
    revenue: 3180000,
    staffingFillPercent: 81,
    managerName: "Dana Ruiz",
    updatedAt: "2026-05-17T21:35:00Z",
    nextMilestone: "Night cutover rehearsal",
    tags: ["Maritime", "Union Site"],
  },
  {
    id: "project-command-bridge",
    name: "Command Bridge Retrofit",
    clientName: "Metro Public Safety",
    site: "Austin, TX",
    status: "Closing",
    health: "On Track",
    progressPercent: 91,
    revenue: 1260000,
    staffingFillPercent: 96,
    managerName: "Priya Shah",
    updatedAt: "2026-05-16T19:10:00Z",
    nextMilestone: "Final acceptance walk",
    tags: ["Closeout", "Renewal Path"],
  },
  {
    id: "project-campus-grid",
    name: "Campus Grid Refresh",
    clientName: "St. Mary Regional Health",
    site: "Indianapolis, IN",
    status: "Planning",
    health: "At Risk",
    progressPercent: 24,
    revenue: 980000,
    staffingFillPercent: 63,
    managerName: "Jules Bennett",
    updatedAt: "2026-05-18T11:15:00Z",
    nextMilestone: "Insurance rider resolution",
    tags: ["Healthcare", "Dependency Risk"],
  },
];

export const mockProjectsSummary: ProjectsSummary = getProjectsSummary(mockProjects);

export const mockProjectDetails: Record<string, ProjectDetailData> = {
  "project-ramp-watch": {
    ...mockProjects[0],
    overview:
      "Airside field deployment pairing perimeter analytics, command center integration, and mobile supervisor workflows for three active operating zones.",
    startDate: "2026-06-14T08:00:00Z",
    targetDate: "2027-02-28T17:00:00Z",
    siteLead: "Rae Cole",
    opsCadence: "Twice-weekly launch review",
    budgetBurnPercent: 37,
    budgetCommitted: 1580000,
    crewSummary: "18 assigned, 2 open reqs, 1 roving specialist",
    phases: [
      {
        id: "phase-1",
        label: "Mobilization package",
        ownerName: "Alex Kim",
        completionPercent: 84,
        status: "In Progress",
      },
      {
        id: "phase-2",
        label: "Field installation wave 1",
        ownerName: "Rae Cole",
        completionPercent: 28,
        status: "Pending",
      },
      {
        id: "phase-3",
        label: "SOC integration and training",
        ownerName: "Nadia Flores",
        completionPercent: 12,
        status: "Pending",
      },
    ],
    risks: [
      {
        id: "risk-1",
        title: "Airside access badging pace",
        severity: "Medium",
        mitigation: "Lock customer sign-off this week and pre-stage alternate crews.",
      },
      {
        id: "risk-2",
        title: "Night work window compression",
        severity: "Low",
        mitigation: "Shift firmware staging into daytime prep to protect install pace.",
      },
    ],
    recentActivity: [
      {
        id: "activity-1",
        timestamp: "2026-05-18T16:20:00Z",
        label: "Kickoff packet approved",
        detail: "Customer approved the final mobilization binder and readiness checklist.",
      },
      {
        id: "activity-2",
        timestamp: "2026-05-17T13:45:00Z",
        label: "Crew roster refreshed",
        detail: "Operations backfilled one overnight supervisor and one controls tech.",
      },
    ],
    linkedContracts: [
      {
        id: "contract-socal-airfields",
        title: "Southern Airfields Perimeter Upgrade",
        stage: "Signature",
        value: 1840000,
      },
    ],
  },
  "project-harbor-grid": {
    ...mockProjects[1],
    overview:
      "In-flight modernization of dock access controls, analytics, and network resiliency across a live maritime campus with staged work windows.",
    startDate: "2026-04-02T08:00:00Z",
    targetDate: "2027-01-15T17:00:00Z",
    siteLead: "Dana Ruiz",
    opsCadence: "Daily superintendent sync",
    budgetBurnPercent: 59,
    budgetCommitted: 2410000,
    crewSummary: "24 assigned, no open reqs, 3 union alternates",
    phases: [
      {
        id: "phase-4",
        label: "Core infrastructure",
        ownerName: "Dana Ruiz",
        completionPercent: 76,
        status: "In Progress",
      },
      {
        id: "phase-5",
        label: "Waterside analytics",
        ownerName: "Marco Liu",
        completionPercent: 58,
        status: "In Progress",
      },
      {
        id: "phase-6",
        label: "Operations acceptance",
        ownerName: "Harbor Ops",
        completionPercent: 18,
        status: "Pending",
      },
    ],
    risks: [
      {
        id: "risk-3",
        title: "Weather-dependent cutovers",
        severity: "High",
        mitigation: "Reserve two alternate windows and protect crane support availability.",
      },
    ],
    recentActivity: [
      {
        id: "activity-3",
        timestamp: "2026-05-17T21:35:00Z",
        label: "Cabinet energization complete",
        detail: "North berth edge cabinet stack passed energization and handoff testing.",
      },
    ],
    linkedContracts: [
      {
        id: "contract-port-hardening",
        title: "Port Security Hardening Phase 2",
        stage: "Negotiation",
        value: 2610000,
      },
    ],
  },
};

export const mockFeaturedProject: ProjectDetailData = mockProjectDetails["project-ramp-watch"];
