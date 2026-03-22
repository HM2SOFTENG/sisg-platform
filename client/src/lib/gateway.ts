/**
 * SISG Gateway Client
 * Frontend API client for the SISG gateway through backend proxy at /api/admin/gateway/...
 * All methods handle authentication via Bearer token from localStorage
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

// Base response envelope
export interface GatewayResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp?: string;
}

// Health & Status
export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  uptime?: number;
  version?: string;
}

export interface StatusResponse {
  status: "online" | "offline" | "maintenance";
  timestamp: string;
  services?: Record<string, string>;
  message?: string;
}

// Chat / ClawBot
export interface ChatContext {
  conversationId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface ChatRequest {
  message: string;
  context?: ChatContext;
}

export interface ChatResponse {
  conversationId: string;
  response: string;
  timestamp: string;
  context?: ChatContext;
  tokens?: {
    input: number;
    output: number;
  };
}

// Task Execution
export interface ExecuteRequest {
  task: string;
  params?: Record<string, any>;
  timeout?: number;
  metadata?: Record<string, any>;
}

export interface ExecuteResponse {
  taskId: string;
  status: "success" | "failed" | "timeout";
  result?: any;
  error?: string;
  executedAt: string;
  duration: number;
}

export interface AsyncTaskResponse {
  taskId: string;
  status: "queued" | "running" | "pending";
  createdAt: string;
  statusUrl: string;
}

// Agent Operations
export interface AgentRunResponse {
  agentId: string;
  action: string;
  status: "success" | "failed" | "error";
  result?: any;
  error?: string;
  executedAt: string;
  duration: number;
}

export interface AgentRunSyncResponse {
  agentId: string;
  action: string;
  status: "running" | "queued";
  taskId: string;
  statusUrl: string;
  estimatedDuration?: number;
}

// Tasks Management
export interface Task {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  createdAt: string;
  updatedAt: string;
  result?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface TasksResponse {
  tasks: Task[];
  total: number;
  limit: number;
  offset: number;
}

export interface TaskResponse {
  task: Task;
}

export interface GetTasksOptions {
  limit?: number;
  offset?: number;
  status?: "pending" | "running" | "completed" | "failed";
}

// Automations
export interface Automation {
  name: string;
  enabled: boolean;
  schedule?: string;
  action: string;
  params?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  lastRun?: string;
  nextRun?: string;
}

export interface AutomationRequest {
  name: string;
  enabled?: boolean;
  schedule?: string;
  action: string;
  params?: Record<string, any>;
}

export interface AutomationResponse {
  automation: Automation;
}

export interface AutomationsResponse {
  automations: Automation[];
  total: number;
}

export interface DeleteResponse {
  success: boolean;
  message?: string;
  timestamp: string;
}

// Health check hook response
export interface GatewayHealthStatus {
  connected: boolean;
  status: "healthy" | "degraded" | "unhealthy" | "unknown";
  lastCheck: string | null;
  error: string | null;
  uptime?: number;
}

// Error type
export class GatewayError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = "GatewayError";
  }
}

// ============================================================================
// AUTHENTICATION & FETCH HELPER
// ============================================================================

function getToken(): string {
  return localStorage.getItem("sisg_admin_token") || "";
}

/**
 * Base fetch helper that handles:
 * - Adding Bearer token authentication
 * - Error handling and typed responses
 * - Request/response logging (in dev)
 */
