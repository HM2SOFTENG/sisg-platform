import { Request, Response, NextFunction } from "express";
import { loginRequestSchema, refreshSessionRequestSchema } from "@sisg/schemas";
import { logSecurityEvent } from "../services/security-audit.js";
import { isFileAuthMode } from "../services/auth-store.js";
import {
  cleanupExpiredAuthSessions,
  loginWithPassword,
  refreshAccessSession,
  revokeAccessToken,
  verifyAccessToken,
} from "../services/auth-service.js";

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

// Rate limiter: Map<ip, { count: number, resetAt: number }>
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getClientIp(req: Request): string {
  return (
    (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
    req.socket.remoteAddress ||
    "unknown"
  );
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return false;
  }

  entry.count++;
  return true;
}

function resolveLoginEmail(email?: string): string | undefined {
  if (email) {
    return email;
  }

  if (process.env.NODE_ENV === "production" && !isFileAuthMode()) {
    return undefined;
  }

  return process.env.AUTH_BOOTSTRAP_EMAIL || "admin@sentinelintegratedgroup.com";
}

// Periodic cleanup of expired tokens and stale rate limit entries
setInterval(() => {
  const now = Date.now();
  void cleanupExpiredAuthSessions();

  // Clean up stale rate limit entries
  Array.from(rateLimitMap.entries()).forEach(([ip, { resetAt }]) => {
    if (now > resetAt) {
      rateLimitMap.delete(ip);
    }
  });
}, CLEANUP_INTERVAL_MS);

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const ip = getClientIp(req);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    logSecurityEvent({
      action: "admin.auth.missing_bearer",
      outcome: "denied",
      actor: { type: "admin", ip },
      target: req.path,
      metadata: { method: req.method },
    });
    return res.status(401).json({ error: "Authentication required" });
  }

  void verifyAccessToken(authHeader.slice(7))
    .then((session) => {
      if (!session) {
        logSecurityEvent({
          action: "admin.auth.invalid_token",
          outcome: "denied",
          actor: { type: "admin", ip },
          target: req.path,
          metadata: { method: req.method },
        });
        res.status(401).json({ error: "Invalid or expired token" });
        return;
      }

      req.auth = {
        sessionId: session.refreshToken || session.accessToken,
        user: session.user,
        roles: session.roles,
      };
      next();
    })
    .catch(() => {
      res.status(500).json({ error: "Authentication verification failed" });
    });
}

export function requireRoles(...requiredRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const activeRoles = req.auth?.roles || [];
    if (!activeRoles.some((role) => requiredRoles.includes(role))) {
      logSecurityEvent({
        action: "admin.auth.insufficient_role",
        outcome: "denied",
        actor: {
          type: "admin",
          id: req.auth?.user.id,
          label: req.auth?.user.email,
          ip: getClientIp(req),
        },
        target: req.path,
        metadata: { method: req.method, requiredRoles, activeRoles },
      });
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}

export function loginHandler(req: Request, res: Response) {
  const ip = getClientIp(req);

  if (!checkRateLimit(ip)) {
    logSecurityEvent({
      action: "admin.login.rate_limited",
      outcome: "denied",
      actor: { type: "admin", ip },
      target: req.path,
      metadata: { method: req.method },
    });
    return res.status(429).json({ error: "Too many login attempts. Try again later." });
  }

  const parsed = loginRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const email = resolveLoginEmail(parsed.data.email);

  void loginWithPassword({
    email,
    password: parsed.data.password,
    ip,
    userAgent: req.get("user-agent") || undefined,
  })
    .then((session) => {
      if (!session) {
        logSecurityEvent({
          action: "admin.login.failed",
          outcome: "failure",
          actor: { type: "admin", ip },
          target: req.path,
          metadata: { method: req.method, email: email || null },
        });
        res.status(401).json({ error: "Invalid email or password" });
        return;
      }

      logSecurityEvent({
        action: "admin.login.succeeded",
        outcome: "success",
        actor: { type: "admin", ip },
        target: req.path,
        metadata: { method: req.method, email: session.user.email, roles: session.roles },
      });

      res.json({ success: true, ...session });
    })
    .catch((error) => {
      console.error("Login error", error);
      res.status(500).json({ error: "Failed to create session" });
    });
}

export function logoutHandler(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  const ip = getClientIp(req);
  if (authHeader?.startsWith("Bearer ")) {
    void revokeAccessToken(authHeader.slice(7));
  }
  logSecurityEvent({
    action: "admin.logout",
    outcome: "success",
    actor: { type: "admin", ip },
    target: req.path,
    metadata: { method: req.method },
  });
  res.json({ success: true });
}

export function verifyHandler(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.json({ authenticated: false });
  }

  void verifyAccessToken(authHeader.slice(7))
    .then((session) => {
      if (!session) {
        res.json({ authenticated: false });
        return;
      }

      res.json({ authenticated: true, ...session });
    })
    .catch(() => {
      res.status(500).json({ error: "Failed to verify session" });
    });
}

export function refreshHandler(req: Request, res: Response) {
  const parsed = refreshSessionRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "refreshToken is required" });
  }

  const ip = getClientIp(req);
  void refreshAccessSession({
    refreshToken: parsed.data.refreshToken,
    ip,
    userAgent: req.get("user-agent") || undefined,
  })
    .then((session) => {
      if (!session) {
        logSecurityEvent({
          action: "admin.session.refresh.failed",
          outcome: "failure",
          actor: { type: "admin", ip },
          target: req.path,
          metadata: { method: req.method },
        });
        res.status(401).json({ error: "Invalid or expired refresh token" });
        return;
      }

      logSecurityEvent({
        action: "admin.session.refresh.succeeded",
        outcome: "success",
        actor: { type: "admin", id: session.user.id, label: session.user.email, ip },
        target: req.path,
        metadata: { method: req.method, roles: session.roles },
      });
      res.json(session);
    })
    .catch((error) => {
      console.error("Refresh error", error);
      res.status(500).json({ error: "Failed to refresh session" });
    });
}
