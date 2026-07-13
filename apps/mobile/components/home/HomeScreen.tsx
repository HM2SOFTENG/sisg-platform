import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { colors, radii, spacing } from "@sisg/ui-tokens";
import { formatCompactCurrency, formatRelativeCount } from "@sisg/utils";
import type { DashboardSummary } from "@sisg/types";
import type { AgentCardVM, InboxThreadVM, NotificationVM } from "../../lib/view-models";

const summaryCards: Array<{
  key: keyof DashboardSummary;
  label: string;
  tone: "accent" | "success" | "warning" | "primary";
  detail: string;
  format?: (value: number) => string;
}> = [
  {
    key: "contracts",
    label: "Contracts in play",
    tone: "accent",
    detail: "Bid and teaming pipeline",
    format: (value) => formatRelativeCount(value, "contract"),
  },
  {
    key: "activeProjects",
    label: "Active delivery",
    tone: "success",
    detail: "Programs needing operator visibility",
    format: (value) => formatRelativeCount(value, "active project"),
  },
  {
    key: "activity",
    label: "Fresh signals",
    tone: "warning",
    detail: "Net new updates since last sweep",
    format: (value) => formatRelativeCount(value, "event"),
  },
  {
    key: "contractsTotal",
    label: "Qualified pipeline",
    tone: "primary",
    detail: "Estimated contract value",
    format: formatCompactCurrency,
  },
];

const operationalLanes = [
  {
    key: "contracts",
    label: "Contracts in play",
    detail: "Bid and teaming opportunities currently tracked",
    tone: "accent" as const,
  },
  {
    key: "activeProjects",
    label: "Delivery watch",
    detail: "Programs with live delivery motion",
    tone: "success" as const,
  },
  {
    key: "team",
    label: "Team coverage",
    detail: "Operators and contributors available across the stack",
    tone: "primary" as const,
  },
];

const severityRank: Record<NotificationVM["severity"], number> = {
  critical: 0,
  warning: 1,
  success: 2,
  info: 3,
};

const sourceLabels: Record<NotificationVM["source"], string> = {
  activity: "Activity",
  "sisg-agent": "Agent",
  clawbot: "ClawBot",
  digest: "Digest",
};

type PriorityItem = {
  id: string;
  label: string;
  title: string;
  detail: string;
  tone: "danger" | "warning" | "accent";
};

type QueueItem = {
  id: string;
  label: string;
  value: string;
  note: string;
};

type ActivityItem = {
  id: string;
  title: string;
  meta: string;
};

