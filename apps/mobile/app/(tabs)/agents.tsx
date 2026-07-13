import { useEffect, useState } from "react";
import { AgentsSurface } from "../../components/agents";
import type { AgentIncident, AgentMonitorItem, AgentsOverviewStats } from "../../components/agents";
import { useAuth } from "../../lib/auth";
import { fetchAgentsMonitorSnapshot } from "../../lib/agents-monitor";

export default function AgentsRoute() {
  const { apiBaseUrl, session } = useAuth();
  const [reloadKey, setReloadKey] = useState(0);
  const [agents, setAgents] = useState<AgentMonitorItem[]>([]);
  const [incidents, setIncidents] = useState<AgentIncident[]>([]);
  const [summary, setSummary] = useState<AgentsOverviewStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function hydrateAgents() {
      if (!session) {
        setAgents([]);
        setIncidents([]);
        setSummary(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setErrorMessage(null);

      try {
        const snapshot = await fetchAgentsMonitorSnapshot({
          baseUrl: apiBaseUrl,
          session,
        });

        if (!cancelled) {
          setAgents(snapshot.agents);
          setIncidents(snapshot.incidents);
          setSummary(snapshot.summary);
        }
      } catch (error) {
        if (!cancelled) {
          setAgents([]);
          setIncidents([]);
          setSummary(null);
          setErrorMessage(error instanceof Error ? error.message : "Failed to load SISG agent telemetry");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void hydrateAgents();

    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, reloadKey, session]);

  return (
    <AgentsSurface
      agents={agents}
      incidents={incidents}
      summary={summary}
      errorMessage={errorMessage}
      isLoading={loading}
      onPrimaryAction={() => {
        setLoading(true);
        setReloadKey((current) => current + 1);
      }}
    />
  );
}
