import dotenv from "dotenv";
import path from "path";
import { GatewayConfig } from "./types";

dotenv.config();

export const config: GatewayConfig = {
  port: parseInt(process.env.PORT || "4100", 10),
  gatewayApiKey: process.env.GATEWAY_API_KEY || "",
  openclawApiUrl: process.env.OPENCLAW_API_URL || "http://localhost:3000",
  openclawApiKey: process.env.OPENCLAW_API_KEY || "",
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "https://sentinelintegratedgroup.com")
    .split(",")
    .map((s) => s.trim()),
  logLevel: process.env.LOG_LEVEL || "info",
  taskResultDir: path.resolve(process.env.TASK_RESULT_DIR || "./data/results"),
  maxConcurrentTasks: parseInt(process.env.MAX_CONCURRENT_TASKS || "5", 10),
};

// Validate critical config
export function validateConfig(): void {
  if (!config.gatewayApiKey || config.gatewayApiKey === "CHANGE_ME_generate_with_openssl_rand_hex_32") {
    console.error("FATAL: GATEWAY_API_KEY is not set. Generate one with: openssl rand -hex 32");
    process.exit(1);
  }
  if (config.gatewayApiKey.length < 32) {
    console.warn("WARNING: GATEWAY_API_KEY is shorter than 32 chars — consider using a longer key");
  }
}
