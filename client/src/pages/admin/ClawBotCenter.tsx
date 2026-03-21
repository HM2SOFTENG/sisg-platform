import { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Bot, Cpu, HardDrive, MemoryStick, Wifi, WifiOff, Activity,
  Play, Pause, Send, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, Terminal, Zap, CircleDot, ChevronDown, Filter, Loader2
} from "lucide-react";

interface BotStatus {
  online: boolean;
  lastHeartbeat: string;
  uptime: number;
  system: { cpu: number; memory: number; disk: number; hostname: string; platform: string };
  version: string;
  connection: { directUrl: string; directAvailable: boolean; lastDirectSuccess: string; slackFallback: boolean; slackChannel: string };
}

interface BotAgent {
  id: string;
  name: string;
  type: string;
  status: "active" | "idle" | "error" | "disabled";
  lastRun: string;
  nextRun: string;
  schedule: string;
  lastResult: string;
  errorCount: number;
}

interface BotTask {
  id: string;
  command: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  priority: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: string;
  error?: string;
  source: string;
  agent?: string;
}

interface BotLog {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  agent: string;
  message: string;
}

interface Metrics {
  totalTasks: number;
  tasksLast24h: number;
  completedLast24h: number;
  failedLast24h: number;
  queuedNow: number;
  runningNow: number;
  errorsLast24h: number;
  activeAgents: number;
  totalAgents: number;
}

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

