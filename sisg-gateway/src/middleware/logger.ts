import { Request, Response, NextFunction } from "express";
import { config } from "../config";

const COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function statusColor(code: number): string {
  if (code < 300) return COLORS.green;
  if (code < 400) return COLORS.yellow;
  return COLORS.red;
}

/**
 * Request logging middleware with timing.
 */
export function loggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const method = req.method;
  const path = req.path;

  // Skip verbose logging for health checks in production
  if (config.logLevel !== "debug" && path === "/health") {
    return next();
  }

  res.on("finish", () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const color = statusColor(status);
    const agent = req.body?.context?.agent || req.body?.agent || "—";
    const ts = new Date().toISOString().split("T")[1].split(".")[0];

    console.log(
      `${COLORS.dim}${ts}${COLORS.reset} ${COLORS.cyan}${method.padEnd(6)}${COLORS.reset} ${path} ${color}${status}${COLORS.reset} ${COLORS.dim}${duration}ms${COLORS.reset}${agent !== "—" ? ` ${COLORS.magenta}@${agent}${COLORS.reset}` : ""}`
    );
  });

  next();
}
