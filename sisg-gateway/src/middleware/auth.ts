import { Request, Response, NextFunction } from "express";
import { config } from "../config";

/**
 * Bearer token authentication middleware.
 * Skips auth for /health endpoint.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Allow health check without auth
  if (req.path === "/health") {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: "Authorization header required",
      code: "AUTH_FAILED",
    });
    return;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    res.status(401).json({
      success: false,
      error: "Authorization header must be: Bearer <token>",
      code: "AUTH_FAILED",
    });
    return;
  }

  const token = parts[1];
  if (token !== config.gatewayApiKey) {
    res.status(401).json({
      success: false,
      error: "Invalid API key",
      code: "AUTH_FAILED",
    });
    return;
  }

  next();
}
