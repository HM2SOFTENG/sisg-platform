export type DemoSurfaceState = "loading" | "ready" | "empty" | "error";

export type ProjectStatus = "Planning" | "Mobilizing" | "Active" | "Closing" | "Delayed";

export type ProjectHealth = "On Track" | "Watch" | "At Risk" | "Critical";

export interface ProjectListItem {
  id: string;
  name: string;
  clientName: string;
  site: string;
  status: ProjectStatus;
  health: ProjectHealth;
  progressPercent: number;
  revenue: number;
  staffingFillPercent: number;
  managerName: string;
  updatedAt: string;
  nextMilestone: string;
  tags: string[];
}

export interface ProjectPhase {
  id: string;
  label: string;
  ownerName: string;
  completionPercent: number;
  status: "Done" | "In Progress" | "Pending" | "Blocked";
}

export interface ProjectRisk {
  id: string;
  title: string;
  severity: "Low" | "Medium" | "High";
  mitigation: string;
}

export interface ProjectActivity {
  id: string;
  timestamp: string;
  label: string;
  detail: string;
}

export interface LinkedContract {
  id: string;
  title: string;
  stage: string;
  value: number;
}

export interface ProjectDetailData extends ProjectListItem {
  overview: string;
  startDate: string;
  targetDate: string;
  siteLead: string;
  opsCadence: string;
  budgetBurnPercent: number;
  budgetCommitted: number;
  crewSummary: string;
  phases: ProjectPhase[];
  risks: ProjectRisk[];
  recentActivity: ProjectActivity[];
  linkedContracts: LinkedContract[];
}

export interface ProjectsSummary {
  activeProjects: number;
  criticalProjects: number;
  averageProgressPercent: number;
  revenueInFlight: number;
  staffingFillPercent: number;
  closingSoon: number;
}

export interface ProjectsScreenProps {
  state?: DemoSurfaceState;
  projects?: ProjectListItem[];
  summary?: ProjectsSummary;
  heading?: string;
  subheading?: string;
  highlightedProjectId?: string;
  errorMessage?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onRetry?: () => void;
  onSelectProject?: (project: ProjectListItem) => void;
}

export interface ProjectDetailProps {
  state?: DemoSurfaceState;
  project?: ProjectDetailData | null;
  heading?: string;
  subheading?: string;
  errorMessage?: string;
  onBack?: () => void;
  onRetry?: () => void;
  onOpenContract?: (contractId: string) => void;
}
