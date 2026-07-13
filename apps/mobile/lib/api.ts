import Constants from "expo-constants";
import { Platform } from "react-native";

const DEFAULT_API_PORT = process.env.EXPO_PUBLIC_API_PORT || "3010";
const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function normalizeApiBaseUrl(value: string | null | undefined): string {
  return (value || "").trim().replace(/\/+$/, "");
}

function extractHost(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).hostname || null;
  } catch {
    const withoutProtocol = trimmed.replace(/^[a-z]+:\/\//i, "");
    const host = withoutProtocol.split("/")[0]?.replace(/:\d+$/, "");
    return host || null;
  }
}

export function resolveDefaultApiBaseUrl(): string {
  const configuredBaseUrl = normalizeApiBaseUrl(process.env.EXPO_PUBLIC_API_BASE_URL);

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  const expoHost =
    extractHost(Constants.expoConfig?.hostUri) ||
    extractHost(Constants.linkingUri) ||
    extractHost(Constants.experienceUrl);

  if (expoHost) {
    return `http://${expoHost}:${DEFAULT_API_PORT}`;
  }

  if (Platform.OS === "android") {
    return `http://10.0.2.2:${DEFAULT_API_PORT}`;
  }

  return `http://localhost:${DEFAULT_API_PORT}`;
}

export function isLoopbackUrl(value: string): boolean {
  try {
    return LOOPBACK_HOSTS.has(new URL(value).hostname);
  } catch {
    return false;
  }
}

export function formatApiError(error: unknown, baseUrl: string): string {
  const message = error instanceof Error ? error.message : "Unable to reach SISG API";

  if (message !== "Network request failed") {
    return message;
  }

  const isHttpUrl = /^http:\/\//i.test(baseUrl);

  if (isLoopbackUrl(baseUrl)) {
    return `Cannot reach SISG API at ${baseUrl}. On a physical device, localhost points back to the phone, not your Mac.`;
  }

  if (Platform.OS === "ios" && isHttpUrl) {
    return `Cannot reach SISG API at ${baseUrl}. If this is an iPhone build, allow local-network HTTP in the native app config and rebuild the app, or use an HTTPS API URL.`;
  }

  return `Cannot reach SISG API at ${baseUrl}. Check that the local API is running and reachable from this device.`;
}
