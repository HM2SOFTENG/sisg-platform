import { config } from "../config";

// ============================================================================
// OpenClaw Integration Service
// ============================================================================
// Tries multiple connection methods to communicate with the local OpenClaw:
//   1. HTTP REST API (preferred)
//   2. CLI fallback (shell out to `openclaw` command)
// ============================================================================

interface OpenClawStatus {
  connected: boolean;
  url: string;
  lastPing: string | null;
  method: "http" | "cli" | "none";
  version?: string;
}

class OpenClawService {
  private status: OpenClawStatus = {
    connected: false,
    url: config.openclawApiUrl,
    lastPing: null,
    method: "none",
  };

  private pingInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize connection to OpenClaw — probe available methods.
   */
  async initialize(): Promise<void> {
    console.log(`🦞 Connecting to OpenClaw at ${config.openclawApiUrl}...`);

    // Try HTTP first
    const httpOk = await this.tryHttpPing();
    if (httpOk) {
      this.status.connected = true;
      this.status.method = "http";
      this.status.lastPing = new Date().toISOString();
      console.log(`✅ OpenClaw connected via HTTP`);
    } else {
      // Try CLI fallback
      const cliOk = await this.tryCliPing();
      if (cliOk) {
        this.status.connected = true;
        this.status.method = "cli";
        this.status.lastPing = new Date().toISOString();
        console.log(`✅ OpenClaw connected via CLI`);
      } else {
        this.status.connected = false;
        this.status.method = "none";
        console.warn(`⚠️  OpenClaw not reachable — gateway will queue tasks and retry`);
      }
    }

    // Periodic health check every 30 seconds
    this.pingInterval = setInterval(() => this.healthCheck(), 30000);
  }

  /**
   * Shut down the connection.
   */
  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Get connection status.
   */
  getStatus(): OpenClawStatus {
    return { ...this.status };
  }

  /**
   * Check if OpenClaw is reachable.
   */
  isConnected(): boolean {
    return this.status.connected;
  }

  // --------------------------------------------------------------------------
  // Chat / AI Reasoning
  // --------------------------------------------------------------------------

  /**
   * Send a message to OpenClaw for AI processing.
   */
  async chat(message: string, context?: { agent?: string; sessionId?: string; systemPrompt?: string; data?: any }): Promise<string> {
    if (this.status.method === "http") {
      return this.httpChat(message, context);
    }
    if (this.status.method === "cli") {
      return this.cliChat(message, context);
    }
    throw new Error("OpenClaw is not connected");
  }

  // --------------------------------------------------------------------------
  // Tool / Task Execution
  // --------------------------------------------------------------------------

  /**
   * Execute a tool or task through OpenClaw.
   */
  async executeTool(type: string, command: string, params?: Record<string, any>): Promise<any> {
    if (this.status.method === "http") {
      return this.httpExecute(type, command, params);
    }
    if (this.status.method === "cli") {
      return this.cliExecute(type, command, params);
    }
    throw new Error("OpenClaw is not connected");
  }

  // --------------------------------------------------------------------------
  // HTTP Methods
  // --------------------------------------------------------------------------

