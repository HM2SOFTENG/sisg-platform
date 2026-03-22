import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import {
  Bot, Play, Pause, RefreshCw, CheckCircle2, Clock, AlertTriangle, Loader2, X,
  Zap, Shield, DollarSign, Users, Code, Award, FileSearch, Briefcase, Building,
  Eye, Rocket, Square, Hash, Calendar, Activity, ChevronRight, MoreVertical
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface SisgAgent {
  id: string;
  slug: string;
  name: string;
  handle: string;
  channels: string[];
  description: string;
  category: "core" | "technical" | "administrative" | "mission";
  status: "deployed" | "stopped" | "error" | "deploying" | "undeployed";
  schedule: string;
  lastRun: string;
  nextRun: string;
  lastResult: string;
  errorCount: number;
  successCount: number;
  totalRuns: number;
  deployedAt: string;
  config: Record<string, any>;
  capabilities: string[];
  priority: number;
}

interface AgentRun {
  id: string;
  agentId: string;
  agentSlug: string;
  trigger: "schedule" | "manual" | "api" | "event";
  status: "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  duration?: number;
  result?: any;
  error?: string;
  output: any[];
}

interface DashboardData {
  agents: SisgAgent[];
  stats: {
    totalAgents: number;
    deployed: number;
    running: number;
    errors: number;
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function getToken() {
  return localStorage.getItem("sisg_admin_token") || "";
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(opts.headers || {}) },
  });
  return res.json();
}

