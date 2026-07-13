import type { NextFunction, Request, Response } from "express";
import { logSecurityEvent } from "../services/security-audit.js";

type RateLimitOptions = {
  key: string;
  windowMs: number;
  maxRequests: number;
  message?: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function bucketKey(req: Request, key: string): string {
  return `${key}:${getClientIp(req)}`;
}

export function createRateLimit(options: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = bucketKey(req, options.key);
    const existing = buckets.get(key);

    if (!existing || now > existing.resetAt) {
      buckets.set(key, { count: 1, resetAt: now + options.windowMs });
      next();
      return;
    }

    if (existing.count >= options.maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader("Retry-After", retryAfterSeconds.toString());
      logSecurityEvent({
        action: `rate_limit.${options.key}`,
        outcome: "denied",
        actor: { type: "public", ip: getClientIp(req) },
        target: req.originalUrl,
        metadata: { method: req.method, maxRequests: options.maxRequests, windowMs: options.windowMs },
      });
      res.status(429).json({ error: options.message || "Too many requests. Try again later." });
      return;
    }

    existing.count += 1;
    next();
  };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (now > bucket.resetAt) {
      buckets.delete(key);
    }
  }
}, 5 * 60 * 1000);
