import type { AuthSession } from "@sisg/types";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const SESSION_STORAGE_KEY = "sisg.mobile.bootstrap.session";

export interface StoredSession {
  apiBaseUrl: string;
  session: AuthSession | null;
}

function canUseWebStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export async function loadStoredSession(): Promise<StoredSession | null> {
  const rawValue =
    Platform.OS === "web"
      ? canUseWebStorage()
        ? window.localStorage.getItem(SESSION_STORAGE_KEY)
        : null
      : await SecureStore.getItemAsync(SESSION_STORAGE_KEY);

  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredSession>;

    if (typeof parsed.apiBaseUrl !== "string") {
      return null;
    }

    return {
      apiBaseUrl: parsed.apiBaseUrl,
      session: parsed.session && typeof parsed.session === "object" ? (parsed.session as AuthSession) : null,
    };
  } catch {
    return null;
  }
}

export async function saveStoredSession(session: StoredSession): Promise<void> {
  const serialized = JSON.stringify(session);

  if (Platform.OS === "web") {
    if (canUseWebStorage()) {
      window.localStorage.setItem(SESSION_STORAGE_KEY, serialized);
    }
    return;
  }

  await SecureStore.setItemAsync(SESSION_STORAGE_KEY, serialized);
}

export async function clearStoredSession(): Promise<void> {
  if (Platform.OS === "web") {
    if (canUseWebStorage()) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
    return;
  }

  await SecureStore.deleteItemAsync(SESSION_STORAGE_KEY);
}
