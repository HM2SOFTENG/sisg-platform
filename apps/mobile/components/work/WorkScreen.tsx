import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "@sisg/ui-tokens";

import {
  ContractDetail,
  type ContractDetailData,
  ContractsScreen,
  type ContractListItem,
  type DemoSurfaceState as ContractsSurfaceState,
  mockContracts,
  mockContractsSummary,
} from "../contracts";
import {
  ProjectDetail,
  type ProjectDetailData,
  ProjectsScreen,
  type DemoSurfaceState as ProjectsSurfaceState,
  type ProjectListItem,
  mockProjects,
  mockProjectsSummary,
} from "../projects";

type WorkMode = "contracts" | "projects";

const modes: Array<{ id: WorkMode; label: string; summary: string }> = [
  { id: "contracts", label: "Contracts", summary: "Pipeline, award readiness, and approvals" },
  { id: "projects", label: "Projects", summary: "Delivery health, staffing, and milestones" },
];

export interface WorkScreenProps {
  contracts?: ContractListItem[];
  projects?: ProjectListItem[];
  contractsState?: ContractsSurfaceState;
  projectsState?: ProjectsSurfaceState;
  contractsErrorMessage?: string;
  projectsErrorMessage?: string;
  onRetryContracts?: () => void;
  onRetryProjects?: () => void;
}