export function HomeScreen({
  agents = [],
  dashboard,
  isRefreshing = false,
  notifications = [],
  operatorName,
  onLogout,
  threads = [],
}: {
  agents?: AgentCardVM[];
  dashboard: DashboardSummary;
  isRefreshing?: boolean;
  notifications?: NotificationVM[];
  operatorName: string;
  onLogout: () => void;
  threads?: InboxThreadVM[];
}) {
  const { width } = useWindowDimensions();
  const summaryColumns = width >= 720 ? 4 : width >= 440 ? 2 : 1;
  const queueColumns = width >= 720 ? 2 : 1;
  const priorityItems = buildPriorityItems(notifications, dashboard);
  const queueItems = buildQueueItems({ agents, dashboard, notifications, threads });
  const activityItems = buildActivityItems(notifications);
  const unreadThreads = threads.filter((thread) => thread.unreadCount > 0).length;
  const unreadMessages = threads.reduce((sum, thread) => sum + thread.unreadCount, 0);
  const attentionSignals = notifications.filter((item) => item.severity === "critical" || item.severity === "warning").length;
  const agentAttention = agents.filter((agent) => agent.status !== "deployed" || agent.errorCount > 0).length;
  const deployedAgents = agents.filter((agent) => agent.status === "deployed").length;
  const totalQueueLoad = queueItems.reduce((sum, item) => sum + Number(item.value || 0), 0);
  const riskCount = priorityItems.filter((item) => item.tone !== "accent").length;
  const briefing = buildOperationalBrief({
    activity: dashboard.activity,
    activeProjects: dashboard.activeProjects,
    attentionSignals,
    contracts: dashboard.contracts,
    deployedAgents,
    inboxThreads: unreadThreads,
    operatorName,
    queueLoad: totalQueueLoad,
    riskCount,
    totalAgents: agents.length,
  });

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroGlowTop} />
        <View style={styles.heroGlowBottom} />
        <View style={styles.heroHeader}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>SISG COMMAND</Text>
            <Text style={styles.heroTitle}>Today at SISG</Text>
            <Text style={styles.heroSubtitle}>
              Premium mobile command for {operatorName}. Contracts, delivery, and operator signals stay
              visible in one pass.
            </Text>
          </View>
          <Pressable onPress={onLogout} style={styles.heroButton}>
            <Text style={styles.heroButtonText}>Log out</Text>
          </Pressable>
        </View>

        <View style={styles.heroMetrics}>
          <HeroMetric
            label="Attention now"
            value={String(attentionSignals + agentAttention)}
            detail={
              attentionSignals > 0
                ? `${attentionSignals} alert${attentionSignals === 1 ? "" : "s"} surfaced in the latest feed`
                : "No alerting signals in the latest sync"
            }
          />
          <HeroMetric
            label="Queue pressure"
            value={String(totalQueueLoad)}
            detail={
              unreadMessages > 0
                ? `${unreadMessages} unread message${unreadMessages === 1 ? "" : "s"} across ${unreadThreads} thread${unreadThreads === 1 ? "" : "s"}`
                : "Contracts, delivery, inbox, and automation in one pass"
            }
          />
          <HeroMetric
            label="Automation watch"
            value={agents.length > 0 ? `${deployedAgents}/${agents.length}` : "0"}
            detail={agents.length > 0 ? "Deployed agents with current dashboard visibility" : "Agent dashboard not yet populated"}
          />
        </View>

        <View style={styles.briefingCard}>
          <View style={styles.briefingHeader}>
            <Text style={styles.briefingEyebrow}>Operator brief</Text>
            <View style={styles.livePill}>
              {isRefreshing ? <ActivityIndicator color={colors.success} size="small" /> : <View style={styles.liveDot} />}
              <Text style={styles.livePillText}>{isRefreshing ? "Syncing" : "Live"}</Text>
            </View>
          </View>
          <Text style={styles.briefingText}>{briefing}</Text>
        </View>
      </View>

      <SectionHeader
        title="Operational overview"
        meta={`${summaryCards.length} core metrics`}
        subtitle="High-signal numbers tuned for quick scanning and future motion."
      />
      <View style={styles.summaryGrid}>
        {summaryCards.map((card) => {
          const value = typeof dashboard[card.key] === "number" ? dashboard[card.key] : 0;
          return (
            <SummaryCard
              key={card.key}
              label={card.label}
              detail={card.detail}
              value={card.format ? card.format(value) : String(value)}
              tone={card.tone}
              columns={summaryColumns}
            />
          );
        })}
      </View>

      <View style={styles.dualSection}>
        <View style={styles.flexSection}>
          <SectionHeader
            title="Mission board"
            meta={`${priorityItems.length} live items`}
            subtitle="Current attention pulled from admin activity and latest automation runs."
          />
          <View style={styles.stack}>
            {priorityItems.map((priority, index) => (
              <PriorityCard
                key={priority.id}
                index={index + 1}
                label={priority.label}
                title={priority.title}
                detail={priority.detail}
                tone={priority.tone}
              />
            ))}
          </View>
        </View>

        <View style={styles.flexSection}>
          <SectionHeader
            title="Operating lanes"
            meta="Live coverage"
            subtitle="Core operational counts kept visible without mirroring the full web dashboard."
          />
          <View style={styles.stack}>
            {operationalLanes.map((lane, index) => (
              <FunctionalLaneCard
                key={lane.key}
                index={index + 1}
                label={lane.label}
                detail={lane.detail}
                value={String(dashboard[lane.key as keyof DashboardSummary] ?? 0)}
                tone={lane.tone}
              />
            ))}
          </View>
        </View>
      </View>

      <SectionHeader
        title="Operational queues"
        meta={`${totalQueueLoad} total items`}
        subtitle="Queue cards combine dashboard counts with inbox and agent attention already exposed by current APIs."
      />
      <View style={styles.queueGrid}>
        {queueItems.map((item, index) => (
          <QueueCard
            key={item.id}
            index={index + 1}
            label={item.label}
            note={item.note}
            value={item.value}
            progress={(index + 1) / (queueItems.length + 1)}
            columns={queueColumns}
          />
        ))}
      </View>

      <SectionHeader
        title="Signal feed"
        meta={`${activityItems.length} recent updates`}
        subtitle="Recent activity and agent run summaries ordered for quick scanning."
      />
      <View style={styles.activityCard}>
        {activityItems.map((item, index) => (
          <ActivityRow
            key={item.id}
            title={item.title}
            meta={item.meta}
            isLast={index === activityItems.length - 1}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function SectionHeader({
  title,
  meta,
  subtitle,
}: {
  title: string;
  meta: string;
  subtitle: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionMeta}>{meta}</Text>
      </View>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function HeroMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <View style={styles.heroMetricCard}>
      <Text style={styles.heroMetricLabel}>{label}</Text>
      <Text style={styles.heroMetricValue}>{value}</Text>
      <Text style={styles.heroMetricDetail}>{detail}</Text>
    </View>
  );
}

function SummaryCard({
  label,
  value,
  detail,
  tone,
  columns,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "accent" | "success" | "warning" | "primary";
  columns: number;
}) {
  const toneColor = getToneColor(tone);

  return (
    <View style={[styles.summaryCard, { width: getColumnWidth(columns) }]}>
      <View style={[styles.summaryAccent, { backgroundColor: toneColor }]} />
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryDetail}>{detail}</Text>
    </View>
  );
}

function PriorityCard({
  index,
  label,
  title,
  detail,
  tone,
}: {
  index: number;
  label: string;
  title: string;
  detail: string;
  tone: "danger" | "warning" | "accent";
}) {
  const palette = getPriorityPalette(tone);

  return (
    <View style={[styles.priorityCard, { borderColor: palette.borderColor, backgroundColor: palette.backgroundColor }]}>
      <View style={styles.priorityHeader}>
        <View style={[styles.priorityBadge, { backgroundColor: palette.badgeBackgroundColor, borderColor: palette.borderColor }]}>
          <Text style={[styles.priorityBadgeText, { color: palette.color }]}>P{index}</Text>
        </View>
        <Text style={[styles.priorityLabel, { color: palette.color }]}>{label}</Text>
      </View>
      <Text style={styles.priorityTitle}>{title}</Text>
      <Text style={styles.priorityDetail}>{detail}</Text>
    </View>
  );
}

function FunctionalLaneCard({
  index,
  label,
  value,
  detail,
  tone,
}: {
  index: number;
  label: string;
  value: string;
  detail: string;
  tone: "accent" | "primary" | "success";
}) {
  const toneColor = getToneColor(tone);

  return (
    <View style={styles.functionalCard}>
      <View style={[styles.functionalRail, { backgroundColor: toneColor }]} />
      <View style={styles.functionalBody}>
        <View style={styles.functionalHeader}>
          <Text style={styles.functionalIndex}>0{index}</Text>
          <Text style={styles.functionalValue}>{value}</Text>
        </View>
        <Text style={styles.functionalLabel}>{label}</Text>
        <Text style={styles.functionalDetail}>{detail}</Text>
      </View>
    </View>
  );
}

function QueueCard({
  index,
  label,
  note,
  value,
  progress,
  columns,
}: {
  index: number;
  label: string;
  note: string;
  value: string;
  progress: number;
  columns: number;
}) {
  return (
    <View style={[styles.queueCard, { width: getColumnWidth(columns) }]}>
      <View style={styles.queueHeader}>
        <Text style={styles.queueIndex}>Lane 0{index}</Text>
        <Text style={styles.queueValue}>{value}</Text>
      </View>
      <Text style={styles.queueLabel}>{label}</Text>
      <Text style={styles.queueNote}>{note}</Text>
      <View style={styles.queueTrack}>
        <View style={[styles.queueProgress, { width: `${Math.max(18, Math.round(progress * 100))}%` }]} />
      </View>
    </View>
  );
}

function ActivityRow({
  title,
  meta,
  isLast,
}: {
  title: string;
  meta: string;
  isLast: boolean;
}) {
  return (
    <View style={[styles.activityRow, isLast ? styles.activityRowLast : null]}>
      <View style={styles.activityRail}>
        <View style={styles.activityDot} />
        {!isLast ? <View style={styles.activityLine} /> : null}
      </View>
      <View style={styles.activityCopy}>
        <Text style={styles.activityTitle}>{title}</Text>
        <Text style={styles.activityMeta}>{meta}</Text>
      </View>
    </View>
  );
}

function buildOperationalBrief({
  activity,
  activeProjects,
  attentionSignals,
  contracts,
  deployedAgents,
  inboxThreads,
  operatorName,
  queueLoad,
  riskCount,
  totalAgents,
}: {
  activity: number;
  activeProjects: number;
  attentionSignals: number;
  contracts: number;
  deployedAgents: number;
  inboxThreads: number;
  operatorName: string;
  queueLoad: number;
  riskCount: number;
  totalAgents: number;
}) {
  const riskSentence =
    riskCount > 0
      ? `${riskCount} escalation${riskCount === 1 ? "" : "s"} should be cleared before routine follow-up.`
      : "No escalations are currently flagged.";

  const inboxSentence =
    inboxThreads > 0
      ? `${inboxThreads} inbox thread${inboxThreads === 1 ? "" : "s"} waiting on response.`
      : "Inbox is clear right now.";
  const automationSentence =
    totalAgents > 0
      ? `${deployedAgents} of ${totalAgents} agents are deployed, with ${attentionSignals} automation or activity alert${attentionSignals === 1 ? "" : "s"} in the latest pull.`
      : "Agent telemetry is not populated yet from the current environment.";

  return `${operatorName} is walking into ${formatRelativeCount(activity, "new signal")}, ${formatRelativeCount(
    activeProjects,
    "active project",
  )}, and ${formatRelativeCount(contracts, "contract opportunity")} across the pipeline. ${riskSentence} ${inboxSentence} ${automationSentence} Current queue load is ${queueLoad} items.`;
}

function buildPriorityItems(notifications: NotificationVM[], dashboard: DashboardSummary): PriorityItem[] {
  const liveItems = [...notifications]
    .sort(compareNotifications)
    .slice(0, 3)
    .map((item) => ({
      id: item.id,
      label: buildPriorityLabel(item),
      title: item.title,
      detail: item.body || buildNotificationMeta(item),
      tone: mapSeverityToPriorityTone(item.severity),
    }));

  if (liveItems.length > 0) {
    return liveItems;
  }

  return [
    {
      id: "fallback-submissions",
      label: "Submissions queue",
      title: `${formatRelativeCount(dashboard.submissions, "submission")} awaiting review`,
      detail: "Live activity and agent feeds are empty, so the brief falls back to current dashboard counts.",
      tone: dashboard.submissions > 0 ? "warning" : "accent",
    },
    {
      id: "fallback-projects",
      label: "Delivery watch",
      title: `${formatRelativeCount(dashboard.activeProjects, "active project")} in motion`,
      detail: "Project monitoring is still sourced from the admin stats summary.",
      tone: dashboard.activeProjects > 0 ? "accent" : "warning",
    },
  ];
}

function buildQueueItems({
  agents,
  dashboard,
  notifications,
  threads,
}: {
  agents: AgentCardVM[];
  dashboard: DashboardSummary;
  notifications: NotificationVM[];
  threads: InboxThreadVM[];
}): QueueItem[] {
  const unreadMessages = threads.reduce((sum, thread) => sum + thread.unreadCount, 0);
  const latestThread = [...threads].sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""))[0];
  const agentAttention = agents.filter((agent) => agent.status !== "deployed" || agent.errorCount > 0).length;
  const liveAlerts = notifications.filter((item) => item.severity === "critical" || item.severity === "warning").length;

  return [
    {
      id: "queue-submissions",
      label: "Submissions in review",
      value: String(dashboard.submissions),
      note: `${dashboard.contracts} contract opportunities currently tracked.`,
    },
    {
      id: "queue-delivery",
      label: "Active delivery programs",
      value: String(dashboard.activeProjects),
      note: dashboard.projects > dashboard.activeProjects
        ? `${dashboard.projects - dashboard.activeProjects} projects are planning or completed.`
        : "All tracked projects are active right now.",
    },
    {
      id: "queue-inbox",
      label: "Unread inbox messages",
      value: String(unreadMessages),
      note: latestThread?.lastMessageAt
        ? `Latest thread updated ${formatRelativeTimestamp(latestThread.lastMessageAt)} in ${latestThread.title}.`
        : "Message channels are connected but no recent thread updates were returned.",
    },
    {
      id: "queue-agents",
      label: "Agent follow-ups",
      value: String(agentAttention + liveAlerts),
      note: agents.length > 0
        ? `${agentAttention} agents need attention, with ${liveAlerts} alerting signals in the latest run data.`
        : "Agent dashboard is available but no workers were returned in this session.",
    },
  ];
}

