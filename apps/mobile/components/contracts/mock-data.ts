import { getContractsSummary } from "./helpers";
import type { ContractDetailData, ContractListItem, ContractsSummary } from "./types";

export const mockContracts: ContractListItem[] = [
  {
    id: "contract-socal-airfields",
    title: "Southern Airfields Perimeter Upgrade",
    clientName: "Western Defense Logistics",
    stage: "Signature",
    health: "On Track",
    totalValue: 1840000,
    securedValue: 1220000,
    salesCycleDays: 52,
    ownerName: "Mina Torres",
    region: "SoCal",
    windowLabel: "Jun 2026 kickoff",
    nextStep: "Final legal redlines due Thursday",
    updatedAt: "2026-05-18T15:30:00Z",
    tags: ["Federal", "Aviation", "Priority"],
  },
  {
    id: "contract-port-hardening",
    title: "Port Security Hardening Phase 2",
    clientName: "Harbor Transit Authority",
    stage: "Negotiation",
    health: "Watch",
    totalValue: 2610000,
    securedValue: 1480000,
    salesCycleDays: 74,
    ownerName: "Owen Parker",
    region: "Pacific Northwest",
    windowLabel: "Q3 2026 mobilization",
    nextStep: "Pricing review with procurement board",
    updatedAt: "2026-05-17T20:10:00Z",
    tags: ["Maritime", "Infrastructure"],
  },
  {
    id: "contract-campus-command",
    title: "Campus Command Center Refresh",
    clientName: "St. Mary Regional Health",
    stage: "Review",
    health: "At Risk",
    totalValue: 920000,
    securedValue: 360000,
    salesCycleDays: 39,
    ownerName: "Jules Bennett",
    region: "Midwest",
    windowLabel: "July 2026 award window",
    nextStep: "Resolve insurance rider gap",
    updatedAt: "2026-05-18T12:05:00Z",
    tags: ["Healthcare", "Retrofit"],
  },
  {
    id: "contract-civic-ops",
    title: "Civic Operations Center Support",
    clientName: "Metro Public Safety",
    stage: "Active",
    health: "On Track",
    totalValue: 3160000,
    securedValue: 3160000,
    salesCycleDays: 63,
    ownerName: "Priya Shah",
    region: "Texas",
    windowLabel: "Live through Jan 2027",
    nextStep: "Confirm Q2 staffing backfill",
    updatedAt: "2026-05-16T18:00:00Z",
    tags: ["Managed Services", "Renewal"],
  },
];

export const mockContractsSummary: ContractsSummary = getContractsSummary(mockContracts);

export const mockContractDetails: Record<string, ContractDetailData> = {
  "contract-socal-airfields": {
    ...mockContracts[0],
    overview:
      "Multi-site perimeter, camera, and response integration package spanning three active airfield facilities with phased cutovers and federal reporting requirements.",
    contractingOffice: "Regional Aviation Security Office",
    submittedAt: "2026-03-22T09:00:00Z",
    startDate: "2026-06-10T08:00:00Z",
    endDate: "2027-02-28T17:00:00Z",
    invoiceCadence: "Monthly progress billing",
    complianceScore: 96,
    winProbability: 82,
    marginLabel: "31% gross margin",
    team: ["Mina Torres", "Alex Kim", "Nadia Flores", "Legal Ops"],
    milestones: [
      {
        id: "milestone-1",
        label: "Finalize legal redlines",
        dueAt: "2026-05-22T18:00:00Z",
        status: "In Progress",
        ownerName: "Legal Ops",
      },
      {
        id: "milestone-2",
        label: "Customer signature packet",
        dueAt: "2026-05-27T18:00:00Z",
        status: "Pending",
        ownerName: "Mina Torres",
      },
      {
        id: "milestone-3",
        label: "Kickoff staffing lock",
        dueAt: "2026-06-03T18:00:00Z",
        status: "Pending",
        ownerName: "Alex Kim",
      },
    ],
    documents: [
      {
        id: "doc-1",
        label: "Prime SOW v7",
        type: "SOW",
        updatedAt: "2026-05-18T14:40:00Z",
      },
      {
        id: "doc-2",
        label: "Pricing schedule rev C",
        type: "Pricing",
        updatedAt: "2026-05-17T19:10:00Z",
      },
      {
        id: "doc-3",
        label: "Airport compliance binder",
        type: "Compliance",
        updatedAt: "2026-05-16T22:25:00Z",
      },
    ],
    relatedProjects: [
      {
        id: "project-ramp-watch",
        name: "Ramp Watch Deployment",
        phase: "Mobilizing",
        site: "Long Beach, CA",
      },
      {
        id: "project-terminal-fusion",
        name: "Terminal Fusion Uplift",
        phase: "Planning",
        site: "Ontario, CA",
      },
    ],
    notes: [
      "Customer legal team requested one final indemnity revision before routing signatures.",
      "Operations has already reserved the preferred PM and field engineer pairing.",
      "No permitting blocker expected if kickoff stays inside the current June window.",
    ],
  },
  "contract-port-hardening": {
    ...mockContracts[1],
    overview:
      "Expanded waterside analytics, credentialing, and dock access controls for a high-volume cargo terminal operating across union and port-authority work rules.",
    contractingOffice: "Harbor Capital Programs",
    submittedAt: "2026-02-18T10:00:00Z",
    startDate: "2026-08-04T08:00:00Z",
    endDate: "2027-05-30T17:00:00Z",
    invoiceCadence: "Milestone billing",
    complianceScore: 91,
    winProbability: 68,
    marginLabel: "28% gross margin",
    team: ["Owen Parker", "Dana Ruiz", "Finance Desk", "Procurement Counsel"],
    milestones: [
      {
        id: "milestone-4",
        label: "Procurement pricing board",
        dueAt: "2026-05-24T18:00:00Z",
        status: "Pending",
        ownerName: "Finance Desk",
      },
      {
        id: "milestone-5",
        label: "Union staffing assumptions",
        dueAt: "2026-05-29T18:00:00Z",
        status: "In Progress",
        ownerName: "Dana Ruiz",
      },
      {
        id: "milestone-6",
        label: "Insurance endorsement approval",
        dueAt: "2026-06-03T18:00:00Z",
        status: "Blocked",
        ownerName: "Procurement Counsel",
      },
    ],
    documents: [
      {
        id: "doc-4",
        label: "Commercial matrix",
        type: "Pricing",
        updatedAt: "2026-05-17T20:10:00Z",
      },
      {
        id: "doc-5",
        label: "Redline tracker",
        type: "Redlines",
        updatedAt: "2026-05-16T16:45:00Z",
      },
    ],
    relatedProjects: [
      {
        id: "project-harbor-grid",
        name: "Harbor Grid Modernization",
        phase: "Execution planning",
        site: "Tacoma, WA",
      },
    ],
    notes: [
      "Customer likes the operating model but is pressing on escalation language and weather downtime assumptions.",
      "Finance wants to protect margin before offering any further concession on on-call coverage.",
    ],
  },
};

export const mockFeaturedContract: ContractDetailData =
  mockContractDetails["contract-socal-airfields"];
