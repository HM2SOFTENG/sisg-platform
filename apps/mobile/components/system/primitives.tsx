import type { PropsWithChildren, ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, elevation, radii, spacing, typography } from "@sisg/ui-tokens";

type ScreenShellProps = PropsWithChildren<{
  hero?: ReactNode;
  footerInset?: number;
  contentContainerStyle?: StyleProp<ViewStyle>;
}>;

export function ScreenShell({
  children,
  hero,
  footerInset = spacing["3xl"],
  contentContainerStyle,
}: ScreenShellProps) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.screenContent,
        { paddingBottom: footerInset },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {hero ? <View style={styles.heroSlot}>{hero}</View> : null}
      {children}
    </ScrollView>
  );
}

export function ScreenHero({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <SurfaceCard tone="hero" style={styles.heroCard}>
      <View style={styles.heroHeader}>
        <View style={styles.heroCopy}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text style={styles.heroTitle}>{title}</Text>
          {subtitle ? <Text style={styles.heroSubtitle}>{subtitle}</Text> : null}
        </View>
        {action ? <View style={styles.heroAction}>{action}</View> : null}
      </View>
    </SurfaceCard>
  );
}

export function Section({
  title,
  meta,
  children,
  action,
}: PropsWithChildren<{
  title: string;
  meta?: string;
  action?: ReactNode;
}>) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionHeaderCopy}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
        </View>
        {action ? <View>{action}</View> : null}
      </View>
      {children}
    </View>
  );
}

export function SurfaceCard({
  children,
  style,
  tone = "default",
}: PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  tone?: "default" | "elevated" | "hero" | "muted";
}>) {
  return <View style={[styles.card, cardToneStyles[tone], style]}>{children}</View>;
}

export function ActionButton({
  children,
  variant = "primary",
  style,
  ...props
}: PropsWithChildren<
  PressableProps & {
    variant?: "primary" | "secondary" | "ghost";
    style?: PressableProps["style"];
  }
>) {
  return (
    <Pressable
      {...props}
      style={({ pressed }) => [
        styles.button,
        buttonVariantStyles[variant],
        pressed ? styles.buttonPressed : null,
        typeof style === "function" ? style({ pressed, hovered: false }) : style,
      ]}
    >
      <Text style={[styles.buttonLabel, buttonLabelVariantStyles[variant]]}>{children}</Text>
    </Pressable>
  );
}

const cardToneStyles = StyleSheet.create({
  default: {
    backgroundColor: colors.surface,
    borderColor: colors.stroke,
  },
  elevated: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.strokeStrong,
  },
  hero: {
    backgroundColor: colors.backgroundCanvas,
    borderColor: colors.strokeStrong,
  },
  muted: {
    backgroundColor: colors.surfaceAlt,
    borderColor: colors.stroke,
  },
});

const buttonVariantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  secondary: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.strokeStrong,
  },
  ghost: {
    backgroundColor: "transparent",
    borderColor: colors.stroke,
  },
});

const buttonLabelVariantStyles = StyleSheet.create({
  primary: {
    color: colors.textOnPrimary,
  },
  secondary: {
    color: colors.text,
  },
  ghost: {
    color: colors.textMuted,
  },
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "transparent",
  },
  screenContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  heroSlot: {
    marginBottom: spacing.xs,
  },
  heroCard: {
    overflow: "hidden",
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  heroAction: {
    paddingTop: spacing.xs,
  },
  eyebrow: {
    color: colors.accent,
    ...typography.eyebrow,
  },
  heroTitle: {
    color: colors.text,
    ...typography.title,
  },
  heroSubtitle: {
    color: colors.textMuted,
    ...typography.body,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  sectionHeaderCopy: {
    flex: 1,
    gap: spacing.xxs,
  },
  sectionTitle: {
    color: colors.text,
    ...typography.sectionTitle,
  },
  sectionMeta: {
    color: colors.textSubtle,
    ...typography.caption,
  },
  card: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    gap: spacing.md,
    ...elevation.card,
  },
  button: {
    minHeight: 44,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xxs,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  buttonLabel: {
    ...typography.button,
  },
});
