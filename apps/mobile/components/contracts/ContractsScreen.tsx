import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { colors, radii, spacing } from "@sisg/ui-tokens";
import { formatCompactCurrency } from "@sisg/utils";

import {
  formatContractValue,
  formatShortDate,
  getContractsSummary,
  getHealthTone,
  getStageTone,
} from "./helpers";
import { mockContracts } from "./mock-data";
import type { ContractsScreenProps } from "./types";

const DEFAULT_HEADING = "Contracts";
const DEFAULT_SUBHEADING =
  "Premium field visibility for pipeline, redlines, and award readiness.";

export function ContractsScreen({
  state = "ready",
  contracts = mockContracts,
  summary,
  heading = DEFAULT_HEADING,
  subheading = DEFAULT_SUBHEADING,
  highlightedContractId,
  errorMessage = "Contract pipeline is temporarily unavailable.",
  primaryActionLabel = "Create contract",
  onPrimaryAction,
  onRetry,
  onSelectContract,
}: ContractsScreenProps) {
  const hasContracts = contracts.length > 0;
  const surfaceState = state === "ready" && !hasContracts ? "empty" : state;
  const portfolioSummary = summary ?? getContractsSummary(contracts);
  const highlightedContract =
    contracts.find((contract) => contract.id === highlightedContractId) ?? contracts[0];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>SISG CONTRACTS</Text>
          <Text style={styles.heading}>{heading}</Text>
          <Text style={styles.subheading}>{subheading}</Text>
        </View>
        <Pressable
          disabled={!onPrimaryAction}
          onPress={onPrimaryAction}
          style={({ pressed }) => [
            styles.primaryAction,
            !onPrimaryAction && styles.disabledButton,
            pressed && onPrimaryAction ? styles.primaryActionPressed : null,
          ]}
        >
          <Text style={styles.primaryActionLabel}>{primaryActionLabel}</Text>
        </Pressable>
      </View>

      {surfaceState === "loading" ? <ContractsScreenLoading /> : null}
      {surfaceState === "error" ? (
        <StateCard
          title="Contract feed offline"
          body={errorMessage}
          actionLabel="Retry"
          onPress={onRetry}
        />
      ) : null}
      {surfaceState === "empty" ? (
        <StateCard
          title="No contracts in motion"
          body="Pipeline cards will populate here once intake or renewal opportunities are added."
          actionLabel={primaryActionLabel}
          onPress={onPrimaryAction}
        />
      ) : null}
      {surfaceState === "ready" && highlightedContract ? (
        <>
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroLabel}>Signature priority</Text>
                <Text style={styles.heroTitle}>{highlightedContract.title}</Text>
                <Text style={styles.heroBody}>
                  {highlightedContract.clientName} · {highlightedContract.region} ·{" "}
                  {highlightedContract.windowLabel}
                </Text>
              </View>
              <View style={styles.heroPillColumn}>
                <StatusPill label={highlightedContract.stage} tone={getStageTone(highlightedContract.stage)} />
                <StatusPill
                  label={highlightedContract.health}
                  tone={getHealthTone(highlightedContract.health)}
                />
              </View>
            </View>

            <View style={styles.heroMetrics}>
              <MetricBlock label="Total value" value={formatContractValue(highlightedContract)} />
              <MetricBlock
                label="Secured"
                value={formatCompactCurrency(highlightedContract.securedValue)}
              />
              <MetricBlock label="Owner" value={highlightedContract.ownerName} />
            </View>

            <View style={styles.heroFooter}>
              <Text style={styles.heroFooterLabel}>Next step</Text>
              <Text style={styles.heroFooterBody}>{highlightedContract.nextStep}</Text>
            </View>
          </View>

          <View style={styles.statsGrid}>
            <SummaryTile label="Pipeline" value={formatCompactCurrency(portfolioSummary.pipelineValue)} />
            <SummaryTile label="Secured" value={formatCompactCurrency(portfolioSummary.securedValue)} />
            <SummaryTile label="Live" value={String(portfolioSummary.liveContracts)} />
            <SummaryTile label="Pending sign" value={String(portfolioSummary.signaturesPending)} />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Priority contracts</Text>
            <Text style={styles.sectionCaption}>
              {portfolioSummary.averageCycleDays > 0
                ? `${portfolioSummary.averageCycleDays} day average cycle`
                : "Tracked for demo preview"}
            </Text>
          </View>

          <View style={styles.cardList}>
            {contracts.map((contract) => {
              const stageTone = getStageTone(contract.stage);
              const healthTone = getHealthTone(contract.health);
              const isHighlighted = contract.id === highlightedContract.id;

              return (
                <Pressable
                  key={contract.id}
                  disabled={!onSelectContract}
                  onPress={() => onSelectContract?.(contract)}
                  style={({ pressed }) => [
                    styles.contractCard,
                    isHighlighted ? styles.contractCardHighlighted : null,
                    pressed && onSelectContract ? styles.contractCardPressed : null,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderCopy}>
                      <Text style={styles.cardTitle}>{contract.title}</Text>
                      <Text style={styles.cardSubtitle}>
                        {contract.clientName} · {contract.region}
                      </Text>
                    </View>
                    <Text style={styles.cardValue}>{formatContractValue(contract)}</Text>
                  </View>

                  <View style={styles.pillRow}>
                    <StatusPill label={contract.stage} tone={stageTone} />
                    <StatusPill label={contract.health} tone={healthTone} />
                    {contract.tags.slice(0, 1).map((tag) => (
                      <StatusPill
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

                  <View style={styles.cardMetaRow}>
                    <MetaStack label="Next step" value={contract.nextStep} />
                    <MetaStack label="Updated" value={formatShortDate(contract.updatedAt)} />
                  </View>

                  <View style={styles.cardFooter}>
                    <Text style={styles.cardFooterText}>Owner: {contract.ownerName}</Text>
                    <Text style={styles.cardFooterText}>{contract.windowLabel}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

function ContractsScreenLoading() {
  return (
    <View style={styles.loadingStack}>
      <LoadingCard style={styles.loadingHero} />
      <View style={styles.statsGrid}>
        <LoadingCard style={styles.loadingTile} />
        <LoadingCard style={styles.loadingTile} />
        <LoadingCard style={styles.loadingTile} />
        <LoadingCard style={styles.loadingTile} />
      </View>
      <LoadingCard style={styles.loadingListCard} />
      <LoadingCard style={styles.loadingListCard} />
      <LoadingCard style={styles.loadingListCard} />
    </View>
  );
}

function StatusPill({
  label,
  tone,
}: {
  label: string;
  tone: { backgroundColor: string; borderColor: string; textColor: string };
}) {
  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor },
      ]}
    >
      <Text style={[styles.pillLabel, { color: tone.textColor }]}>{label}</Text>
    </View>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBlock}>
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
          styles.stateButton,
          !onPress && styles.disabledButton,
          pressed && onPress ? styles.primaryActionPressed : null,
        ]}
      >
        <Text style={styles.stateButtonLabel}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

function LoadingCard({ style }: { style?: object }) {
  return <View style={[styles.loadingCard, style]} />;
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
  primaryActionPressed: {
    opacity: 0.84,
  },
  primaryActionLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  disabledButton: {
    opacity: 0.5,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.16)",
    padding: spacing.lg,
    gap: spacing.lg,
    shadowColor: "#000000",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
    elevation: 6,
  },
  heroTopRow: {
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
    lineHeight: 28,
  },
  heroBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  heroPillColumn: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  heroMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metricBlock: {
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
  statsGrid: {
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
    alignItems: "center",
    gap: spacing.md,
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
  cardList: {
    gap: spacing.md,
  },
  contractCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    padding: spacing.md,
    gap: spacing.md,
  },
  contractCardHighlighted: {
    borderColor: "rgba(34, 211, 238, 0.34)",
  },
  contractCardPressed: {
    opacity: 0.92,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  cardHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 24,
  },
  cardSubtitle: {
    color: colors.muted,
    fontSize: 13,
  },
  cardValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
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
  cardMetaRow: {
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
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(148, 163, 184, 0.12)",
  },
  cardFooterText: {
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
  stateButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  stateButtonLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  loadingStack: {
    gap: spacing.md,
  },
  loadingCard: {
    backgroundColor: "rgba(23, 32, 51, 0.78)",
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
});
