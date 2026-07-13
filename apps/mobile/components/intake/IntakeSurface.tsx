import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, radii, spacing, typography } from "@sisg/ui-tokens";
import type { IntakeSubmission, IntakeSummary, SubmissionStatus } from "./types";

type StatusFilter = "all" | SubmissionStatus;

const statusFilters: Array<{ id: StatusFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "reviewed", label: "Reviewed" },
  { id: "responded", label: "Responded" },
];

export function IntakeSurface({
  submissions,
  summary,
  isLoading,
  isUpdating,
  errorMessage,
  onRefresh,
  onUpdateStatus,
}: {
  submissions: IntakeSubmission[];
  summary: IntakeSummary;
  isLoading: boolean;
  isUpdating: string | null;
  errorMessage: string | null;
  onRefresh: () => void;
  onUpdateStatus: (submissionId: string, status: SubmissionStatus) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredSubmissions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return submissions.filter((submission) => {
      const matchesFilter = filter === "all" || submission.status === filter;
      if (!matchesFilter) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = `${submission.name} ${submission.email} ${submission.subject} ${submission.message}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [filter, query, submissions]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>INTAKE TRIAGE</Text>
            <Text style={styles.heroTitle}>Submissions</Text>
            <Text style={styles.heroBody}>
              Live contact intake with mobile-first review and response-state updates.
            </Text>
          </View>
          <Pressable onPress={onRefresh} style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}>
            <Text style={styles.refreshButtonLabel}>Refresh</Text>
          </Pressable>
        </View>

        <View style={styles.summaryGrid}>
          <SummaryCard label="Total" value={String(summary.total)} accent="neutral" />
          <SummaryCard label="New" value={String(summary.newCount)} accent="primary" />
          <SummaryCard label="Reviewed" value={String(summary.reviewedCount)} accent="warning" />
          <SummaryCard label="Responded" value={String(summary.respondedCount)} accent="success" />
        </View>
      </View>

      <View style={styles.toolbarCard}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, email, subject, or message"
          placeholderTextColor={colors.textSubtle}
          style={styles.searchInput}
        />

        <View style={styles.filterRow}>
          {statusFilters.map((item) => {
            const active = item.id === filter;
            return (
              <Pressable
                key={item.id}
                onPress={() => setFilter(item.id)}
                style={({ pressed }) => [
                  styles.filterChip,
                  active ? styles.filterChipActive : null,
                  pressed ? styles.pressed : null,
                ]}
              >
                <Text style={[styles.filterChipLabel, active ? styles.filterChipLabelActive : null]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.stateTitle}>Loading submissions</Text>
          <Text style={styles.stateBody}>Pulling the latest contact intake from the SISG admin API.</Text>
        </View>
      ) : null}

      {!isLoading && errorMessage ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>Submission feed offline</Text>
          <Text style={styles.stateBody}>{errorMessage}</Text>
          <Pressable onPress={onRefresh} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
            <Text style={styles.retryButtonLabel}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !errorMessage && filteredSubmissions.length === 0 ? (
        <View style={styles.stateCard}>
          <Text style={styles.stateTitle}>No submissions match</Text>
          <Text style={styles.stateBody}>
            Adjust the search or status filter to widen the triage view.
          </Text>
        </View>
      ) : null}

      {!isLoading && !errorMessage ? (
        <View style={styles.stack}>
          {filteredSubmissions.map((submission) => {
            const expanded = submission.id === expandedId;
            const statusTone = getStatusTone(submission.status);
            const updatingThisItem = isUpdating === submission.id;

            return (
              <View key={submission.id} style={styles.submissionCard}>
                <Pressable
                  onPress={() => setExpandedId(expanded ? null : submission.id)}
                  style={({ pressed }) => [styles.submissionHeader, pressed && styles.pressed]}
                >
                  <View style={styles.submissionCopy}>
                    <Text style={styles.submissionName}>{submission.name}</Text>
                    <Text style={styles.submissionSubject}>{submission.subject}</Text>
                    <Text style={styles.submissionMeta}>
                      {submission.email} · {formatTimestamp(submission.updatedAt || submission.createdAt)}
                    </Text>
                  </View>
                  <View style={[styles.statusPill, statusTone]}>
                    <Text style={styles.statusPillLabel}>{submission.status.toUpperCase()}</Text>
                  </View>
                </Pressable>

                {expanded ? (
                  <View style={styles.expandedPanel}>
                    <View style={styles.messageCard}>
                      <Text style={styles.messageLabel}>Message</Text>
                      <Text style={styles.messageBody}>{submission.message}</Text>
                    </View>

                    <View style={styles.metaGrid}>
                      <MetaCell label="Phone" value={submission.phone || "Not provided"} />
                      <MetaCell label="Received" value={formatLongTimestamp(submission.createdAt)} />
                    </View>

                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() => Linking.openURL(`mailto:${submission.email}?subject=${encodeURIComponent(`Re: ${submission.subject}`)}`)}
                        style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                      >
                        <Text style={styles.secondaryButtonLabel}>Email</Text>
                      </Pressable>

                      {submission.phone ? (
                        <Pressable
                          onPress={() => Linking.openURL(`tel:${submission.phone}`)}
                          style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
                        >
                          <Text style={styles.secondaryButtonLabel}>Call</Text>
                        </Pressable>
                      ) : null}

                      {submission.status !== "reviewed" ? (
                        <Pressable
                          disabled={updatingThisItem}
                          onPress={() => void onUpdateStatus(submission.id, "reviewed")}
                          style={({ pressed }) => [
                            styles.statusAction,
                            styles.reviewedAction,
                            pressed && !updatingThisItem ? styles.pressed : null,
                            updatingThisItem ? styles.disabled : null,
                          ]}
                        >
                          <Text style={styles.statusActionLabel}>
                            {updatingThisItem ? "Updating..." : "Mark reviewed"}
                          </Text>
                        </Pressable>
                      ) : null}

                      {submission.status !== "responded" ? (
                        <Pressable
                          disabled={updatingThisItem}
                          onPress={() => void onUpdateStatus(submission.id, "responded")}
                          style={({ pressed }) => [
                            styles.statusAction,
                            styles.respondedAction,
                            pressed && !updatingThisItem ? styles.pressed : null,
                            updatingThisItem ? styles.disabled : null,
                          ]}
                        >
                          <Text style={styles.statusActionLabel}>
                            {updatingThisItem ? "Updating..." : "Mark responded"}
                          </Text>
                        </Pressable>
                      ) : null}
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "neutral" | "primary" | "warning" | "success";
}) {
  const accentStyle =
    accent === "primary"
      ? styles.summaryPrimary
      : accent === "warning"
        ? styles.summaryWarning
        : accent === "success"
          ? styles.summarySuccess
          : styles.summaryNeutral;

  return (
    <View style={[styles.summaryCard, accentStyle]}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function MetaCell({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaCell}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function getStatusTone(status: SubmissionStatus) {
  switch (status) {
    case "responded":
      return styles.statusSuccess;
    case "reviewed":
      return styles.statusWarning;
    case "new":
    default:
      return styles.statusPrimary;
  }
}

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatLongTimestamp(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
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
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  heroHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 34,
    fontWeight: "800",
  },
  heroBody: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  refreshButton: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  refreshButtonLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  summaryCard: {
    minWidth: 120,
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    gap: 4,
  },
  summaryNeutral: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.stroke,
  },
  summaryPrimary: {
    backgroundColor: "rgba(37, 99, 235, 0.18)",
    borderColor: "rgba(37, 99, 235, 0.38)",
  },
  summaryWarning: {
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    borderColor: "rgba(245, 158, 11, 0.34)",
  },
  summarySuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.18)",
    borderColor: "rgba(16, 185, 129, 0.34)",
  },
  summaryLabel: {
    color: colors.textSubtle,
    ...typography.caption,
  },
  summaryValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  toolbarCard: {
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  searchInput: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.stroke,
    borderWidth: 1,
    borderRadius: radii.lg,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipLabel: {
    color: colors.textSubtle,
    fontSize: 13,
    fontWeight: "700",
  },
  filterChipLabelActive: {
    color: colors.text,
  },
  stateCard: {
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.stroke,
    alignItems: "flex-start",
  },
  stateTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  stateBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  retryButtonLabel: {
    color: colors.text,
    fontWeight: "700",
  },
  stack: {
    gap: spacing.md,
  },
  submissionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.stroke,
    overflow: "hidden",
  },
  submissionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
    padding: spacing.md,
  },
  submissionCopy: {
    flex: 1,
    gap: 4,
  },
  submissionName: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  submissionSubject: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  submissionMeta: {
    color: colors.textSubtle,
    fontSize: 13,
    lineHeight: 18,
  },
  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  statusPrimary: {
    backgroundColor: "rgba(37, 99, 235, 0.18)",
    borderColor: "rgba(37, 99, 235, 0.38)",
  },
  statusWarning: {
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    borderColor: "rgba(245, 158, 11, 0.38)",
  },
  statusSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.18)",
    borderColor: "rgba(16, 185, 129, 0.34)",
  },
  statusPillLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  expandedPanel: {
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  messageCard: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  messageLabel: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  messageBody: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
  },
  metaGrid: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  metaCell: {
    minWidth: 140,
    flexGrow: 1,
    gap: 4,
    padding: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  metaLabel: {
    color: colors.textSubtle,
    fontSize: 12,
    fontWeight: "700",
  },
  metaValue: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  secondaryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.surfaceAlt,
  },
  secondaryButtonLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  statusAction: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
  },
  reviewedAction: {
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.34)",
  },
  respondedAction: {
    backgroundColor: "rgba(16, 185, 129, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.34)",
  },
  statusActionLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.82,
  },
});