  private async tryHttpPing(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${config.openclawApiUrl}/health`, {
        signal: controller.signal,
        headers: config.openclawApiKey ? { Authorization: `Bearer ${config.openclawApiKey}` } : {},
      });
      clearTimeout(timeout);
      return res.ok;
    } catch {
      return false;
    }
  }

  private async httpChat(message: string, context?: any): Promise<string> {
    try {
      const res = await fetch(`${config.openclawApiUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.openclawApiKey ? { Authorization: `Bearer ${config.openclawApiKey}` } : {}),
        },
        body: JSON.stringify({ message, context }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenClaw HTTP ${res.status}: ${err}`);
      }

      const data = await res.json() as any;
      return data.response || data.message || data.text || JSON.stringify(data);
    } catch (err) {
      // If HTTP fails, try to fallback to CLI
      if (this.status.method === "http") {
        console.warn("HTTP chat failed, attempting CLI fallback...");
        const cliOk = await this.tryCliPing();
        if (cliOk) {
          this.status.method = "cli";
          return this.cliChat(message, context);
        }
      }
      throw err;
    }
  }

  private async httpExecute(type: string, command: string, params?: Record<string, any>): Promise<any> {
    try {
      const res = await fetch(`${config.openclawApiUrl}/api/execute`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(config.openclawApiKey ? { Authorization: `Bearer ${config.openclawApiKey}` } : {}),
        },
        body: JSON.stringify({ type, command, params }),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`OpenClaw HTTP ${res.status}: ${err}`);
      }

      return await res.json();
    } catch (err) {
      if (this.status.method === "http") {
        console.warn("HTTP execute failed, attempting CLI fallback...");
        const cliOk = await this.tryCliPing();
        if (cliOk) {
          this.status.method = "cli";
          return this.cliExecute(type, command, params);
        }
      }
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // CLI Fallback Methods
  // --------------------------------------------------------------------------

  private async tryCliPing(): Promise<boolean> {
    try {
      const { execSync } = require("child_process");
      const output = execSync("openclaw --version 2>/dev/null || echo NOTFOUND", {
        timeout: 5000,
        encoding: "utf-8",
      });
      return !output.includes("NOTFOUND");
    } catch {
      return false;
    }
  }

  private async cliChat(message: string, context?: any): Promise<string> {
    const { execSync } = require("child_process");
    const escapedMsg = message.replace(/'/g, "'\\''");
    const systemFlag = context?.systemPrompt
      ? `--system '${context.systemPrompt.replace(/'/g, "'\\''")}'`
      : "";

    try {
      const output = execSync(
        `openclaw chat ${systemFlag} '${escapedMsg}' 2>/dev/null`,
        { timeout: 60000, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
      );
      return output.trim();
    } catch (err: any) {
      throw new Error(`OpenClaw CLI chat failed: ${err.message}`);
    }
  }

  private async cliExecute(type: string, command: string, params?: Record<string, any>): Promise<any> {
    const { execSync } = require("child_process");
    const escapedCmd = command.replace(/'/g, "'\\''");

    try {
      // For shell type, execute directly
      if (type === "shell") {
        const output = execSync(escapedCmd, { timeout: 30000, encoding: "utf-8" });
        return { output: output.trim(), exitCode: 0 };
      }

      // For other types, pipe through openclaw
      const input = JSON.stringify({ type, command, params });
      const output = execSync(
        `echo '${input.replace(/'/g, "'\\''")}' | openclaw execute 2>/dev/null`,
        { timeout: 60000, encoding: "utf-8", maxBuffer: 10 * 1024 * 1024 }
      );
      try {
        return JSON.parse(output);
      } catch {
        return { output: output.trim() };
      }
    } catch (err: any) {
      throw new Error(`OpenClaw CLI execute failed: ${err.message}`);
    }
  }

  // --------------------------------------------------------------------------
  // Health Check
  // --------------------------------------------------------------------------

  private async healthCheck(): Promise<void> {
    const wasConnected = this.status.connected;

    if (this.status.method === "http" || this.status.method === "none") {
      const httpOk = await this.tryHttpPing();
      if (httpOk) {
        this.status.connected = true;
        this.status.method = "http";
        this.status.lastPing = new Date().toISOString();
        if (!wasConnected) console.log("✅ OpenClaw reconnected via HTTP");
        return;
      }
    }

    const cliOk = await this.tryCliPing();
    if (cliOk) {
      this.status.connected = true;
      this.status.method = "cli";
      this.status.lastPing = new Date().toISOString();
      if (!wasConnected) console.log("✅ OpenClaw reconnected via CLI");
    } else {
      this.status.connected = false;
      if (wasConnected) console.warn("⚠️  OpenClaw connection lost");
    }
  }
}

// Singleton
export const openclaw = new OpenClawService();