export function WorkScreen({
  contracts = mockContracts,
  projects = mockProjects,
  contractsState = "ready",
  projectsState = "ready",
  contractsErrorMessage,
  projectsErrorMessage,
  onRetryContracts,
  onRetryProjects,
}: WorkScreenProps) {
  const [mode, setMode] = useState<WorkMode>("contracts");
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const active = useMemo(() => modes.find((item) => item.id === mode) ?? modes[0], [mode]);
  const contractSummary = contracts.length > 0 ? undefined : mockContractsSummary;
  const projectSummary = projects.length > 0 ? undefined : mockProjectsSummary;
  const highlightedContractId = contracts[0]?.id;
  const highlightedProjectId = projects[0]?.id;
  const selectedContract = useMemo(
    () => contracts.find((contract) => contract.id === selectedContractId) ?? null,
    [contracts, selectedContractId],
  );
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) ?? null,
    [projects, selectedProjectId],
  );
  const contractDetail = useMemo(
    () => (selectedContract ? buildContractDetail(selectedContract, projects) : null),
    [projects, selectedContract],
  );
  const projectDetail = useMemo(
    () => (selectedProject ? buildProjectDetail(selectedProject, contracts) : null),
    [contracts, selectedProject],
  );

  function showContractDetail(contractId: string) {
    setMode("contracts");
    setSelectedContractId(contractId);
  }

  function showProjectDetail(projectId: string) {
    setMode("projects");
    setSelectedProjectId(projectId);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>EXECUTION LANE</Text>
        <Text style={styles.title}>Work</Text>
        <Text style={styles.subtitle}>
          Switch between revenue motion and delivery operations without leaving the command layer.
        </Text>
        <View style={styles.segmentedControl}>
          {modes.map((item) => {
            const selected = item.id === mode;

            return (
              <Pressable
                key={item.id}
                onPress={() => setMode(item.id)}
                style={[styles.segment, selected ? styles.segmentActive : null]}
              >
                <Text style={[styles.segmentLabel, selected ? styles.segmentLabelActive : null]}>
                  {item.label}
                </Text>
                <Text style={[styles.segmentSummary, selected ? styles.segmentSummaryActive : null]}>
                  {item.summary}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.contextCard}>
          <Text style={styles.contextEyebrow}>Focused lane</Text>
          <Text style={styles.contextTitle}>{active.label}</Text>
          <Text style={styles.contextBody}>{active.summary}</Text>
        </View>
      </View>

      <View style={styles.surface}>
        {mode === "contracts" && selectedContractId ? (
          <ContractDetail
            state={contractsState}
            contract={contractDetail}
            heading={contractDetail?.title || "Contract detail"}
            subheading="Live mobile detail derived from the current SISG contract feed."
            errorMessage={contractsErrorMessage}
            onBack={() => setSelectedContractId(null)}
            onRetry={onRetryContracts}
            onOpenProject={showProjectDetail}
          />
        ) : null}
        {mode === "projects" && selectedProjectId ? (
          <ProjectDetail
            state={projectsState}
            project={projectDetail}
            heading={projectDetail?.name || "Project detail"}
            subheading="Live mobile detail derived from the current SISG delivery feed."
            errorMessage={projectsErrorMessage}
            onBack={() => setSelectedProjectId(null)}
            onRetry={onRetryProjects}
            onOpenContract={showContractDetail}
          />
        ) : null}
        {mode === "contracts" && !selectedContractId ? (
          <ContractsScreen
            state={contractsState}
            contracts={contracts}
            summary={contractSummary}
            highlightedContractId={highlightedContractId}
            primaryActionLabel="Create contract"
            errorMessage={contractsErrorMessage}
            onRetry={onRetryContracts}
            onSelectContract={(contract) => setSelectedContractId(contract.id)}
          />
        ) : null}
        {mode === "projects" && !selectedProjectId ? (
          <ProjectsScreen
            state={projectsState}
            projects={projects}
            summary={projectSummary}
            highlightedProjectId={highlightedProjectId}
            primaryActionLabel="New project brief"
            errorMessage={projectsErrorMessage}
            onRetry={onRetryProjects}
            onSelectProject={(project) => setSelectedProjectId(project.id)}
          />
        ) : null}
      </View>
    </View>
  );
}

function buildContractDetail(
  contract: ContractListItem,
  projects: ProjectListItem[],
): ContractDetailData {
  const linkedProjects = projects
    .filter((project) => {
      const normalizedProjectText = `${project.name} ${project.clientName} ${project.site}`.toLowerCase();
      const normalizedContractText = `${contract.title} ${contract.clientName}`.toLowerCase();
      return normalizedProjectText.includes(contract.clientName.toLowerCase()) || normalizedContractText.includes(project.clientName.toLowerCase());
    })
    .slice(0, 3)
    .map((project) => ({
      id: project.id,
      name: project.name,
      phase: project.status,
      site: project.site,
    }));

  const anchorDate = safeDate(contract.updatedAt);
  const startDate = shiftDate(anchorDate, -21);
  const endDate = shiftDate(anchorDate, 45);
  const submittedAt = shiftDate(anchorDate, -(contract.salesCycleDays ?? 14));

  return {
    ...contract,
    overview:
      contract.nextStep ||
      `Current operator snapshot for ${contract.clientName}. Mobile detail is derived from the live contract feed until a dedicated detail endpoint lands.`,
    contractingOffice: contract.region,
    submittedAt,
    startDate,
    endDate,
    invoiceCadence: contract.stage === "Active" ? "Monthly progress billing" : "Pending award schedule",
    complianceScore: contract.health === "Blocked" ? 48 : contract.health === "At Risk" ? 67 : contract.health === "Watch" ? 81 : 93,
    winProbability: contract.stage === "Signature" ? 88 : contract.stage === "Negotiation" ? 72 : contract.stage === "Review" ? 54 : contract.stage === "Active" ? 100 : 42,
    marginLabel: contract.health === "Blocked" ? "Needs review" : contract.health === "At Risk" ? "Tight" : "Healthy",
    team: [contract.ownerName, "Capture lead", "Delivery coordinator"],
    milestones: [
      {
        id: `${contract.id}-milestone-1`,
        label: "Commercial review",
        dueAt: shiftDate(anchorDate, -7),
        status: contract.stage === "Active" ? "Done" : "In Progress",
        ownerName: contract.ownerName,
      },
      {
        id: `${contract.id}-milestone-2`,
        label: "Redline and approvals",
        dueAt: shiftDate(anchorDate, 3),
        status: contract.stage === "Signature" ? "In Progress" : contract.health === "Blocked" ? "Blocked" : "Pending",
        ownerName: "Operations",
      },
      {
        id: `${contract.id}-milestone-3`,
        label: contract.stage === "Active" ? "Delivery kickoff" : "Award decision",
        dueAt: shiftDate(anchorDate, 10),
        status: contract.stage === "Active" ? "In Progress" : "Pending",
        ownerName: linkedProjects[0]?.name || "Program lead",
      },
    ],
    documents: [
      {
        id: `${contract.id}-doc-sow`,
        label: "Statement of work",
        type: "SOW",
        updatedAt: contract.updatedAt,
      },
      {
        id: `${contract.id}-doc-pricing`,
        label: "Pricing workbook",
        type: "Pricing",
        updatedAt: shiftDate(anchorDate, -2),
      },
      {
        id: `${contract.id}-doc-compliance`,
        label: "Compliance checklist",
        type: "Compliance",
        updatedAt: shiftDate(anchorDate, -1),
      },
    ],
    relatedProjects: linkedProjects,
    notes: [
      `Latest mobile signal: ${contract.windowLabel}.`,
      `Commercial posture: ${contract.health} with stage ${contract.stage}.`,
      "This detail surface is populated from current mobile contract data and linked project context, without a dedicated backend detail endpoint yet.",
    ],
  };
}

function buildProjectDetail(
  project: ProjectListItem,
  contracts: ContractListItem[],
): ProjectDetailData {
  const linkedContracts = contracts
    .filter((contract) => {
      const normalizedProjectText = `${project.name} ${project.clientName} ${project.site}`.toLowerCase();
      const normalizedContractText = `${contract.title} ${contract.clientName}`.toLowerCase();
      return normalizedProjectText.includes(contract.clientName.toLowerCase()) || normalizedContractText.includes(project.clientName.toLowerCase());
    })
    .slice(0, 3)
    .map((contract) => ({
      id: contract.id,
      title: contract.title,
      stage: contract.stage,
      value: contract.totalValue,
    }));

  const anchorDate = safeDate(project.updatedAt);
  const startDate = shiftDate(anchorDate, -30);
  const targetDate = shiftDate(anchorDate, 30);

  return {
    ...project,
    overview:
      project.nextMilestone ||
      `Current operator snapshot for ${project.clientName}. Mobile detail is derived from the live project feed until a dedicated project detail endpoint lands.`,
    startDate,
    targetDate,
    siteLead: project.managerName,
    opsCadence: project.status === "Active" ? "Daily field sync" : "Weekly operator review",
    budgetBurnPercent: clamp(Math.max(project.progressPercent - 6, 12), 0, 100),
    budgetCommitted: Math.round(project.revenue * Math.max(project.progressPercent, 15) / 100),
    crewSummary: `${project.staffingFillPercent}% staffed across current deployment coverage.`,
    phases: [
      {
        id: `${project.id}-phase-1`,
        label: "Mobilization",
        ownerName: project.managerName,
        completionPercent: project.status === "Planning" ? 35 : 100,
        status: project.status === "Planning" ? "In Progress" : "Done",
      },
      {
        id: `${project.id}-phase-2`,
        label: "Field execution",
        ownerName: "Operations",
        completionPercent: project.progressPercent,
        status: project.status === "Delayed" ? "Blocked" : project.progressPercent >= 100 ? "Done" : "In Progress",
      },
      {
        id: `${project.id}-phase-3`,
        label: "Closeout and reporting",
        ownerName: "Program controls",
        completionPercent: project.status === "Closing" ? 64 : 0,
        status: project.status === "Closing" ? "In Progress" : "Pending",
      },
    ],
    risks: [
      {
        id: `${project.id}-risk-1`,
        title: project.health === "Critical" || project.health === "At Risk" ? "Execution pressure" : "Normal delivery watch",
        severity: project.health === "Critical" ? "High" : project.health === "At Risk" || project.health === "Watch" ? "Medium" : "Low",
        mitigation: project.nextMilestone,
      },
      {
        id: `${project.id}-risk-2`,
        title: "Staffing alignment",
        severity: project.staffingFillPercent < 75 ? "High" : project.staffingFillPercent < 90 ? "Medium" : "Low",
        mitigation: `Current staffing fill is ${project.staffingFillPercent}%. Rebalance coverage before the next milestone.`,
      },
    ],
    recentActivity: [
      {
        id: `${project.id}-activity-1`,
        timestamp: shiftDate(anchorDate, -3),
        label: "Field update",
        detail: project.nextMilestone,
      },
      {
        id: `${project.id}-activity-2`,
        timestamp: shiftDate(anchorDate, -1),
        label: "Operator sync",
        detail: `Status remains ${project.status} with health ${project.health}.`,
      },
      {
        id: `${project.id}-activity-3`,
        timestamp: anchorDate.toISOString(),
        label: "Mobile refresh",
        detail: "Latest project card data pulled into the native command surface.",
      },
    ],
    linkedContracts,
  };
}

function safeDate(value: string): Date {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}

function shiftDate(date: Date, days: number): string {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next.toISOString();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.2,
  },
  title: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "800",
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 420,
  },
  segmentedControl: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  segment: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    gap: 4,
  },
  segmentActive: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.primary,
  },
  segmentLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  segmentLabelActive: {
    color: colors.text,
  },
  segmentSummary: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  segmentSummaryActive: {
    color: colors.text,
  },
  contextCard: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surface,
    gap: 4,
  },
  contextEyebrow: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  contextTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  contextBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  surface: {
    flex: 1,
  },
});
