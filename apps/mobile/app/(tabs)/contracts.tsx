import { useEffect, useState } from "react";
import { WorkScreen } from "../../components/work";
import type {
  ContractHealth,
  ContractListItem,
  ContractStage,
} from "../../components/contracts";
import type {
  ProjectHealth,
  ProjectListItem,
  ProjectStatus,
} from "../../components/projects";
import { useAuth } from "../../lib/auth";
import { fetchContractCards, fetchProjectCards } from "../../lib/mobile-data";
import type { ContractCardVM, ProjectCardVM } from "../../lib/view-models";

export default function ContractsRoute() {
  const { apiBaseUrl, session } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [contractsState, setContractsState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [projectsState, setProjectsState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const [contractsError, setContractsError] = useState<string | undefined>(undefined);
  const [projectsError, setProjectsError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function hydrateWork() {
      if (!session) {
        return;
      }

      setContractsState("loading");
      setProjectsState("loading");
      setContractsError(undefined);
      setProjectsError(undefined);

      const options = {
        baseUrl: apiBaseUrl,
        session,
      };

      const [contractsResult, projectsResult] = await Promise.allSettled([
        fetchContractCards(options),
        fetchProjectCards(options),
      ]);

      if (cancelled) {
        return;
      }

      if (contractsResult.status === "fulfilled") {
        const nextContracts = contractsResult.value.map(mapContractCard);
        setContracts(nextContracts);
        setContractsState(nextContracts.length > 0 ? "ready" : "empty");
      } else {
        setContracts([]);
        setContractsState("error");
        setContractsError(contractsResult.reason instanceof Error ? contractsResult.reason.message : "Failed to load contracts");
      }

      if (projectsResult.status === "fulfilled") {
        const nextProjects = projectsResult.value.map(mapProjectCard);
        setProjects(nextProjects);
        setProjectsState(nextProjects.length > 0 ? "ready" : "empty");
      } else {
        setProjects([]);
        setProjectsState("error");
        setProjectsError(projectsResult.reason instanceof Error ? projectsResult.reason.message : "Failed to load projects");
      }
    }

    void hydrateWork();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, reloadKey, session]);

  return (
    <WorkScreen
      contracts={contracts}
      projects={projects}
      contractsState={contractsState}
      projectsState={projectsState}
      contractsErrorMessage={contractsError}
      projectsErrorMessage={projectsError}
      onRetryContracts={() => {
        setContractsState("loading");
        setReloadKey((current) => current + 1);
      }}
      onRetryProjects={() => {
        setProjectsState("loading");
        setReloadKey((current) => current + 1);
      }}
    />
  );
}

function mapContractCard(contract: ContractCardVM): ContractListItem {
  return {
    id: contract.id,
    title: contract.title,
    clientName: contract.clientName,
    stage: mapContractStage(contract.status),
    health: mapContractHealth(contract.status),
    totalValue: contract.value || 0,
    securedValue: contract.status === "active" ? contract.value || 0 : Math.round((contract.value || 0) * 0.35),
    salesCycleDays: contract.startDate && contract.endDate ? daysBetween(contract.startDate, contract.endDate) : undefined,
    ownerName: contract.ownerName || "Unassigned owner",
    region: "Operator lane",
    windowLabel: contract.endDate ? `Due ${formatCompactDate(contract.endDate)}` : "Timeline pending",
    nextStep: contract.summary || contract.paymentTerms || "Review contract details and update next action.",
    updatedAt: contract.endDate || contract.startDate || new Date().toISOString(),
    tags: contract.tags,
  };
}

function mapProjectCard(project: ProjectCardVM): ProjectListItem {
  return {
    id: project.id,
    name: project.title,
    clientName: project.client,
    site: project.capabilities[0] || "Field deployment",
    status: mapProjectStatus(project.status),
    health: mapProjectHealth(project.priority),
    progressPercent: clampPercent(project.progress),
    revenue: project.budget || 0,
    staffingFillPercent: project.teamSize ? clampPercent(project.teamSize * 18) : 72,
    managerName: project.priority ? `${project.priority} priority` : "Assigned PM",
    updatedAt: project.dueLabel || new Date().toISOString(),
    nextMilestone: project.summary || "Refresh delivery milestones and staffing alignment.",
    tags: project.capabilities.slice(0, 3),
  };
}

function mapContractStage(status: ContractCardVM["status"]): ContractStage {
  switch (status) {
    case "draft":
      return "Intake";
    case "rfp":
      return "Review";
    case "active":
      return "Active";
    case "completed":
      return "Signature";
    default:
      return "Negotiation";
  }
}

function mapContractHealth(status: ContractCardVM["status"]): ContractHealth {
  switch (status) {
    case "completed":
      return "On Track";
    case "active":
      return "On Track";
    case "rfp":
      return "Watch";
    case "unknown":
      return "Blocked";
    default:
      return "At Risk";
  }
}

function mapProjectStatus(status: ProjectCardVM["status"]): ProjectStatus {
  switch (status) {
    case "planning":
      return "Planning";
    case "active":
      return "Active";
    case "completed":
      return "Closing";
    case "in_progress":
      return "Mobilizing";
    default:
      return "Delayed";
  }
}

function mapProjectHealth(priority: string | null): ProjectHealth {
  const normalized = String(priority || "").toLowerCase();
  if (normalized === "critical" || normalized === "urgent") return "Critical";
  if (normalized === "high") return "At Risk";
  if (normalized === "medium") return "Watch";
  return "On Track";
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function daysBetween(start: string, end: string): number {
  const delta = Math.abs(new Date(end).getTime() - new Date(start).getTime());
  return Math.max(1, Math.round(delta / 86400000));
}

function formatCompactDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}
