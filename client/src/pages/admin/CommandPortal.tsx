import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import {
  Bot, Cpu, Wifi, WifiOff, Activity, Play, Pause, Send, RefreshCw,
  AlertTriangle, CheckCircle2, Clock, Terminal, Zap, ChevronDown,
  Loader2, X, ChevronUp, Maximize2, Minimize2, RotateCcw, Eye,
  Timer, Shield, Radar, Radio, Circle, ArrowUpRight, MessageSquare,
  Calendar, Settings2, TrendingUp, BarChart3, Bell, BellRing, Sparkles,
  Command, Rocket, Target, Gauge, GitBranch, Server, Database,
  ShieldCheck, FileSearch, Globe, Lock, Cog, Layers, PlayCircle,
  PauseCircle, Trash2, Plus, Search, Filter, ChevronRight, XCircle,
  Info, Hash, Boxes, Volume2, VolumeX
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface SisgAgent {
  id: string; slug: string; name: string; handle: string;
  channels: string[]; description: string;
  category: "core" | "technical" | "administrative" | "mission";
  status: "deployed" | "stopped" | "error" | "deploying" | "undeployed";
  schedule: string; lastRun: string; nextRun: string; lastResult: string;
  errorCount: number; successCount: number; totalRuns: number;
  deployedAt: string; config: Record<string, any>;
  capabilities: string[]; priority: number;
}

interface AgentRun {
  id: string; agentId: string; agentSlug: string;
  trigger: "schedule" | "manual" | "api" | "event";
  status: "running" | "completed" | "failed";
  startedAt: string; completedAt?: string; duration?: number;
  result?: string; error?: string;
  output: { type: string; title: string; message: string; severity: string; data?: any }[];
}

interface GatewayHealth {
  status: string; service: string; version: string;
  uptime: number; openclawConnected: boolean; activeTasks: number; timestamp: string;
}

interface ChatMessage {
  id: string; role: "user" | "assistant" | "system";
  content: string; timestamp: string; pending?: boolean;
}

interface AutomationJob {
  name: string; schedule: string; enabled: boolean;
  lastRun?: string; nextRun?: string; runCount: number;
  task: { type: string; command: string };
}

interface Alert {
  id: string; severity: "critical" | "warning" | "info";
  title: string; message: string; timestamp: string;
  source: string; acknowledged: boolean;
}

// ============================================================================
// HELPERS
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

function timeAgo(ts: string): string {
  if (!ts) return "never";
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const statusColor: Record<string, string> = {
  deployed: "#00e5a0", running: "#00d4ff", stopped: "#6b7280",
  error: "#ff3b3b", deploying: "#ffb800", undeployed: "#374151",
  completed: "#00e5a0", failed: "#ff3b3b", ok: "#00e5a0", degraded: "#ffb800",
};

const categoryIcon: Record<string, any> = {
  core: Shield, technical: Cpu, administrative: FileSearch, mission: Target,
};

// ============================================================================
// PULSE DOT — animated status indicator
// ============================================================================

function PulseDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span className="relative inline-flex" style={{ width: size, height: size }}>
      <span
        className="absolute inline-flex h-full w-full animate-ping opacity-40"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex h-full w-full"
        style={{ backgroundColor: color }}
      />
    </span>
  );
}

// ============================================================================
// KPI CARD
// ============================================================================

function KpiCard({ label, value, icon: Icon, color, sub, pulse }: {
  label: string; value: string | number; icon: any; color: string; sub?: string; pulse?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--card)] border border-[var(--border)] p-4 flex items-center gap-3 hover:border-[color:var(--c)]/30 transition-colors group"
      style={{ "--c": color } as any}
    >
      <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-[var(--foreground)] font-mono">{value}</span>
          {pulse && <PulseDot color={color} />}
        </div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted-foreground)]">{label}</div>
        {sub && <div className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{sub}</div>}
      </div>
    </motion.div>
  );
}

// ============================================================================
// AGENT TILE — clickable live agent card
// ============================================================================

