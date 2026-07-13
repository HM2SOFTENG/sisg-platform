import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "@sisg/ui-tokens";
import { formatCompactCurrency } from "@sisg/utils";

import {
  formatPercent,
  formatProjectRevenue,
  formatShortDate,
  getProjectHealthTone,
  getProjectsSummary,
  getProjectStatusTone,
} from "./helpers";
import { mockProjects } from "./mock-data";
import type { ProjectsScreenProps } from "./types";

const DEFAULT_HEADING = "Projects";
const DEFAULT_SUBHEADING =
  "Delivery health, staffing confidence, and live site momentum in one mobile surface.";

export function ProjectsScreen({
  state = "ready",
  projects = mockProjects,
  summary,
  heading = DEFAULT_HEADING,
  subheading = DEFAULT_SUBHEADING,
  highlightedProjectId,
  errorMessage = "Project operations feed is temporarily unavailable.",
  primaryActionLabel = "New project brief",
  onPrimaryAction,
  onRetry,
  onSelectProject,
}: ProjectsScreenProps) {
  const hasProjects = projects.length > 0;
  const surfaceState = state === "ready" && !hasProjects ? "empty" : state;
  const deliverySummary = summary ?? getProjectsSummary(projects);
  const highlightedProject =
    projects.find((project) => project.id === highlightedProjectId) ?? projects[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>SISG PROJECTS</Text>
          <Text style={styles.heading}>{heading}</Text>
          <Text style={styles.subheading}>{subheading}</Text>
        </View>
        <Pressable
          disabled={!onPrimaryAction}
          onPress={onPrimaryAction}
          style={({ pressed }) => [
            styles.primaryAction,
            !onPrimaryAction && styles.disabled,
            pressed && onPrimaryAction ? styles.pressed : null,
          ]}
        >
          <Text style={styles.primaryActionLabel}>{primaryActionLabel}</Text>
        </Pressable>
      </View>

      {surfaceState === "loading" ? <ProjectsScreenLoading /> : null}
      {surfaceState === "error" ? (
        <StateCard
          title="Project feed offline"
          body={errorMessage}
          actionLabel="Retry"
          onPress={onRetry}
        />
      ) : null}
      {surfaceState === "empty" ? (
        <StateCard
          title="No projects active"
          body="Delivery cards will populate here once mobilization, execution, or closeout work is connected."
          actionLabel={primaryActionLabel}
          onPress={onPrimaryAction}
        />
      ) : null}
      {surfaceState === "ready" && highlightedProject ? (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroLabel}>Field priority</Text>
                <Text style={styles.heroTitle}>{highlightedProject.name}</Text>
                <Text style={styles.heroBody}>
                  {highlightedProject.clientName} · {highlightedProject.site}
                </Text>
              </View>
              <View style={styles.heroPills}>
                <TonePill
                  label={highlightedProject.status}
                  tone={getProjectStatusTone(highlightedProject.status)}
                />
                <TonePill
                  label={highlightedProject.health}
                  tone={getProjectHealthTone(highlightedProject.health)}
                />
              </View>
            </View>

            <View style={styles.heroMetrics}>
              <MetricTile label="Revenue" value={formatProjectRevenue(highlightedProject)} />
              <MetricTile label="Progress" value={formatPercent(highlightedProject.progressPercent)} />
              <MetricTile
                label="Staffed"
                value={formatPercent(highlightedProject.staffingFillPercent)}
              />
            </View>

            <View style={styles.heroFooter}>
              <Text style={styles.heroFooterLabel}>Next milestone</Text>
              <Text style={styles.heroFooterBody}>{highlightedProject.nextMilestone}</Text>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <SummaryTile label="In flight" value={formatCompactCurrency(deliverySummary.revenueInFlight)} />
            <SummaryTile label="Active" value={String(deliverySummary.activeProjects)} />
            <SummaryTile label="Critical" value={String(deliverySummary.criticalProjects)} />
            <SummaryTile label="Avg progress" value={formatPercent(deliverySummary.averageProgressPercent)} />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Project lineup</Text>
            <Text style={styles.sectionCaption}>
              Staffing average {formatPercent(deliverySummary.staffingFillPercent)}
            </Text>
          </View>

          <View style={styles.stack}>
            {projects.map((project) => (
              <Pressable
                key={project.id}
                disabled={!onSelectProject}
                onPress={() => onSelectProject?.(project)}
                style={({ pressed }) => [
                  styles.projectCard,
                  project.id === highlightedProject.id ? styles.projectCardHighlighted : null,
                  pressed && onSelectProject ? styles.pressed : null,
                ]}
              >
                <View style={styles.projectHeader}>
                  <View style={styles.projectHeaderCopy}>
                    <Text style={styles.projectTitle}>{project.name}</Text>
                    <Text style={styles.projectSubtitle}>
                      {project.clientName} · {project.site}
                    </Text>
                  </View>
                  <Text style={styles.projectRevenue}>{formatProjectRevenue(project)}</Text>
                </View>

                <View style={styles.pillRow}>
                  <TonePill label={project.status} tone={getProjectStatusTone(project.status)} />
                  <TonePill label={project.health} tone={getProjectHealthTone(project.health)} />
                  {project.tags.slice(0, 1).map((tag) => (
                    <TonePill
                      key={tag}
                      label={tag}
                      tone={{
                        backgroundColor: "rgba(148, 163, 184, 0.12)",
                        borderColor: "rgba(148, 163, 184, 0.24)",
                        textColor: colors.muted,
                      }}
                    />
                  ))}
                </View>

                <View style={styles.metricRow}>
                  <MetaStack label="Progress" value={formatPercent(project.progressPercent)} />
                  <MetaStack label="Staffed" value={formatPercent(project.staffingFillPercent)} />
                  <MetaStack label="Updated" value={formatShortDate(project.updatedAt)} />
                </View>

                <View style={styles.projectFooter}>
                  <Text style={styles.projectFooterText}>PM: {project.managerName}</Text>
                  <Text style={styles.projectFooterText}>{project.nextMilestone}</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function ProjectsScreenLoading() {
  return (
    <View style={styles.stack}>
      <View style={[styles.loadingCard, styles.loadingHero]} />
      <View style={styles.summaryGrid}>
        <View style={[styles.loadingCard, styles.loadingTile]} />
        <View style={[styles.loadingCard, styles.loadingTile]} />
        <View style={[styles.loadingCard, styles.loadingTile]} />
        <View style={[styles.loadingCard, styles.loadingTile]} />
      </View>
      <View style={[styles.loadingCard, styles.loadingListCard]} />
      <View style={[styles.loadingCard, styles.loadingListCard]} />
      <View style={[styles.loadingCard, styles.loadingListCard]} />
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

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function MetaStack({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaStack}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
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
    <View style={styles.stateCard}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      <Pressable
        disabled={!onPress}
        onPress={onPress}
        style={({ pressed }) => [
          styles.primaryAction,
          !onPress ? styles.disabled : null,
          pressed && onPress ? styles.pressed : null,
        ]}
      >
        <Text style={styles.primaryActionLabel}>{actionLabel}</Text>
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
    gap: spacing.md,
  },
  headerCopy: {
    gap: spacing.sm,
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
  primaryAction: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  primaryActionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.24)",
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroHeader: {
    gap: spacing.md,
  },
  heroCopy: {
    gap: spacing.xs,
  },
  heroLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  heroBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  heroPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
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
  heroMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricTile: {
    flexGrow: 1,
    minWidth: 96,
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
  heroFooter: {
    gap: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.12)",
  },
  heroFooterLabel: {
    color: colors.muted,
    fontSize: 12,
    textTransform: "uppercase",
  },
  heroFooterBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  summaryTile: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    padding: spacing.md,
    gap: spacing.xs,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    alignItems: "center",
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  sectionCaption: {
    color: colors.muted,
    fontSize: 13,
  },
  stack: {
    gap: spacing.md,
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    padding: spacing.md,
    gap: spacing.md,
  },
  projectCardHighlighted: {
    borderColor: "rgba(34, 211, 238, 0.3)",
  },
  projectHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  projectHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  projectTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
  },
  projectSubtitle: {
    color: colors.muted,
    fontSize: 13,
  },
  projectRevenue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metaStack: {
    flex: 1,
    gap: spacing.xs,
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  metaValue: {
    color: colors.text,
    fontSize: 14,
  },
  projectFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.12)",
  },
  projectFooterText: {
    color: colors.muted,
    fontSize: 12,
  },
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    padding: spacing.lg,
    gap: spacing.md,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  stateBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  loadingCard: {
    backgroundColor: "rgba(23, 32, 51, 0.82)",
    borderRadius: radii.lg,
  },
  loadingHero: {
    minHeight: 220,
  },
  loadingTile: {
    minHeight: 92,
    flexGrow: 1,
    minWidth: 140,
  },
  loadingListCard: {
    minHeight: 164,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
});
