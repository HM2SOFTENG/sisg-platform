import { useEffect, useState } from "react";
import { fetchOperatorAccounts } from "@sisg/api-client";
import type { OperatorAccount } from "@sisg/types";
import { ProfileSurface } from "../../components/profile";
import type {
  ProfileActivityItem,
  ProfileOperator,
  ProfileSettingSection,
  ProfileStat,
} from "../../components/profile/types";
import { useAuth } from "../../lib/auth";

export default function ProfileRoute() {
  const { apiBaseUrl, logout, session } = useAuth();
  const [accounts, setAccounts] = useState<OperatorAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const isAdmin = session?.user.roles.includes("admin") ?? false;

  useEffect(() => {
    let cancelled = false;

    async function hydrateAccounts() {
      if (!session || !isAdmin) {
        setAccounts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const nextAccounts = await fetchOperatorAccounts({
          accessToken: session.accessToken,
          baseUrl: apiBaseUrl,
        });

        if (!cancelled) {
          setAccounts(nextAccounts);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Failed to load operator accounts");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void hydrateAccounts();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, isAdmin, session]);

  const operator = buildOperator(session?.user.displayName, session?.user.email, session?.user.roles[0]);
  const stats = buildStats(accounts, session?.expiresAt, isAdmin);
  const sections = buildSections(isAdmin, accounts.length, session?.expiresAt);
  const activity = buildActivity(accounts, session?.issuedAt, session?.expiresAt, isAdmin);

  return (
    <ProfileSurface
      operator={operator}
      stats={stats}
      sections={sections}
      activity={activity}
      isLoading={loading}
      errorMessage={errorMessage}
      onPrimaryAction={logout}
    />
  );
}

function buildOperator(
  name?: string,
  email?: string,
  primaryRole?: string,
): ProfileOperator {
  return {
    id: email || "operator",
    name: name || "SISG Operator",
    role: formatRole(primaryRole || "operator"),
    summary: "Controls operator identity, session trust, and account readiness for the SISG mobile command layer.",
    baseLabel: "SISG Command",
    shiftLabel: "Secure mobile session",
    statusLabel: "Access policy enforced",
    email: email || "operator@sentinelintegratedgroup.com",
    phone: "Managed in secure directory",
    completionPercent: 100,
  };
}

function buildStats(accounts: OperatorAccount[], expiresAt?: string, isAdmin?: boolean): ProfileStat[] {
  const activeAccounts = accounts.filter((account) => account.status === "active").length;
  const adminAccounts = accounts.filter((account) => account.roles.includes("admin")).length;

  return [
    {
      id: "stat-1",
      label: "Session trust",
      value: expiresAt ? formatShortDate(expiresAt) : "Live",
    },
    {
      id: "stat-2",
      label: isAdmin ? "Active accounts" : "Access scope",
      value: isAdmin ? String(activeAccounts || accounts.length || 1) : "Role-based",
    },
    {
      id: "stat-3",
      label: isAdmin ? "Admin seats" : "Control plane",
      value: isAdmin ? String(adminAccounts || 1) : "Secured",
    },
  ];
}

function buildSections(isAdmin: boolean, accountCount: number, expiresAt?: string): ProfileSettingSection[] {
  return [
    {
      id: "section-identity",
      title: "Identity and access",
      items: [
        {
          id: "setting-1",
          label: "Session expiry",
          description: "Current bearer session rotates through refresh-backed access tokens.",
          valueLabel: expiresAt ? formatShortDate(expiresAt) : "Tracked",
          kind: "status",
        },
        {
          id: "setting-2",
          label: "Privilege model",
          description: "Operators authenticate with individual accounts and explicit role assignments.",
          valueLabel: isAdmin ? "Admin managed" : "Role scoped",
          kind: "status",
        },
      ],
    },
    {
      id: "section-operations",
      title: "Operations",
      items: [
        {
          id: "setting-3",
          label: "Account registry",
          description: "Provision, disable, and rotate credentials through the new auth account surface.",
          valueLabel: isAdmin ? `${accountCount || 1} accounts` : "Visible to admins",
          kind: "status",
        },
      ],
    },
  ];
}

function buildActivity(
  accounts: OperatorAccount[],
  issuedAt?: string,
  expiresAt?: string,
  isAdmin?: boolean,
): ProfileActivityItem[] {
  const items: ProfileActivityItem[] = [];

  if (issuedAt) {
    items.push({
      id: "activity-session",
      title: "Session restored",
      detail: "The mobile shell restored a persisted session and re-verified access before entering the command surface.",
      timeLabel: formatRelativeLabel(issuedAt),
      tone: "positive",
    });
  }

  if (isAdmin) {
    items.push({
      id: "activity-accounts",
      title: "Operator registry synced",
      detail: `${accounts.length || 1} account record(s) are now available through the protected auth accounts API.`,
      timeLabel: "Now",
    });
  }

  if (expiresAt) {
    items.push({
      id: "activity-expiry",
      title: "Access token window tracked",
      detail: `Current access token expires ${formatShortDate(expiresAt)} and can be rotated with the refresh session.`,
      timeLabel: "Live",
      tone: "warning",
    });
  }

  return items;
}

function formatRole(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(" ");
}

function formatShortDate(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRelativeLabel(value: string): string {
  const deltaMs = Date.now() - new Date(value).getTime();
  const deltaMinutes = Math.max(1, Math.round(deltaMs / 60000));

  if (deltaMinutes < 60) {
    return `${deltaMinutes}m ago`;
  }

  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours}h ago`;
  }

  const deltaDays = Math.round(deltaHours / 24);
  return `${deltaDays}d ago`;
}
