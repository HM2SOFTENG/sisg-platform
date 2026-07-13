import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import { storage } from "./storage.js";

export type SecurityActor = {
  type: "admin" | "service" | "public";
  id?: string;
  label?: string;
  ip?: string;
};

export type SecurityAuditEvent = {
  id: string;
  timestamp: string;
  action: string;
  outcome: "success" | "failure" | "denied";
  actor: SecurityActor;
  target?: string;
  metadata?: Record<string, unknown>;
};

const COLLECTION = "security_audit_log";
const MAX_EVENTS = 2000;

function redactValue(key: string, value: unknown): unknown {
  const lowered = key.toLowerCase();
  if (
    lowered.includes("password") ||
    lowered.includes("token") ||
    lowered.includes("secret") ||
    lowered.includes("authorization") ||
    lowered.includes("cookie") ||
    lowered.includes("apiKey".toLowerCase())
  ) {
    return "[REDACTED]";
  }

  if (typeof value === "string" && value.length > 500) {
    return `${value.slice(0, 500)}…[truncated]`;
  }

  return value;
}

export function sanitizeMetadata(
  metadata?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!metadata) return undefined;

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, redactValue(key, value)])
  );
}

export function logSecurityEvent(event: Omit<SecurityAuditEvent, "id" | "timestamp">): SecurityAuditEvent {
  const entry: SecurityAuditEvent = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ...event,
    metadata: sanitizeMetadata(event.metadata),
  };

  const existing = storage.getCollection(COLLECTION) || [];
  existing.unshift(entry);
  storage.write(COLLECTION, existing.slice(0, MAX_EVENTS));
  return entry;
}

export function auditAdminAction(action: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    res.on("finish", () => {
      const statusCode = res.statusCode;
      const outcome =
        statusCode < 400 ? "success" : statusCode === 401 || statusCode === 403 ? "denied" : "failure";

      logSecurityEvent({
        action,
        outcome,
        actor: {
          type: "admin",
          id: req.auth?.user.id,
          label: req.auth?.user.email,
          ip:
            (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
            req.socket.remoteAddress ||
            "unknown",
        },
        target: req.originalUrl,
        metadata: {
          method: req.method,
          statusCode,
          bodyKeys: req.body && typeof req.body === "object" ? Object.keys(req.body as Record<string, unknown>) : [],
        },
      });
    });

    next();
  };
}
