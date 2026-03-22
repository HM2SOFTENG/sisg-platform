import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { toast } from "sonner";
import {
  Bot, Cpu, HardDrive, MemoryStick, Wifi, WifiOff, Activity,
  Play, Pause, Send, RefreshCw, AlertTriangle, CheckCircle2,
  Clock, Terminal, Zap, CircleDot, ChevronDown, Filter, Loader2, X, Info,
  GripVertical, Trash2, Edit2, MoreVertical, Plus, TrendingUp,
  ChevronUp, Maximize2, Minimize2
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
  connection: {
    directUrl: string;
    directAvailable: boolean;
    directVerified: boolean;
    lastDirectSuccess: string;
    activeConnection: {
      url: string;
      verifiedAt: string;
      capabilities: string[];
      lastPingAt: string;
      wsClients?: number;
      sseClients?: number;
    } | null;
    slackFallback: boolean;
    slackChannel: string;
  };
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

interface DashboardCard {
  id: string;
  title: string;
  order: number;
  collapsed: boolean;
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
  if (value < 60) return "#00e5a0";
  if (value < 85) return "#ffb800";
  return "#ff4444";
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

const priorityColors: Record<string, string> = {
  low: "#6b7280",
  normal: "#0066ff",
  high: "#ffb800",
  critical: "#ff4444",
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
  const [autoScrollPaused, setAutoScrollPaused] = useState(false);
  const activityScrollRef = useRef<HTMLDivElement>(null);

  // Dashboard layout state
  const [cardOrder, setCardOrder] = useState<string[]>([
    "status", "metrics", "kanban", "agents", "activity", "terminal", "connection"
  ]);
  const [collapsedCards, setCollapsedCards] = useState<Record<string, boolean>>({});

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Command history
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autocompleteOpen, setAutocompleteOpen] = useState(false);
  const [autocompleteMatches, setAutocompleteMatches] = useState<string[]>([]);

  // Task creation modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskFormData, setTaskFormData] = useState({ command: "", priority: "normal", agent: "" });

  // Previous state for change detection
  const prevStateRef = useRef<{ status: BotStatus | null; tasks: BotTask[]; logs: BotLog[] }>({
    status: null,
    tasks: [],
    logs: [],
  });

  // Load dashboard layout from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("clawbot_card_order");
    if (saved) {
      try {
        setCardOrder(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load card order:", e);
      }
    }

    const savedCollapsed = localStorage.getItem("clawbot_collapsed_cards");
    if (savedCollapsed) {
      try {
        setCollapsedCards(JSON.parse(savedCollapsed));
      } catch (e) {
        console.error("Failed to load collapsed state:", e);
      }
    }
  }, []);

  // Save dashboard layout to localStorage
  const saveCardOrder = (newOrder: string[]) => {
    setCardOrder(newOrder);
    localStorage.setItem("clawbot_card_order", JSON.stringify(newOrder));
  };

  const toggleCardCollapse = (cardId: string) => {
    const newCollapsed = { ...collapsedCards, [cardId]: !collapsedCards[cardId] };
    setCollapsedCards(newCollapsed);
    localStorage.setItem("clawbot_collapsed_cards", JSON.stringify(newCollapsed));
  };

  // ---- Fetch all data ----
  const fetchAll = useCallback(async () => {
    try {
      const [s, a, t, l, m, connInfo] = await Promise.all([
        apiFetch("/api/admin/clawbot/status"),
        apiFetch("/api/admin/clawbot/agents"),
        apiFetch("/api/admin/clawbot/tasks"),
        apiFetch("/api/admin/clawbot/logs?limit=50"),
        apiFetch("/api/admin/clawbot/metrics"),
        apiFetch("/api/admin/clawbot/connection").catch(() => null),
      ]);

      const prevState = prevStateRef.current;

      // ---- Change detection & activity feed generation ----

      // Detect online/offline transition
      if (prevState.status && prevState.status.online !== s.online) {
        if (s.online) {
          addToast("Heartbeat restored", "success");
          toast.success("Heartbeat restored");
          addActivityEvent({
            type: "heartbeat",
            severity: "success",
            title: "Connection Restored",
            description: "ClawBot heartbeat detected",
          });
        } else {
          addToast("Heartbeat lost", "error");
          toast.error("Heartbeat lost");
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
                toast.success("Task completed");
              } else if (task.status === "failed") {
                addToast(`Task failed: ${task.error || "unknown error"}`, "error");
                toast.error(`Task failed: ${task.error || "unknown error"}`);
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

      // Merge connection info with WS/SSE client counts into status
      if (connInfo && s?.connection) {
        s.connection.wsClients = connInfo.wsClients ?? 0;
        s.connection.sseClients = connInfo.sseClients ?? 0;
      }
      setStatus(s);
      setAgents(Array.isArray(a) ? a : []);
      setTasks(Array.isArray(t) ? t : []);
      setLogs(Array.isArray(l) ? l : []);
      setMetrics(m && typeof m === "object" ? {
        totalTasks: m.totalTasks ?? 0,
        tasksLast24h: m.tasksLast24h ?? 0,
        completedLast24h: m.completedLast24h ?? 0,
        failedLast24h: m.failedLast24h ?? 0,
        queuedNow: m.queuedNow ?? 0,
        runningNow: m.runningNow ?? 0,
        errorsLast24h: m.errorsLast24h ?? 0,
        activeAgents: m.activeAgents ?? 0,
        totalAgents: m.totalAgents ?? 0,
      } : null);

      prevStateRef.current = { status: s, tasks: Array.isArray(t) ? t : [], logs: Array.isArray(l) ? l : [] };
    } catch (e) {
      console.error("Failed to fetch ClawBot data:", e);
      addToast("Failed to fetch data", "error");
      toast.error("Failed to fetch data");
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

  // ---- Auto-scroll activity feed (with pause detection) ----
  useEffect(() => {
    if (!autoScrollPaused && activityScrollRef.current) {
      activityScrollRef.current.scrollTop = 0;
    }
  }, [activityEvents, autoScrollPaused]);

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

      setCommandHistory(prev => [{ command: commandInput, timestamp: Date.now() }, ...prev].slice(0, 50));
      setHistoryIndex(-1);

      addToast("Command sent", "success");
      toast.success("Command sent");
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
      toast.error("Failed to send command");
    }
    setSending(false);
  };

  const createTask = async (command: string, priority = "normal", agent = "") => {
    try {
      await apiFetch("/api/admin/clawbot/tasks", {
        method: "POST",
        body: JSON.stringify({ command, priority, agent: agent || undefined }),
      });
      addToast("Task created", "success");
      toast.success("Task created");
      setShowTaskModal(false);
      setTaskFormData({ command: "", priority: "normal", agent: "" });
      setTimeout(fetchAll, 1000);
    } catch (error) {
      addToast("Failed to create task", "error");
      toast.error("Failed to create task");
    }
  };

  const cancelTask = async (taskId: string) => {
    try {
      await apiFetch(`/api/admin/clawbot/tasks/${taskId}/cancel`, {
        method: "POST",
      });
      addToast("Task cancelled", "success");
      toast.success("Task cancelled");
      setTimeout(fetchAll, 500);
    } catch (error) {
      addToast("Failed to cancel task", "error");
      toast.error("Failed to cancel task");
    }
  };

  const retryTask = async (taskId: string) => {
    try {
      await apiFetch(`/api/admin/clawbot/tasks/${taskId}/retry`, {
        method: "POST",
      });
      addToast("Task retried", "success");
      toast.success("Task retried");
      setTimeout(fetchAll, 500);
    } catch (error) {
      addToast("Failed to retry task", "error");
      toast.error("Failed to retry task");
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    try {
      await apiFetch(`/api/admin/clawbot/tasks/${taskId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      });
      setTimeout(fetchAll, 500);
    } catch (error) {
      console.error("Failed to update task:", error);
    }
  };

  const quickCommand = (cmd: string) => {
    setSending(true);
    apiFetch("/api/admin/clawbot/commands", {
      method: "POST",
      body: JSON.stringify({ command: cmd, priority: "normal" }),
    }).then(() => {
      setCommandHistory(prev => [{ command: cmd, timestamp: Date.now() }, ...prev].slice(0, 50));
      addToast("Command sent", "success");
      toast.success("Command sent");
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
      toast.error("Failed to send command");
    }).finally(() => setSending(false));
  };

  const handleTestConnection = async () => {
    try {
      const resp = await apiFetch("/api/admin/clawbot/test-connection", {
        method: "POST",
      });
      if (resp.success) {
        toast.success(`Direct connection verified! ${resp.latency ? `(${resp.latency})` : ''}`);
        addActivityEvent({
          type: "status",
          severity: "success",
          title: "Connection Test Passed",
          description: resp.message,
        });
      } else {
        toast.error(resp.message || "Connection test failed");
        addActivityEvent({
          type: "status",
          severity: "warning",
          title: "Connection Test Failed",
          description: resp.message,
        });
      }
      fetchAll();
    } catch (e) {
      toast.error("Failed to test connection");
    }
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

  const filteredActivityEvents = logFilter === "all" ? activityEvents : activityEvents.filter((e) => {
    if (logFilter === "info") return e.severity === "info";
    if (logFilter === "warn") return e.severity === "warning";
    if (logFilter === "error") return e.severity === "error";
    return true;
  });

  // Group tasks by status for kanban
  const tasksByStatus = {
    queued: tasks.filter(t => t.status === "queued"),
    running: tasks.filter(t => t.status === "running"),
    completed: tasks.filter(t => t.status === "completed"),
    failed: tasks.filter(t => t.status === "failed"),
  };

  // Render card based on ID
  const renderCard = (cardId: string) => {
    switch (cardId) {
      case "status":
        return <SystemStatusCard key={cardId} status={status} metrics={metrics} />;
      case "metrics":
        return <MetricsCard key={cardId} metrics={metrics} tasks={tasks} />;
      case "kanban":
        return <KanbanBoard key={cardId} tasksByStatus={tasksByStatus} onCancel={cancelTask} onRetry={retryTask} onDragEnd={updateTaskStatus} />;
      case "agents":
        return <AgentsPanel key={cardId} agents={agents} onRunAgent={(id) => createTask(`agent:run:${id}`, "high")} />;
      case "activity":
        return <ActivityPanel key={cardId} events={filteredActivityEvents} logFilter={logFilter} onFilterChange={setLogFilter} scrollRef={activityScrollRef} />;
      case "terminal":
        return <CommandTerminal key={cardId} commandInput={commandInput} onInputChange={handleCommandInputChange} onInputKeyDown={handleCommandInputKeyDown} onSend={sendCommand} sending={sending} autocompleteOpen={autocompleteOpen} autocompleteMatches={autocompleteMatches} onAutocompleteSelect={(cmd) => { setCommandInput(cmd); setAutocompleteOpen(false); }} onQuickCommand={quickCommand} commandHistory={commandHistory} />;
      case "connection":
        return <ConnectionPanel key={cardId} status={status} onTestConnection={handleTestConnection} />;
      default:
        return null;
    }
  };

  return (
    <DashboardLayout title="ClawBot Command Center">
      <style>{`
        @keyframes slideInFromTop {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideOutToRight {
          from { opacity: 1; transform: translateX(0); }
          to { opacity: 0; transform: translateX(400px); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }

        @keyframes heartbeatDraw {
          0% { stroke-dasharray: 0 1000; stroke-dashoffset: 0; }
          100% { stroke-dasharray: 1000 0; stroke-dashoffset: 0; }
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

        .drag-over {
          background-color: rgba(0, 102, 255, 0.1) !important;
          border-color: rgba(0, 102, 255, 0.3) !important;
        }
      `}
      </style>

      <div className="space-y-4 pb-8">
        {/* ---- HEADER ---- */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#8b5cf6]/20 border border-[#8b5cf6]/30 flex items-center justify-center">
              <Bot className="w-5 h-5 text-[#8b5cf6]" />
            </div>
            <div>
              <h1 className="text-white text-xl sm:text-3xl font-bold" style={{ fontFamily: "Sora, sans-serif" }}>
                ClawBot Command Center
              </h1>
              <div className="flex items-center gap-2 text-[11px] font-mono text-gray-500">
                <HeartbeatIndicator online={status?.online || false} />
                <span className="text-gray-700">|</span>
                <span>Heartbeat: {status ? timeAgo(status.lastHeartbeat) : "—"}</span>
                <span className="text-gray-700">|</span>
                <span>Uptime: {status ? formatUptime(status.uptime) : "—"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono text-white border border-[#00e5a0]/30 bg-[#00e5a0]/5 hover:bg-[#00e5a0]/10 transition-colors"
            >
              <Plus className="w-3 h-3" /> New Task
            </button>
            <button
              onClick={fetchAll}
              className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-mono text-gray-400 border border-white/10 hover:bg-white/5 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          </div>
        </div>

        {/* ---- DRAGGABLE DASHBOARD GRID ---- */}
        <motion.div layout className="space-y-4">
          <AnimatePresence>
            {cardOrder.map((cardId) => (
              <DashboardCardWrapper
                key={cardId}
                cardId={cardId}
                collapsed={collapsedCards[cardId] || false}
                onToggleCollapse={() => toggleCardCollapse(cardId)}
              >
                {renderCard(cardId)}
              </DashboardCardWrapper>
            ))}
          </AnimatePresence>
        </motion.div>

        {/* ---- TASK CREATION MODAL ---- */}
        <AnimatePresence>
          {showTaskModal && (
            <TaskCreationModal
              isOpen={showTaskModal}
              onClose={() => setShowTaskModal(false)}
              onSubmit={(cmd, priority, agent) => createTask(cmd, priority, agent)}
              agents={agents}
            />
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function HeartbeatIndicator({ online }: { online: boolean }) {
  return (
    <motion.div
      className="flex items-center gap-1"
      animate={online ? { opacity: 1 } : { opacity: 0.5 }}
      transition={{ duration: 0.5 }}
    >
      <div className={`w-2 h-2 ${online ? "bg-[#00e5a0]" : "bg-[#ff4444]"} ${online ? "status-pulse" : ""}`} />
      <span className="text-[11px] font-mono text-gray-500">
        {online ? "ONLINE" : "OFFLINE"}
      </span>
    </motion.div>
  );
}

function DashboardCardWrapper({
  cardId,
  collapsed,
  onToggleCollapse,
  children,
}: {
  cardId: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  children: React.ReactNode;
}) {
  const cardTitles: Record<string, string> = {
    status: "System Status",
    metrics: "Metrics Overview",
    kanban: "Task Board",
    agents: "Agent Management",
    activity: "Activity Feed",
    terminal: "Command Terminal",
    connection: "Direct API Connection",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="border border-[var(--border)] bg-[var(--card)]"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--border)]/50 transition-colors">
        <div className="flex items-center gap-3">
          <GripVertical className="w-4 h-4 text-gray-600 cursor-grab" />
          <span className="text-sm font-mono text-white uppercase tracking-wider">
            {cardTitles[cardId] || cardId}
          </span>
        </div>
        <button
          onClick={onToggleCollapse}
          className="text-gray-600 hover:text-gray-400 transition-colors"
        >
          {collapsed ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
        </button>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SystemStatusCard({
  status,
  metrics,
}: {
  status: BotStatus | null;
  metrics: Metrics | null;
}) {
  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatusCard icon={Bot} label="Agents" value={`${metrics?.activeAgents || 0}/${metrics?.totalAgents || 0}`} sub="active" color="#8b5cf6" />
        <StatusCard icon={Zap} label="Tasks (24h)" value={String(metrics?.tasksLast24h || 0)} sub={`${metrics?.completedLast24h || 0} done`} color="#0066ff" />
        <StatusCard icon={Activity} label="Queue" value={String(metrics?.queuedNow || 0)} sub={`${metrics?.runningNow || 0} running`} color="#00e5a0" />
        <StatusCard icon={AlertTriangle} label="Errors (24h)" value={String(metrics?.errorsLast24h || 0)} sub="check logs" color={metrics?.errorsLast24h ? "#ff4444" : "#00e5a0"} />
      </div>

      {status?.system && status.online && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <GaugeCard icon={Cpu} label="CPU" value={status.system.cpu} />
          <GaugeCard icon={MemoryStick} label="Memory" value={status.system.memory} />
          <GaugeCard icon={HardDrive} label="Disk" value={status.system.disk} />
        </div>
      )}
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: any;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-3 border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--border)]/50 transition-colors"
    >
      <div className="flex items-start gap-2">
        <Icon className="w-4 h-4 mt-0.5" style={{ color }} />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-mono text-gray-500 uppercase">{label}</div>
          <div className="text-white text-lg font-bold font-mono mt-1">{value}</div>
          <div className="text-[10px] font-mono text-gray-600 mt-0.5">{sub}</div>
        </div>
      </div>
    </motion.div>
  );
}

function GaugeCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: number;
}) {
  const color = getGaugeColor(value);
  const circumference = 2 * Math.PI * 30;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="p-4 border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--border)]/50 transition-colors flex flex-col items-center"
    >
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4" style={{ color }} />
        <span className="text-sm font-mono text-gray-400">{label}</span>
      </div>
      <svg width="80" height="80" className="mb-2">
        <circle cx="40" cy="40" r="30" stroke="rgba(255,255,255,0.1)" strokeWidth="2" fill="none" />
        <circle
          cx="40"
          cy="40"
          r="30"
          stroke={color}
          strokeWidth="2"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%", transition: "stroke-dashoffset 0.5s ease" }}
        />
        <text
          x="40"
          y="45"
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fill="white"
          fontFamily="monospace"
        >
          {value}%
        </text>
      </svg>
    </motion.div>
  );
}

function MetricsCard({ metrics, tasks }: { metrics: Metrics | null; tasks: BotTask[] }) {
  if (!metrics) return null;

  const successRate = (metrics.tasksLast24h ?? 0) > 0
    ? Math.round(((metrics.completedLast24h ?? 0) / metrics.tasksLast24h) * 100)
    : 0;

  // Calculate hourly task distribution (last 24 hours)
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const hour = new Date();
    hour.setHours(hour.getHours() - (23 - i));
    const count = tasks.filter(t => {
      const createdAt = new Date(t.createdAt);
      return createdAt.getHours() === hour.getHours();
    }).length;
    return { hour: hour.getHours(), count };
  });

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <MetricBox label="Success Rate" value={`${successRate}%`} color="#00e5a0" />
        <MetricBox label="Avg Completion" value="2.3s" color="#0066ff" />
        <MetricBox label="Failed Tasks" value={String(metrics.failedLast24h ?? 0)} color={(metrics.failedLast24h ?? 0) > 0 ? "#ff4444" : "#00e5a0"} />
      </div>

      {/* Mini sparkline using text-based visualization */}
      <div className="p-3 border border-[var(--border)] bg-[var(--border)]/30">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono text-gray-500 uppercase">24h Task Distribution</span>
          <span className="text-[10px] font-mono text-gray-600">{metrics.tasksLast24h ?? 0} tasks</span>
        </div>
        <div className="flex items-end justify-between h-12 gap-1">
          {hourlyData.map((data, i) => (
            <motion.div
              key={i}
              className="flex-1 bg-[#0066ff] rounded-t"
              style={{ height: `${Math.max(5, (data.count / Math.max(...hourlyData.map(d => d.count), 1)) * 100)}%` }}
              whileHover={{ opacity: 0.8 }}
              title={`${data.hour}:00 - ${data.count} tasks`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="p-3 border border-[var(--border)] bg-[var(--card)]">
      <div className="text-[10px] font-mono text-gray-500 uppercase mb-1">{label}</div>
      <div className="text-white text-lg font-bold font-mono" style={{ color }}>
        {value}
      </div>
    </div>
  );
}

function KanbanBoard({
  tasksByStatus,
  onCancel,
  onRetry,
  onDragEnd,
}: {
  tasksByStatus: Record<string, BotTask[]>;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
  onDragEnd: (id: string, status: string) => void;
}) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const columns = [
    { key: "queued", label: "Queued", count: tasksByStatus.queued.length },
    { key: "running", label: "Running", count: tasksByStatus.running.length },
    { key: "completed", label: "Completed", count: tasksByStatus.completed.length },
    { key: "failed", label: "Failed", count: tasksByStatus.failed.length },
  ];

  const handleDragStart = (taskId: string, e: React.DragEvent) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (columnKey: string, e: React.DragEvent) => {
    e.preventDefault();
    setDragOverColumn(columnKey);
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (columnKey: string, e: React.DragEvent) => {
    e.preventDefault();
    if (draggedTaskId) {
      onDragEnd(draggedTaskId, columnKey);
      setDraggedTaskId(null);
      setDragOverColumn(null);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if ((e.target as HTMLElement).className.includes("kanban-column")) {
      setDragOverColumn(null);
    }
  };

  return (
    <div className="p-4 overflow-x-auto">
      <div className="flex gap-4 min-w-max">
        {columns.map((col) => (
          <motion.div
            key={col.key}
            className={`flex-shrink-0 w-80 kanban-column border border-[var(--border)] bg-[var(--border)]/30 p-3 transition-colors ${
              dragOverColumn === col.key ? "drag-over" : ""
            }`}
            onDragOver={(e) => handleDragOver(col.key, e)}
            onDrop={(e) => handleDrop(col.key, e)}
            onDragLeave={handleDragLeave}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2"
                  style={{ backgroundColor: statusColors[col.key] || "#6b7280" }}
                />
                <span className="text-sm font-mono text-white font-semibold">{col.label}</span>
              </div>
              <span className="text-[10px] font-mono text-gray-500">{col.count}</span>
            </div>

            <div className="space-y-2 min-h-[200px]">
              <AnimatePresence>
                {tasksByStatus[col.key as keyof typeof tasksByStatus]?.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    draggable
                    onDragStart={(e) => handleDragStart(task.id, e)}
                    className={`p-3 border border-[var(--border)] bg-[var(--card)] cursor-move hover:bg-[var(--border)]/50 transition-colors ${
                      draggedTaskId === task.id ? "opacity-50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-white font-mono truncate">{task.command}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 border"
                            style={{
                              borderColor: priorityColors[task.priority] || "#6b7280",
                              color: priorityColors[task.priority] || "#6b7280",
                            }}
                          >
                            {task.priority}
                          </span>
                          {task.agent && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 border border-white/10 text-gray-500">
                              {task.agent}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-[9px] font-mono text-gray-600 flex-shrink-0">
                        {timeAgo(task.createdAt)}
                      </div>
                    </div>

                    {task.error && (
                      <div className="text-[10px] text-[#ff4444] font-mono p-2 bg-[#ff4444]/10 border border-[#ff4444]/20 mb-2 truncate">
                        {task.error}
                      </div>
                    )}

                    <div className="flex items-center gap-1.5">
                      {(task.status === "queued" || task.status === "running") && (
                        <button
                          onClick={() => onCancel(task.id)}
                          className="flex-1 px-2 py-1.5 text-[10px] font-mono text-white bg-[#ff4444]/20 border border-[#ff4444]/30 hover:bg-[#ff4444]/30 transition-colors"
                        >
                          Cancel
                        </button>
                      )}
                      {task.status === "failed" && (
                        <button
                          onClick={() => onRetry(task.id)}
                          className="flex-1 px-2 py-1.5 text-[10px] font-mono text-white bg-[#ffb800]/20 border border-[#ffb800]/30 hover:bg-[#ffb800]/30 transition-colors"
                        >
                          Retry
                        </button>
                      )}
                      {task.result && (
                        <button
                          className="flex-1 px-2 py-1.5 text-[10px] font-mono text-white bg-[#0066ff]/20 border border-[#0066ff]/30 hover:bg-[#0066ff]/30 transition-colors"
                          title={task.result}
                        >
                          Details
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function AgentsPanel({
  agents,
  onRunAgent,
}: {
  agents: BotAgent[];
  onRunAgent: (id: string) => void;
}) {
  const [sortBy, setSortBy] = useState<"name" | "status" | "errors">("name");

  const sortedAgents = [...agents].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "errors") return b.errorCount - a.errorCount;
    return statusColors[a.status]?.localeCompare(statusColors[b.status] || "") || 0;
  });

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <span className="text-[10px] font-mono text-gray-500 uppercase">Sort by:</span>
        <div className="flex gap-1">
          {(["name", "status", "errors"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`text-[10px] font-mono px-2 py-1 border transition-colors ${
                sortBy === option ? "text-white border-[#0066ff]/50 bg-[#0066ff]/10" : "text-gray-500 border-white/10 hover:border-white/20"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sortedAgents.map((agent) => (
          <motion.div
            key={agent.id}
            whileHover={{ y: -2 }}
            className="p-3 border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--border)]/50 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusColors[agent.status] || "#6b7280" }}
                />
                <div>
                  <div className="text-sm text-white font-mono font-semibold">{agent.name}</div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 border border-white/10 text-gray-500 uppercase">
                    {agent.type}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[10px] font-mono text-gray-600 space-y-1 mb-3">
              <div>Last run: {timeAgo(agent.lastRun)}</div>
              <div>Errors: {agent.errorCount}</div>
              <div>Schedule: {agent.schedule || "manual"}</div>
            </div>

            <button
              onClick={() => onRunAgent(agent.id)}
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[10px] font-mono bg-[#0066ff] text-white hover:bg-[#0055dd] transition-colors"
            >
              <Play className="w-3 h-3" /> Run Now
            </button>
          </motion.div>
        ))}
      </div>

      {agents.length === 0 && (
        <div className="text-center py-8 text-gray-600 text-sm font-mono">
          No agents registered.
        </div>
      )}
    </div>
  );
}

function ActivityPanel({
  events,
  logFilter,
  onFilterChange,
  scrollRef,
}: {
  events: ActivityEvent[];
  logFilter: string;
  onFilterChange: (filter: string) => void;
  scrollRef: React.RefObject<HTMLDivElement>;
}) {
  const [jumpToLatestVisible, setJumpToLatestVisible] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    setJumpToLatestVisible(target.scrollTop > 100);
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#00d4ff]" />
          <span className="text-sm font-mono text-white uppercase">Live Activity</span>
          <span className="text-[10px] font-mono text-gray-600">({events.length})</span>
        </div>
        <div className="flex items-center gap-1">
          {["all", "info", "warn", "error"].map((level) => (
            <button
              key={level}
              onClick={() => onFilterChange(level)}
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
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-[400px] overflow-y-auto space-y-2 relative"
      >
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-600 text-sm font-mono">
            No activity yet. Send a command to get started.
          </div>
        ) : (
          <AnimatePresence>
            {events.map((event) => (
              <ActivityEventRow key={event.id} event={event} />
            ))}
          </AnimatePresence>
        )}

        {jumpToLatestVisible && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={() => {
              if (scrollRef.current) scrollRef.current.scrollTop = 0;
            }}
            className="sticky bottom-0 left-0 right-0 py-2 px-3 text-[10px] font-mono text-white bg-[#0066ff] hover:bg-[#0055dd] transition-colors"
          >
            ↓ Jump to Latest
          </motion.button>
        )}
      </div>
    </div>
  );
}

function ActivityEventRow({ event }: { event: ActivityEvent }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="p-2 border border-[var(--border)] bg-[var(--border)]/30 hover:bg-[var(--border)]/50 transition-colors"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <div className="flex items-start gap-2">
          <div
            className="w-2 h-2 mt-1.5 flex-shrink-0"
            style={{ backgroundColor: severityColors[event.severity] || "#6b7280" }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white font-mono font-semibold truncate">
                {event.title}
              </span>
              <span className="text-[9px] font-mono text-gray-600 flex-shrink-0" title={event.timestamp}>
                {timeAgo(event.timestamp)}
              </span>
            </div>
            <div className="text-[11px] font-mono text-gray-400 mt-0.5 truncate">
              {event.description}
            </div>
          </div>
          <ChevronUp
            className={`w-3 h-3 text-gray-600 flex-shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {expanded && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-2 pt-2 border-t border-[var(--border)] text-[10px] font-mono text-gray-500"
        >
          <div className="space-y-1">
            <div>Type: {event.type} {event.subType ? `(${event.subType})` : ""}</div>
            <div>Severity: {event.severity}</div>
            {event.agent && <div>Agent: {event.agent}</div>}
            {event.data && <div className="mt-2 p-2 bg-white/5 border border-white/10 rounded-none overflow-auto max-h-[150px]">
              <pre className="text-[9px]">{JSON.stringify(event.data, null, 2)}</pre>
            </div>}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function CommandTerminal({
  commandInput,
  onInputChange,
  onInputKeyDown,
  onSend,
  sending,
  autocompleteOpen,
  autocompleteMatches,
  onAutocompleteSelect,
  onQuickCommand,
  commandHistory,
}: {
  commandInput: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onInputKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSend: () => void;
  sending: boolean;
  autocompleteOpen: boolean;
  autocompleteMatches: string[];
  onAutocompleteSelect: (cmd: string) => void;
  onQuickCommand: (cmd: string) => void;
  commandHistory: CommandHistory[];
}) {
  const commandCategories = {
    "System": ["health-check", "system-info", "restart"],
    "Agents": ["run-all-agents", "list-agents"],
    "Tasks": ["cancel-all", "deploy-status"],
    "QA": ["run-qa"],
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 relative">
        <span className="text-[#00e5a0] text-xs font-mono flex-shrink-0">$</span>
        <input
          value={commandInput}
          onChange={onInputChange}
          onKeyDown={onInputKeyDown}
          placeholder="Send a command to ClawBot... (e.g., health-check, deploy, run-qa)"
          className="flex-1 bg-transparent text-white text-xs font-mono outline-none placeholder:text-gray-700"
        />
        <button
          onClick={onSend}
          disabled={sending || !commandInput.trim()}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono bg-[#0066ff] text-white hover:bg-[#0055dd] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          Send
        </button>

        {autocompleteOpen && autocompleteMatches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] z-50 max-w-[300px]"
          >
            {autocompleteMatches.map((match) => (
              <button
                key={match}
                onClick={() => onAutocompleteSelect(match)}
                className="w-full text-left px-3 py-2 text-[11px] font-mono text-gray-300 hover:bg-white/5 border-b border-[var(--border)] last:border-0"
              >
                $ {match}
              </button>
            ))}
          </motion.div>
        )}
      </div>

      {/* Quick commands organized by category */}
      <div className="space-y-3 border-t border-[var(--border)] pt-3">
        {Object.entries(commandCategories).map(([category, commands]) => (
          <div key={category}>
            <span className="text-[10px] font-mono text-gray-600 uppercase block mb-1.5">{category}</span>
            <div className="flex flex-wrap gap-1.5">
              {commands.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => onQuickCommand(cmd)}
                  className="text-[10px] font-mono px-2 py-1 text-gray-500 border border-white/10 hover:border-[#0066ff]/30 hover:text-[#0066ff] transition-colors"
                >
                  {cmd}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {commandHistory.length > 0 && (
        <div className="border-t border-[var(--border)] pt-3">
          <span className="text-[10px] font-mono text-gray-600 uppercase block mb-2">Last Command</span>
          <div className="p-2 border border-[var(--border)] bg-[var(--border)]/30 font-mono text-[10px] text-gray-400">
            {commandHistory[0].command}
          </div>
        </div>
      )}
    </div>
  );
}

function ConnectionPanel({ status, onTestConnection }: {
  status: BotStatus | null;
  onTestConnection: () => void;
}) {
  if (!status) return null;
  const conn = status?.connection;
  if (!conn) return (
    <div className="p-4 text-center text-gray-500 text-sm font-mono">
      Connection data unavailable
    </div>
  );

  // Determine active mode
  const wsConnected = (conn?.wsClients ?? 0) > 0;
  const sseConnected = (conn?.sseClients ?? 0) > 0;
  const mode = wsConnected ? "websocket" : conn?.directVerified ? "direct" : sseConnected ? "sse" : conn?.directAvailable ? "polling" : "slack";
  const modeColors: Record<string, string> = { websocket: "#00e5a0", direct: "#00e5a0", sse: "#0066ff", polling: "#f59e0b", slack: "#ef4444" };
  const modeLabels: Record<string, string> = { websocket: "WebSocket (Real-Time)", direct: "Direct API (Verified)", sse: "SSE Stream", polling: "Polling", slack: "Slack Fallback" };

  return (
    <div className="p-4 space-y-4">
      {/* Connection Mode Badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-2.5 h-2.5 rounded-full animate-pulse"
            style={{ backgroundColor: modeColors[mode] }}
          />
          <span className="text-sm font-mono font-bold" style={{ color: modeColors[mode] }}>
            {modeLabels[mode]}
          </span>
        </div>
        <button
          onClick={onTestConnection}
          className="px-3 py-1 text-[10px] font-mono uppercase border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--border)] transition-colors rounded"
        >
          Test Connection
        </button>
      </div>

      {/* Connection Details */}
      <div className="space-y-2 text-[11px] font-mono">
        {conn?.activeConnection ? (
          <>
            <div className="flex justify-between">
              <span className="text-gray-500">URL</span>
              <span className="text-[var(--foreground)] truncate ml-4 max-w-[120px] sm:max-w-[200px]">{conn.activeConnection.url}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Verified</span>
              <span className="text-[#00e5a0]">{new Date(conn.activeConnection.verifiedAt).toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Ping</span>
              <span className="text-[var(--foreground)]">{conn.activeConnection.lastPingAt ? new Date(conn.activeConnection.lastPingAt).toLocaleTimeString() : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Capabilities</span>
              <span className="text-[var(--foreground)]">{conn.activeConnection.capabilities?.length || 0} registered</span>
            </div>
          </>
        ) : (
          <div className="p-3 border border-[var(--border)] bg-[var(--border)]/20 rounded text-center">
            <div className="text-gray-400 mb-1">No direct connection</div>
            <div className="text-[10px] text-gray-500">
              ClawBot must call <code className="px-1 py-0.5 bg-[var(--border)] rounded">POST /api/clawbot/connect</code> to establish
            </div>
          </div>
        )}
      </div>

      {/* Communication Channels */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-2 border-t border-[var(--border)]">
        <div className="text-center p-2">
          <div className={`text-[10px] font-mono uppercase mb-1 ${wsConnected ? 'text-[#00e5a0]' : 'text-gray-500'}`}>
            WS
          </div>
          <div className={`w-3 h-3 rounded-full mx-auto ${wsConnected ? 'bg-[#00e5a0]' : 'bg-gray-600'}`} />
        </div>
        <div className="text-center p-2">
          <div className={`text-[10px] font-mono uppercase mb-1 ${sseConnected ? 'text-[#0066ff]' : 'text-gray-500'}`}>
            SSE
          </div>
          <div className={`w-3 h-3 rounded-full mx-auto ${sseConnected ? 'bg-[#0066ff]' : 'bg-gray-600'}`} />
        </div>
        <div className="text-center p-2">
          <div className={`text-[10px] font-mono uppercase mb-1 ${conn?.directVerified ? 'text-[#00e5a0]' : 'text-gray-500'}`}>
            Direct
          </div>
          <div className={`w-3 h-3 rounded-full mx-auto ${conn?.directVerified ? 'bg-[#00e5a0]' : 'bg-gray-600'}`} />
        </div>
        <div className="text-center p-2">
          <div className={`text-[10px] font-mono uppercase mb-1 ${conn?.directAvailable ? 'text-[#f59e0b]' : 'text-gray-500'}`}>
            Poll
          </div>
          <div className={`w-3 h-3 rounded-full mx-auto ${conn?.directAvailable ? 'bg-[#f59e0b]' : 'bg-gray-600'}`} />
        </div>
        <div className="text-center p-2">
          <div className="text-[10px] font-mono uppercase mb-1 text-[#ef4444]">
            Slack
          </div>
          <div className="w-3 h-3 rounded-full mx-auto bg-[#ef4444]" />
        </div>
      </div>

      {/* Last Direct Success */}
      {conn?.lastDirectSuccess && conn.lastDirectSuccess !== "never" && (
        <div className="text-[10px] text-gray-500 font-mono text-center">
          Last direct success: {new Date(conn.lastDirectSuccess).toLocaleString()}
        </div>
      )}
    </div>
  );
}

function ConnectionCard({ status }: { status: BotStatus | null }) {
  if (!status) return null;

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
        <span className="text-sm font-mono text-white uppercase">Connection Status</span>
        <HeartbeatIndicator online={status.online} />
      </div>

      <div className="space-y-2">
        <div className="p-3 border border-[var(--border)] bg-[var(--border)]/30">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-2 h-2"
              style={{ backgroundColor: status.connection?.directAvailable ? "#00e5a0" : "#ff4444" }}
            />
            <span className="text-[10px] font-mono text-gray-500 uppercase">Direct API</span>
          </div>
          <div className="text-sm font-mono text-white truncate">{status.connection?.directUrl || "—"}</div>
          <div className="text-[10px] font-mono text-gray-600 mt-1">
            Last: {timeAgo(status.connection?.lastDirectSuccess || "")}
          </div>
        </div>

        <div className="p-3 border border-[var(--border)] bg-[var(--border)]/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-[#00e5a0]" />
            <span className="text-[10px] font-mono text-gray-500 uppercase">Slack Fallback</span>
          </div>
          <div className="text-sm font-mono text-white">
            #{status.connection?.slackChannel || "—"}
          </div>
          <div className="text-[10px] font-mono text-gray-600 mt-1">
            {status.connection?.slackFallback ? "Enabled" : "Disabled"}
          </div>
        </div>

        {status.system && (
          <div className="p-3 border border-[var(--border)] bg-[var(--border)]/30">
            <div className="text-[10px] font-mono text-gray-600 uppercase mb-2">System Info</div>
            <div className="space-y-1 text-[10px] font-mono text-gray-400">
              <div>Hostname: {status.system.hostname}</div>
              <div>Platform: {status.system.platform}</div>
              <div>Version: {status.version}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCreationModal({
  isOpen,
  onClose,
  onSubmit,
  agents,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (command: string, priority: string, agent: string) => void;
  agents: BotAgent[];
}) {
  const [command, setCommand] = useState("");
  const [priority, setPriority] = useState("normal");
  const [agent, setAgent] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;
    setSubmitted(true);
    onSubmit(command, priority, agent);
    setTimeout(() => {
      setCommand("");
      setPriority("normal");
      setAgent("");
      setSubmitted(false);
    }, 500);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md border border-[var(--border)] bg-[var(--card)]"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <span className="text-sm font-mono text-white uppercase">Create Task</span>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="text-[10px] font-mono text-gray-500 uppercase block mb-2">Command</label>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="e.g., health-check, deploy-status"
              className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-white font-mono text-sm outline-none focus:border-[#0066ff]/50"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-mono text-gray-500 uppercase block mb-2">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-white font-mono text-sm outline-none focus:border-[#0066ff]/50"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-mono text-gray-500 uppercase block mb-2">Agent (optional)</label>
            <select
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-white font-mono text-sm outline-none focus:border-[#0066ff]/50"
            >
              <option value="">Any agent</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 text-[11px] font-mono text-gray-400 border border-white/10 hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitted}
              className="flex-1 px-3 py-2 text-[11px] font-mono bg-[#0066ff] text-white hover:bg-[#0055dd] disabled:opacity-50 transition-colors"
            >
              {submitted ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
              Create
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
}
