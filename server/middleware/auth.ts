import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let ADMIN_PIN: string;

// Initialize admin PIN: require env var, or generate secure random PIN at startup
if (process.env.ADMIN_PIN) {
  ADMIN_PIN = process.env.ADMIN_PIN;
} else {
  ADMIN_PIN = crypto.randomBytes(16).toString("hex");
  console.warn(
    `[AUTH] No ADMIN_PIN environment variable set. Generated PIN for this session: ${ADMIN_PIN}`
  );
}

// Token storage: Map<token, { createdAt: number }>
const tokens = new Map<string, { createdAt: number }>();

// Rate limiter: Map<ip, { count: number, resetAt: number }>
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function generateToken(): string {
  const token = crypto.randomBytes(48).toString("hex");
  tokens.set(token, { createdAt: Date.now() });
  return token;
}

function isTokenExpired(createdAt: number): boolean {
  return Date.now() - createdAt > TOKEN_EXPIRY_MS;
}

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

// Periodic cleanup of expired tokens and stale rate limit entries
setInterval(() => {
  const now = Date.now();

  // Clean up expired tokens
  for (const [token, { createdAt }] of tokens.entries()) {
    if (isTokenExpired(createdAt)) {
      tokens.delete(token);
    }
  }

  // Clean up stale rate limit entries
  for (const [ip, { resetAt }] of rateLimitMap.entries()) {
    if (now > resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, CLEANUP_INTERVAL_MS);

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }

  const token = authHeader.slice(7);
  const tokenData = tokens.get(token);

  if (!tokenData) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  if (isTokenExpired(tokenData.createdAt)) {
    tokens.delete(token);
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  next();
}

export function loginHandler(req: Request, res: Response) {
  const ip = getClientIp(req);

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "Too many login attempts. Try again later." });
  }

  const { password } = req.body;
  if (password !== ADMIN_PIN) {
    return res.status(401).json({ error: "Invalid password" });
  }

  res.json({ success: true, token: generateToken() });
}

export function logoutHandler(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    tokens.delete(authHeader.slice(7));
  }
  res.json({ success: true });
}

export function verifyHandler(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.json({ authenticated: false });
  }

  const token = authHeader.slice(7);
  const tokenData = tokens.get(token);

  if (!tokenData) {
    return res.json({ authenticated: false });
  }

  if (isTokenExpired(tokenData.createdAt)) {
    tokens.delete(token);
    return res.json({ authenticated: false });
  }

  res.json({ authenticated: true });
}