function timeAgo(dateStr: string) {
  if (!dateStr || dateStr === "never") return "never";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function timeUntil(dateStr: string) {
  if (!dateStr || dateStr === "never") return "never";
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff < 0) return "overdue";
  if (diff < 60000) return `in ${Math.floor(diff / 1000)}s`;
  if (diff < 3600000) return `in ${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return `in ${Math.floor(diff / 3600000)}h`;
  return `in ${Math.floor(diff / 86400000)}d`;
}

function formatCron(cron: string): string {
  if (cron === "manual") return "Manual";
  const parts = cron.split(" ");
  if (parts.length !== 5) return cron;
  const [minute, hour, day, month, dow] = parts;
  if (hour === "*/6") return "Every 6 hours";
  if (hour === "*" && minute === "0") return "Hourly";
  if (minute === "0" && hour === "9") return "Daily at 9 AM";
  return cron;
}

const categoryColors: Record<string, string> = {
  core: "#8b5cf6",
  technical: "#0066ff",
  administrative: "#ffb800",
  mission: "#00e5a0",
};

const statusColors: Record<string, string> = {
  deployed: "#00e5a0",
  stopped: "#6b7280",
  error: "#ff4444",
  deploying: "#0066ff",
  undeployed: "#ffb800",
};

const agentIcons: Record<string, any> = {
  sisg: Building,
  contracts: FileSearch,
  proposals: Briefcase,
  bd: Zap,
  cyber: Shield,
  compliance: CheckCircle2,
  finance: DollarSign,
  hr: Users,
  dev: Code,
  veterans: Award,
};

// ============================================================================
// SKELETON LOADER
// ============================================================================

function SkeletonCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-4"
    >
      <div className="h-6 bg-[var(--border)] rounded w-1/3 animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 bg-[var(--border)] rounded w-2/3 animate-pulse" />
        <div className="h-4 bg-[var(--border)] rounded w-3/4 animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 bg-[var(--border)] rounded flex-1 animate-pulse" />
        <div className="h-8 bg-[var(--border)] rounded flex-1 animate-pulse" />
      </div>
    </motion.div>
  );
}

// ============================================================================
// DETAIL MODAL
// ============================================================================

interface DetailModalProps {
  agent: SisgAgent;
  runs: AgentRun[];
  onClose: () => void;
  onDeploy: (slug: string) => void;
  onStop: (slug: string) => void;
  onRunNow: (slug: string) => void;
}

function DetailModal({ agent, runs, onClose, onDeploy, onStop, onRunNow }: DetailModalProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "history" | "config">("overview");

  const tabs = [
    { id: "overview", label: "Overview", icon: Eye },
    { id: "history", label: "Run History", icon: Activity },
    { id: "config", label: "Configuration", icon: Hash },
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--card)] border border-[var(--border)] rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="border-b border-[var(--border)] p-5 flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              {React.createElement(agentIcons[agent.slug] || Bot, { className: "w-5 h-5", style: { color: categoryColors[agent.category] } })}
              <h2 className="text-lg font-mono text-[var(--foreground)]">{agent.handle}</h2>
              <span className="px-2 py-1 rounded text-[9px] font-mono uppercase bg-[var(--border)]" style={{ borderLeft: `3px solid ${categoryColors[agent.category]}` }}>
                {agent.category}
              </span>
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[agent.status] }} />
              <span className="text-[9px] font-mono text-[var(--muted-foreground)] uppercase">{agent.status}</span>
            </div>
            <p className="text-xs font-mono text-[var(--muted-foreground)] mt-2">{agent.description}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-[var(--border)] px-5 flex gap-4">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id as any;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-3 text-[12px] font-mono border-b-2 transition-colors flex items-center gap-2 ${
                  isActive
                    ? "border-[#0066ff] text-[#0066ff]"
                    : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                }`}
              >
                <Icon className="w-3 h-3" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">Name</label>
                <p className="text-sm font-mono text-[var(--foreground)]">{agent.name}</p>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">Channels</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {agent.channels.map((ch) => (
                    <span key={ch} className="px-2 py-1 bg-[var(--border)] text-[9px] font-mono rounded">
                      {ch}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">Capabilities</label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {agent.capabilities.map((cap) => (
                    <span key={cap} className="px-2 py-1 bg-[var(--border)]/50 text-[9px] font-mono rounded">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">Total Runs</label>
                  <p className="text-sm font-mono text-[var(--foreground)]">{agent.totalRuns}</p>
                </div>
                <div>
                  <label className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">Success Rate</label>
                  <p className="text-sm font-mono text-[#00e5a0]">
                    {agent.totalRuns > 0 ? `${Math.round((agent.successCount / agent.totalRuns) * 100)}%` : "—"}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">Last Run</label>
                <p className="text-sm font-mono text-[var(--foreground)]">{agent.lastRun ? timeAgo(agent.lastRun) : "Never"}</p>
              </div>
            </div>
          )}

          {activeTab === "history" && (
            <div className="space-y-3">
              {runs.length === 0 ? (
                <p className="text-xs font-mono text-[var(--muted-foreground)] text-center py-8">No runs yet</p>
              ) : (
                runs.map((run) => (
                  <div key={run.id} className="border border-[var(--border)] rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: run.status === "completed" ? "#00e5a0" : run.status === "failed" ? "#ff4444" : "#0066ff" }} />
                        <span className="text-[9px] font-mono uppercase">{run.status}</span>
                      </div>
                      <span className="text-[9px] font-mono text-[var(--muted-foreground)]">{timeAgo(run.startedAt)}</span>
                    </div>
                    <p className="text-[11px] font-mono text-[var(--muted-foreground)] truncate">
                      {run.result || run.error || "—"}
                    </p>
                    {run.duration && (
                      <p className="text-[9px] font-mono text-[var(--muted-foreground)]">
                        Duration: {(run.duration / 1000).toFixed(2)}s
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "config" && (
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">Schedule</label>
                <p className="text-sm font-mono text-[var(--foreground)]">{formatCron(agent.schedule)}</p>
                <p className="text-[9px] font-mono text-[var(--muted-foreground)] mt-1">Cron: {agent.schedule}</p>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">Configuration</label>
                <pre className="text-[9px] font-mono bg-[var(--background)] p-3 rounded mt-1 overflow-auto max-h-32 text-[var(--muted-foreground)]">
                  {JSON.stringify(agent.config, null, 2)}
                </pre>
              </div>
              <div>
                <label className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">Deployed</label>
                <p className="text-[9px] font-mono text-[var(--foreground)]">{agent.deployedAt ? timeAgo(agent.deployedAt) : "Never"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[var(--border)] p-4 flex gap-2">
          {agent.status === "undeployed" || agent.status === "stopped" ? (
            <button
              onClick={() => { onDeploy(agent.slug); onClose(); }}
              className="flex-1 py-2 px-3 bg-[#00e5a0]/20 hover:bg-[#00e5a0]/30 text-[#00e5a0] text-[11px] font-mono border border-[#00e5a0]/50 rounded transition-colors flex items-center justify-center gap-2"
            >
              <Rocket className="w-3 h-3" />
              Deploy
            </button>
          ) : agent.status === "deployed" ? (
            <>
              <button
                onClick={() => { onRunNow(agent.slug); onClose(); }}
                className="flex-1 py-2 px-3 bg-[#0066ff]/20 hover:bg-[#0066ff]/30 text-[#0066ff] text-[11px] font-mono border border-[#0066ff]/50 rounded transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-3 h-3" />
                Run Now
              </button>
              <button
                onClick={() => { onStop(agent.slug); onClose(); }}
                className="flex-1 py-2 px-3 bg-[#ff4444]/20 hover:bg-[#ff4444]/30 text-[#ff4444] text-[11px] font-mono border border-[#ff4444]/50 rounded transition-colors flex items-center justify-center gap-2"
              >
                <Square className="w-3 h-3" />
                Stop
              </button>
            </>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// AGENT CARD
// ============================================================================

interface AgentCardProps {
  agent: SisgAgent;
  onDeploy: (slug: string) => void;
  onStop: (slug: string) => void;
  onRunNow: (slug: string) => void;
  onDetails: (agent: SisgAgent) => void;
}

function AgentCard({ agent, onDeploy, onStop, onRunNow, onDetails }: AgentCardProps) {
  const Icon = agentIcons[agent.slug] || Bot;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3 hover:border-[var(--border)] transition-colors"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4 flex-shrink-0" style={{ color: categoryColors[agent.category] }} />
            <h3 className="text-sm font-mono font-bold text-[var(--foreground)]">{agent.handle}</h3>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="px-1.5 py-0.5 rounded text-[8px] font-mono uppercase"
              style={{ backgroundColor: categoryColors[agent.category] + "20", color: categoryColors[agent.category], borderLeft: `2px solid ${categoryColors[agent.category]}` }}
            >
              {agent.category}
            </span>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[agent.status] }} />
              <span className="text-[8px] font-mono uppercase text-[var(--muted-foreground)]">{agent.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-2">
        <p className="text-[11px] font-mono text-[var(--muted-foreground)]">{agent.description}</p>

        {agent.channels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {agent.channels.map((ch) => (
              <span key={ch} className="px-1.5 py-0.5 bg-[var(--border)] text-[8px] font-mono rounded">
                {ch}
              </span>
            ))}
          </div>
        )}

        <div className="text-[9px] font-mono text-[var(--muted-foreground)] space-y-0.5">
          <div className="flex items-center gap-2">
            <Calendar className="w-3 h-3" />
            <span>{formatCron(agent.schedule)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>Last: {agent.lastRun ? timeAgo(agent.lastRun) : "never"}</span>
            </div>
            <span>Next: {agent.nextRun ? timeUntil(agent.nextRun) : "—"}</span>
          </div>
        </div>

        <div className="flex gap-4 text-[9px] font-mono">
          <div>
            <span className="text-[var(--muted-foreground)]">Runs:</span>
            <span className="ml-1 text-[var(--foreground)]">{agent.totalRuns}</span>
          </div>
          <div>
            <span className="text-[var(--muted-foreground)]">Success:</span>
            <span className="ml-1 text-[#00e5a0]">{agent.successCount}</span>
          </div>
          <div>
            <span className="text-[var(--muted-foreground)]">Errors:</span>
            <span className="ml-1 text-[#ff4444]">{agent.errorCount}</span>
          </div>
        </div>

        {agent.lastResult && (
          <p className="text-[9px] font-mono text-[var(--muted-foreground)] truncate italic">"{agent.lastResult.substring(0, 60)}{agent.lastResult.length > 60 ? "..." : ""}"</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2">
        {agent.status === "undeployed" || agent.status === "stopped" ? (
          <button
            onClick={() => onDeploy(agent.slug)}
            className="flex-1 py-1.5 px-2 bg-[#00e5a0]/20 hover:bg-[#00e5a0]/30 text-[#00e5a0] text-[10px] font-mono border border-[#00e5a0]/50 rounded transition-colors"
          >
            Deploy
          </button>
        ) : agent.status === "deployed" ? (
          <>
            <button
              onClick={() => onRunNow(agent.slug)}
              className="flex-1 py-1.5 px-2 bg-[#0066ff]/20 hover:bg-[#0066ff]/30 text-[#0066ff] text-[10px] font-mono border border-[#0066ff]/50 rounded transition-colors"
            >
              Run
            </button>
            <button
              onClick={() => onStop(agent.slug)}
              className="flex-1 py-1.5 px-2 bg-[#ff4444]/20 hover:bg-[#ff4444]/30 text-[#ff4444] text-[10px] font-mono border border-[#ff4444]/50 rounded transition-colors"
            >
              Stop
            </button>
          </>
        ) : null}
        <button
          onClick={() => onDetails(agent)}
          className="flex-1 py-1.5 px-2 bg-[var(--border)] hover:bg-[var(--border)]/80 text-[var(--muted-foreground)] text-[10px] font-mono rounded transition-colors"
        >
          Details
        </button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// STAT CARD
// ============================================================================

interface StatCardProps {
  icon: any;
  label: string;
  value: number | string;
  unit?: string;
  color: string;
}

function StatCard({ icon: Icon, label, value, unit, color }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase text-[var(--muted-foreground)]">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <span className="text-2xl font-mono font-bold" style={{ color }}>{value}</span>
        {unit && <span className="text-[9px] font-mono text-[var(--muted-foreground)] ml-1">{unit}</span>}
      </div>
    </motion.div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SisgAgents() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [runs, setRuns] = useState<Record<string, AgentRun[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<SisgAgent | null>(null);
  const [actionStates, setActionStates] = useState<Record<string, boolean>>({});

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    try {
      const result = await apiFetch("/api/admin/agents/dashboard");
      const inner = result.data || result;
      if (inner.agents) {
        setData({
          agents: inner.agents,
          stats: {
            totalAgents: inner.summary?.total ?? inner.agents.length,
            deployed: inner.summary?.deployed ?? 0,
            running: inner.agents.filter((a: any) => a.status === "deploying").length,
            errors: inner.summary?.errors ?? 0,
          },
        });
        setLoading(false);
      }
    } catch (err) {
      console.error("Failed to fetch agents:", err);
      if (loading) setLoading(false);
    }
  }, [loading]);

  // Fetch run history for an agent
  const fetchRuns = useCallback(async (slug: string) => {
    try {
      const result = await apiFetch(`/api/admin/agents/${slug}/runs?limit=10`);
      const runData = result.data || result.runs || [];
      setRuns((prev) => ({ ...prev, [slug]: Array.isArray(runData) ? runData : [] }));
    } catch (err) {
      console.error(`Failed to fetch runs for ${slug}:`, err);
    }
  }, []);

  // Initial load and polling
  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  // Deploy agent
  const handleDeploy = useCallback(async (slug: string) => {
    setActionStates((prev) => ({ ...prev, [slug]: true }));
    try {
      await apiFetch(`/api/admin/agents/${slug}/deploy`, { method: "POST" });
      toast.success(`${slug} deployed`);
      fetchDashboard();
    } catch (err) {
      toast.error(`Failed to deploy ${slug}`);
    } finally {
      setActionStates((prev) => ({ ...prev, [slug]: false }));
    }
  }, [fetchDashboard]);

  // Stop agent
  const handleStop = useCallback(async (slug: string) => {
    setActionStates((prev) => ({ ...prev, [slug]: true }));
    try {
      await apiFetch(`/api/admin/agents/${slug}/stop`, { method: "POST" });
      toast.success(`${slug} stopped`);
      fetchDashboard();
    } catch (err) {
      toast.error(`Failed to stop ${slug}`);
    } finally {
      setActionStates((prev) => ({ ...prev, [slug]: false }));
    }
  }, [fetchDashboard]);

  // Run agent now
  const handleRunNow = useCallback(async (slug: string) => {
    setActionStates((prev) => ({ ...prev, [slug]: true }));
    try {
      await apiFetch(`/api/admin/agents/${slug}/run`, { method: "POST" });
      toast.success(`${slug} started`);
      fetchDashboard();
    } catch (err) {
      toast.error(`Failed to run ${slug}`);
    } finally {
      setActionStates((prev) => ({ ...prev, [slug]: false }));
    }
  }, [fetchDashboard]);

  // Deploy all agents
  const handleDeployAll = useCallback(async () => {
    setActionStates((prev) => ({ ...prev, deployAll: true }));
    try {
      await apiFetch("/api/admin/agents/deploy-all", { method: "POST" });
      toast.success("All agents deploying");
      fetchDashboard();
    } catch (err) {
      toast.error("Failed to deploy all agents");
    } finally {
      setActionStates((prev) => ({ ...prev, deployAll: false }));
    }
  }, [fetchDashboard]);

  // Stop all agents
  const handleStopAll = useCallback(async () => {
    setActionStates((prev) => ({ ...prev, stopAll: true }));
    try {
      await apiFetch("/api/admin/agents/stop-all", { method: "POST" });
      toast.success("All agents stopping");
      fetchDashboard();
    } catch (err) {
      toast.error("Failed to stop all agents");
    } finally {
      setActionStates((prev) => ({ ...prev, stopAll: false }));
    }
  }, [fetchDashboard]);

  // Open details modal
  const handleDetails = useCallback((agent: SisgAgent) => {
    setSelectedAgent(agent);
    fetchRuns(agent.slug);
  }, [fetchRuns]);

  const sortedAgents = data?.agents?.sort((a, b) => a.priority - b.priority) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-[#8b5cf6]" />
            <h1 className="text-2xl font-mono font-bold text-[var(--foreground)]">SISG Operations Agents</h1>
          </div>
          <p className="text-sm font-mono text-[var(--muted-foreground)]">
            {data?.stats.totalAgents || 10} Business Agents — Deploy, Run, Schedule, Monitor
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <motion.button
            onClick={handleDeployAll}
            disabled={actionStates.deployAll}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-[#00e5a0]/20 hover:bg-[#00e5a0]/30 disabled:opacity-50 text-[#00e5a0] text-[11px] font-mono border border-[#00e5a0]/50 rounded transition-colors flex items-center gap-2"
          >
            {actionStates.deployAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Rocket className="w-3 h-3" />}
            Deploy All
          </motion.button>
          <motion.button
            onClick={handleStopAll}
            disabled={actionStates.stopAll}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-[#ff4444]/20 hover:bg-[#ff4444]/30 disabled:opacity-50 text-[#ff4444] text-[11px] font-mono border border-[#ff4444]/50 rounded transition-colors flex items-center gap-2"
          >
            {actionStates.stopAll ? <Loader2 className="w-3 h-3 animate-spin" /> : <Square className="w-3 h-3" />}
            Stop All
          </motion.button>
          <motion.button
            onClick={fetchDashboard}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 bg-[var(--border)] hover:bg-[var(--border)]/80 text-[var(--muted-foreground)] text-[11px] font-mono border border-[var(--border)] rounded transition-colors flex items-center gap-2"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </motion.button>
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={CheckCircle2}
              label="Total Agents"
              value={`${data.stats.totalAgents}/10`}
              color="#0066ff"
            />
            <StatCard
              icon={Rocket}
              label="Deployed"
              value={data.stats.deployed}
              color="#00e5a0"
            />
            <StatCard
              icon={Activity}
              label="Running Now"
              value={data.stats.running}
              color="#0066ff"
            />
            <StatCard
              icon={AlertTriangle}
              label="Errors"
              value={data.stats.errors}
              color="#ff4444"
            />
          </div>
        )}

        {/* Agent Grid */}
        <div>
          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : sortedAgents.length > 0 ? (
            <motion.div
              className="grid grid-cols-1 lg:grid-cols-2 gap-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {sortedAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onDeploy={handleDeploy}
                  onStop={handleStop}
                  onRunNow={handleRunNow}
                  onDetails={handleDetails}
                />
              ))}
            </motion.div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-8 text-center">
              <p className="text-sm font-mono text-[var(--muted-foreground)]">No agents found</p>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <DetailModal
            agent={selectedAgent}
            runs={runs[selectedAgent.slug] || []}
            onClose={() => setSelectedAgent(null)}
            onDeploy={handleDeploy}
            onStop={handleStop}
            onRunNow={handleRunNow}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
