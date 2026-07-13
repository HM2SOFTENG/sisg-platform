import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radii, spacing } from "@sisg/ui-tokens";
import {
  demoProfileActivity,
  demoProfileOperator,
  demoProfileSections,
  demoProfileStats,
} from "./profile-demo-data";
import type {
  ProfileActivityItem,
  ProfileActivityTone,
  ProfileOperator,
  ProfileSettingItem,
  ProfileSettingSection,
  ProfileStat,
} from "./types";

export interface ProfileSurfaceProps {
  title?: string;
  subtitle?: string;
  operator?: ProfileOperator;
  stats?: ProfileStat[];
  sections?: ProfileSettingSection[];
  activity?: ProfileActivityItem[];
  errorMessage?: string | null;
  isLoading?: boolean;
  onPrimaryAction?: () => void;
  onSelectSetting?: (item: ProfileSettingItem) => void;
}

export function ProfileSurface({
  title = "Profile",
  subtitle = "Identity, trust controls, and operator preferences for the mobile command center.",
  operator = demoProfileOperator,
  stats = demoProfileStats,
  sections = demoProfileSections,
  activity = demoProfileActivity,
  errorMessage,
  isLoading = false,
  onPrimaryAction,
  onSelectSetting,
}: ProfileSurfaceProps) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroGlow} />
        <View style={styles.heroHeader}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>OPERATOR IDENTITY</Text>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          </View>
          <Pressable onPress={onPrimaryAction} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Manage access</Text>
          </Pressable>
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{getInitials(operator.name)}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.operatorName}>{operator.name}</Text>
            <Text style={styles.operatorRole}>{operator.role}</Text>
            <Text style={styles.operatorSummary}>{operator.summary}</Text>
            <View style={styles.identityMeta}>
              <Text style={styles.identityMetaText}>{operator.baseLabel}</Text>
              <Text style={styles.identityMetaText}>{operator.shiftLabel}</Text>
              <Text style={styles.identityMetaText}>{operator.statusLabel}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metricRow}>
          {stats.map((stat) => (
            <MetricCard key={stat.id} label={stat.label} value={stat.value} />
          ))}
        </View>
      </View>

      {errorMessage ? <ErrorCard message={errorMessage} /> : null}

      {isLoading ? (
        <View style={styles.feedbackCard}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.feedbackTitle}>Loading profile controls</Text>
          <Text style={styles.feedbackBody}>Refreshing identity, preferences, and recent activity.</Text>
        </View>
      ) : null}

      {!isLoading ? (
        <View style={styles.contactCard}>
          <Text style={styles.sectionTitle}>Contact</Text>
          <View style={styles.stack}>
            <ContactRow label="Email" value={operator.email} />
            <ContactRow label="Phone" value={operator.phone} />
            <ContactRow label="Readiness" value={`${operator.completionPercent}% profile complete`} />
          </View>
        </View>
      ) : null}

      {!isLoading && sections.length > 0 ? (
        <View style={styles.stack}>
          {sections.map((section) => (
            <View key={section.id} style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <View style={styles.stack}>
                {section.items.map((item) => (
                  <SettingRow key={item.id} item={item} onPress={() => onSelectSetting?.(item)} />
                ))}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      {!isLoading && sections.length === 0 ? (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>No settings configured</Text>
          <Text style={styles.feedbackBody}>Wire profile sections into this surface when mobile preference data is available.</Text>
        </View>
      ) : null}

      {!isLoading && activity.length > 0 ? (
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent activity</Text>
            <Text style={styles.sectionMeta}>{activity.length} updates</Text>
          </View>
          <View style={styles.stack}>
            {activity.map((item) => (
              <ActivityCard key={item.id} item={item} />
            ))}
          </View>
        </View>
      ) : null}

      {!isLoading && activity.length === 0 ? (
        <View style={styles.feedbackCard}>
          <Text style={styles.feedbackTitle}>No recent activity</Text>
          <Text style={styles.feedbackBody}>This panel is ready for audit trails, approvals, and session trust events.</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ContactRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.contactRow}>
      <Text style={styles.contactLabel}>{label}</Text>
      <Text style={styles.contactValue}>{value}</Text>
    </View>
  );
}

function SettingRow({ item, onPress }: { item: ProfileSettingItem; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.settingRow}>
      <View style={styles.settingCopy}>
        <Text style={styles.settingLabel}>{item.label}</Text>
        <Text style={styles.settingDescription}>{item.description}</Text>
      </View>
      <View style={styles.settingValue}>
        <Text style={styles.settingValueText}>{item.valueLabel}</Text>
        <Text style={styles.settingCaret}>{item.kind === "navigation" ? ">" : "Live"}</Text>
      </View>
    </Pressable>
  );
}

function ActivityCard({ item }: { item: ProfileActivityItem }) {
  const tone = getActivityTone(item.tone || "default");

  return (
    <View style={[styles.activityCard, { borderColor: tone.borderColor, backgroundColor: tone.backgroundColor }]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.activityTitle}>{item.title}</Text>
        <Text style={[styles.activityTime, { color: tone.color }]}>{item.timeLabel}</Text>
      </View>
      <Text style={styles.activityDetail}>{item.detail}</Text>
    </View>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <View style={[styles.feedbackCard, styles.errorCard]}>
      <Text style={styles.feedbackTitle}>Profile needs attention</Text>
      <Text style={styles.feedbackBody}>{message}</Text>
    </View>
  );
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getActivityTone(tone: ProfileActivityTone) {
  switch (tone) {
    case "positive":
      return {
        color: colors.success,
        backgroundColor: "rgba(16, 185, 129, 0.08)",
        borderColor: "rgba(16, 185, 129, 0.3)",
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
        backgroundColor: colors.surfaceAlt,
        borderColor: colors.surfaceAlt,
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
    borderColor: "rgba(37, 99, 235, 0.28)",
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroGlow: {
    position: "absolute",
    right: -40,
    top: -72,
    height: 200,
    width: 200,
    borderRadius: 100,
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
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
  },
  heroSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
  },
  primaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  profileCard: {
    flexDirection: "row",
    gap: spacing.md,
    alignItems: "flex-start",
  },
  avatar: {
    height: 72,
    width: 72,
    borderRadius: 36,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  profileCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  operatorName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  operatorRole: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  operatorSummary: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  identityMeta: {
    gap: 4,
  },
  identityMetaText: {
    color: colors.text,
    fontSize: 13,
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
  metricValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "700",
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  contactCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.md,
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
    gap: spacing.sm,
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
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  contactLabel: {
    color: colors.muted,
    fontSize: 13,
    width: 84,
  },
  contactValue: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
    textAlign: "right",
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  settingCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  settingLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  settingDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  settingValue: {
    alignItems: "flex-end",
    gap: 4,
  },
  settingValueText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  settingCaret: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  activityCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  activityTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    flex: 1,
  },
  activityTime: {
    fontSize: 12,
    fontWeight: "700",
  },
  activityDetail: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
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
