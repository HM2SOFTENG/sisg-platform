import rateLimit from "express-rate-limit";

/**
 * Rate limiter — 100 requests per minute per IP.
 */
export const rateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests — limit is 100/minute",
    code: "RATE_LIMIT",
  },
});
