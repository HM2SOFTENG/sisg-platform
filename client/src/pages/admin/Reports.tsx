import React, { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import {
  FileText, RefreshCw, AlertTriangle, CheckCircle2, Info, Clock, Filter,
  Bot, Shield, DollarSign, Users, Code, Award, FileSearch, Briefcase, Building,
  Zap, ChevronDown, ChevronRight, Download, Activity, TrendingUp, BarChart3,
  Eye, X, Table2, PieChart
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface AgentOutput {
  type: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "critical" | "success";
  data?: any;
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
  result?: string;
  error?: string;
  output: AgentOutput[];
}

interface SisgAgent {
  id: string;
  slug: string;
  name: string;
  handle: string;
  category: string;
  status: string;
  totalRuns: number;
  successCount: number;
  errorCount: number;
}

interface ReportsData {
  runs: AgentRun[];
  total: number;
  agents: SisgAgent[];
  summary: {
    total: number;
    deployed: number;
    errors: number;
    totalRuns: number;
    totalSuccess: number;
    totalErrors: number;
  };
}

// ============================================================================
// CONSTANTS
// ============================================================================

function getToken() {
  return localStorage.getItem("sisg_admin_token") || "";
}

async function apiFetch(path: string) {
  const res = await fetch(path, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}

const agentIcons: Record<string, any> = {
  sisg: Building, contracts: FileSearch, proposals: Briefcase, bd: Zap,
  cyber: Shield, compliance: CheckCircle2, finance: DollarSign,
  hr: Users, dev: Code, veterans: Award,
};

const categoryColors: Record<string, string> = {
  core: "#8b5cf6", technical: "#0066ff", administrative: "#ffb800", mission: "#00e5a0",
};

const severityConfig: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  critical: { color: "#ff4444", bg: "rgba(255,68,68,0.15)", icon: AlertTriangle, label: "CRITICAL" },
  warning: { color: "#ffb800", bg: "rgba(255,184,0,0.15)", icon: AlertTriangle, label: "WARNING" },
  success: { color: "#00e5a0", bg: "rgba(0,229,160,0.15)", icon: CheckCircle2, label: "SUCCESS" },
  info: { color: "#0066ff", bg: "rgba(0,102,255,0.15)", icon: Info, label: "INFO" },
};

const agentCategoryMap: Record<string, string> = {
  sisg: "core", contracts: "core", bd: "core", proposals: "core",
  cyber: "technical", dev: "technical",
  compliance: "administrative", finance: "administrative", hr: "administrative",
  veterans: "mission",
};

// ============================================================================
// UTILITIES
// ============================================================================

function timeAgo(dateStr: string) {
  if (!dateStr) return "—";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function formatDuration(ms?: number) {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

// ============================================================================
// KPI CARD
// ============================================================================

function KpiCard({ icon: Icon, label, value, color, sub }: {
  icon: any; label: string; value: string | number; color: string; sub?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">{label}</span>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="text-2xl font-mono font-bold" style={{ color }}>{value}</div>
      {sub && <div className="text-[9px] font-mono text-[var(--muted-foreground)] mt-1">{sub}</div>}
    </motion.div>
  );
}

// ============================================================================
// MINI BAR CHART (inline SVG)
// ============================================================================

function MiniBarChart({ data, height = 120 }: { data: { label: string; value: number; color: string }[]; height?: number }) {
  if (!data.length) return null;
  const maxVal = Math.max(...data.map(d => d.value), 1);
  const barWidth = Math.min(40, Math.floor(280 / data.length) - 8);

  return (
    <div className="w-full overflow-x-auto">
      <svg width={data.length * (barWidth + 8) + 16} height={height + 30} className="block">
        {data.map((d, i) => {
          const barH = (d.value / maxVal) * height;
          const x = i * (barWidth + 8) + 8;
          return (
            <g key={i}>
              <rect x={x} y={height - barH} width={barWidth} height={barH} rx={3} fill={d.color} opacity={0.85} />
              <text x={x + barWidth / 2} y={height - barH - 4} textAnchor="middle" className="text-[9px] font-mono" fill="var(--muted-foreground)">{d.value}</text>
              <text x={x + barWidth / 2} y={height + 14} textAnchor="middle" className="text-[8px] font-mono" fill="var(--muted-foreground)">{d.label.length > 6 ? d.label.slice(0, 6) : d.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ============================================================================
// DATA TABLE
// ============================================================================

function DataTable({ data, maxRows = 10 }: { data: any[]; maxRows?: number }) {
  if (!data || !Array.isArray(data) || data.length === 0) return null;
  const items = data.slice(0, maxRows);
  const cols = Object.keys(items[0]).filter(k => typeof items[0][k] !== "object");

  return (
    <div className="overflow-x-auto mt-3 border border-[var(--border)] rounded-lg">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--border)]/30">
            {cols.map(col => (
              <th key={col} className="px-3 py-2 text-[9px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
                {col.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((row, i) => (
            <tr key={i} className="border-b border-[var(--border)]/50 last:border-0 hover:bg-[var(--border)]/20 transition-colors">
              {cols.map(col => (
                <td key={col} className="px-3 py-2 text-[11px] font-mono text-[var(--foreground)]">
                  {formatCellValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCellValue(val: any): string {
  if (val === null || val === undefined) return "—";
  if (typeof val === "number") {
    if (val > 10000) return `$${val.toLocaleString()}`;
    return val.toLocaleString();
  }
  if (typeof val === "string" && val.match(/^\d{4}-\d{2}-\d{2}/)) {
    return new Date(val).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }
  return String(val);
}

// ============================================================================
// SEVERITY DOT CHART (for cyber CVEs, etc.)
// ============================================================================

function SeverityDots({ data }: { data: any[] }) {
  if (!data || !Array.isArray(data)) return null;
  const severityCounts: Record<string, number> = {};
  data.forEach(d => {
    const sev = (d.severity || d.baseSeverity || "unknown").toUpperCase();
    severityCounts[sev] = (severityCounts[sev] || 0) + 1;
  });

  const sevColors: Record<string, string> = {
    CRITICAL: "#ff4444", HIGH: "#ff8800", MEDIUM: "#ffb800", LOW: "#00e5a0", UNKNOWN: "#6b7280",
  };

  return (
    <div className="flex gap-4 mt-2">
      {Object.entries(severityCounts).map(([sev, count]) => (
        <div key={sev} className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sevColors[sev] || "#6b7280" }} />
          <span className="text-[10px] font-mono text-[var(--muted-foreground)]">{sev}: {count}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// REPORT CARD — The core visual component for each agent output
// ============================================================================

function ReportCard({ run, output, index }: { run: AgentRun; output: AgentOutput; index: number }) {
  const [expanded, setExpanded] = useState(index === 0);
  const sev = severityConfig[output.severity] || severityConfig.info;
  const SevIcon = sev.icon;
  const AgentIcon = agentIcons[run.agentSlug] || Bot;
  const category = agentCategoryMap[run.agentSlug] || "core";
  const catColor = categoryColors[category];
  const hasData = output.data && (Array.isArray(output.data) ? output.data.length > 0 : Object.keys(output.data).length > 0);
  const isTableData = Array.isArray(output.data) && output.data.length > 0 && typeof output.data[0] === "object";
  const isCyberData = run.agentSlug === "cyber" && isTableData;

  // Generate chart data from array outputs
  const chartData = useMemo(() => {
    if (!isTableData) return [];
    const items = output.data as any[];
    // Try to find a good label/value pair
    const labelKey = Object.keys(items[0]).find(k => typeof items[0][k] === "string" && k !== "description") || Object.keys(items[0])[0];
    const valueKey = Object.keys(items[0]).find(k => typeof items[0][k] === "number");
    if (!valueKey) return [];
    return items.slice(0, 8).map((item, i) => ({
      label: String(item[labelKey] || `#${i + 1}`).slice(0, 12),
      value: item[valueKey],
      color: catColor,
    }));
  }, [output.data, isTableData, catColor]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="bg-[var(--card)] border rounded-lg overflow-hidden"
      style={{ borderColor: `${sev.color}30` }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[var(--border)]/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Severity indicator */}
        <div className="w-1 self-stretch rounded-full" style={{ backgroundColor: sev.color }} />

        {/* Agent icon */}
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${catColor}20` }}>
          <AgentIcon className="w-4 h-4" style={{ color: catColor }} />
        </div>

        {/* Title area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase" style={{ color: catColor }}>@{run.agentSlug}</span>
            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase" style={{ color: sev.color, backgroundColor: sev.bg }}>
              {sev.label}
            </span>
            <span className="text-[9px] font-mono text-[var(--muted-foreground)]">
              {run.trigger === "schedule" ? "⏰" : "▶"} {timeAgo(run.startedAt)}
            </span>
          </div>
          <h3 className="text-sm font-mono text-[var(--foreground)] mt-0.5 truncate">{output.title}</h3>
        </div>

        {/* Expand/collapse */}
        <div className="flex items-center gap-2">
          {hasData && (
            <span className="text-[8px] font-mono text-[var(--muted-foreground)] uppercase">
              {isTableData ? `${output.data.length} items` : "data"}
            </span>
          )}
          {expanded ? <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" /> : <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />}
        </div>
      </div>

      {/* Expanded content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 border-t border-[var(--border)]/50">
              {/* Message */}
              <p className="text-xs font-mono text-[var(--muted-foreground)] mt-3 leading-relaxed">{output.message}</p>

              {/* Metadata row */}
              <div className="flex items-center gap-4 mt-3 text-[9px] font-mono text-[var(--muted-foreground)]">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(run.startedAt)}</span>
                <span className="flex items-center gap-1"><Activity className="w-3 h-3" /> {formatDuration(run.duration)}</span>
                <span className="flex items-center gap-1">
                  {run.status === "completed" ? <CheckCircle2 className="w-3 h-3 text-[#00e5a0]" /> : <AlertTriangle className="w-3 h-3 text-[#ff4444]" />}
                  {run.status}
                </span>
              </div>

              {/* Severity dots for cyber data */}
              {isCyberData && <SeverityDots data={output.data} />}

              {/* Smart data rendering */}
              {hasData && (
                <div className="mt-3">
                  {isTableData ? (
                    <>
                      <DataTable data={output.data} />
                      {chartData.length > 0 && (
                        <div className="mt-4 p-3 bg-[var(--border)]/20 rounded-lg">
                          <div className="text-[9px] font-mono uppercase text-[var(--muted-foreground)] mb-2 flex items-center gap-1">
                            <BarChart3 className="w-3 h-3" /> Distribution
                          </div>
                          <MiniBarChart data={chartData} />
                        </div>
                      )}
                    </>
                  ) : typeof output.data === "object" && !Array.isArray(output.data) ? (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(output.data).map(([key, val]) => {
                        if (typeof val === "object") return null;
                        return (
                          <div key={key} className="bg-[var(--border)]/20 rounded-lg p-2.5">
                            <div className="text-[8px] font-mono uppercase text-[var(--muted-foreground)]">{key.replace(/_/g, " ")}</div>
                            <div className="text-sm font-mono font-bold text-[var(--foreground)] mt-0.5">{formatCellValue(val)}</div>
                          </div>
                        );
                      })}
                      {/* Nested arrays (like recent_runs in @sisg briefing) */}
                      {Object.entries(output.data).map(([key, val]) => {
                        if (!Array.isArray(val) || val.length === 0 || typeof val[0] !== "object") return null;
                        return (
                          <div key={key} className="col-span-full">
                            <div className="text-[9px] font-mono uppercase text-[var(--muted-foreground)] mt-2 mb-1">{key.replace(/_/g, " ")}</div>
                            <DataTable data={val} maxRows={5} />
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// AGENT ACTIVITY SPARKLINE CHART
// ============================================================================

function AgentActivityChart({ agents, runs }: { agents: SisgAgent[]; runs: AgentRun[] }) {
  const chartData = useMemo(() => {
    return agents
      .sort((a, b) => b.totalRuns - a.totalRuns)
      .map(a => ({
        label: a.slug,
        value: a.totalRuns,
        color: categoryColors[agentCategoryMap[a.slug] || "core"],
      }));
  }, [agents]);

  // Severity breakdown from runs
  const severityBreakdown = useMemo(() => {
    const counts = { critical: 0, warning: 0, success: 0, info: 0 };
    runs.forEach(r => {
      r.output?.forEach(o => {
        if (counts[o.severity as keyof typeof counts] !== undefined) {
          counts[o.severity as keyof typeof counts]++;
        }
      });
    });
    return counts;
  }, [runs]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Agent runs bar chart */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-[#0066ff]" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">Runs by Agent</span>
        </div>
        <MiniBarChart data={chartData} height={100} />
      </div>

      {/* Severity breakdown */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <PieChart className="w-4 h-4 text-[#8b5cf6]" />
          <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">Output Severity</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-2">
          {Object.entries(severityBreakdown).map(([sev, count]) => {
            const cfg = severityConfig[sev];
            const SIcon = cfg.icon;
            return (
              <div key={sev} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: cfg.bg }}>
                <SIcon className="w-4 h-4" style={{ color: cfg.color }} />
                <div>
                  <div className="text-lg font-mono font-bold" style={{ color: cfg.color }}>{count}</div>
                  <div className="text-[8px] font-mono uppercase text-[var(--muted-foreground)]">{sev}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// FILTER BAR
// ============================================================================

function FilterBar({ agents, selectedAgent, selectedSeverity, onAgentChange, onSeverityChange }: {
  agents: SisgAgent[];
  selectedAgent: string;
  selectedSeverity: string;
  onAgentChange: (v: string) => void;
  onSeverityChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-1.5">
        <Filter className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
        <span className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">Filters</span>
      </div>

      {/* Agent filter */}
      <select
        value={selectedAgent}
        onChange={e => onAgentChange(e.target.value)}
        className="bg-[var(--card)] border border-[var(--border)] rounded px-2.5 py-1.5 text-[11px] font-mono text-[var(--foreground)] outline-none focus:border-[#0066ff] cursor-pointer"
      >
        <option value="">All Agents</option>
        {agents.map(a => (
          <option key={a.slug} value={a.slug}>@{a.slug}</option>
        ))}
      </select>

      {/* Severity filter */}
      <select
        value={selectedSeverity}
        onChange={e => onSeverityChange(e.target.value)}
        className="bg-[var(--card)] border border-[var(--border)] rounded px-2.5 py-1.5 text-[11px] font-mono text-[var(--foreground)] outline-none focus:border-[#0066ff] cursor-pointer"
      >
        <option value="">All Severity</option>
        <option value="critical">Critical</option>
        <option value="warning">Warning</option>
        <option value="success">Success</option>
        <option value="info">Info</option>
      </select>

      {/* Active filter badges */}
      {(selectedAgent || selectedSeverity) && (
        <button
          onClick={() => { onAgentChange(""); onSeverityChange(""); }}
          className="text-[10px] font-mono text-[#ff4444] hover:text-[#ff6666] transition-colors flex items-center gap-1"
        >
          <X className="w-3 h-3" /> Clear
        </button>
      )}
    </div>
  );
}

// ============================================================================
// SKELETON LOADER
// ============================================================================

function ReportSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[var(--border)] rounded-lg animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-[var(--border)] rounded w-1/4 animate-pulse" />
              <div className="h-4 bg-[var(--border)] rounded w-2/3 animate-pulse" />
            </div>
          </div>
          <div className="h-3 bg-[var(--border)] rounded w-3/4 animate-pulse" />
          <div className="h-20 bg-[var(--border)] rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Reports() {
  const [data, setData] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Fetch all data
  const fetchData = useCallback(async () => {
    try {
      // Build query string
      const params = new URLSearchParams({ limit: "100" });
      if (selectedAgent) params.set("agent", selectedAgent);
      if (selectedSeverity) params.set("severity", selectedSeverity);

      const [runsResult, dashResult] = await Promise.all([
        apiFetch(`/api/admin/agents/runs/all?${params}`),
        apiFetch("/api/admin/agents/dashboard"),
      ]);

      const runs = runsResult.data?.runs || [];
      const dash = dashResult.data || {};

      setData({
        runs,
        total: runsResult.data?.total || 0,
        agents: dash.agents || [],
        summary: dash.summary || { total: 0, deployed: 0, errors: 0, totalRuns: 0, totalSuccess: 0, totalErrors: 0 },
      });
      setLoading(false);
      setLastRefresh(new Date());
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      if (loading) setLoading(false);
    }
  }, [selectedAgent, selectedSeverity, loading]);

  // Initial load + auto-refresh every 30s
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Flatten all outputs from runs for the feed
  const feedItems = useMemo(() => {
    if (!data?.runs) return [];
    const items: { run: AgentRun; output: AgentOutput; sortTime: number }[] = [];
    for (const run of data.runs) {
      if (run.output && run.output.length > 0) {
        for (const out of run.output) {
          items.push({ run, output: out, sortTime: new Date(run.startedAt).getTime() });
        }
      }
    }
    return items.sort((a, b) => b.sortTime - a.sortTime);
  }, [data?.runs]);

  // Count outputs by severity
  const outputCounts = useMemo(() => {
    const counts = { critical: 0, warning: 0, success: 0, info: 0, total: 0 };
    feedItems.forEach(item => {
      counts[item.output.severity as keyof typeof counts]++;
      counts.total++;
    });
    return counts;
  }, [feedItems]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#8b5cf6]" />
              <h1 className="text-2xl font-mono font-bold text-[var(--foreground)]">Operations Reports</h1>
            </div>
            <p className="text-sm font-mono text-[var(--muted-foreground)]">
              Live agent output feed — auto-refreshes every 30s
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-[var(--muted-foreground)]">
              Last: {lastRefresh.toLocaleTimeString()}
            </span>
            <motion.button
              onClick={fetchData}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-3 py-1.5 bg-[var(--border)] hover:bg-[var(--border)]/80 text-[var(--muted-foreground)] text-[11px] font-mono border border-[var(--border)] rounded transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </motion.button>
          </div>
        </div>

        {/* KPI Cards */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard icon={Bot} label="Agents" value={`${data.summary.deployed}/${data.summary.total}`} color="#0066ff" sub="deployed" />
            <KpiCard icon={Activity} label="Total Runs" value={data.summary.totalRuns} color="#8b5cf6" sub="all time" />
            <KpiCard icon={CheckCircle2} label="Success" value={data.summary.totalSuccess} color="#00e5a0" sub={`${data.summary.totalRuns > 0 ? Math.round((data.summary.totalSuccess / data.summary.totalRuns) * 100) : 0}% rate`} />
            <KpiCard icon={AlertTriangle} label="Critical" value={outputCounts.critical} color="#ff4444" sub="alerts" />
            <KpiCard icon={AlertTriangle} label="Warnings" value={outputCounts.warning} color="#ffb800" sub="flagged" />
            <KpiCard icon={TrendingUp} label="Outputs" value={outputCounts.total} color="#0066ff" sub="total reports" />
          </div>
        )}

        {/* Charts */}
        {data && data.runs.length > 0 && (
          <AgentActivityChart agents={data.agents} runs={data.runs} />
        )}

        {/* Filters */}
        {data && (
          <FilterBar
            agents={data.agents}
            selectedAgent={selectedAgent}
            selectedSeverity={selectedSeverity}
            onAgentChange={setSelectedAgent}
            onSeverityChange={setSelectedSeverity}
          />
        )}

        {/* Feed */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-[var(--muted-foreground)]" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-foreground)]">
              Activity Feed {feedItems.length > 0 && `— ${feedItems.length} report${feedItems.length !== 1 ? "s" : ""}`}
            </span>
          </div>

          {loading ? (
            <ReportSkeleton />
          ) : feedItems.length > 0 ? (
            <div className="space-y-3">
              {feedItems.map((item, i) => (
                <ReportCard key={`${item.run.id}-${i}`} run={item.run} output={item.output} index={i} />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-12 text-center"
            >
              <FileText className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3 opacity-50" />
              <p className="text-sm font-mono text-[var(--muted-foreground)]">No reports yet</p>
              <p className="text-xs font-mono text-[var(--muted-foreground)] mt-1 opacity-70">
                Run agents from the Agents page to generate reports
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
