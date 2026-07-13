import "react-native-gesture-handler";
import "react-native-reanimated";

import { Stack } from "expo-router";
import { StatusBar, StyleSheet } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppShell } from "../components/system";
import { AuthProvider } from "../lib/auth";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <AuthProvider>
          <AppShell>
            <StatusBar barStyle="light-content" />
            <Stack screenOptions={{ headerShown: false, contentStyle: styles.stackContent }} />
          </AppShell>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stackContent: {
    backgroundColor: "transparent",
  },
});