function formatUptime(seconds: number) {
  if (!seconds) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

const statusColors: Record<string, string> = {
  active: "#00e5a0",
  idle: "#ffb800",
  error: "#ff4444",
  disabled: "#6b7280",
  queued: "#00d4ff",
  running: "#0066ff",
  completed: "#00e5a0",
  failed: "#ff4444",
  cancelled: "#6b7280",
};

const levelColors: Record<string, string> = {
  info: "#00d4ff",
  warn: "#ffb800",
  error: "#ff4444",
  debug: "#6b7280",
};

export default function ClawBotCenter() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [agents, setAgents] = useState<BotAgent[]>([]);
  const [tasks, setTasks] = useState<BotTask[]>([]);
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [commandInput, setCommandInput] = useState("");
  const [sending, setSending] = useState(false);
  const [logFilter, setLogFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"agents" | "tasks" | "logs">("agents");
  const logEndRef = useRef<HTMLDivElement>(null);

  const fetchAll = useCallback(async () => {
    try {
      const [s, a, t, l, m] = await Promise.all([
        apiFetch("/api/admin/clawbot/status"),
        apiFetch("/api/admin/clawbot/agents"),
        apiFetch("/api/admin/clawbot/tasks"),
        apiFetch("/api/admin/clawbot/logs?limit=50"),
        apiFetch("/api/admin/clawbot/metrics"),
      ]);
      setStatus(s);
      setAgents(Array.isArray(a) ? a : []);
      setTasks(Array.isArray(t) ? t : []);
      setLogs(Array.isArray(l) ? l : []);
      setMetrics(m);
    } catch (e) {
      console.error("Failed to fetch ClawBot data:", e);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, [fetchAll]);

  const sendCommand = async () => {
    if (!commandInput.trim()) return;
    setSending(true);
    try {
      await apiFetch("/api/admin/clawbot/commands", {
        method: "POST",
        body: JSON.stringify({ command: commandInput, priority: "normal" }),
      });
      setCommandInput("");
      setTimeout(fetchAll, 1000);
    } catch (e) {
      console.error("Failed to send command:", e);
    }
    setSending(false);
  };

  const createTask = async (command: string, priority = "normal") => {
    await apiFetch("/api/admin/clawbot/tasks", {
      method: "POST",
      body: JSON.stringify({ command, priority }),
    });
    setTimeout(fetchAll, 1000);
  };

  const filteredLogs = logFilter === "all" ? logs : logs.filter((l) => l.level === logFilter);

  return (
    <DashboardLayout title="ClawBot Command Center">
      <div className="space-y-4">
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#8b5cf6]" />
            </div>
            <div>
              <h1 className="text-white text-lg font-bold" style={{ fontFamily: "Sora, sans-serif" }}>
                ClawBot Command Center
              </h1>
              <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500">
                <span className="flex items-center gap-1">
                  {status?.online ? (
                    <><Wifi className="w-3 h-3 text-[#00e5a0]" /> ONLINE</>
                  ) : (
                    <><WifiOff className="w-3 h-3 text-[#ff4444]" /> OFFLINE</>
                  )}
                </span>
                <span className="text-gray-700">|</span>
                <span>Heartbeat: {status ? timeAgo(status.lastHeartbeat) : "—"}</span>
                <span className="text-gray-700">|</span>
                <span>Uptime: {status ? formatUptime(status.uptime) : "—"}</span>
              </div>
            </div>
          </div>
          <button
            onClick={fetchAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono text-gray-400 border border-white/10 hover:bg-white/5 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>

        {/* ---- Status Cards ---- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatusCard icon={Bot} label="Agents" value={`${metrics?.activeAgents || 0}/${metrics?.totalAgents || 0}`} sub="active" color="#8b5cf6" />
          <StatusCard icon={Zap} label="Tasks (24h)" value={String(metrics?.tasksLast24h || 0)} sub={`${metrics?.completedLast24h || 0} done, ${metrics?.failedLast24h || 0} failed`} color="#0066ff" />
          <StatusCard icon={Activity} label="Queue" value={String(metrics?.queuedNow || 0)} sub={`${metrics?.runningNow || 0} running`} color="#00e5a0" />
          <StatusCard icon={AlertTriangle} label="Errors (24h)" value={String(metrics?.errorsLast24h || 0)} sub="check logs" color={metrics?.errorsLast24h ? "#ff4444" : "#00e5a0"} />
        </div>

        {/* ---- Connection Banner ---- */}
        <div className="flex items-center gap-3 px-4 py-2.5 border border-white/8 bg-[oklch(0.085_0.025_255)]">
          <div className="flex items-center gap-4 text-[11px] font-mono flex-1">
            <span className="text-gray-500">CONNECTION:</span>
            <span className="flex items-center gap-1">
              <CircleDot className="w-3 h-3" style={{ color: status?.connection?.directAvailable ? "#00e5a0" : "#ff4444" }} />
              <span className="text-gray-400">Direct API</span>
              <span className="text-gray-600">({status?.connection?.directUrl || "—"})</span>
            </span>
            <span className="flex items-center gap-1">
              <CircleDot className="w-3 h-3 text-[#00e5a0]" />
              <span className="text-gray-400">Slack Fallback</span>
              <span className="text-gray-600">(#{status?.connection?.slackChannel || "—"})</span>
            </span>
          </div>
          {status?.system?.hostname && (
            <span className="text-[10px] font-mono text-gray-600">{status.system.hostname} / {status.system.platform}</span>
          )}
        </div>

        {/* ---- System Metrics Bar ---- */}
        {status?.system && status.online && (
          <div className="grid grid-cols-3 gap-3">
            <MetricBar icon={Cpu} label="CPU" value={status.system.cpu} color="#0066ff" />
            <MetricBar icon={MemoryStick} label="Memory" value={status.system.memory} color="#8b5cf6" />
            <MetricBar icon={HardDrive} label="Disk" value={status.system.disk} color="#00e5a0" />
          </div>
        )}

        {/* ---- Tab Navigation ---- */}
        <div className="flex border-b border-white/8">
          {(["agents", "tasks", "logs"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 ${
                activeTab === tab
                  ? "text-white border-[#0066ff]"
                  : "text-gray-500 border-transparent hover:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ---- Agents Panel ---- */}
        {activeTab === "agents" && (
          <div className="space-y-2">
            {agents.length === 0 ? (
              <div className="text-center py-12 text-gray-600 text-sm font-mono">
                No agents registered. ClawBot will report agents after first heartbeat.
              </div>
            ) : (
              agents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-4 px-4 py-3 border border-white/8 bg-[oklch(0.085_0.025_255)] hover:bg-white/4 transition-colors">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColors[agent.status] || "#6b7280" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{agent.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 border border-white/10 text-gray-500 uppercase">{agent.type}</span>
                    </div>
                    <div className="text-[11px] font-mono text-gray-600 mt-0.5">
                      Last run: {timeAgo(agent.lastRun)} · Schedule: {agent.schedule} · Errors: {agent.errorCount}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => createTask(`agent:run:${agent.id}`, "high")}
                      className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-[#00e5a0] border border-white/10 hover:border-[#00e5a0]/30 transition-colors"
                      title="Run now"
                    >
                      <Play className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => {
                        // Toggle disabled/idle
                        const newStatus = agent.status === "disabled" ? "idle" : "disabled";
                        apiFetch(`/api/admin/clawbot/agents/${agent.id}`, {
                          method: "PUT",
                          body: JSON.stringify({ status: newStatus }),
                        }).then(fetchAll);
                      }}
                      className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-[#ffb800] border border-white/10 hover:border-[#ffb800]/30 transition-colors"
                      title={agent.status === "disabled" ? "Enable" : "Disable"}
                    >
                      <Pause className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ---- Tasks Panel ---- */}
        {activeTab === "tasks" && (
          <div className="space-y-2">
            <div className="flex gap-2 mb-3">
              {["queued", "running", "completed", "failed"].map((s) => {
                const count = tasks.filter((t) => t.status === s).length;
                return (
                  <span
                    key={s}
                    className="text-[10px] font-mono px-2 py-1 border border-white/10"
                    style={{ color: statusColors[s], borderColor: `${statusColors[s]}33` }}
                  >
                    {s}: {count}
                  </span>
                );
              })}
            </div>
            {tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-600 text-sm font-mono">
                No tasks yet. Send a command below to create one.
              </div>
            ) : (
              tasks.slice(0, 20).map((task) => (
                <div key={task.id} className="flex items-center gap-3 px-4 py-2.5 border border-white/8 bg-[oklch(0.085_0.025_255)]">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColors[task.status] }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-mono truncate">{task.command}</div>
                    <div className="text-[10px] text-gray-600 font-mono mt-0.5">
                      {task.source} · {task.priority} · {timeAgo(task.createdAt)}
                      {task.error && <span className="text-[#ff4444] ml-2">Error: {task.error}</span>}
                    </div>
                  </div>
                  <span
                    className="text-[10px] font-mono px-1.5 py-0.5 border uppercase"
                    style={{ color: statusColors[task.status], borderColor: `${statusColors[task.status]}33` }}
                  >
                    {task.status}
                  </span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ---- Logs Panel ---- */}
        {activeTab === "logs" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Filter className="w-3 h-3 text-gray-600" />
              {["all", "info", "warn", "error", "debug"].map((level) => (
                <button
                  key={level}
                  onClick={() => setLogFilter(level)}
                  className={`text-[10px] font-mono px-2 py-1 border transition-colors ${
                    logFilter === level ? "text-white border-[#0066ff]/50 bg-[#0066ff]/10" : "text-gray-500 border-white/10 hover:border-white/20"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
            <div className="max-h-[400px] overflow-y-auto border border-white/8 bg-[oklch(0.06_0.025_255)]">
              {filteredLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-600 text-xs font-mono">No logs to display</div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 px-3 py-1.5 border-b border-white/5 hover:bg-white/3 text-[11px] font-mono">
                    <span className="text-gray-600 flex-shrink-0 w-14">
                      {new Date(log.timestamp).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                    <span
                      className="flex-shrink-0 w-10 uppercase"
                      style={{ color: levelColors[log.level] }}
                    >
                      {log.level}
                    </span>
                    <span className="text-[#8b5cf6] flex-shrink-0 w-16 truncate">[{log.agent}]</span>
                    <span className="text-gray-300 flex-1">{log.message}</span>
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          </div>
        )}

        {/* ---- Command Input ---- */}
        <div className="border border-white/8 bg-[oklch(0.085_0.025_255)]">
          <div className="flex items-center gap-2 px-3 py-1 border-b border-white/5">
            <Terminal className="w-3 h-3 text-[#8b5cf6]" />
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Command Terminal</span>
          </div>
          <div className="flex items-center gap-2 p-3">
            <span className="text-[#00e5a0] text-xs font-mono flex-shrink-0">$</span>
            <input
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendCommand()}
              placeholder="Send a command to ClawBot... (e.g., health-check, deploy, run-qa)"
              className="flex-1 bg-transparent text-white text-xs font-mono outline-none placeholder:text-gray-700"
            />
            <button
              onClick={sendCommand}
              disabled={sending || !commandInput.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono bg-[#0066ff] text-white hover:bg-[#0055dd] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              Send
            </button>
          </div>
          {/* Quick commands */}
          <div className="flex items-center gap-1.5 px-3 pb-3">
            <span className="text-[10px] font-mono text-gray-600">Quick:</span>
            {["health-check", "run-qa", "deploy-status", "system-info", "run-all-agents"].map((cmd) => (
              <button
                key={cmd}
                onClick={() => { setCommandInput(cmd); }}
                className="text-[10px] font-mono px-2 py-0.5 text-gray-500 border border-white/8 hover:border-[#0066ff]/30 hover:text-[#0066ff] transition-colors"
              >
                {cmd}
              </button>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ---- Sub-components ----

function StatusCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="border border-white/8 bg-[oklch(0.085_0.025_255)] p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-white text-xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>{value}</div>
      <div className="text-[10px] font-mono text-gray-600 mt-1">{sub}</div>
    </div>
  );
}

function MetricBar({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="border border-white/8 bg-[oklch(0.085_0.025_255)] px-4 py-3">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3" style={{ color }} />
          <span className="text-[10px] font-mono text-gray-500 uppercase">{label}</span>
        </div>
        <span className="text-xs font-mono text-white">{Math.round(value)}%</span>
      </div>
      <div className="h-1.5 bg-white/5 overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{ width: `${Math.min(value, 100)}%`, backgroundColor: value > 90 ? "#ff4444" : color }}
        />
      </div>
    </div>
  );
}
