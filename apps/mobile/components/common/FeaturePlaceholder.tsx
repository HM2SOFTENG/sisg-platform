import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, radii, spacing } from "@sisg/ui-tokens";

export function FeaturePlaceholder({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Section wiring in progress</Text>
        <Text style={styles.panelBody}>
          This surface is part of the production-demo rollout and will be populated by the
          delegated feature build stream.
        </Text>
      </View>
    </ScrollView>
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
  hero: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: "800",
  },
  body: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  panel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  panelBody: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
});
