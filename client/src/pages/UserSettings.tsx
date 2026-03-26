/**
 * UserSettings — Non-admin user settings page
 * Bug 4: Settings page for regular users with push notification toggle + profile info
 */
import React, { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  Bell, BellOff, User, Shield, Palette, Sun, Moon, Save,
  CheckCircle2, AlertTriangle, TestTube, Loader2,
} from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

// ============================================================================
// HELPERS
// ============================================================================

function SectionCard({ title, description, icon: Icon, color, children }: {
  title: string;
  description?: string;
  icon: React.ComponentType<any>;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden"
    >
      <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
        <div
          className="w-8 h-8 flex items-center justify-center rounded"
          style={{ background: `${color}15` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{title}</h2>
          {description && (
            <p className="text-[10px] font-mono text-[var(--muted-foreground)]">{description}</p>
          )}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

function ToggleRow({ label, description, checked, onChange, disabled }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div className="flex-1">
        <p className="text-sm text-[var(--foreground)]">{label}</p>
        {description && (
          <p className="text-[10px] font-mono text-[var(--muted-foreground)] mt-0.5">{description}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
          checked ? "bg-[#0066ff]" : "bg-[var(--border)]"
        } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <span
          className={`inline-block w-5 h-5 bg-white rounded-full shadow transform transition-transform duration-200 mt-0.5 ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function UserSettings() {
  const { theme, cycleTheme } = useTheme();
  const {
    isSubscribed,
    permission,
    isSupported,
    subscribe,
    unsubscribe,
    sendTestNotification,
    loading: pushLoading,
  } = usePushNotifications();

  // Profile state (read from localStorage as a simple persistence layer)
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("sisg_display_name") || "Brian Smith"
  );
  const [emailDigest, setEmailDigest] = useState(
    () => localStorage.getItem("sisg_email_digest") !== "false"
  );
  const [alertsEnabled, setAlertsEnabled] = useState(
    () => localStorage.getItem("sisg_alerts_enabled") !== "false"
  );
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400)); // simulate async save
    localStorage.setItem("sisg_display_name", displayName);
    setSaving(false);
    toast.success("Profile saved");
  };

  const handlePushToggle = async (enabled: boolean) => {
    if (enabled) {
      const granted = await subscribe();
      if (!granted) {
        toast.error(
          permission === "denied"
            ? "Notifications blocked — please enable them in your browser settings"
            : "Notification permission was not granted"
        );
      } else {
        toast.success("Push notifications enabled");
      }
    } else {
      unsubscribe();
      toast.success("Push notifications disabled");
    }
  };

  const handleEmailDigest = (v: boolean) => {
    setEmailDigest(v);
    localStorage.setItem("sisg_email_digest", String(v));
    toast.success(v ? "Email digest enabled" : "Email digest disabled");
  };

  const handleAlertsToggle = (v: boolean) => {
    setAlertsEnabled(v);
    localStorage.setItem("sisg_alerts_enabled", String(v));
    toast.success(v ? "Alert notifications on" : "Alert notifications off");
  };

  const themeLabel = theme === "dark" ? "Dark" : theme === "light" ? "Light" : "Sentinel";
  const ThemeIcon = theme === "light" ? Sun : theme === "dark" ? Moon : Palette;

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Page header */}
        <div className="mb-2">
          <div className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase tracking-widest mb-1">
            Account
          </div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]" style={{ fontFamily: "Sora, sans-serif" }}>
            Settings
          </h1>
        </div>

        {/* ─── Profile ─── */}
        <SectionCard
          title="Profile"
          description="Your display name and account info"
          icon={User}
          color="#0066ff"
        >
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                Display Name
              </label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] px-3 py-2 font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[#0066ff]/40 rounded"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                Email
              </label>
              <input
                value="brian@sisg.io"
                disabled
                className="w-full bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--muted-foreground)] px-3 py-2 font-mono rounded opacity-60 cursor-not-allowed"
              />
              <p className="text-[10px] text-[var(--muted-foreground)]">
                Email is managed by your administrator
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">
                Role
              </label>
              <div className="flex items-center gap-2 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded">
                <Shield className="w-3.5 h-3.5 text-[#0066ff]" />
                <span className="text-sm font-mono text-[var(--foreground)]">Administrator</span>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#0066ff] hover:bg-[#0055dd] disabled:opacity-50 text-white text-xs font-mono rounded transition-colors"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Save Profile
              </button>
            </div>
          </div>
        </SectionCard>

        {/* ─── Push Notifications ─── */}
        <SectionCard
          title="Push Notifications"
          description="Control browser notification permissions"
          icon={Bell}
          color="#00e5a0"
        >
          <div className="space-y-3">
            {/* Supported check */}
            {!isSupported && (
              <div className="flex items-center gap-2 text-[#ffb800] text-xs font-mono bg-[#ffb800]/10 border border-[#ffb800]/30 rounded px-3 py-2">
                <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                Push notifications are not supported in this browser
              </div>
            )}

            {/* Denied state warning */}
            {isSupported && permission === "denied" && (
              <div className="flex items-center gap-2 text-[#ff3b3b] text-xs font-mono bg-[#ff3b3b]/10 border border-[#ff3b3b]/30 rounded px-3 py-2">
                <BellOff className="w-3.5 h-3.5 flex-shrink-0" />
                Notifications are blocked — enable them in your browser settings to use this feature
              </div>
            )}

            {/* Permission granted badge */}
            {isSupported && permission === "granted" && (
              <div className="flex items-center gap-2 text-[#00e5a0] text-xs font-mono bg-[#00e5a0]/10 border border-[#00e5a0]/30 rounded px-3 py-2">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                Browser permission granted
              </div>
            )}

            <div className="divide-y divide-[var(--border)]">
              <ToggleRow
                label="Enable Push Notifications"
                description="Receive alerts and messages in the browser when the tab is open"
                checked={isSubscribed}
                onChange={handlePushToggle}
                disabled={!isSupported || pushLoading || permission === "denied"}
              />
            </div>

            {/* Test button — only show when subscribed */}
            {isSubscribed && permission === "granted" && (
              <div className="pt-1">
                <button
                  onClick={() => {
                    sendTestNotification();
                    toast.success("Test notification sent!");
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[#0066ff]/30 rounded transition-colors"
                >
                  <TestTube className="w-3.5 h-3.5" />
                  Send Test Notification
                </button>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ─── Notification Preferences ─── */}
        <SectionCard
          title="Notification Preferences"
          description="What you get notified about"
          icon={Bell}
          color="#ffb800"
        >
          <div className="divide-y divide-[var(--border)]">
            <ToggleRow
              label="Critical Alerts"
              description="Notifications for critical agent errors and system failures"
              checked={alertsEnabled}
              onChange={handleAlertsToggle}
            />
            <ToggleRow
              label="Email Digest"
              description="Daily summary of activity sent to your email"
              checked={emailDigest}
              onChange={handleEmailDigest}
            />
          </div>
        </SectionCard>

        {/* ─── Appearance ─── */}
        <SectionCard
          title="Appearance"
          description="UI theme and display preferences"
          icon={ThemeIcon}
          color="#8b5cf6"
        >
          <div className="space-y-3">
            <p className="text-[10px] font-mono text-[var(--muted-foreground)] uppercase">
              Current Theme
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(["dark", "light", "sentinel"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    // Cycle to target theme
                    if (theme !== t) {
                      cycleTheme();
                      // May need multiple cycles — do it via direct storage
                      localStorage.setItem("sisg_theme", t);
                      window.location.reload();
                    }
                  }}
                  className={`flex flex-col items-center gap-2 p-3 border rounded transition-colors ${
                    theme === t
                      ? "border-[#8b5cf6] bg-[#8b5cf6]/10"
                      : "border-[var(--border)] hover:border-[#8b5cf6]/40"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    t === "light" ? "bg-yellow-400" : t === "dark" ? "bg-indigo-500" : "bg-[#0066ff]"
                  }`}>
                    {t === "light" ? <Sun className="w-3 h-3 text-white" /> :
                     t === "dark" ? <Moon className="w-3 h-3 text-white" /> :
                     <Palette className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-[10px] font-mono capitalize text-[var(--foreground)]">{t}</span>
                  {theme === t && (
                    <CheckCircle2 className="w-3 h-3 text-[#8b5cf6]" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </SectionCard>
      </div>
    </DashboardLayout>
  );
}
