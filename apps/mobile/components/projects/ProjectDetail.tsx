import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "@sisg/ui-tokens";
import { formatCompactCurrency } from "@sisg/utils";

import {
  formatLongDate,
  formatPercent,
  getProjectHealthTone,
  getProjectStatusTone,
} from "./helpers";
import { mockFeaturedProject } from "./mock-data";
import type {
  LinkedContract,
  ProjectActivity,
  ProjectDetailProps,
  ProjectPhase,
  ProjectRisk,
} from "./types";

const DEFAULT_HEADING = "Project detail";
const DEFAULT_SUBHEADING = "Execution posture, budget burn, risks, and linked contract context.";

export function ProjectDetail({
  state = "ready",
  project = mockFeaturedProject,
  heading = DEFAULT_HEADING,
  subheading = DEFAULT_SUBHEADING,
  errorMessage = "Project detail is unavailable right now.",
  onBack,
  onRetry,
  onOpenContract,
}: ProjectDetailProps) {
  const surfaceState = state === "ready" && !project ? "empty" : state;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backButtonLabel}>Back</Text>
          </Pressable>
        ) : null}
        <Text style={styles.eyebrow}>SISG PROJECT DETAIL</Text>
        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.subheading}>{subheading}</Text>
      </View>

      {surfaceState === "loading" ? <DetailLoading /> : null}
      {surfaceState === "error" ? (
        <StateCard title="Unable to load project" body={errorMessage} actionLabel="Retry" onPress={onRetry} />
      ) : null}
      {surfaceState === "empty" ? (
        <StateCard
          title="No project selected"
          body="Pass a selected delivery record into this surface to show progress, budget, and linked commercial work."
          actionLabel="Retry"
          onPress={onRetry}
        />
      ) : null}
      {surfaceState === "ready" && project ? (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle}>{project.name}</Text>
                <Text style={styles.heroBody}>
                  {project.clientName} · {project.site}
                </Text>
              </View>
              <View style={styles.pillRow}>
                <TonePill label={project.status} tone={getProjectStatusTone(project.status)} />
                <TonePill label={project.health} tone={getProjectHealthTone(project.health)} />
              </View>
            </View>

            <View style={styles.metricGrid}>
              <MetricTile label="Revenue" value={formatCompactCurrency(project.revenue)} />
              <MetricTile label="Progress" value={formatPercent(project.progressPercent)} />
              <MetricTile label="Budget burn" value={formatPercent(project.budgetBurnPercent)} />
              <MetricTile label="Staffed" value={formatPercent(project.staffingFillPercent)} />
            </View>

            <View style={styles.metaGrid}>
              <MetaPanel label="Site lead" value={project.siteLead} />
              <MetaPanel label="Ops cadence" value={project.opsCadence} />
              <MetaPanel label="Start" value={formatLongDate(project.startDate)} />
              <MetaPanel label="Target" value={formatLongDate(project.targetDate)} />
            </View>
          </View>

          <InfoCard title="Delivery overview">
            <Text style={styles.bodyText}>{project.overview}</Text>
            <View style={styles.metaGrid}>
              <MetaPanel label="Crew status" value={project.crewSummary} />
              <MetaPanel label="Committed budget" value={formatCompactCurrency(project.budgetCommitted)} />
              <MetaPanel label="Program manager" value={project.managerName} />
              <MetaPanel label="Next milestone" value={project.nextMilestone} />
            </View>
          </InfoCard>

          <InfoCard title="Phase plan">
            <View style={styles.stack}>
              {project.phases.map((phase) => (
                <PhaseRow key={phase.id} phase={phase} />
              ))}
            </View>
          </InfoCard>

          <InfoCard title="Risk register">
            <View style={styles.stack}>
              {project.risks.map((risk) => (
                <RiskRow key={risk.id} risk={risk} />
              ))}
            </View>
          </InfoCard>

          <InfoCard title="Recent activity">
            <View style={styles.stack}>
              {project.recentActivity.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </View>
          </InfoCard>

          <InfoCard title="Linked contracts">
            <View style={styles.stack}>
              {project.linkedContracts.map((contract) => (
                <ContractRow
                  key={contract.id}
                  contract={contract}
                  onPress={onOpenContract ? () => onOpenContract(contract.id) : undefined}
                />
              ))}
            </View>
          </InfoCard>
        </>
      ) : null}
    </ScrollView>
  );
}

function DetailLoading() {
  return (
    <View style={styles.stack}>
      <View style={[styles.loadingCard, styles.loadingHero]} />
      <View style={[styles.loadingCard, styles.loadingInfo]} />
      <View style={[styles.loadingCard, styles.loadingInfo]} />
      <View style={[styles.loadingCard, styles.loadingInfo]} />
    </View>
  );
}

