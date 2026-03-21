import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

const ADMIN_PIN = process.env.ADMIN_PIN || "SISG2026!";
const tokens = new Set<string>();

function generateToken(): string {
  const token = crypto.randomBytes(48).toString("hex");
  tokens.add(token);
  return token;
}

export function adminAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  if (!tokens.has(authHeader.slice(7))) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  next();
}

export function loginHandler(req: Request, res: Response) {
  const { password } = req.body;
  if (password !== ADMIN_PIN) {
    return res.status(401).json({ error: "Invalid password" });
  }
  res.json({ success: true, token: generateToken() });
}

export function logoutHandler(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) tokens.delete(authHeader.slice(7));
  res.json({ success: true });
}

export function verifyHandler(req: Request, res: Response) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return res.json({ authenticated: false });
  res.json({ authenticated: tokens.has(authHeader.slice(7)) });
}
