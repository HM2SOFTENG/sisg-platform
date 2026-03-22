// ============================================================================
// SISG Gateway — Shared Types
// ============================================================================

export interface GatewayConfig {
  port: number;
  gatewayApiKey: string;
  openclawApiUrl: string;
  openclawApiKey: string;
  allowedOrigins: string[];
  logLevel: string;
  taskResultDir: string;
  maxConcurrentTasks: number;
}

export type TaskType = "shell" | "browser" | "file" | "scrape" | "analyze" | "generate";
export type TaskStatus = "queued" | "running" | "completed" | "failed";
export type TaskPriority = "normal" | "high" | "critical";
export type TaskSource = "clawbot" | "agents" | "api";
export type TaskTrigger = "manual" | "schedule" | "api" | "callback";

export interface TaskContext {
  agent?: string;
  source?: TaskSource;
  priority?: TaskPriority;
  callbackUrl?: string;
}

export interface TaskRequest {
  taskId?: string;
  type: TaskType;
  command: string;
  context?: TaskContext;
  params?: Record<string, any>;
  async?: boolean;
}

export interface Task {
  id: string;
  type: TaskType;
  command: string;
  context: TaskContext;
  params: Record<string, any>;
  status: TaskStatus;
  result: any | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  duration: number | null;
}

export interface ChatRequest {
  message: string;
  context?: {
    agent?: string;
    sessionId?: string;
    systemPrompt?: string;
    data?: any;
  };
  stream?: boolean;
}

export interface ChatResponse {
  success: boolean;
  response: string;
  usage?: {
    model: string;
    tokens?: number;
  };
  sessionId?: string;
}

export interface AgentRunRequest {
  agent: string;
  action: string;
  params?: Record<string, any>;
  callbackUrl?: string;
}

export interface AutomationJob {
  name: string;
  schedule: string;
  task: TaskRequest;
  callbackUrl?: string;
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  runCount: number;
}

export interface CallbackPayload {
  source: "sisg-gateway";
  taskId: string;
  agent?: string;
  action?: string;
  status: TaskStatus;
  result: any;
  error?: string;
  duration: number | null;
  timestamp: string;
  gatewayKey: string;
}

export interface HealthResponse {
  status: "ok" | "degraded" | "error";
  service: "sisg-gateway";
  version: string;
  uptime: number;
  openclawConnected: boolean;
  activeTasks: number;
  timestamp: string;
}

export interface StatusResponse extends HealthResponse {
  openclaw: {
    connected: boolean;
    url: string;
    lastPing: string | null;
  };
  tasks: {
    active: number;
    completed: number;
    failed: number;
    queued: number;
  };
  system: {
    memoryMB: number;
    uptime: string;
    nodeVersion: string;
  };
  automations: {
    total: number;
    enabled: number;
  };
}
