import { useEffect, useState } from "react";
import { HomeScreen } from "../../components/home/HomeScreen";
import { useAuth } from "../../lib/auth";
import { demoSummaryFallback } from "../../lib/demo-data";
import { fetchAgentCards, fetchInboxThreads, fetchNotifications } from "../../lib/mobile-data";
import type { AgentCardVM, InboxThreadVM, NotificationVM } from "../../lib/view-models";

export default function HomeRoute() {
  const { apiBaseUrl, dashboard, logout, session } = useAuth();
  const [notifications, setNotifications] = useState<NotificationVM[]>([]);
  const [threads, setThreads] = useState<InboxThreadVM[]>([]);
  const [agents, setAgents] = useState<AgentCardVM[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadHomeData() {
      if (!session) {
        setNotifications([]);
        setThreads([]);
        setAgents([]);
        setIsRefreshing(false);
        return;
      }

      setIsRefreshing(true);

      try {
        const [nextNotifications, nextThreads, nextAgents] = await Promise.all([
          fetchNotifications({ baseUrl: apiBaseUrl, session }),
          fetchInboxThreads({ baseUrl: apiBaseUrl, session }),
          fetchAgentCards({ baseUrl: apiBaseUrl, session }),
        ]);

        if (cancelled) {
          return;
        }

        setNotifications(nextNotifications);
        setThreads(nextThreads);
        setAgents(nextAgents);
      } catch {
        if (cancelled) {
          return;
        }

        setNotifications([]);
        setThreads([]);
        setAgents([]);
      } finally {
        if (!cancelled) {
          setIsRefreshing(false);
        }
      }
    }

    void loadHomeData();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, session]);

  return (
    <HomeScreen
      agents={agents}
      dashboard={dashboard || demoSummaryFallback}
      isRefreshing={isRefreshing}
      notifications={notifications}
      operatorName={session?.user.displayName || "operator"}
      onLogout={logout}
      threads={threads}
    />
  );
}
