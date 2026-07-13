import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "@sisg/ui-tokens";
import { formatCompactCurrency } from "@sisg/utils";

import {
  formatDateRange,
  formatLongDate,
  formatPercent,
  getHealthTone,
  getStageTone,
} from "./helpers";
import { mockFeaturedContract } from "./mock-data";
import type { ContractDetailProps, ContractDocument, ContractMilestone } from "./types";

const DEFAULT_HEADING = "Contract detail";
const DEFAULT_SUBHEADING = "Demo-ready commercial posture, delivery handoff, and document state.";

export function ContractDetail({
  state = "ready",
  contract = mockFeaturedContract,
  heading = DEFAULT_HEADING,
  subheading = DEFAULT_SUBHEADING,
  errorMessage = "Contract detail is unavailable right now.",
  onBack,
  onRetry,
  onOpenProject,
  onOpenDocument,
}: ContractDetailProps) {
  const surfaceState = state === "ready" && !contract ? "empty" : state;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable onPress={onBack} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}>
            <Text style={styles.backButtonLabel}>Back</Text>
          </Pressable>
        ) : null}
        <Text style={styles.eyebrow}>SISG CONTRACT DETAIL</Text>
        <Text style={styles.heading}>{heading}</Text>
        <Text style={styles.subheading}>{subheading}</Text>
      </View>

      {surfaceState === "loading" ? <DetailLoading /> : null}
      {surfaceState === "error" ? (
        <StateCard
          title="Unable to load contract"
          body={errorMessage}
          actionLabel="Retry"
          onPress={onRetry}
        />
      ) : null}
      {surfaceState === "empty" ? (
        <StateCard
          title="No contract selected"
          body="Wire a selected contract into this surface to show commercial status, documents, and linked delivery work."
          actionLabel="Retry"
          onPress={onRetry}
        />
      ) : null}
      {surfaceState === "ready" && contract ? (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroHeader}>
              <View style={styles.heroTitleBlock}>
                <Text style={styles.heroTitle}>{contract.title}</Text>
                <Text style={styles.heroBody}>
                  {contract.clientName} · {contract.contractingOffice}
                </Text>
              </View>
              <View style={styles.heroPills}>
                <TonePill label={contract.stage} tone={getStageTone(contract.stage)} />
                <TonePill label={contract.health} tone={getHealthTone(contract.health)} />
              </View>
            </View>

            <View style={styles.heroMetrics}>
              <MetricTile label="Total value" value={formatCompactCurrency(contract.totalValue)} />
              <MetricTile label="Secured" value={formatCompactCurrency(contract.securedValue)} />
              <MetricTile label="Win chance" value={formatPercent(contract.winProbability)} />
              <MetricTile label="Compliance" value={formatPercent(contract.complianceScore)} />
            </View>

            <View style={styles.heroFooter}>
              <HeroMeta label="Delivery window" value={formatDateRange(contract.startDate, contract.endDate)} />
              <HeroMeta label="Billing" value={contract.invoiceCadence} />
              <HeroMeta label="Margin" value={contract.marginLabel} />
            </View>
          </View>

          <InfoCard title="Scope overview">
            <Text style={styles.bodyText}>{contract.overview}</Text>
            <View style={styles.copyGrid}>
              <MetaPanel label="Submitted" value={formatLongDate(contract.submittedAt)} />
              <MetaPanel label="Region" value={contract.region} />
              <MetaPanel label="Owner" value={contract.ownerName} />
              <MetaPanel label="Next move" value={contract.nextStep} />
            </View>
          </InfoCard>

          <InfoCard title="Execution team">
            <View style={styles.tagRow}>
              {contract.team.map((member) => (
                <View key={member} style={styles.teamChip}>
                  <Text style={styles.teamChipLabel}>{member}</Text>
                </View>
              ))}
            </View>
          </InfoCard>

          <InfoCard title="Milestones">
            <View style={styles.stack}>
              {contract.milestones.map((milestone) => (
                <MilestoneRow key={milestone.id} milestone={milestone} />
              ))}
            </View>
          </InfoCard>

          <InfoCard title="Documents">
            <View style={styles.stack}>
              {contract.documents.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  onPress={onOpenDocument ? () => onOpenDocument(document.id) : undefined}
                />
              ))}
            </View>
          </InfoCard>

          <InfoCard title="Linked projects">
            <View style={styles.stack}>
              {contract.relatedProjects.map((project) => (
                <Pressable
                  key={project.id}
                  disabled={!onOpenProject}
                  onPress={() => onOpenProject?.(project.id)}
                  style={({ pressed }) => [styles.projectRow, pressed && onOpenProject ? styles.pressed : null]}
                >
                  <View style={styles.projectCopy}>
                    <Text style={styles.projectTitle}>{project.name}</Text>
                    <Text style={styles.projectCaption}>{project.site}</Text>
                  </View>
                  <Text style={styles.projectPhase}>{project.phase}</Text>
                </Pressable>
              ))}
            </View>
          </InfoCard>

          <InfoCard title="Operator notes">
            <View style={styles.stack}>
              {contract.notes.map((note) => (
                <View key={note} style={styles.noteCard}>
                  <Text style={styles.noteText}>{note}</Text>
                </View>
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

function HeroMeta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroMeta}>
      <Text style={styles.heroMetaLabel}>{label}</Text>
      <Text style={styles.heroMetaValue}>{value}</Text>
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

function MetaPanel({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaPanel}>
      <Text style={styles.metaPanelLabel}>{label}</Text>
      <Text style={styles.metaPanelValue}>{value}</Text>
    </View>
  );
}

function MilestoneRow({ milestone }: { milestone: ContractMilestone }) {
  const tone =
    milestone.status === "Done"
      ? { backgroundColor: "rgba(16, 185, 129, 0.14)", borderColor: "rgba(16, 185, 129, 0.34)", textColor: "#6ee7b7" }
      : milestone.status === "Blocked"
        ? { backgroundColor: "rgba(239, 68, 68, 0.14)", borderColor: "rgba(239, 68, 68, 0.34)", textColor: "#fca5a5" }
        : milestone.status === "In Progress"
          ? { backgroundColor: "rgba(34, 211, 238, 0.14)", borderColor: "rgba(34, 211, 238, 0.34)", textColor: "#67e8f9" }
          : { backgroundColor: "rgba(148, 163, 184, 0.12)", borderColor: "rgba(148, 163, 184, 0.24)", textColor: "#cbd5e1" };

  return (
    <View style={styles.rowCard}>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{milestone.label}</Text>
        <Text style={styles.rowCaption}>
          Due {formatLongDate(milestone.dueAt)} · {milestone.ownerName}
        </Text>
      </View>
      <TonePill label={milestone.status} tone={tone} />
    </View>
  );
}

function DocumentRow({
  document,
  onPress,
}: {
  document: ContractDocument;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.rowCard, pressed && onPress ? styles.pressed : null]}
    >
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{document.label}</Text>
        <Text style={styles.rowCaption}>
          {document.type} · Updated {formatLongDate(document.updatedAt)}
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
    borderColor: "rgba(37, 99, 235, 0.24)",
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroHeader: {
    gap: spacing.md,
  },
  heroTitleBlock: {
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
  heroPills: {
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
  heroFooter: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  heroMeta: {
    flexGrow: 1,
    minWidth: 150,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.14)",
    padding: spacing.md,
    gap: spacing.xs,
  },
  heroMetaLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  heroMetaValue: {
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
  copyGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metaPanel: {
    flexGrow: 1,
    minWidth: 140,
    backgroundColor: "rgba(2, 8, 23, 0.44)",
    borderRadius: radii.md,
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
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  teamChip: {
    borderRadius: radii.pill,
    backgroundColor: "rgba(34, 211, 238, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.22)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  teamChipLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "600",
  },
  stack: {
    gap: spacing.sm,
  },
  rowCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    alignItems: "center",
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
  rowAction: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  projectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    alignItems: "center",
    borderRadius: radii.md,
    backgroundColor: "rgba(2, 8, 23, 0.44)",
    padding: spacing.md,
  },
  projectCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  projectTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  projectCaption: {
    color: colors.muted,
    fontSize: 13,
  },
  projectPhase: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "700",
  },
  noteCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingLeft: spacing.md,
  },
  noteText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 21,
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
