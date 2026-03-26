import express, { Router, Request, Response } from "express";
import { adminAuth } from "../middleware/auth.js";
import { storage } from "../services/storage.js";

const router: Router = express.Router();

// ============================================================================
// MESSAGES API
// Data model:
//   Message { id, channelId, senderId, senderName, senderEmail, content,
//              createdAt, updatedAt }
//   Channel { id, name, type ("dm"|"channel"), members: string[], createdAt }
// ============================================================================

// --- Channels ---

// GET /api/messages/channels — list all channels
router.get("/api/messages/channels", adminAuth, async (req: Request, res: Response) => {
  try {
    const channels = storage.getCollection("msg_channels") || [];
    res.json({ channels });
  } catch {
    res.status(500).json({ error: "Failed to fetch channels" });
  }
});

// POST /api/messages/channels — create a channel or DM
router.post("/api/messages/channels", adminAuth, async (req: Request, res: Response) => {
  try {
    const { name, type = "channel", members = [] } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });

    const channel = storage.addToCollection("msg_channels", {
      name,
      type,
      members,
    });
    res.status(201).json({ channel });
  } catch {
    res.status(500).json({ error: "Failed to create channel" });
  }
});

// --- Messages ---

// GET /api/messages/channels/:channelId/messages — fetch messages for a channel
// Supports ?since=<ISO timestamp> for polling
router.get(
  "/api/messages/channels/:channelId/messages",
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;
      const { since, limit = "100" } = req.query as Record<string, string>;

      let messages = (storage.getCollection("msg_messages") || []).filter(
        (m: any) => m.channelId === channelId
      );

      // Filter by since timestamp for efficient polling
      if (since) {
        const sinceDate = new Date(since).getTime();
        messages = messages.filter(
          (m: any) => new Date(m.createdAt).getTime() > sinceDate
        );
      }

      // Sort ascending, limit
      messages = messages
        .sort(
          (a: any, b: any) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        )
        .slice(-parseInt(limit, 10));

      res.json({ messages });
    } catch {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  }
);

// POST /api/messages/channels/:channelId/messages — send a message
router.post(
  "/api/messages/channels/:channelId/messages",
  adminAuth,
  async (req: Request, res: Response) => {
    try {
      const { channelId } = req.params;
      const { content, senderId, senderName, senderEmail } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ error: "content is required" });
      }
      if (!senderName) {
        return res.status(400).json({ error: "senderName is required" });
      }

      // Verify channel exists
      const channels = storage.getCollection("msg_channels") || [];
      const channel = channels.find((c: any) => c.id === channelId);
      if (!channel) {
        return res.status(404).json({ error: "Channel not found" });
      }

      const message = storage.addToCollection("msg_messages", {
        channelId,
        senderId: senderId || "unknown",
        senderName,
        senderEmail: senderEmail || "",
        content: content.trim(),
      });

      res.status(201).json({ message });
    } catch {
      res.status(500).json({ error: "Failed to send message" });
    }
  }
);

// POST /api/messages/send — send a new direct message (creates DM channel if needed)
router.post("/api/messages/send", adminAuth, async (req: Request, res: Response) => {
  try {
    const { recipientName, recipientEmail, content, senderName, senderEmail, senderId } =
      req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: "content is required" });
    }
    if (!senderName) {
      return res.status(400).json({ error: "senderName is required" });
    }
    if (!recipientName) {
      return res.status(400).json({ error: "recipientName is required" });
    }

    // Find or create DM channel between sender and recipient
    const channels = storage.getCollection("msg_channels") || [];
    const dmName = [senderEmail || senderName, recipientEmail || recipientName]
      .sort()
      .join("|");

    let channel = channels.find(
      (c: any) => c.type === "dm" && c.name === dmName
    );

    if (!channel) {
      channel = storage.addToCollection("msg_channels", {
        name: dmName,
        type: "dm",
        members: [senderEmail || senderName, recipientEmail || recipientName],
        displayNames: {
          [senderEmail || senderName]: senderName,
          [recipientEmail || recipientName]: recipientName,
        },
      });
    }

    const message = storage.addToCollection("msg_messages", {
      channelId: channel.id,
      senderId: senderId || "unknown",
      senderName,
      senderEmail: senderEmail || "",
      content: content.trim(),
    });

    res.status(201).json({ message, channel });
  } catch {
    res.status(500).json({ error: "Failed to send message" });
  }
});

// GET /api/messages/users — list known users for recipient picker
router.get("/api/messages/users", adminAuth, async (_req: Request, res: Response) => {
  try {
    const team = storage.getCollection("team") || [];
    // Map team members to a simple user list
    const users = team.map((m: any) => ({
      id: m.id,
      name: m.name || m.displayName || "Unknown",
      email: m.email || "",
      role: m.role || m.position || "",
    }));
    res.json({ users });
  } catch {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

export default router;
