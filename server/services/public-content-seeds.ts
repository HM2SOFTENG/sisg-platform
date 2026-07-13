import { storage } from "./storage.js";

const PROJECT_SEEDS = [
  {
    id: "proj-zero-trust-modernization",
    name: "Zero Trust Modernization Program",
    title: "Zero Trust Modernization Program",
    client: "Federal Civilian Agency",
    status: "In Progress",
    priority: "High",
    budget: 2400000,
    team: 8,
    due: "Q4 2026",
    progress: 68,
    color: "#0066ff",
    description:
      "Enterprise zero trust transformation initiative covering identity hardening, endpoint security baselines, and segmented access controls across mission systems.",
    summary:
      "Identity, endpoint, and network segmentation rollout for a mission-critical federal environment.",
    capabilities: [
      "Zero Trust Architecture",
      "Identity & Access Management",
      "Endpoint Security",
      "Program Delivery",
    ],
  },
  {
    id: "proj-cmmc-readiness",
    name: "CMMC Readiness Accelerator",
    title: "CMMC Readiness Accelerator",
    client: "Defense Industrial Base Contractor",
    status: "Active",
    priority: "Critical",
    budget: 875000,
    team: 5,
    due: "Q3 2026",
    progress: 54,
    color: "#8b5cf6",
    description:
      "Assessment and remediation sprint to close compliance gaps, harden control evidence, and prepare audit-ready documentation for regulated environments.",
    summary:
      "Fast-turn compliance uplift for audit readiness and security operations maturity.",
    capabilities: ["CMMC", "Risk Assessments", "Policy Engineering", "Security Documentation"],
  },
  {
    id: "proj-cloud-ops-analytics",
    name: "Cloud Operations Analytics Platform",
    title: "Cloud Operations Analytics Platform",
    client: "Multi-Site Commercial Enterprise",
    status: "Planning",
    priority: "Medium",
    budget: 1250000,
    team: 6,
    due: "Q1 2027",
    progress: 22,
    color: "#00e5a0",
    description:
      "Data and observability platform design for unified operational reporting, alert routing, and executive visibility across distributed cloud workloads.",
    summary:
      "Centralized monitoring and analytics foundation for cloud operations leadership.",
    capabilities: ["Cloud Architecture", "Observability", "Data Pipelines", "Executive Reporting"],
  },
];

const TEAM_SEEDS = [
  {
    id: "team-ash-carter",
    name: "Ash Carter",
    role: "Program Director",
    dept: "Delivery",
    clearance: "Secret Eligible",
    utilization: 82,
    color: "#0066ff",
    initials: "AC",
    bio:
      "Leads delivery across modernization programs with a focus on disciplined execution, stakeholder alignment, and risk-controlled scaling.",
    certifications: ["PMP", "ITIL", "Agile Delivery"],
  },
  {
    id: "team-maya-brooks",
    name: "Maya Brooks",
    role: "Cybersecurity Lead",
    dept: "Security",
    clearance: "Top Secret Eligible",
    utilization: 76,
    color: "#8b5cf6",
    initials: "MB",
    bio:
      "Owns security architecture, control design, and compliance readiness across regulated environments and public sector workloads.",
    certifications: ["CISSP", "Security Architecture", "CMMC"],
  },
  {
    id: "team-ethan-rhodes",
    name: "Ethan Rhodes",
    role: "Cloud Solutions Architect",
    dept: "Engineering",
    clearance: "Public Trust",
    utilization: 71,
    color: "#00e5a0",
    initials: "ER",
    bio:
      "Designs resilient cloud platforms with strong observability, automation, and cost-aware operational controls.",
    certifications: ["AWS Architecture", "DevSecOps", "Platform Engineering"],
  },
];

function ensureCollectionSeed(collection: string, seedData: unknown[]) {
  const existing = storage.getCollection(collection) || [];
  if (existing.length > 0) {
    return false;
  }

  storage.write(collection, seedData);
  return true;
}

export function ensurePublicContentSeeds() {
  const seededProjects = ensureCollectionSeed("projects", PROJECT_SEEDS);
  const seededTeam = ensureCollectionSeed("team", TEAM_SEEDS);

  if (seededProjects) {
    console.warn("[SEED] Seeded default public projects content.");
  }

  if (seededTeam) {
    console.warn("[SEED] Seeded default public team content.");
  }
}