function AgentTile({ agent, onRun, onToggle, expanded, onExpand }: {
  agent: SisgAgent; onRun: () => void; onToggle: () => void; expanded: boolean; onExpand: () => void;
}) {
  const CatIcon = categoryIcon[agent.category] || Zap;
  const color = statusColor[agent.status] || "#6b7280";
  const isRunnable = agent.status === "deployed";
  const isRunning = agent.status === "deploying";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`bg-[var(--card)] border transition-all cursor-pointer group ${
        expanded ? "border-[#0066ff]/40 col-span-2 row-span-2" : "border-[var(--border)] hover:border-[color:var(--c)]/30"
      }`}
      style={{ "--c": color } as any}
      onClick={onExpand}
    >
      {/* Header */}
      <div className="p-3 flex items-start justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ background: `${color}15` }}>
            <CatIcon className="w-4 h-4" style={{ color }} />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium text-[var(--foreground)] truncate">{agent.name}</div>
            <div className="text-[10px] font-mono text-[var(--muted-foreground)]">{agent.handle}</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <PulseDot color={color} size={6} />
          <span className="text-[10px] font-mono uppercase" style={{ color }}>{agent.status}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-3 pb-2 flex items-center gap-3 text-[10px] font-mono text-[var(--muted-foreground)]">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-[#00e5a0]" />
          {agent.successCount}
        </span>
        <span className="flex items-center gap-1">
          <XCircle className="w-3 h-3 text-[#ff3b3b]" />
          {agent.errorCount}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {timeAgo(agent.lastRun)}
        </span>
      </div>

      {/* Mini bar */}
      <div className="h-[2px] mx-3 mb-2 bg-[var(--border)] overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: agent.totalRuns > 0 ? `${(agent.successCount / agent.totalRuns) * 100}%` : "0%",
            backgroundColor: color,
          }}
        />
      </div>

      {/* Expanded view */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 space-y-2 border-t border-[var(--border)] pt-2">
              <p className="text-xs text-[var(--muted-foreground)]">{agent.description}</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-[var(--muted-foreground)]">Schedule:</span>
                  <span className="ml-1 font-mono text-[var(--foreground)]">{agent.schedule || "manual"}</span>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)]">Next Run:</span>
                  <span className="ml-1 font-mono text-[var(--foreground)]">{agent.nextRun ? timeAgo(agent.nextRun) : "—"}</span>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)]">Total Runs:</span>
                  <span className="ml-1 font-mono text-[var(--foreground)]">{agent.totalRuns}</span>
                </div>
                <div>
                  <span className="text-[var(--muted-foreground)]">Category:</span>
                  <span className="ml-1 font-mono text-[var(--foreground)] capitalize">{agent.category}</span>
                </div>
              </div>
              {agent.capabilities?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {agent.capabilities.slice(0, 4).map((c) => (
                    <span key={c} className="text-[9px] px-1.5 py-0.5 bg-[#0066ff]/10 text-[#0066ff] font-mono">{c}</span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onRun(); }}
                  disabled={!isRunnable}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0066ff] text-white hover:bg-[#0055dd] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                  {isRunning ? "Running..." : "Run Now"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onToggle(); }}
                  className={`px-3 py-1.5 text-xs font-medium border transition-colors ${
                    agent.status === "deployed"
                      ? "border-[#ff3b3b]/30 text-[#ff3b3b] hover:bg-[#ff3b3b]/10"
                      : "border-[#00e5a0]/30 text-[#00e5a0] hover:bg-[#00e5a0]/10"
                  }`}
                >
                  {agent.status === "deployed" ? "Stop" : "Deploy"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// ACTIVITY FEED — real-time event stream
// ============================================================================

function ActivityFeed({ runs, loading }: { runs: AgentRun[]; loading: boolean }) {
  const sevColor: Record<string, string> = {
    critical: "#ff3b3b", warning: "#ffb800", info: "#00d4ff", success: "#00e5a0",
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-[var(--card)] border border-[var(--border)] animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
      {runs.slice(0, 20).map((run) => {
        const output = run.output?.[0];
        const sev = output?.severity || (run.status === "failed" ? "critical" : "info");
        return (
          <motion.div
            key={run.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-2 px-2 py-1.5 hover:bg-white/[0.02] transition-colors group"
          >
            <div className="w-1 h-full min-h-[20px] mt-1 flex-shrink-0" style={{ backgroundColor: sevColor[sev] || "#6b7280" }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-medium text-[var(--foreground)] truncate">
                  {output?.title || run.agentSlug}
                </span>
                <span className={`text-[9px] px-1 font-mono uppercase ${
                  run.status === "completed" ? "text-[#00e5a0] bg-[#00e5a0]/10" :
                  run.status === "failed" ? "text-[#ff3b3b] bg-[#ff3b3b]/10" :
                  "text-[#00d4ff] bg-[#00d4ff]/10"
                }`}>{run.status}</span>
              </div>
              <div className="text-[10px] text-[var(--muted-foreground)] truncate">
                {output?.message || run.result || run.error || "Processing..."}
              </div>
            </div>
            <span className="text-[9px] font-mono text-[var(--muted-foreground)] flex-shrink-0 mt-0.5">
              {timeAgo(run.startedAt)}
            </span>
          </motion.div>
        );
      })}
      {runs.length === 0 && (
        <div className="text-center py-8 text-[var(--muted-foreground)] text-sm">
          <Radio className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No activity yet
        </div>
      )}
    </div>
  );
}

// ============================================================================
// CLAWBOT CHAT PANEL — full AI chat with gateway control
// ============================================================================

function ClawBotChat({ gatewayOnline, agents }: { gatewayOnline: boolean; agents: SisgAgent[] }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "system", content: "ClawBot connected via SISG Gateway. I can run agents, check status, create automations, and answer questions. Try: \"Run all agents\" or \"What critical CVEs came in today?\"", timestamp: new Date().toISOString() },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const quickActions = [
    { label: "Run All Agents", icon: Rocket, cmd: "Run all agents now" },
    { label: "Health Check", icon: Activity, cmd: "Check gateway and OpenClaw health status" },
    { label: "Show Alerts", icon: Bell, cmd: "Show me any critical alerts or warnings" },
    { label: "Schedule Task", icon: Calendar, cmd: "Help me schedule an automation" },
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || sending) return;
    setInput("");

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`, role: "user", content: msg, timestamp: new Date().toISOString(),
    };
    const pendingMsg: ChatMessage = {
      id: `p-${Date.now()}`, role: "assistant", content: "", timestamp: new Date().toISOString(), pending: true,
    };
    setMessages((prev) => [...prev, userMsg, pendingMsg]);
    setSending(true);

    // Try handling commands locally first for instant feedback
    const lower = msg.toLowerCase();
    let reply = "";

    if (lower.includes("run all") || lower.includes("deploy all")) {
      try {
        await apiFetch("/api/admin/agents/deploy-all", { method: "POST" });
        reply = "✅ All agents deployed and running. They'll execute on their configured schedules. Check the Agent Grid above for live status.";
      } catch { reply = "⚠️ Failed to deploy agents. Check if you're authenticated."; }
    } else if (lower.match(/^run\s+/i) || lower.match(/^deploy\s+/i)) {
      const agentName = msg.replace(/^(run|deploy)\s+/i, "").trim().toLowerCase();
      const matched = agents.find((a) =>
        a.slug.includes(agentName) || a.name.toLowerCase().includes(agentName) || a.handle.toLowerCase().includes(agentName)
      );
      if (matched) {
        try {
          await apiFetch(`/api/admin/agents/${matched.slug}/run`, { method: "POST" });
          reply = `✅ Started **${matched.name}** (${matched.handle}). Watch the activity feed for results.`;
        } catch { reply = `⚠️ Failed to run ${matched.name}.`; }
      } else {
        reply = `❓ No agent found matching "${agentName}". Available: ${agents.map((a) => a.name).join(", ")}`;
      }
    } else if (lower.includes("stop all")) {
      try {
        await apiFetch("/api/admin/agents/stop-all", { method: "POST" });
        reply = "⏹ All agents stopped.";
      } catch { reply = "⚠️ Failed to stop agents."; }
    } else if (lower.includes("health") || lower.includes("status")) {
      try {
        const h = await apiFetch("/api/admin/gateway/health");
        if (h?.error) {
          reply = `⚠️ Gateway offline — ${h.error.substring(0, 120)}...\n\nLocal agents are still functional. The Kamrui gateway may need to be restarted (pm2 restart sisg-gateway).`;
        } else {
          reply = `🟢 Gateway: ${h.status || "ok"}\n🤖 OpenClaw: ${h.openclawConnected ? "connected" : "offline"}\n⚡ Active Tasks: ${h.activeTasks || 0}\n⏱ Uptime: ${formatUptime(h.uptime || 0)}`;
        }
      } catch { reply = "⚠️ Cannot reach gateway. The Kamrui may be offline. Local agent operations still work."; }
    } else if (lower.includes("agent") && (lower.includes("list") || lower.includes("show") || lower.includes("status"))) {
      const deployed = agents.filter((a) => a.status === "deployed");
      const stopped = agents.filter((a) => a.status !== "deployed");
      reply = `📋 **Agent Status**\n\n🟢 Deployed (${deployed.length}): ${deployed.map((a) => a.name).join(", ") || "none"}\n\n🔴 Stopped (${stopped.length}): ${stopped.map((a) => a.name).join(", ") || "none"}\n\nTotal runs: ${agents.reduce((s, a) => s + a.totalRuns, 0)} | Errors: ${agents.reduce((s, a) => s + a.errorCount, 0)}`;
    } else {
      // Try gateway AI chat
      try {
        const res = await apiFetch("/api/admin/gateway/chat", {
          method: "POST",
          body: JSON.stringify({ message: msg, context: { agent: "clawbot" } }),
        });
        if (res?.error) {
          // Gateway error — provide helpful fallback
          reply = `⚠️ Gateway is currently unreachable.\n\nI can still help with local commands:\n• "run all agents" — deploy & run all agents\n• "run [agent name]" — run a specific agent\n• "stop all" — stop all agents\n• "agent status" — show agent list\n• "health check" — check gateway status\n\nTo restore gateway: SSH into Kamrui and run \`pm2 restart sisg-gateway\``;
        } else {
          reply = res?.response || res?.data?.response || "Received empty response from gateway.";
        }
      } catch {
        reply = `⚠️ Gateway offline. Available local commands:\n• "run all agents"\n• "run [agent name]"\n• "stop all"\n• "agent status"\n• "health check"`;
      }
    }

    setMessages((prev) =>
      prev.map((m) => m.id === pendingMsg.id ? { ...m, content: reply, pending: false } : m)
    );
    setSending(false);
  }, [input, sending]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#8b5cf6]/15 flex items-center justify-center">
            <Bot className="w-4 h-4 text-[#8b5cf6]" />
          </div>
          <div>
            <div className="text-sm font-medium text-[var(--foreground)]">ClawBot</div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono">
              <PulseDot color={gatewayOnline ? "#00e5a0" : "#ff3b3b"} size={5} />
              <span className={gatewayOnline ? "text-[#00e5a0]" : "text-[#ff3b3b]"}>
                {gatewayOnline ? "Gateway Connected" : "Offline"}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setMessages([messages[0]])}
          className="w-7 h-7 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-white/5 transition-colors"
          title="Clear chat"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-[#0066ff] text-white"
                  : msg.role === "system"
                  ? "bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 text-xs"
                  : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)]"
              }`}
            >
              {msg.pending ? (
                <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span className="text-xs">Thinking...</span>
                </div>
              ) : (
                <div className="whitespace-pre-wrap break-words">{msg.content}</div>
              )}
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick actions */}
      <div className="px-3 py-2 flex gap-1.5 overflow-x-auto scrollbar-none border-t border-[var(--border)]">
        {quickActions.map((qa) => (
          <button
            key={qa.label}
            onClick={() => handleSend(qa.cmd)}
            disabled={sending}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[#0066ff]/30 transition-colors flex-shrink-0 disabled:opacity-40"
          >
            <qa.icon className="w-3 h-3" />
            {qa.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[var(--border)]">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={gatewayOnline ? "Ask ClawBot anything..." : "Gateway offline — limited commands"}
            className="flex-1 bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] px-3 py-2 font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[#0066ff]/40"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || sending}
            className="w-9 h-9 flex items-center justify-center bg-[#0066ff] text-white hover:bg-[#0055dd] disabled:opacity-30 transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AUTOMATION MANAGER PANEL
// ============================================================================

function AutomationPanel({ visible }: { visible: boolean }) {
  const [jobs, setJobs] = useState<AutomationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newJob, setNewJob] = useState({ name: "", schedule: "0 */6 * * *", type: "analyze", command: "" });

  const fetchJobs = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/gateway/automations");
      setJobs(res?.data?.jobs || res?.jobs || []);
    } catch { /* gateway may be offline */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (visible) fetchJobs();
  }, [visible, fetchJobs]);

  const toggleJob = async (name: string, enabled: boolean) => {
    try {
      await apiFetch(`/api/admin/gateway/automations/${name}`, {
        method: "PATCH", body: JSON.stringify({ enabled }),
      });
      toast.success(`${name} ${enabled ? "enabled" : "paused"}`);
      fetchJobs();
    } catch { toast.error("Failed to toggle automation"); }
  };

  const deleteJob = async (name: string) => {
    try {
      await apiFetch(`/api/admin/gateway/automations/${name}`, { method: "DELETE" });
      toast.success(`${name} deleted`);
      fetchJobs();
    } catch { toast.error("Failed to delete"); }
  };

  const createJob = async () => {
    if (!newJob.name || !newJob.command) { toast.error("Name and command required"); return; }
    try {
      await apiFetch("/api/admin/gateway/automations", {
        method: "POST",
        body: JSON.stringify({
          name: newJob.name, schedule: newJob.schedule, enabled: true,
          task: { type: newJob.type, command: newJob.command },
        }),
      });
      toast.success(`Automation "${newJob.name}" created`);
      setShowCreate(false);
      setNewJob({ name: "", schedule: "0 */6 * * *", type: "analyze", command: "" });
      fetchJobs();
    } catch { toast.error("Failed to create automation"); }
  };

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--card)] border border-[var(--border)]"
    >
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#ffb800]" />
          <span className="text-sm font-medium text-[var(--foreground)]">Automations</span>
          <span className="text-[10px] font-mono px-1.5 bg-[#ffb800]/10 text-[#ffb800]">{jobs.length}</span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono bg-[#0066ff]/10 text-[#0066ff] hover:bg-[#0066ff]/20 transition-colors"
        >
          <Plus className="w-3 h-3" />
          New
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-b border-[var(--border)] space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={newJob.name} onChange={(e) => setNewJob({ ...newJob, name: e.target.value })}
                  placeholder="Job name" className="bg-[var(--background)] border border-[var(--border)] text-xs px-2 py-1.5 font-mono text-[var(--foreground)] focus:outline-none focus:border-[#0066ff]/30"
                />
                <input
                  value={newJob.schedule} onChange={(e) => setNewJob({ ...newJob, schedule: e.target.value })}
                  placeholder="0 */6 * * *" className="bg-[var(--background)] border border-[var(--border)] text-xs px-2 py-1.5 font-mono text-[var(--foreground)] focus:outline-none focus:border-[#0066ff]/30"
                />
              </div>
              <input
                value={newJob.command} onChange={(e) => setNewJob({ ...newJob, command: e.target.value })}
                placeholder="Command to execute" className="w-full bg-[var(--background)] border border-[var(--border)] text-xs px-2 py-1.5 font-mono text-[var(--foreground)] focus:outline-none focus:border-[#0066ff]/30"
              />
              <div className="flex gap-2">
                <select
                  value={newJob.type} onChange={(e) => setNewJob({ ...newJob, type: e.target.value })}
                  className="bg-[var(--background)] border border-[var(--border)] text-xs px-2 py-1.5 font-mono text-[var(--foreground)]"
                >
                  <option value="analyze">Analyze</option>
                  <option value="shell">Shell</option>
                  <option value="scrape">Scrape</option>
                  <option value="generate">Generate</option>
                </select>
                <button onClick={createJob} className="flex-1 bg-[#0066ff] text-white text-xs py-1.5 hover:bg-[#0055dd] transition-colors">
                  Create Automation
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Jobs list */}
      <div className="divide-y divide-[var(--border)] max-h-[250px] overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-[var(--muted-foreground)] text-xs">Loading...</div>
        ) : jobs.length === 0 ? (
          <div className="p-6 text-center text-[var(--muted-foreground)] text-xs">
            <Calendar className="w-6 h-6 mx-auto mb-2 opacity-30" />
            No automations configured
          </div>
        ) : (
          jobs.map((job) => (
            <div key={job.name} className="px-4 py-2.5 flex items-center gap-3 hover:bg-white/[0.02] transition-colors">
              <button
                onClick={() => toggleJob(job.name, !job.enabled)}
                className={`w-7 h-7 flex items-center justify-center flex-shrink-0 transition-colors ${
                  job.enabled ? "bg-[#00e5a0]/15 text-[#00e5a0]" : "bg-[var(--border)] text-[var(--muted-foreground)]"
                }`}
              >
                {job.enabled ? <PlayCircle className="w-4 h-4" /> : <PauseCircle className="w-4 h-4" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[var(--foreground)] truncate">{job.name}</div>
                <div className="text-[10px] font-mono text-[var(--muted-foreground)]">{job.schedule} • {job.runCount} runs</div>
              </div>
              <button onClick={() => deleteJob(job.name)} className="w-6 h-6 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[#ff3b3b] transition-colors">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// ALERT CENTER
// ============================================================================

function AlertCenter({ runs, visible }: { runs: AgentRun[]; visible: boolean }) {
  if (!visible) return null;

  const alerts: Alert[] = useMemo(() => {
    const a: Alert[] = [];
    runs.forEach((run) => {
      run.output?.forEach((out) => {
        if (out.severity === "critical" || out.severity === "warning") {
          a.push({
            id: `${run.id}-${out.title}`,
            severity: out.severity as "critical" | "warning",
            title: out.title,
            message: out.message,
            timestamp: run.startedAt,
            source: run.agentSlug,
            acknowledged: false,
          });
        }
      });
      if (run.status === "failed") {
        a.push({
          id: `fail-${run.id}`,
          severity: "critical",
          title: `Agent Failed: ${run.agentSlug}`,
          message: run.error || "Unknown error",
          timestamp: run.startedAt,
          source: run.agentSlug,
          acknowledged: false,
        });
      }
    });
    return a.sort((x, y) => new Date(y.timestamp).getTime() - new Date(x.timestamp).getTime()).slice(0, 30);
  }, [runs]);

  const critCount = alerts.filter((a) => a.severity === "critical").length;
  const warnCount = alerts.filter((a) => a.severity === "warning").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--card)] border border-[var(--border)]"
    >
      <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-3">
        <BellRing className="w-4 h-4 text-[#ff3b3b]" />
        <span className="text-sm font-medium text-[var(--foreground)]">Alerts</span>
        {critCount > 0 && (
          <span className="text-[10px] font-mono px-1.5 bg-[#ff3b3b]/15 text-[#ff3b3b]">{critCount} critical</span>
        )}
        {warnCount > 0 && (
          <span className="text-[10px] font-mono px-1.5 bg-[#ffb800]/15 text-[#ffb800]">{warnCount} warning</span>
        )}
      </div>
      <div className="divide-y divide-[var(--border)] max-h-[300px] overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-6 text-center text-[var(--muted-foreground)] text-xs">
            <ShieldCheck className="w-6 h-6 mx-auto mb-2 opacity-30" />
            All clear — no alerts
          </div>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="px-4 py-2.5 flex items-start gap-2 hover:bg-white/[0.02] transition-colors">
              <div className="mt-0.5 flex-shrink-0">
                {alert.severity === "critical" ? (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#ff3b3b]" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5 text-[#ffb800]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-[var(--foreground)] truncate">{alert.title}</div>
                <div className="text-[10px] text-[var(--muted-foreground)] truncate">{alert.message}</div>
                <div className="text-[9px] font-mono text-[var(--muted-foreground)] mt-0.5">
                  {alert.source} • {timeAgo(alert.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// SYSTEM HEALTH BAR — gateway + openclaw connection gauges
// ============================================================================

function SystemHealthBar({ health, loading }: { health: GatewayHealth | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-4 px-4 py-2 bg-[var(--card)] border border-[var(--border)] animate-pulse">
        <div className="h-3 w-40 bg-[var(--border)]" />
      </div>
    );
  }

  const online = health && health.status !== "error";
  const ocOnline = health?.openclawConnected;

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-[var(--card)] border border-[var(--border)] flex-wrap">
      {/* Gateway status */}
      <div className="flex items-center gap-2">
        <PulseDot color={online ? "#00e5a0" : "#ff3b3b"} size={6} />
        <span className="text-[10px] font-mono text-[var(--muted-foreground)]">GATEWAY</span>
        <span className={`text-[10px] font-mono font-bold ${online ? "text-[#00e5a0]" : "text-[#ff3b3b]"}`}>
          {online ? "ONLINE" : "OFFLINE"}
        </span>
      </div>

      <div className="w-px h-4 bg-[var(--border)]" />

      {/* OpenClaw status */}
      <div className="flex items-center gap-2">
        <PulseDot color={ocOnline ? "#00e5a0" : "#ff3b3b"} size={6} />
        <span className="text-[10px] font-mono text-[var(--muted-foreground)]">OPENCLAW</span>
        <span className={`text-[10px] font-mono font-bold ${ocOnline ? "text-[#00e5a0]" : "text-[#ff3b3b]"}`}>
          {ocOnline ? "CONNECTED" : "DISCONNECTED"}
        </span>
      </div>

      <div className="w-px h-4 bg-[var(--border)]" />

      {/* Uptime */}
      <div className="flex items-center gap-2">
        <Timer className="w-3 h-3 text-[var(--muted-foreground)]" />
        <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
          UP {health ? formatUptime(health.uptime) : "—"}
        </span>
      </div>

      <div className="w-px h-4 bg-[var(--border)]" />

      {/* Active tasks */}
      <div className="flex items-center gap-2">
        <Layers className="w-3 h-3 text-[#00d4ff]" />
        <span className="text-[10px] font-mono text-[var(--muted-foreground)]">
          {health?.activeTasks ?? 0} ACTIVE TASKS
        </span>
      </div>

      {health?.version && (
        <>
          <div className="w-px h-4 bg-[var(--border)]" />
          <span className="text-[9px] font-mono text-[var(--muted-foreground)]">v{health.version}</span>
        </>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMMAND PORTAL
// ============================================================================

export default function CommandPortal() {
  // State
  const [agents, setAgents] = useState<SisgAgent[]>([]);
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [health, setHealth] = useState<GatewayHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [healthLoading, setHealthLoading] = useState(true);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"automations" | "alerts" | null>(null);
  const [chatMinimized, setChatMinimized] = useState(false);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch agents + runs
  const fetchData = useCallback(async () => {
    try {
      const [dashRes, runsRes] = await Promise.all([
        apiFetch("/api/admin/agents/dashboard"),
        apiFetch("/api/admin/agents/runs/all?limit=100"),
      ]);
      const inner = dashRes.data || dashRes;
      if (inner.agents) setAgents(inner.agents);
      setRuns(runsRes.data?.runs || runsRes.runs || []);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
    setLoading(false);
  }, []);

  // Fetch gateway health
  const fetchHealth = useCallback(async () => {
    try {
      const res = await apiFetch("/api/admin/gateway/health");
      setHealth(res);
    } catch {
      setHealth(null);
    }
    setHealthLoading(false);
  }, []);

  // Auto-refresh
  useEffect(() => {
    fetchData();
    fetchHealth();
    refreshTimerRef.current = setInterval(() => {
      fetchData();
      fetchHealth();
    }, 15000); // 15s refresh
    return () => { if (refreshTimerRef.current) clearInterval(refreshTimerRef.current); };
  }, [fetchData, fetchHealth]);

  // Agent actions
  const runAgent = async (slug: string) => {
    toast.info(`Running ${slug}...`);
    try {
      await apiFetch(`/api/admin/agents/${slug}/run`, { method: "POST" });
      toast.success(`${slug} started`);
      setTimeout(fetchData, 2000);
    } catch { toast.error(`Failed to run ${slug}`); }
  };

  const toggleAgent = async (slug: string, status: string) => {
    const action = status === "deployed" ? "stop" : "deploy";
    try {
      await apiFetch(`/api/admin/agents/${slug}/${action}`, { method: "POST" });
      toast.success(`${slug} ${action}ed`);
      setTimeout(fetchData, 1000);
    } catch { toast.error(`Failed to ${action} ${slug}`); }
  };

  const runAllAgents = async () => {
    toast.info("Deploying all agents...");
    try {
      await apiFetch("/api/admin/agents/deploy-all", { method: "POST" });
      toast.success("All agents deployed");
      setTimeout(fetchData, 3000);
    } catch { toast.error("Failed to deploy agents"); }
  };

  // Computed stats
  const stats = useMemo(() => {
    const deployed = agents.filter((a) => a.status === "deployed").length;
    const running = agents.filter((a) => a.status === "deploying").length;
    const errors = agents.filter((a) => a.status === "error").length;
    const totalRuns = runs.length;
    const successRuns = runs.filter((r) => r.status === "completed").length;
    const critAlerts = runs.reduce((n, r) => n + (r.output?.filter((o) => o.severity === "critical").length || 0), 0)
      + runs.filter((r) => r.status === "failed").length;
    const warnAlerts = runs.reduce((n, r) => n + (r.output?.filter((o) => o.severity === "warning").length || 0), 0);
    const rate = totalRuns > 0 ? Math.round((successRuns / totalRuns) * 100) : 0;
    return { deployed, running, errors, totalRuns, successRuns, critAlerts, warnAlerts, rate };
  }, [agents, runs]);

  const gatewayOnline = health !== null && health.status !== "error";

  return (
    <DashboardLayout title="Command Portal">
      <div className="space-y-4">
        {/* ============ HEADER ============ */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#0066ff]/15 flex items-center justify-center">
              <Command className="w-5 h-5 text-[#0066ff]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--foreground)]" style={{ fontFamily: "Sora, sans-serif" }}>
                COMMAND PORTAL
              </h1>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted-foreground)]">
                Sentinel Integrated Solutions Group
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={runAllAgents}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#0066ff] text-white hover:bg-[#0055dd] transition-colors"
            >
              <Rocket className="w-3.5 h-3.5" />
              Deploy All
            </button>
            <button
              onClick={() => { fetchData(); fetchHealth(); toast.success("Refreshed"); }}
              className="w-8 h-8 flex items-center justify-center border border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[#0066ff]/30 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ============ SYSTEM HEALTH BAR ============ */}
        <SystemHealthBar health={health} loading={healthLoading} />

        {/* ============ KPI ROW ============ */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Agents Online" value={stats.deployed} icon={Zap} color="#00e5a0" pulse sub={`${agents.length} total`} />
          <KpiCard label="Running" value={stats.running} icon={Loader2} color="#00d4ff" pulse={stats.running > 0} />
          <KpiCard label="Total Runs" value={stats.totalRuns} icon={Activity} color="#0066ff" />
          <KpiCard label="Success Rate" value={`${stats.rate}%`} icon={TrendingUp} color={stats.rate >= 80 ? "#00e5a0" : "#ffb800"} />
          <KpiCard label="Critical" value={stats.critAlerts} icon={AlertTriangle} color="#ff3b3b" pulse={stats.critAlerts > 0} />
          <KpiCard label="Warnings" value={stats.warnAlerts} icon={Bell} color="#ffb800" />
        </div>

        {/* ============ MAIN GRID: Agents + Chat ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* LEFT COLUMN — Agent Grid + Activity Feed (2/3 width) */}
          <div className="lg:col-span-2 space-y-4">

            {/* Agent Grid */}
            <div className="bg-[var(--card)] border border-[var(--border)]">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Radar className="w-4 h-4 text-[#0066ff]" />
                  <span className="text-sm font-medium text-[var(--foreground)]">Agent Grid</span>
                  <span className="text-[10px] font-mono px-1.5 bg-[#0066ff]/10 text-[#0066ff]">{agents.length} agents</span>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => setActivePanel(activePanel === "automations" ? null : "automations")}
                    className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono transition-colors ${
                      activePanel === "automations" ? "bg-[#ffb800]/15 text-[#ffb800]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    Automations
                  </button>
                  <button
                    onClick={() => setActivePanel(activePanel === "alerts" ? null : "alerts")}
                    className={`flex items-center gap-1 px-2 py-1 text-[10px] font-mono transition-colors ${
                      activePanel === "alerts" ? "bg-[#ff3b3b]/15 text-[#ff3b3b]" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                    }`}
                  >
                    <BellRing className="w-3 h-3" />
                    Alerts
                    {stats.critAlerts > 0 && (
                      <span className="w-4 h-4 flex items-center justify-center bg-[#ff3b3b] text-white text-[8px] font-bold">{stats.critAlerts}</span>
                    )}
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-28 bg-[var(--background)] border border-[var(--border)] animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="p-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {agents.map((agent) => (
                    <AgentTile
                      key={agent.slug}
                      agent={agent}
                      onRun={() => runAgent(agent.slug)}
                      onToggle={() => toggleAgent(agent.slug, agent.status)}
                      expanded={expandedAgent === agent.slug}
                      onExpand={() => setExpandedAgent(expandedAgent === agent.slug ? null : agent.slug)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Automation / Alert panels */}
            <AutomationPanel visible={activePanel === "automations"} />
            <AlertCenter runs={runs} visible={activePanel === "alerts"} />

            {/* Activity Feed */}
            <div className="bg-[var(--card)] border border-[var(--border)]">
              <div className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#00d4ff]" />
                <span className="text-sm font-medium text-[var(--foreground)]">Live Activity Feed</span>
                <PulseDot color="#00d4ff" size={5} />
                <span className="text-[10px] font-mono text-[var(--muted-foreground)] ml-auto">Auto-refresh 15s</span>
              </div>
              <div className="p-2">
                <ActivityFeed runs={runs} loading={loading} />
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — ClawBot Chat (1/3 width) */}
          <div className="lg:col-span-1">
            <div className={`bg-[var(--card)] border border-[var(--border)] sticky top-20 ${chatMinimized ? "" : "h-[calc(100vh-8rem)]"} flex flex-col`}>
              {chatMinimized ? (
                <button
                  onClick={() => setChatMinimized(false)}
                  className="p-4 flex items-center gap-2 hover:bg-white/[0.02] transition-colors w-full"
                >
                  <Bot className="w-5 h-5 text-[#8b5cf6]" />
                  <span className="text-sm font-medium text-[var(--foreground)]">ClawBot</span>
                  <PulseDot color={gatewayOnline ? "#00e5a0" : "#ff3b3b"} size={5} />
                  <Maximize2 className="w-3.5 h-3.5 text-[var(--muted-foreground)] ml-auto" />
                </button>
              ) : (
                <>
                  <div className="absolute top-2 right-2 z-10">
                    <button
                      onClick={() => setChatMinimized(true)}
                      className="w-6 h-6 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                    >
                      <Minimize2 className="w-3 h-3" />
                    </button>
                  </div>
                  <ClawBotChat gatewayOnline={gatewayOnline} agents={agents} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