function TonePill({
  label,
  tone,
}: {
  label: string;
  tone: { backgroundColor: string; borderColor: string; textColor: string };
}) {
  return (
    <View style={[styles.pill, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
      <Text style={[styles.pillLabel, { color: tone.textColor }]}>{label}</Text>
    </View>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function MetaPanel({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaPanel}>
      <Text style={styles.metaPanelLabel}>{label}</Text>
      <Text style={styles.metaPanelValue}>{value}</Text>
    </View>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>{title}</Text>
      {children}
    </View>
  );
}

function PhaseRow({ phase }: { phase: ProjectPhase }) {
  const tone =
    phase.status === "Done"
      ? { backgroundColor: "rgba(16, 185, 129, 0.14)", borderColor: "rgba(16, 185, 129, 0.32)", textColor: "#6ee7b7" }
      : phase.status === "Blocked"
        ? { backgroundColor: "rgba(239, 68, 68, 0.14)", borderColor: "rgba(239, 68, 68, 0.32)", textColor: "#fca5a5" }
        : phase.status === "In Progress"
          ? { backgroundColor: "rgba(34, 211, 238, 0.14)", borderColor: "rgba(34, 211, 238, 0.32)", textColor: "#67e8f9" }
          : { backgroundColor: "rgba(148, 163, 184, 0.12)", borderColor: "rgba(148, 163, 184, 0.22)", textColor: "#cbd5e1" };

  return (
    <View style={styles.rowCard}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{phase.label}</Text>
        <Text style={styles.rowCaption}>
          {phase.ownerName} · {formatPercent(phase.completionPercent)} complete
        </Text>
      </View>
      <TonePill label={phase.status} tone={tone} />
    </View>
  );
}

function RiskRow({ risk }: { risk: ProjectRisk }) {
  const tone =
    risk.severity === "High"
      ? { backgroundColor: "rgba(239, 68, 68, 0.14)", borderColor: "rgba(239, 68, 68, 0.32)", textColor: "#fca5a5" }
      : risk.severity === "Medium"
        ? { backgroundColor: "rgba(245, 158, 11, 0.14)", borderColor: "rgba(245, 158, 11, 0.32)", textColor: "#fcd34d" }
        : { backgroundColor: "rgba(16, 185, 129, 0.14)", borderColor: "rgba(16, 185, 129, 0.32)", textColor: "#6ee7b7" };

  return (
    <View style={styles.rowCard}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{risk.title}</Text>
        <Text style={styles.rowCaption}>{risk.mitigation}</Text>
      </View>
      <TonePill label={risk.severity} tone={tone} />
    </View>
  );
}

function ActivityRow({ activity }: { activity: ProjectActivity }) {
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{activity.label}</Text>
        <Text style={styles.rowCaption}>{activity.detail}</Text>
      </View>
      <Text style={styles.rowMeta}>{formatLongDate(activity.timestamp)}</Text>
    </View>
  );
}

function ContractRow({
  contract,
  onPress,
}: {
  contract: LinkedContract;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.rowCard, pressed && onPress ? styles.pressed : null]}
    >
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{contract.title}</Text>
        <Text style={styles.rowCaption}>
          {contract.stage} · {formatCompactCurrency(contract.value)}
        </Text>
      </View>
      <Text style={styles.rowAction}>Open</Text>
    </Pressable>
  );
}

function StateCard({
  title,
  body,
  actionLabel,
  onPress,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.bodyText}>{body}</Text>
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [styles.retryButton, !onPress ? styles.disabled : null, pressed && onPress ? styles.pressed : null]}
      >
        <Text style={styles.retryButtonLabel}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  header: {
    gap: spacing.sm,
  },
  backButton: {
    alignSelf: "flex-start",
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  backButtonLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
  },
  heading: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
  },
  subheading: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.24)",
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroHeader: {
    gap: spacing.md,
  },
  heroCopy: {
    gap: spacing.xs,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  heroBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  pill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricTile: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: "rgba(2, 8, 23, 0.52)",
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  metricValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  metaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metaPanel: {
    flexGrow: 1,
    minWidth: 140,
    borderRadius: radii.md,
    backgroundColor: "rgba(2, 8, 23, 0.44)",
    padding: spacing.md,
    gap: spacing.xs,
  },
  metaPanelLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  metaPanelValue: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    padding: spacing.lg,
    gap: spacing.md,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "700",
  },
  bodyText: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  stack: {
    gap: spacing.sm,
  },
  rowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.md,
    backgroundColor: "rgba(2, 8, 23, 0.44)",
    padding: spacing.md,
  },
  rowCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  rowCaption: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  rowAction: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  retryButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  retryButtonLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  loadingCard: {
    backgroundColor: "rgba(23, 32, 51, 0.82)",
    borderRadius: radii.lg,
  },
  loadingHero: {
    minHeight: 280,
  },
  loadingInfo: {
    minHeight: 180,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});