async function gatewayFetch<T = any>(
  endpoint: string,
  options: RequestInit & {
    method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  } = {}
): Promise<T> {
  const token = getToken();
  const baseUrl = "/api/admin/gateway";
  const url = `${baseUrl}${endpoint}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle non-JSON responses
  const contentType = response.headers.get("content-type");
  let data: any;

  if (contentType?.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = { success: response.ok, data: text };
  }

  // Handle errors
  if (!response.ok) {
    const errorMessage =
      data.error || data.message || `HTTP ${response.status}`;
    const errorCode = data.code || `HTTP_${response.status}`;

    throw new GatewayError(errorCode, errorMessage, response.status, data);
  }

  // Return typed response
  if (data.data !== undefined) {
    return data.data as T;
  }

  return data as T;
}

// ============================================================================
// GATEWAY CLIENT
// ============================================================================

export const gateway = {
  // ========================================================================
  // Health & Status
  // ========================================================================

  /**
   * Check gateway health status
   */
  async health(): Promise<HealthResponse> {
    return gatewayFetch<HealthResponse>("/health", { method: "GET" });
  },

  /**
   * Get gateway status
   */
  async status(): Promise<StatusResponse> {
    return gatewayFetch<StatusResponse>("/status", { method: "GET" });
  },

  // ========================================================================
  // Chat (ClawBot through OpenClaw)
  // ========================================================================

  /**
   * Send a message to ClawBot through gateway
   */
  async chat(
    message: string,
    context?: ChatContext
  ): Promise<ChatResponse> {
    const payload: ChatRequest = { message, context };
    return gatewayFetch<ChatResponse>("/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ========================================================================
  // Task Execution
  // ========================================================================

  /**
   * Execute a task synchronously
   */
  async execute(task: ExecuteRequest): Promise<ExecuteResponse> {
    return gatewayFetch<ExecuteResponse>("/execute", {
      method: "POST",
      body: JSON.stringify(task),
    });
  },

  /**
   * Execute a task asynchronously, returns task ID for polling
   */
  async executeAsync(task: ExecuteRequest): Promise<AsyncTaskResponse> {
    return gatewayFetch<AsyncTaskResponse>("/execute/async", {
      method: "POST",
      body: JSON.stringify(task),
    });
  },

  // ========================================================================
  // Agent Operations
  // ========================================================================

  /**
   * Run an agent action asynchronously
   */
  async runAgent(
    agent: string,
    action: string,
    params?: Record<string, any>
  ): Promise<AgentRunResponse> {
    const payload = { agent, action, params: params || {} };
    return gatewayFetch<AgentRunResponse>("/agents/run", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  /**
   * Run an agent action synchronously
   */
  async runAgentSync(
    agent: string,
    action: string,
    params?: Record<string, any>
  ): Promise<AgentRunSyncResponse> {
    const payload = { agent, action, params: params || {} };
    return gatewayFetch<AgentRunSyncResponse>("/agents/run/sync", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ========================================================================
  // Tasks Management
  // ========================================================================

  /**
   * Get list of tasks with optional filtering
   */
  async getTasks(opts?: GetTasksOptions): Promise<TasksResponse> {
    const params = new URLSearchParams();
    if (opts?.limit) params.append("limit", opts.limit.toString());
    if (opts?.offset) params.append("offset", opts.offset.toString());
    if (opts?.status) params.append("status", opts.status);

    const query = params.toString();
    const endpoint = query ? `/tasks?${query}` : "/tasks";

    return gatewayFetch<TasksResponse>(endpoint, { method: "GET" });
  },

  /**
   * Get a specific task by ID
   */
  async getTask(id: string): Promise<TaskResponse> {
    return gatewayFetch<TaskResponse>(`/tasks/${encodeURIComponent(id)}`, {
      method: "GET",
    });
  },

  // ========================================================================
  // Automations
  // ========================================================================

  /**
   * Get all automations
   */
  async getAutomations(): Promise<AutomationsResponse> {
    return gatewayFetch<AutomationsResponse>("/automations", {
      method: "GET",
    });
  },

  /**
   * Create a new automation
   */
  async createAutomation(
    job: AutomationRequest
  ): Promise<AutomationResponse> {
    return gatewayFetch<AutomationResponse>("/automations", {
      method: "POST",
      body: JSON.stringify(job),
    });
  },

  /**
   * Enable or disable an automation
   */
  async toggleAutomation(
    name: string,
    enabled: boolean
  ): Promise<AutomationResponse> {
    const payload = { enabled };
    return gatewayFetch<AutomationResponse>(
      `/automations/${encodeURIComponent(name)}/toggle`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    );
  },

  /**
   * Delete an automation
   */
  async deleteAutomation(name: string): Promise<DeleteResponse> {
    return gatewayFetch<DeleteResponse>(
      `/automations/${encodeURIComponent(name)}`,
      {
        method: "DELETE",
      }
    );
  },
};

// ============================================================================
// HOOKS & UTILITIES
// ============================================================================

/**
 * useGatewayHealth - Hook pattern for components to poll gateway health
 * Returns { connected, status, lastCheck, error }
 *
 * Usage:
 * ```typescript
 * const { connected, status, lastCheck, error } = useGatewayHealth();
 * ```
 *
 * For React components, use with useEffect:
 * ```typescript
 * const [health, setHealth] = useState<GatewayHealthStatus>({
 *   connected: false,
 *   status: 'unknown',
 *   lastCheck: null,
 *   error: null,
 * });
 *
 * useEffect(() => {
 *   let interval: NodeJS.Timeout;
 *
 *   const checkHealth = async () => {
 *     try {
 *       const response = await gateway.health();
 *       setHealth({
 *         connected: true,
 *         status: response.status,
 *         lastCheck: new Date().toISOString(),
 *         error: null,
 *         uptime: response.uptime,
 *       });
 *     } catch (err) {
 *       const errorMsg = err instanceof Error ? err.message : String(err);
 *       setHealth((prev) => ({
 *         ...prev,
 *         connected: false,
 *         lastCheck: new Date().toISOString(),
 *         error: errorMsg,
 *       }));
 *     }
 *   };
 *
 *   checkHealth();
 *   interval = setInterval(checkHealth, 30000); // Poll every 30s
 *
 *   return () => clearInterval(interval);
 * }, []);
 *
 * return health;
 * ```
 */
export async function useGatewayHealth(): Promise<GatewayHealthStatus> {
  try {
    const response = await gateway.health();
    return {
      connected: true,
      status: response.status,
      lastCheck: new Date().toISOString(),
      error: null,
      uptime: response.uptime,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      status: "unknown",
      lastCheck: new Date().toISOString(),
      error: errorMsg,
    };
  }
}

/**
 * Helper to create a polling interval for health checks
 * Returns cleanup function
 *
 * Usage:
 * ```typescript
 * const cleanup = startHealthPolling((health) => {
 *   console.log('Gateway health:', health);
 * }, 30000); // Poll every 30 seconds
 *
 * // Later...
 * cleanup();
 * ```
 */
export function startHealthPolling(
  callback: (health: GatewayHealthStatus) => void,
  intervalMs: number = 30000
): () => void {
  const checkAndNotify = async () => {
    const health = await useGatewayHealth();
    callback(health);
  };

  checkAndNotify();
  const interval = setInterval(checkAndNotify, intervalMs);

  return () => clearInterval(interval);
}

/**
 * Helper to wait for gateway to become healthy
 * Useful during app initialization
 *
 * Usage:
 * ```typescript
 * await waitForGateway(5000, 10); // Max 5s, retry every 10 checks
 * ```
 */
export async function waitForGateway(
  maxWaitMs: number = 10000,
  checkIntervalMs: number = 500
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const health = await gateway.health();
      if (health.status === "healthy" || health.status === "degraded") {
        return;
      }
    } catch {
      // Continue polling
    }

    await new Promise((resolve) => setTimeout(resolve, checkIntervalMs));
  }

  throw new GatewayError(
    "GATEWAY_TIMEOUT",
    `Gateway did not become healthy within ${maxWaitMs}ms`
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  gatewayFetch,
  getToken,
};

export default gateway;
