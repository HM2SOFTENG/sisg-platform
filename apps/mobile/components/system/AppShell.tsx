import type { PropsWithChildren } from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "@sisg/ui-tokens";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <View style={styles.root}>
      <View pointerEvents="none" style={[styles.glow, styles.primaryGlow]} />
      <View pointerEvents="none" style={[styles.glow, styles.accentGlow]} />
      <View pointerEvents="none" style={styles.grid} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  glow: {
    position: "absolute",
    borderRadius: 999,
  },
  primaryGlow: {
    top: -120,
    right: -80,
    width: 320,
    height: 320,
    backgroundColor: colors.glowPrimary,
  },
  accentGlow: {
    top: 140,
    left: -110,
    width: 240,
    height: 240,
    backgroundColor: colors.glowAccent,
  },
  grid: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
    backgroundColor: "transparent",
    borderColor: colors.stroke,
    borderWidth: StyleSheet.hairlineWidth,
    margin: 24,
    borderRadius: 32,
  },
});
