import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radii, spacing } from "@sisg/ui-tokens";
import type {
  AgentHealthStatus,
  AgentIncident,
  AgentIncidentSeverity,
  AgentMonitorItem,
  AgentRunState,
  AgentsOverviewStats,
} from "./types";

export interface AgentsSurfaceProps {
  title?: string;
  subtitle?: string;
  agents?: AgentMonitorItem[];
  incidents?: AgentIncident[];
  summary?: AgentsOverviewStats | null;
  errorMessage?: string | null;
  isLoading?: boolean;
  onPrimaryAction?: () => void;
  primaryActionLabel?: string;
  onSelectAgent?: (agent: AgentMonitorItem) => void;
}

export function AgentsSurface({
  title = "SISG Agents",
  subtitle = "Live command coverage across deployed SISG automation, scheduler health, and the latest execution signals.",
  agents = [],
  incidents = [],
  summary,
  errorMessage,
  isLoading = false,
  onPrimaryAction,
  primaryActionLabel = "Refresh feed",
  onSelectAgent,
}: AgentsSurfaceProps) {
  const healthyCount = agents.filter((agent) => agent.status === "healthy").length;
  const overview = summary ?? {
    total: agents.length,
    deployed: healthyCount,
    attentionCount: agents.filter((agent) => agent.status !== "healthy").length,
    totalRuns: agents.reduce((sum, agent) => sum + (agent.totalRuns || 0), 0),
    schedulerLabel: "Scheduler status unavailable",
    updatedLabel: "Now",
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        onPrimaryAction ? (
          <RefreshControl
            refreshing={isLoading && agents.length > 0}
            onRefresh={onPrimaryAction}
            tintColor={colors.accent}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroGlowPrimary} />
        <View style={styles.heroGlowSecondary} />
        <View style={styles.heroHeader}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>AUTONOMY COMMAND</Text>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          </View>
          <Pressable onPress={onPrimaryAction} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>{primaryActionLabel}</Text>
          </Pressable>
        </View>

        <View style={styles.heroBadgeRow}>
          <Badge label={overview.schedulerLabel} tone={overview.attentionCount > 0 ? "warning" : "info"} />
          <Badge label={`Updated ${overview.updatedLabel}`} tone="neutral" />
        </View>

        <View style={styles.metricRow}>
          <MetricCard label="Deployed" value={String(overview.deployed)} accent={colors.success} />
          <MetricCard label="Attention" value={String(overview.attentionCount)} accent={colors.warning} />
          <MetricCard label="Run history" value={String(overview.totalRuns)} accent={colors.accent} />
        </View>
      </View>

      {errorMessage ? <ErrorCard message={errorMessage} /> : null}

      {isLoading && agents.length === 0 ? (
        <View style={styles.feedbackCard}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.feedbackTitle}>Refreshing SISG agent telemetry</Text>
          <Text style={styles.feedbackBody}>Hydrating dashboard summary, latest runs, and attention signals.</Text>
        </View>
      ) : null}

      {!isLoading && incidents.length > 0 ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Attention board</Text>
            <Text style={styles.sectionMeta}>{incidents.length} live signals</Text>
          </View>
          <View style={styles.stack}>
            {incidents.map((incident) => (
              <IncidentCard key={incident.id} incident={incident} />
            ))}
          </View>
        </View>
      ) : null}

      {!isLoading && agents.length === 0 ? (
        <EmptyCard
          title="No agent telemetry available"
          body="The mobile monitor is live, but the backend has not returned any SISG agent records yet."
        />
      ) : null}

      {!isLoading && agents.length > 0 ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Agent roster</Text>
            <Text style={styles.sectionMeta}>{overview.total} monitored services</Text>
          </View>
          <View style={styles.stack}>
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} onPress={() => onSelectAgent?.(agent)} />
            ))}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricAccent, { backgroundColor: accent }]} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function Badge({
  label,
  tone,
}: {
  label: string;
  tone: "info" | "warning" | "neutral";
}) {
  const palette =
    tone === "warning"
      ? { backgroundColor: "rgba(245, 158, 11, 0.12)", borderColor: "rgba(245, 158, 11, 0.28)", color: colors.warning }
      : tone === "info"
        ? { backgroundColor: "rgba(34, 211, 238, 0.12)", borderColor: "rgba(34, 211, 238, 0.28)", color: colors.accent }
        : { backgroundColor: colors.surfaceAlt, borderColor: colors.surfaceAlt, color: colors.muted };

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor, borderColor: palette.borderColor }]}>
      <Text style={[styles.badgeText, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

function IncidentCard({ incident }: { incident: AgentIncident }) {
  const tone = getIncidentTone(incident.severity);

  return (
    <View style={[styles.incidentCard, { borderColor: tone.borderColor, backgroundColor: tone.backgroundColor }]}>
      <View style={styles.row}>
        <Text style={styles.incidentTitle}>{incident.title}</Text>
        <Text style={[styles.incidentSeverity, { color: tone.color }]}>{formatIncidentSeverity(incident.severity)}</Text>
      </View>
      {incident.agentLabel || incident.detailLabel ? (
        <View style={styles.metaPillRow}>
          {incident.agentLabel ? <MetaPill label={incident.agentLabel} /> : null}
          {incident.detailLabel ? <MetaPill label={incident.detailLabel} /> : null}
        </View>
      ) : null}
      <Text style={styles.incidentSummary}>{incident.summary}</Text>
      <Text style={styles.incidentTime}>{incident.timeLabel}</Text>
    </View>
  );
}

function AgentCard({
  agent,
  onPress,
}: {
  agent: AgentMonitorItem;
  onPress?: () => void;
}) {
  const tone = getAgentTone(agent.status);
  const runTone = getRunTone(agent.latestRunState || "idle");

  return (
    <Pressable onPress={onPress} style={styles.agentCard}>
      <View style={styles.row}>
        <View style={styles.agentIdentity}>
          <View style={[styles.agentStatusDot, { backgroundColor: tone.color }]} />
          <View style={styles.agentCopy}>
            <Text style={styles.agentName}>{agent.name}</Text>
            <Text style={styles.agentOwner}>{agent.owner}</Text>
          </View>
        </View>
        <View style={styles.statusCluster}>
          <View style={[styles.statusPill, { borderColor: tone.borderColor, backgroundColor: tone.backgroundColor }]}>
            <Text style={[styles.statusPillText, { color: tone.color }]}>{formatAgentStatus(agent.status)}</Text>
          </View>
          <View style={[styles.statusPill, { borderColor: runTone.borderColor, backgroundColor: runTone.backgroundColor }]}>
            <Text style={[styles.statusPillText, { color: runTone.color }]}>{formatRunState(agent.latestRunState || "idle")}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.agentSummary}>{agent.summary}</Text>

      {agent.handleLabel || agent.scheduleLabel ? (
        <View style={styles.metaPillRow}>
          {agent.categoryLabel ? <MetaPill label={agent.categoryLabel} /> : null}
          {agent.handleLabel ? <MetaPill label={agent.handleLabel} /> : null}
          {agent.scheduleLabel ? <MetaPill label={agent.scheduleLabel} /> : null}
        </View>
      ) : null}

      <View style={styles.metricRail}>
        <MiniMetric label="Success" value={`${agent.automationRate}%`} />
        <MiniMetric label="Errors" value={String(agent.errorCount || 0)} />
        <MiniMetric label="Last run" value={agent.lastRunLabel} />
        <MiniMetric label="Next run" value={agent.nextRunLabel || "Pending"} />
      </View>

      {(agent.criticalCount || agent.warningCount || agent.infoCount) ? (
        <View style={styles.signalRail}>
          {(agent.criticalCount || 0) > 0 ? <SignalChip label={`${agent.criticalCount} critical`} tone="critical" /> : null}
          {(agent.warningCount || 0) > 0 ? <SignalChip label={`${agent.warningCount} warning`} tone="warning" /> : null}
          {(agent.infoCount || 0) > 0 ? <SignalChip label={`${agent.infoCount} info`} tone="info" /> : null}
        </View>
      ) : null}

      {agent.activeTask ? (
        <View style={styles.taskCard}>
          <Text style={styles.taskEyebrow}>{agent.activeTask.queue}</Text>
          <Text style={styles.taskTitle}>{agent.activeTask.title}</Text>
          <Text style={styles.taskMeta}>{agent.activeTask.etaLabel}</Text>
        </View>
      ) : null}

      {agent.latestResult ? (
        <View style={styles.resultCard}>
          <Text style={styles.resultEyebrow}>Latest result</Text>
          <Text style={styles.resultBody}>{agent.latestResult}</Text>
        </View>
      ) : null}

      {agent.capabilities.length > 0 ? (
        <View style={styles.tagRow}>
          {agent.capabilities.map((capability) => (
            <View key={capability} style={styles.tag}>
              <Text style={styles.tagText}>{capability}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {agent.channels && agent.channels.length > 0 ? (
        <View style={styles.channelRow}>
          {agent.channels.map((channel) => (
            <View key={channel} style={styles.channelChip}>
              <Text style={styles.channelText}>{channel}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

function MetaPill({ label }: { label: string }) {
  return (
    <View style={styles.metaPill}>
      <Text style={styles.metaPillText}>{label}</Text>
    </View>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.miniMetric}>
      <Text style={styles.miniMetricLabel}>{label}</Text>
      <Text style={styles.miniMetricValue}>{value}</Text>
    </View>
  );
}

function SignalChip({
  label,
  tone,
}: {
  label: string;
  tone: "critical" | "warning" | "info";
}) {
  const palette =
    tone === "critical"
      ? { backgroundColor: "rgba(239, 68, 68, 0.12)", color: colors.danger }
      : tone === "warning"
        ? { backgroundColor: "rgba(245, 158, 11, 0.12)", color: colors.warning }
        : { backgroundColor: "rgba(34, 211, 238, 0.12)", color: colors.accent };

  return (
    <View style={[styles.signalChip, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.signalChipText, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <View style={[styles.feedbackCard, styles.errorCard]}>
      <Text style={styles.feedbackTitle}>Agent monitor degraded</Text>
      <Text style={styles.feedbackBody}>{message}</Text>
    </View>
  );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.feedbackCard}>
      <Text style={styles.feedbackTitle}>{title}</Text>
      <Text style={styles.feedbackBody}>{body}</Text>
    </View>
  );
}

function formatAgentStatus(status: AgentHealthStatus): string {
  switch (status) {
    case "degraded":
      return "Degraded";
    case "paused":
      return "Paused";
    case "offline":
      return "Offline";
    default:
      return "Healthy";
  }
}

function formatRunState(state: AgentRunState): string {
  switch (state) {
    case "running":
      return "Running";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return "Idle";
  }
}

function formatIncidentSeverity(severity: AgentIncidentSeverity): string {
  switch (severity) {
    case "critical":
      return "Critical";
    case "warning":
      return "Warning";
    default:
      return "Info";
  }
}

function getAgentTone(status: AgentHealthStatus) {
  switch (status) {
    case "degraded":
      return {
        color: colors.warning,
        backgroundColor: "rgba(245, 158, 11, 0.12)",
        borderColor: "rgba(245, 158, 11, 0.32)",
      };
    case "paused":
      return {
        color: colors.primary,
        backgroundColor: "rgba(37, 99, 235, 0.12)",
        borderColor: "rgba(37, 99, 235, 0.32)",
      };
    case "offline":
      return {
        color: colors.danger,
        backgroundColor: "rgba(239, 68, 68, 0.12)",
        borderColor: "rgba(239, 68, 68, 0.32)",
      };
    default:
      return {
        color: colors.success,
        backgroundColor: "rgba(16, 185, 129, 0.12)",
        borderColor: "rgba(16, 185, 129, 0.32)",
      };
  }
}

function getRunTone(state: AgentRunState) {
  switch (state) {
    case "running":
      return {
        color: colors.accent,
        backgroundColor: "rgba(34, 211, 238, 0.12)",
        borderColor: "rgba(34, 211, 238, 0.3)",
      };
    case "failed":
      return {
        color: colors.danger,
        backgroundColor: "rgba(239, 68, 68, 0.12)",
        borderColor: "rgba(239, 68, 68, 0.3)",
      };
    case "completed":
      return {
        color: colors.success,
        backgroundColor: "rgba(16, 185, 129, 0.12)",
        borderColor: "rgba(16, 185, 129, 0.3)",
      };
    default:
      return {
        color: colors.muted,
        backgroundColor: colors.surfaceAlt,
        borderColor: colors.surfaceAlt,
      };
  }
}

function getIncidentTone(severity: AgentIncidentSeverity) {
  switch (severity) {
    case "critical":
      return {
        color: colors.danger,
        backgroundColor: "rgba(239, 68, 68, 0.08)",
        borderColor: "rgba(239, 68, 68, 0.3)",
      };
    case "warning":
      return {
        color: colors.warning,
        backgroundColor: "rgba(245, 158, 11, 0.08)",
        borderColor: "rgba(245, 158, 11, 0.3)",
      };
    default:
      return {
        color: colors.accent,
        backgroundColor: "rgba(34, 211, 238, 0.08)",
        borderColor: "rgba(34, 211, 238, 0.3)",
      };
  }
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
  heroCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.24)",
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroGlowPrimary: {
    position: "absolute",
    right: -36,
    top: -48,
    height: 170,
    width: 170,
    borderRadius: 85,
    backgroundColor: "rgba(34, 211, 238, 0.12)",
  },
  heroGlowSecondary: {
    position: "absolute",
    left: -52,
    bottom: -88,
    height: 190,
    width: 190,
    borderRadius: 95,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  heroSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.28)",
    backgroundColor: "rgba(34, 211, 238, 0.12)",
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  heroBadgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  badge: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metricAccent: {
    height: 3,
    width: 28,
    borderRadius: radii.pill,
  },
  metricValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  sectionCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  stack: {
    gap: spacing.sm,
  },
  incidentCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  incidentTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  incidentSeverity: {
    fontSize: 12,
    fontWeight: "700",
  },
  incidentSummary: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  incidentTime: {
    color: colors.muted,
    fontSize: 12,
  },
  agentCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.background,
    padding: spacing.md,
    gap: spacing.md,
  },
  agentIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  agentStatusDot: {
    height: 12,
    width: 12,
    borderRadius: 6,
  },
  agentCopy: {
    gap: 2,
    flex: 1,
  },
  agentName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  agentOwner: {
    color: colors.muted,
    fontSize: 12,
  },
  statusCluster: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: spacing.xs,
  },
  statusPill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  agentSummary: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  metaPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  metaPill: {
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaPillText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  metricRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  miniMetric: {
    minWidth: "47%",
    flexGrow: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.sm,
    gap: 2,
  },
  miniMetricLabel: {
    color: colors.muted,
    fontSize: 11,
  },
  miniMetricValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  signalRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  signalChip: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  signalChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  taskCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.28)",
    backgroundColor: "rgba(34, 211, 238, 0.08)",
    padding: spacing.md,
    gap: spacing.xs,
  },
  taskEyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  taskTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  taskMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  resultCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.xs,
  },
  resultEyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  resultBody: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tag: {
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  tagText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "600",
  },
  channelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  channelChip: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.28)",
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  channelText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "600",
  },
  feedbackCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  errorCard: {
    borderColor: "rgba(239, 68, 68, 0.32)",
  },
  feedbackTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  feedbackBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