function buildActivityItems(notifications: NotificationVM[]): ActivityItem[] {
  const liveItems = [...notifications]
    .sort(compareNotifications)
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      title: item.title,
      meta: buildNotificationMeta(item),
    }));

  if (liveItems.length > 0) {
    return liveItems;
  }

  return [
    {
      id: "activity-fallback",
      title: "Live activity feed has not returned data yet",
      meta: "Activity sync will populate here once the current API surface emits updates.",
    },
  ];
}

function compareNotifications(a: NotificationVM, b: NotificationVM) {
  const severityDelta = severityRank[a.severity] - severityRank[b.severity];
  if (severityDelta !== 0) {
    return severityDelta;
  }

  return (b.createdAt || "").localeCompare(a.createdAt || "");
}

function buildPriorityLabel(item: NotificationVM) {
  const severityLabel =
    item.severity === "critical" ? "Critical" : item.severity === "warning" ? "Attention" : "Signal";
  return `${severityLabel} \u00b7 ${sourceLabels[item.source]}`;
}

function buildNotificationMeta(item: NotificationVM) {
  const timeLabel = item.createdAt ? formatRelativeTimestamp(item.createdAt) : "just now";
  return `${sourceLabels[item.source]} \u00b7 ${timeLabel}`;
}

function mapSeverityToPriorityTone(severity: NotificationVM["severity"]): "danger" | "warning" | "accent" {
  if (severity === "critical") {
    return "danger";
  }

  if (severity === "warning") {
    return "warning";
  }

  return "accent";
}

