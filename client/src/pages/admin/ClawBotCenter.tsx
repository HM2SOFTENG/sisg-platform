import React, { useState, useEffect, useCallback, useRef } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Bot, Cpu, HardDrive, MemoryStick, Wifi, WifiOff, Activity,
  Play, Pause, Send, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, Terminal, Zap, CircleDot, ChevronDown, Filter, Loader2, X, Info
} from "lucide-react";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

interface ActivityEvent {
  id: string;
  timestamp: string;
  type: "task" | "command" | "log" | "status" | "agent" | "heartbeat";
  subType?: string;
  severity: "success" | "error" | "info" | "warning";
  title: string;
  description: string;
  agent?: string;
  data?: any;
}

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
  timestamp: number;
}

interface CommandHistory {
  command: string;
  timestamp: number;
}

// ============================================================================
// UTILITY FUNCTIONS
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

function formatUptime(seconds: number) {
  if (!seconds) return "—";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function getGaugeColor(value: number): string {
  if (value < 60) return "#00e5a0"; // green
  if (value < 85) return "#ffb800"; // amber
  return "#ff4444"; // red
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

const severityColors: Record<string, string> = {
  success: "#00e5a0",
  error: "#ff4444",
  info: "#00d4ff",
  warning: "#ffb800",
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function ClawBotCenter() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [agents, setAgents] = useState<BotAgent[]>([]);
  const [tasks, setTasks] = useState<BotTask[]>([]);
  const [logs, setLogs] = useState<BotLog[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [commandInput, setCommandInput] = useState("");
  const [sending, setSending] = useState(false);
  const [logFilter, setLogFilter] = useState<string>("all");

  // Activity feed state
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([]);
  const activityFeedRef = useRef<HTMLDivElement>(null);

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Command history
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteMatches, setAutocompleteMatches] = useState<string[]>([]);

  // Heartbeat visualization
  const heartbeatRef = useRef<SVGPathElement>(null);

  // Previous state for change detection
  const prevStateRef = useRef<{ status: BotStatus | null; tasks: BotTask[]; logs: BotLog[] }>({
    status: null,
    tasks: [],
    logs: [],
  });

  // ---- Fetch all data ----
  const fetchAll = useCallback(async () => {
    try {
      const [s, a, t, l, m] = await Promise.all([
        apiFetch("/api/admin/clawbot/status"),
        apiFetch("/api/admin/clawbot/agents"),
        apiFetch("/api/admin/clawbot/tasks"),
        apiFetch("/api/admin/clawbot/logs?limit=50"),
        apiFetch("/api/admin/clawbot/metrics"),
      ]);

      const prevState = prevStateRef.current;

      // ---- Change detection & activity feed generation ----

      // Detect online/offline transition
      if (prevState.status && prevState.status.online !== s.online) {
        if (s.online) {
          addToast("Heartbeat restored", "success");
          addActivityEvent({
            type: "heartbeat",
            severity: "success",
            title: "Connection Restored",
            description: "ClawBot heartbeat detected",
          });
        } else {
          addToast("Heartbeat lost", "error");
          addActivityEvent({
            type: "heartbeat",
            severity: "error",
            title: "Connection Lost",
            description: "ClawBot heartbeat missing",
          });
        }
      }

      // Detect new tasks
      if (prevState.tasks) {
        const newTasks = Array.isArray(t) ? t.filter((task: BotTask) =>
          !prevState.tasks.find((pt: BotTask) => pt.id === task.id)
        ) : [];

        newTasks.forEach((task: BotTask) => {
          addActivityEvent({
            type: "task",
            subType: "created",
            severity: "info",
            title: "Task Created",
            description: task.command,
            agent: task.agent,
            data: task,
          });
        });

        // Detect status changes in existing tasks
        if (prevState.tasks.length > 0) {
          Array.isArray(t) && t.forEach((task: BotTask) => {
            const prevTask = prevState.tasks.find((pt: BotTask) => pt.id === task.id);
            if (prevTask && prevTask.status !== task.status) {
              let severity: "success" | "error" | "info" | "warning" = "info";
              if (task.status === "completed") severity = "success";
              else if (task.status === "failed") severity = "error";

              addActivityEvent({
                type: "task",
                subType: "status_change",
                severity,
                title: `Task ${task.status}`,
                description: task.command,
                agent: task.agent,
                data: task,
              });

              if (task.status === "completed") {
                addToast("Task completed", "success");
              } else if (task.status === "failed") {
                addToast(`Task failed: ${task.error || "unknown error"}`, "error");
              }
            }
          });
        }
      }

      // Detect new logs
      if (prevState.logs) {
        const newLogs = Array.isArray(l) ? l.filter((log: BotLog) =>
          !prevState.logs.find((pl: BotLog) => pl.id === log.id)
        ) : [];

        newLogs.slice(0, 5).forEach((log: BotLog) => {
          addActivityEvent({
            type: "log",
            severity: (log.level === "error" ? "error" : log.level === "warn" ? "warning" : "info") as any,
            title: `Log [${log.level}]`,
            description: log.message,
            agent: log.agent,
          });
        });
      }

      setStatus(s);
      setAgents(Array.isArray(a) ? a : []);
      setTasks(Array.isArray(t) ? t : []);
      setLogs(Array.isArray(l) ? l : []);
      setMetrics(m);

      prevStateRef.current = { status: s, tasks: Array.isArray(t) ? t : [], logs: Array.isArray(l) ? l : [] };
    } catch (e) {
      console.error("Failed to fetch ClawBot data:", e);
      addToast("Failed to fetch data", "error");
    }
  }, []);

  // ---- Poll every 5 seconds ----
  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 5000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // ---- Auto-dismiss toasts ----
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(toasts => toasts.slice(1));
    }, 4000);
    return () => clearTimeout(timer);
  }, [toasts]);

  // ---- Auto-scroll activity feed ----
  useEffect(() => {
    if (activityFeedRef.current) {
      activityFeedRef.current.scrollTop = 0;
    }
  }, [activityEvents]);

  // ---- Toast handler ----
  const addToast = (message: string, type: Toast["type"]) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts(prev => [{ id, message, type, timestamp: Date.now() }, ...prev].slice(0, 5));
  };

  // ---- Activity feed handler ----
  const addActivityEvent = (event: Omit<ActivityEvent, "id" | "timestamp">) => {
    const newEvent: ActivityEvent = {
      ...event,
      id: `event-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
    };
    setActivityEvents(prev => [newEvent, ...prev].slice(0, 100));
  };

  // ---- Command handlers ----
  const sendCommand = async () => {
    if (!commandInput.trim()) return;
    setSending(true);
    try {
      await apiFetch("/api/admin/clawbot/commands", {
        method: "POST",
        body: JSON.stringify({ command: commandInput, priority: "normal" }),
      });

      // Add to history
      setCommandHistory(prev => [{ command: commandInput, timestamp: Date.now() }, ...prev].slice(0, 50));
      setHistoryIndex(-1);

      addToast("Command sent", "success");
      addActivityEvent({
        type: "command",
        severity: "info",
        title: "Command Sent",
        description: commandInput,
      });

      setCommandInput("");
      setAutocompleteOpen(false);
      setTimeout(fetchAll, 1000);
    } catch (e) {
      console.error("Failed to send command:", e);
      addToast("Failed to send command", "error");
    }
    setSending(false);
  };

  const createTask = async (command: string, priority = "normal") => {
    await apiFetch("/api/admin/clawbot/tasks", {
      method: "POST",
      body: JSON.stringify({ command, priority }),
    });
    addToast("Task created", "success");
    setTimeout(fetchAll, 1000);
  };

  const quickCommand = (cmd: string) => {
    setCommandInput(cmd);
    setTimeout(() => {
      setCommandInput(cmd);
      // Immediately send
      setSending(true);
      apiFetch("/api/admin/clawbot/commands", {
        method: "POST",
        body: JSON.stringify({ command: cmd, priority: "normal" }),
      }).then(() => {
        setCommandHistory(prev => [{ command: cmd, timestamp: Date.now() }, ...prev].slice(0, 50));
        addToast("Command sent", "success");
        addActivityEvent({
          type: "command",
          severity: "info",
          title: "Quick Command",
          description: cmd,
        });
        setCommandInput("");
        setTimeout(fetchAll, 1000);
      }).catch(() => {
        addToast("Failed to send command", "error");
      }).finally(() => setSending(false));
    }, 0);
  };

  const handleCommandInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendCommand();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIndex = historyIndex + 1;
      if (nextIndex < commandHistory.length) {
        setHistoryIndex(nextIndex);
        setCommandInput(commandHistory[nextIndex].command);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setCommandInput(commandHistory[nextIndex].command);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommandInput("");
      }
    } else if (e.key === "Escape") {
      setAutocompleteOpen(false);
    }
  };

  const handleCommandInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    setCommandInput(input);
    setHistoryIndex(-1);

    if (input.length > 0) {
      const known = ["health-check", "run-qa", "deploy-status", "system-info", "run-all-agents", "list-agents", "cancel-all", "restart", "status"];
      const matches = known.filter(cmd => cmd.includes(input.toLowerCase())).slice(0, 5);
      setAutocompleteMatches(matches);
      setAutocompleteOpen(matches.length > 0);
    } else {
      setAutocompleteOpen(false);
    }
  };

  const filteredLogs = logFilter === "all" ? logs : logs.filter((l) => l.level === logFilter);
  const filteredActivityEvents = logFilter === "all" ? activityEvents : activityEvents.filter((e) => {
    if (logFilter === "info") return e.severity === "info";
    if (logFilter === "warn") return e.severity === "warning";
    if (logFilter === "error") return e.severity === "error";
    if (logFilter === "debug") return false;
    return true;
  });

  return (
    <DashboardLayout title="ClawBot Command Center">
      <style>{`
        @keyframes slideInFromTop {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideOutToRight {
          from {
            opacity: 1;
            transform: translateX(0);
          }
          to {
            opacity: 0;
            transform: translateX(400px);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        @keyframes progressStriped {
          0% {
            background-position: 0 0;
          }
          100% {
            background-position: 20px 0;
          }
        }

        @keyframes heartbeatDraw {
          0% { stroke-dasharray: 0 1000; stroke-dashoffset: 0; }
          100% { stroke-dasharray: 1000 0; stroke-dashoffset: 0; }
        }

        @keyframes gaugeStroke {
          0% {
            stroke-dasharray: 0 628;
          }
          100% {
            stroke-dasharray: 628 628;
          }
        }

        .activity-event-enter {
          animation: slideInFromTop 0.3s ease-out;
        }

        .activity-event-exit {
          animation: slideOutToRight 0.4s ease-in forwards;
        }

        .toast-enter {
          animation: slideInFromTop 0.3s ease-out;
        }

        .toast-exit {
          animation: slideOutToRight 0.4s ease-in forwards;
        }

        .status-pulse {
          animation: pulse 2s ease-in-out infinite;
        }

        .task-shake {
          animation: shake 0.5s ease-in-out;
        }

        .progress-striped {
          background-image: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.15) 25%,
            transparent 25%,
            transparent 50%,
            rgba(255, 255, 255, 0.15) 50%,
            rgba(255, 255, 255, 0.15) 75%,
            transparent 75%,
            transparent
          );
          background-size: 20px 20px;
          animation: progressStriped 1s linear infinite;
        }

        .gauge-critical {
          animation: pulse 1s ease-in-out infinite;
        }

        .heartbeat-line {
          stroke-linecap: round;
          stroke-linejoin: round;
        }
      `}
      </style>

      <div className="space-y-4">
        {/* ---- HEADER ---- */}
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
                {/* Heartbeat pulse indicator */}
                <HeartbeatIndicator online={status?.online || false} ref={heartbeatRef} />
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

        {/* ---- STATUS CARDS ---- */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatusCard icon={Bot} label="Agents" value={`${metrics?.activeAgents || 0}/${metrics?.totalAgents || 0}`} sub="active" color="#8b5cf6" />
          <StatusCard icon={Zap} label="Tasks (24h)" value={String(metrics?.tasksLast24h || 0)} sub={`${metrics?.completedLast24h || 0} done, ${metrics?.failedLast24h || 0} failed`} color="#0066ff" />
          <StatusCard icon={Activity} label="Queue" value={String(metrics?.queuedNow || 0)} sub={`${metrics?.runningNow || 0} running`} color="#00e5a0" />
          <StatusCard icon={AlertTriangle} label="Errors (24h)" value={String(metrics?.errorsLast24h || 0)} sub="check logs" color={metrics?.errorsLast24h ? "#ff4444" : "#00e5a0"} />
        </div>

        {/* ---- CONNECTION BANNER ---- */}
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

        {/* ---- ANIMATED SYSTEM GAUGES ---- */}
        {status?.system && status.online && (
          <div className="grid grid-cols-3 gap-3">
            <GaugeCard icon={Cpu} label="CPU" value={status.system.cpu} />
            <GaugeCard icon={MemoryStick} label="Memory" value={status.system.memory} />
            <GaugeCard icon={HardDrive} label="Disk" value={status.system.disk} />
          </div>
        )}

        {/* ---- COMMAND PIPELINE VISUALIZER ---- */}
        {tasks.length > 0 && (
          <CommandPipelineVisualizer tasks={tasks} />
        )}

        {/* ---- REAL-TIME ACTIVITY FEED (CENTER OF PAGE) ---- */}
        <div className="border border-white/8 bg-[oklch(0.085_0.025_255)]">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#00d4ff]" />
              <span className="text-sm font-mono text-white uppercase tracking-wider">Live Activity Feed</span>
              <span className="text-[10px] font-mono text-gray-600">({filteredActivityEvents.length} events)</span>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-3 h-3 text-gray-600" />
              {["all", "info", "warn", "error"].map((level) => (
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
          </div>

          <div
            ref={activityFeedRef}
            className="max-h-[500px] overflow-y-auto space-y-1"
          >
            {filteredActivityEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-600 text-sm font-mono">
                No activity yet. Send a command to get started.
              </div>
            ) : (
              filteredActivityEvents.map((event) => (
                <ActivityEventRow key={event.id} event={event} />
              ))
            )}
          </div>
        </div>

        {/* ---- IMPROVED COMMAND TERMINAL ---- */}
        <div className="border border-white/8 bg-[oklch(0.085_0.025_255)]">
          <div className="flex items-center gap-2 px-3 py-1 border-b border-white/5">
            <Terminal className="w-3 h-3 text-[#8b5cf6]" />
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Command Terminal</span>
          </div>

          {/* Command input */}
          <div className="p-3 border-b border-white/5 relative">
            <div className="flex items-center gap-2">
              <span className="text-[#00e5a0] text-xs font-mono flex-shrink-0">$</span>
              <input
                value={commandInput}
                onChange={handleCommandInputChange}
                onKeyDown={handleCommandInputKeyDown}
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

            {/* Autocomplete dropdown */}
            {autocompleteOpen && autocompleteMatches.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[oklch(0.08_0.025_255)] border border-white/10 rounded-none z-50">
                {autocompleteMatches.map((match) => (
                  <button
                    key={match}
                    onClick={() => {
                      setCommandInput(match);
                      setAutocompleteOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-[11px] font-mono text-gray-300 hover:bg-white/5 border-b border-white/5 last:border-0"
                  >
                    $ {match}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick commands */}
          <div className="flex items-center gap-1.5 px-3 py-3 border-b border-white/5 flex-wrap">
            <span className="text-[10px] font-mono text-gray-600">Quick:</span>
            {["health-check", "run-qa", "deploy-status", "system-info", "run-all-agents"].map((cmd) => (
              <button
                key={cmd}
                onClick={() => quickCommand(cmd)}
                className="text-[10px] font-mono px-2 py-0.5 text-gray-500 border border-white/8 hover:border-[#0066ff]/30 hover:text-[#0066ff] transition-colors"
              >
                {cmd}
              </button>
            ))}
          </div>

          {/* Last command result */}
          {commandHistory.length > 0 && (
            <div className="px-3 py-2 text-[10px] font-mono text-gray-600 border-t border-white/5 bg-white/2">
              Last: {commandHistory[0].command} • {new Date(commandHistory[0].timestamp).toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* ---- AGENTS PANEL (COLLAPSIBLE) ---- */}
        <details className="group border border-white/8 bg-[oklch(0.085_0.025_255)]">
          <summary className="flex items-center gap-2 px-4 py-3 cursor-pointer border-b border-white/8 hover:bg-white/3 transition-colors">
            <ChevronDown className="w-4 h-4 text-gray-500 group-open:rotate-180 transition-transform" />
            <span className="text-sm font-mono text-gray-400 uppercase">Agents ({agents.length})</span>
          </summary>
          <div className="space-y-2 p-3">
            {agents.length === 0 ? (
              <div className="text-center py-8 text-gray-600 text-sm font-mono">
                No agents registered.
              </div>
            ) : (
              agents.map((agent) => (
                <div key={agent.id} className="flex items-center gap-4 px-3 py-2 border border-white/5 bg-white/2 hover:bg-white/4 transition-colors">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: statusColors[agent.status] || "#6b7280" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{agent.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 border border-white/10 text-gray-500 uppercase">{agent.type}</span>
                    </div>
                    <div className="text-[11px] font-mono text-gray-600 mt-0.5">
                      Last: {timeAgo(agent.lastRun)} · Errors: {agent.errorCount}
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
                  </div>
                </div>
              ))
            )}
          </div>
        </details>
      </div>

      {/* ---- TOAST NOTIFICATIONS (Bottom-right) ---- */}
      <div className="fixed bottom-4 right-4 space-y-2 z-50 max-w-sm">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} />
        ))}
      </div>
    </DashboardLayout>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

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

interface GaugeCardProps {
  icon: any;
  label: string;
  value: number;
}

function GaugeCard({ icon: Icon, label, value }: GaugeCardProps) {
  const color = getGaugeColor(value);
  const isCritical = value > 90;

  // SVG circle animation: stroke-dasharray represents the circumference of a circle with radius 45
  // Circumference = 2 * pi * 45 ≈ 283
  const circumference = 283;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="border border-white/8 bg-[oklch(0.085_0.025_255)] p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <Icon className="w-3 h-3" style={{ color }} />
          <span className="text-[10px] font-mono text-gray-500 uppercase">{label}</span>
        </div>
      </div>

      {/* SVG Gauge */}
      <div className="flex items-center justify-center">
        <svg width="100" height="100" viewBox="0 0 100 100" className={isCritical ? "gauge-critical" : ""}>
          {/* Background circle */}
          <circle cx="50" cy="50" r="45" fill="none" stroke="#ffffff10" strokeWidth="3" />

          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: "stroke-dashoffset 0.6s ease, stroke 0.3s ease",
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
            }}
          />

          {/* Center text */}
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dy="0.3em"
            className="text-xs font-mono font-bold fill-white"
            style={{ fontSize: "20px", pointerEvents: "none" }}
          >
            {Math.round(value)}%
          </text>
        </svg>
      </div>
    </div>
  );
}

interface HeartbeatIndicatorProps {
  online: boolean;
}

const HeartbeatIndicator = React.forwardRef<SVGPathElement, HeartbeatIndicatorProps>(
  ({ online }, ref) => {
    return (
      <div className="flex items-center gap-1">
        <svg width="40" height="20" viewBox="0 0 40 20" className="flex-shrink-0">
          {/* Background */}
          <rect x="0" y="0" width="40" height="20" fill="none" />

          {/* ECG-like path */}
          <polyline
            ref={ref}
            points="0,10 5,10 8,4 12,16 15,10 40,10"
            fill="none"
            stroke={online ? "#00e5a0" : "#ff4444"}
            strokeWidth="1.5"
            className="heartbeat-line"
            style={{
              transition: online ? "stroke 0.3s ease" : "stroke 0.3s ease",
            }}
          />
        </svg>
        <span className="text-[11px] font-mono" style={{ color: online ? "#00e5a0" : "#ff4444" }}>
          {online ? "ONLINE" : "OFFLINE"}
        </span>
      </div>
    );
  }
);

HeartbeatIndicator.displayName = "HeartbeatIndicator";

interface ActivityEventRowProps {
  event: ActivityEvent;
}

function ActivityEventRow({ event }: ActivityEventRowProps) {
  const getSeverityIcon = () => {
    switch (event.severity) {
      case "success":
        return <CheckCircle2 className="w-3.5 h-3.5 text-[#00e5a0]" />;
      case "error":
        return <AlertTriangle className="w-3.5 h-3.5 text-[#ff4444]" />;
      case "warning":
        return <AlertTriangle className="w-3.5 h-3.5 text-[#ffb800]" />;
      default:
        return <Info className="w-3.5 h-3.5 text-[#00d4ff]" />;
    }
  };

  const isTaskEvent = event.type === "task" && event.data;
  const taskStatus = event.data?.status;
  const showProgressBar = taskStatus === "running";
  const isCompleted = taskStatus === "completed";
  const isFailed = taskStatus === "failed";

  return (
    <div
      className="activity-event-enter px-3 py-2 border-b border-white/5 hover:bg-white/3 transition-colors"
      style={{ animation: "slideInFromTop 0.3s ease-out" }}
    >
      <div className="flex items-start gap-2">
        <div className={isFailed ? "task-shake" : ""}>
          {getSeverityIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-white truncate">{event.title}</span>
            <span className="text-[9px] font-mono text-gray-600 flex-shrink-0">
              {new Date(event.timestamp).toLocaleTimeString([], { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          </div>
          <div className="text-[10px] font-mono text-gray-400 mt-0.5 truncate">{event.description}</div>
          {event.agent && (
            <div className="text-[9px] font-mono text-[#8b5cf6] mt-0.5">
              Agent: {event.agent}
            </div>
          )}

          {/* Progress bar for running tasks */}
          {showProgressBar && (
            <div className="mt-1.5 h-1 bg-white/5 overflow-hidden">
              <div className="h-full bg-[#0066ff] progress-striped" style={{ width: "100%" }} />
            </div>
          )}

          {/* Completion indicator */}
          {isCompleted && (
            <div className="text-[9px] font-mono text-[#00e5a0] mt-0.5">✓ Completed</div>
          )}
          {isFailed && (
            <div className="text-[9px] font-mono text-[#ff4444] mt-0.5">✗ Failed</div>
          )}
        </div>
      </div>
    </div>
  );
}

interface ToastProps {
  toast: Toast;
  onDismiss: () => void;
}

function Toast({ toast, onDismiss }: ToastProps) {
  const bgColor = {
    success: "bg-[#00e5a0]/20 border-[#00e5a0]/50",
    error: "bg-[#ff4444]/20 border-[#ff4444]/50",
    info: "bg-[#00d4ff]/20 border-[#00d4ff]/50",
    warning: "bg-[#ffb800]/20 border-[#ffb800]/50",
  }[toast.type];

  const textColor = {
    success: "text-[#00e5a0]",
    error: "text-[#ff4444]",
    info: "text-[#00d4ff]",
    warning: "text-[#ffb800]",
  }[toast.type];

  const Icon = {
    success: CheckCircle2,
    error: AlertTriangle,
    info: Info,
    warning: AlertTriangle,
  }[toast.type];

  return (
    <div
      className={`toast-enter flex items-center gap-2.5 px-3 py-2.5 border ${bgColor} backdrop-blur-sm`}
      style={{ animation: "slideInFromTop 0.3s ease-out" }}
    >
      <Icon className={`w-4 h-4 flex-shrink-0 ${textColor}`} />
      <span className="text-[11px] font-mono text-gray-200 flex-1">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-gray-500 hover:text-gray-300 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

interface CommandPipelineVisualizerProps {
  tasks: BotTask[];
}

function CommandPipelineVisualizer({ tasks }: CommandPipelineVisualizerProps) {
  // Get the most recent task
  const recentTask = tasks[0];
  if (!recentTask) return null;

  const stages = ["SENT", "RECEIVED", "RUNNING", "COMPLETED"];
  const statusMap: Record<string, number> = {
    queued: 0,
    running: 2,
    completed: 3,
    failed: 3,
    cancelled: 1,
  };

  const currentStageIndex = statusMap[recentTask.status] || 0;
  const isError = recentTask.status === "failed";

  return (
    <div className="border border-white/8 bg-[oklch(0.085_0.025_255)] p-4">
      <div className="text-[10px] font-mono text-gray-500 uppercase mb-3">Command Pipeline</div>
      <div className="flex items-center justify-between">
        {stages.map((stage, idx) => {
          let stageColor = "#6b7280"; // default gray
          let isActive = false;
          let isComplete = false;

          if (isError) {
            stageColor = idx <= currentStageIndex ? "#ff4444" : "#6b7280";
            isComplete = idx < currentStageIndex;
          } else {
            if (idx < currentStageIndex) {
              stageColor = "#00e5a0";
              isComplete = true;
            } else if (idx === currentStageIndex) {
              stageColor = "#0066ff";
              isActive = true;
            } else {
              stageColor = "#6b7280";
            }
          }

          return (
            <div key={stage} className="flex items-center flex-1">
              {/* Stage node */}
              <div
                className={isActive ? "status-pulse" : ""}
                style={{
                  width: "28px",
                  height: "28px",
                  backgroundColor: `${stageColor}20`,
                  border: `1.5px solid ${stageColor}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {isComplete && <CheckCircle2 className="w-4 h-4" style={{ color: stageColor }} />}
                {isActive && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stageColor }} />}
                {!isComplete && !isActive && <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stageColor, opacity: 0.5 }} />}
              </div>

              {/* Connecting line */}
              {idx < stages.length - 1 && (
                <div
                  style={{
                    flex: 1,
                    height: "1px",
                    backgroundImage: `repeating-linear-gradient(90deg, ${isComplete ? "#00e5a0" : stageColor} 0px, ${isComplete ? "#00e5a0" : stageColor} 4px, transparent 4px, transparent 8px)`,
                    marginX: "4px",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Stage labels and info */}
      <div className="flex justify-between mt-2">
        {stages.map((stage) => (
          <span key={stage} className="text-[8px] font-mono text-gray-600 flex-1 text-center">
            {stage}
          </span>
        ))}
      </div>

      {/* Current task info */}
      <div className="mt-3 pt-3 border-t border-white/5 text-[10px] font-mono text-gray-400">
        <div>Task: {recentTask.command}</div>
        <div>Status: {recentTask.status.toUpperCase()}</div>
        {recentTask.error && <div className="text-[#ff4444]">Error: {recentTask.error}</div>}
      </div>
    </div>
  );
}