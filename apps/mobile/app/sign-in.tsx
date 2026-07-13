import { useState } from "react";
import { Redirect } from "expo-router";
import { Pressable, SafeAreaView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, radii, spacing, typography } from "@sisg/ui-tokens";
import { ActionButton, ScreenHero, ScreenShell, Section, SurfaceCard } from "../components/system";
import { useAuth } from "../lib/auth";
import { isLoopbackUrl, normalizeApiBaseUrl, resolveDefaultApiBaseUrl } from "../lib/api";

export default function LoginScreen() {
  const { apiBaseUrl, setApiBaseUrl, session, hydrated, loading, login, error } = useAuth();
  const [email, setEmail] = useState("admin@sentinelintegratedgroup.com");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const showsLoopbackWarning = isLoopbackUrl(apiBaseUrl);
  const suggestedApiBaseUrl = resolveDefaultApiBaseUrl();
  const normalizedSuggestedApiBaseUrl = normalizeApiBaseUrl(suggestedApiBaseUrl);
  const showsSuggestedApiReset =
    normalizedSuggestedApiBaseUrl.length > 0 &&
    normalizeApiBaseUrl(apiBaseUrl) !== normalizedSuggestedApiBaseUrl;

  if (hydrated && session) {
    return <Redirect href="/(tabs)/home" />;
  }

  async function handleLogin() {
    try {
      setSubmitting(true);
      await login({ email, password });
      setPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScreenShell
        hero={
          <ScreenHero
            eyebrow="SISG MOBILE"
            title="Operator command layer"
            subtitle="Detailed mobile operations for contracts, execution, communications, and monitored automation."
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        <SurfaceCard tone="elevated" style={styles.signalRail}>
          <View style={styles.signalPill}>
            <Text style={styles.signalValue}>24/7</Text>
            <Text style={styles.signalLabel}>coverage</Text>
          </View>
          <View style={styles.signalPill}>
            <Text style={styles.signalValue}>5</Text>
            <Text style={styles.signalLabel}>ops lanes</Text>
          </View>
          <View style={styles.signalPill}>
            <Text style={styles.signalValue}>live</Text>
            <Text style={styles.signalLabel}>session restore</Text>
          </View>
        </SurfaceCard>

        <Section title="Secure sign-in" meta="Trusted sessions restore automatically">
          <SurfaceCard tone="default" style={styles.panel}>
            <Text style={styles.panelBody}>
              Enter with your operator credentials. The app verifies your session, restores the previous environment, and rotates access in the background when possible.
            </Text>

            <View style={styles.field}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="admin@sentinelintegratedgroup.com"
                placeholderTextColor={colors.textSubtle}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.inputLabel}>Password</Text>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Enter operator password"
                placeholderTextColor={colors.textSubtle}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.inputLabel}>API base URL</Text>
              <TextInput
                value={apiBaseUrl}
                onChangeText={setApiBaseUrl}
                placeholder="http://192.168.1.25:3010"
                placeholderTextColor={colors.textSubtle}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                style={styles.input}
              />
            </View>

            <SurfaceCard tone="muted" style={styles.helperCard}>
              <Text style={styles.helperText}>
                {showsLoopbackWarning
                  ? "Physical device note: localhost points to the phone. Use your Mac LAN IP if auto-resolution is unavailable."
                  : "API host looks reachable for device testing."}
              </Text>
              {showsSuggestedApiReset ? (
                <Pressable
                  onPress={() => setApiBaseUrl(suggestedApiBaseUrl)}
                  style={({ pressed }) => [styles.linkButton, pressed && styles.linkButtonPressed]}
                >
                  <Text style={styles.linkButtonLabel}>Use detected local API: {suggestedApiBaseUrl}</Text>
                </Pressable>
              ) : null}
            </SurfaceCard>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <ActionButton
              disabled={!hydrated || loading || submitting || !email || !password}
              onPress={handleLogin}
              variant="primary"
            >
              {loading || submitting ? "Entering..." : "Enter command layer"}
            </ActionButton>
          </SurfaceCard>
        </Section>
      </ScreenShell>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    gap: spacing.lg,
  },
  signalRail: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    padding: spacing.md,
  },
  signalPill: {
    flex: 1,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.stroke,
    gap: 2,
  },
  signalValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  signalLabel: {
    color: colors.textSubtle,
    ...typography.caption,
  },
  panel: {
    gap: spacing.md,
  },
  panelBody: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 22,
  },
  field: {
    gap: spacing.sm,
  },
  inputLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: colors.backgroundAlt,
    borderColor: colors.stroke,
    borderWidth: 1,
    borderRadius: radii.md,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  helperCard: {
    gap: spacing.sm,
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
  },
  linkButton: {
    alignSelf: "flex-start",
  },
  linkButtonPressed: {
    opacity: 0.7,
  },
  linkButtonLabel: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: "600",
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
  },
});
