export type DemoSurfaceState = "loading" | "ready" | "empty" | "error";

export type ContractStage =
  | "Intake"
  | "Review"
  | "Negotiation"
  | "Signature"
  | "Active";

export type ContractHealth = "On Track" | "Watch" | "At Risk" | "Blocked";

export interface ContractListItem {
  id: string;
  title: string;
  clientName: string;
  stage: ContractStage;
  health: ContractHealth;
  totalValue: number;
  securedValue: number;
  salesCycleDays?: number;
  ownerName: string;
  region: string;
  windowLabel: string;
  nextStep: string;
  updatedAt: string;
  tags: string[];
}

export interface ContractMilestone {
  id: string;
  label: string;
  dueAt: string;
  status: "Done" | "In Progress" | "Pending" | "Blocked";
  ownerName: string;
}

export interface ContractDocument {
  id: string;
  label: string;
  type: "SOW" | "Pricing" | "Compliance" | "Redlines" | "Approval";
  updatedAt: string;
}

export interface RelatedProject {
  id: string;
  name: string;
  phase: string;
  site: string;
}

export interface ContractDetailData extends ContractListItem {
  overview: string;
  contractingOffice: string;
  submittedAt: string;
  startDate: string;
  endDate: string;
  invoiceCadence: string;
  complianceScore: number;
  winProbability: number;
  marginLabel: string;
  team: string[];
  milestones: ContractMilestone[];
  documents: ContractDocument[];
  relatedProjects: RelatedProject[];
  notes: string[];
}

export interface ContractsSummary {
  liveContracts: number;
  signaturesPending: number;
  atRiskCount: number;
  pipelineValue: number;
  securedValue: number;
  averageCycleDays: number;
}

export interface ContractsScreenProps {
  state?: DemoSurfaceState;
  contracts?: ContractListItem[];
  summary?: ContractsSummary;
  heading?: string;
  subheading?: string;
  highlightedContractId?: string;
  errorMessage?: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  onRetry?: () => void;
  onSelectContract?: (contract: ContractListItem) => void;
}

export interface ContractDetailProps {
  state?: DemoSurfaceState;
  contract?: ContractDetailData | null;
  heading?: string;
  subheading?: string;
  errorMessage?: string;
  onBack?: () => void;
  onRetry?: () => void;
  onOpenProject?: (projectId: string) => void;
  onOpenDocument?: (documentId: string) => void;
}
