import { Router, Request, Response } from "express";
import { openclaw } from "../services/openclaw";
import { ChatRequest, ChatResponse } from "../types";

// ============================================================================
// Chat / AI Routes
// ============================================================================

const router = Router();

/**
 * POST /api/chat — Send a message to OpenClaw for AI processing.
 *
 * Body: { message, context?, stream? }
 *
 * Context can include:
 *   - agent: which agent persona to use
 *   - sessionId: continue a previous session
 *   - systemPrompt: override the system prompt
 *   - data: additional context data
 */
router.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { message, context, stream } = req.body as ChatRequest;

    if (!message || typeof message !== "string") {
      res.status(400).json({
        success: false,
        error: "Missing or invalid 'message' field (must be a non-empty string)",
        code: "VALIDATION",
      });
      return;
    }

    if (!openclaw.isConnected()) {
      res.status(503).json({
        success: false,
        error: "OpenClaw is not connected — try again shortly",
        code: "OPENCLAW_OFFLINE",
      });
      return;
    }

    // TODO: Streaming support (future enhancement)
    if (stream) {
      res.status(501).json({
        success: false,
        error: "Streaming not yet implemented",
        code: "NOT_IMPLEMENTED",
      });
      return;
    }

    const response = await openclaw.chat(message, context);

    const chatResponse: ChatResponse = {
      success: true,
      response,
      sessionId: context?.sessionId,
    };

    res.json(chatResponse);
  } catch (err: any) {
    console.error("Chat error:", err);

    // Differentiate between OpenClaw errors and internal errors
    if (err.message?.includes("OpenClaw")) {
      res.status(502).json({
        success: false,
        error: err.message,
        code: "OPENCLAW_ERROR",
      });
    } else {
      res.status(500).json({
        success: false,
        error: err.message || "Internal server error",
        code: "INTERNAL",
      });
    }
  }
});

export default router;
