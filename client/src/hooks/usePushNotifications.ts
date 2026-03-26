/**
 * usePushNotifications
 *
 * Wraps the browser Notifications API with a simple subscribe/unsubscribe interface.
 * Falls back gracefully when the API is unavailable (iOS Safari, etc.).
 *
 * This hook does NOT require a push server or service worker for basic
 * in-browser notification support. It uses the Notification API directly
 * and stores preference in localStorage.
 */

import { useState, useEffect, useCallback } from "react";

export type NotificationPermission = "default" | "granted" | "denied" | "unsupported";

interface UsePushNotificationsReturn {
  /** Whether the user has granted notification permission */
  isSubscribed: boolean;
  /** Current permission state */
  permission: NotificationPermission;
  /** Whether push notifications are supported in this browser */
  isSupported: boolean;
  /** Subscribe: requests permission and enables notifications */
  subscribe: () => Promise<boolean>;
  /** Unsubscribe: disables notifications (clears preference) */
  unsubscribe: () => void;
  /** Send a test notification */
  sendTestNotification: () => void;
  /** Loading state while requesting permission */
  loading: boolean;
}

const PREF_KEY = "sisg_push_enabled";

export function usePushNotifications(): UsePushNotificationsReturn {
  const isSupported = typeof window !== "undefined" && "Notification" in window;

  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (!isSupported) return "unsupported";
    return (window.Notification.permission as NotificationPermission) ?? "default";
  });

  const [isSubscribed, setIsSubscribed] = useState<boolean>(() => {
    if (!isSupported) return false;
    const pref = localStorage.getItem(PREF_KEY);
    return pref === "true" && window.Notification.permission === "granted";
  });

  const [loading, setLoading] = useState(false);

  // Keep permission state in sync with browser
  useEffect(() => {
    if (!isSupported) return;
    setPermission(window.Notification.permission as NotificationPermission);
  }, [isSupported]);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setLoading(true);
    try {
      const result = await window.Notification.requestPermission();
      setPermission(result as NotificationPermission);
      if (result === "granted") {
        localStorage.setItem(PREF_KEY, "true");
        setIsSubscribed(true);
        return true;
      }
      setIsSubscribed(false);
      return false;
    } finally {
      setLoading(false);
    }
  }, [isSupported]);

  const unsubscribe = useCallback(() => {
    localStorage.removeItem(PREF_KEY);
    setIsSubscribed(false);
    // Note: browsers don't allow programmatic permission revocation;
    // we just clear the preference so we stop sending.
  }, []);

  const sendTestNotification = useCallback(() => {
    if (!isSupported || permission !== "granted") return;
    new window.Notification("SISG Platform", {
      body: "Push notifications are working! 🔔",
      icon: "/favicon.ico",
    });
  }, [isSupported, permission]);

  return {
    isSubscribed,
    permission,
    isSupported,
    subscribe,
    unsubscribe,
    sendTestNotification,
    loading,
  };
}