function formatRelativeTimestamp(value: string) {
  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "recently";
  }

  const diffMs = Date.now() - timestamp;

  if (diffMs < 60_000) {
    return "just now";
  }

  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

function getColumnWidth(columns: number) {
  if (columns <= 1) {
    return "100%";
  }

  if (columns === 2) {
    return "48%";
  }

  return "23.5%";
}

function getToneColor(tone: "accent" | "success" | "warning" | "primary") {
  switch (tone) {
    case "success":
      return colors.success;
    case "warning":
      return colors.warning;
    case "primary":
      return colors.primary;
    default:
      return colors.accent;
  }
}

function getPriorityPalette(tone: "danger" | "warning" | "accent") {
  switch (tone) {
    case "danger":
      return {
        color: colors.danger,
        backgroundColor: "rgba(239, 68, 68, 0.08)",
        badgeBackgroundColor: "rgba(239, 68, 68, 0.16)",
        borderColor: "rgba(239, 68, 68, 0.28)",
      };
    case "warning":
      return {
        color: colors.warning,
        backgroundColor: "rgba(245, 158, 11, 0.08)",
        badgeBackgroundColor: "rgba(245, 158, 11, 0.16)",
        borderColor: "rgba(245, 158, 11, 0.28)",
      };
    default:
      return {
        color: colors.accent,
        backgroundColor: "rgba(34, 211, 238, 0.08)",
        badgeBackgroundColor: "rgba(34, 211, 238, 0.16)",
        borderColor: "rgba(34, 211, 238, 0.28)",
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
    gap: spacing.xl,
    paddingBottom: spacing.xl,
  },
  heroCard: {
    position: "relative",
    overflow: "hidden",
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.18)",
    backgroundColor: colors.surface,
  },
  heroGlowTop: {
    position: "absolute",
    top: -48,
    right: -12,
    width: 180,
    height: 180,
    borderRadius: radii.pill,
    backgroundColor: "rgba(37, 99, 235, 0.16)",
  },
  heroGlowBottom: {
    position: "absolute",
    bottom: -72,
    left: -24,
    width: 220,
    height: 220,
    borderRadius: radii.pill,
    backgroundColor: "rgba(34, 211, 238, 0.12)",
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
    letterSpacing: 2,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 38,
  },
  heroSubtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 560,
  },
  heroButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.22)",
    backgroundColor: "rgba(2, 8, 23, 0.35)",
  },
  heroButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  heroMetrics: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  heroMetricCard: {
    minWidth: 160,
    flexGrow: 1,
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.16)",
    backgroundColor: "rgba(2, 8, 23, 0.42)",
  },
  heroMetricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroMetricValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  heroMetricDetail: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  briefingCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.24)",
    backgroundColor: "rgba(15, 23, 42, 0.74)",
  },
  briefingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  briefingEyebrow: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(16, 185, 129, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.28)",
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.success,
  },
  livePillText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "700",
  },
  briefingText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionHeader: {
    gap: spacing.xs,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  sectionMeta: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  summaryCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
  },
  summaryAccent: {
    width: 42,
    height: 4,
    borderRadius: radii.pill,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  summaryDetail: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  dualSection: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },
  flexSection: {
    flex: 1,
    minWidth: 280,
    gap: spacing.md,
  },
  stack: {
    gap: spacing.md,
  },
  priorityCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  priorityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  priorityBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  priorityBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  priorityLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.9,
  },
  priorityTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  priorityDetail: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  functionalCard: {
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surface,
  },
  functionalRail: {
    width: 6,
  },
  functionalBody: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.md,
  },
  functionalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  functionalIndex: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  functionalValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  functionalLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  functionalDetail: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  queueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  queueCard: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surface,
  },
  queueHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  queueIndex: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  queueValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
  },
  queueLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  queueNote: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  queueTrack: {
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: "rgba(148, 163, 184, 0.16)",
    overflow: "hidden",
  },
  queueProgress: {
    height: "100%",
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
  },
  activityCard: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surface,
  },
  activityRow: {
    flexDirection: "row",
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  activityRowLast: {
    paddingBottom: 0,
  },
  activityRail: {
    alignItems: "center",
    width: 14,
  },
  activityDot: {
    width: 10,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    marginTop: 4,
  },
  activityLine: {
    flex: 1,
    width: 2,
    marginTop: spacing.xs,
    backgroundColor: "rgba(148, 163, 184, 0.18)",
  },
  activityCopy: {
    flex: 1,
    gap: 2,
  },
  activityTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  activityMeta: {
    color: colors.muted,
    fontSize: 13,
  },
});
