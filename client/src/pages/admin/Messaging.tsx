/**
 * Messaging — SISG Internal Chat
 * Fixes:
 *   Bug 1: Real-time polling (5s) for new messages — no page refresh needed
 *   Bug 2: Sender identity shown on every message bubble
 *   Bug 3: "New Message" button opens a compose modal to start a DM or channel message
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import DashboardLayout from "@/components/DashboardLayout";
import UserProfileModal from "@/components/UserProfileModal";
import {
  MessageSquare, Plus, Send, X, Users, Hash, Search, Loader2,
  RefreshCw, ChevronRight, Clock, CheckCheck,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface Message {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  content: string;
  createdAt: string;
}

interface Channel {
  id: string;
  name: string;
  type: "dm" | "channel";
  members: string[];
  displayNames?: Record<string, string>;
  createdAt: string;
}

interface KnownUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

// ============================================================================
// HELPERS
// ============================================================================

function getToken() {
  return localStorage.getItem("sisg_admin_token") || "";
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

function getCurrentUser() {
  // In this single-admin setup, the logged-in user is always Brian Smith.
  // A future multi-user system would pull this from the auth context.
  return {
    id: "brian",
    name: "Brian Smith",
    email: "brian@sisg.io",
  };
}

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString();
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function channelDisplayName(ch: Channel, currentUserEmail: string): string {
  if (ch.type === "channel") return `#${ch.name}`;
  // For DMs, show the other person's name
  const other = ch.members.find((m) => m !== currentUserEmail);
  if (ch.displayNames && other && ch.displayNames[other]) {
    return ch.displayNames[other];
  }
  return other || ch.name;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "#0066ff", "#8b5cf6", "#00e5a0", "#ffb800", "#ff6b35", "#00d4ff", "#ff3b3b",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ============================================================================
// COMPOSE MODAL (Bug 3)
// ============================================================================

interface ComposeModalProps {
  onClose: () => void;
  onSent: (channelId: string) => void;
}

function ComposeModal({ onClose, onSent }: ComposeModalProps) {
  const me = getCurrentUser();
  const [users, setUsers] = useState<KnownUser[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [tab, setTab] = useState<"dm" | "channel">("dm");
  const [recipientQuery, setRecipientQuery] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<KnownUser | null>(null);
  const [channelName, setChannelName] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    apiFetch("/api/messages/users")
      .then((d) => setUsers(d.users || []))
      .catch(() => {});
    apiFetch("/api/messages/channels")
      .then((d) => setChannels((d.channels || []).filter((c: Channel) => c.type === "channel")))
      .catch(() => {});
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.email !== me.email &&
      (u.name.toLowerCase().includes(recipientQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(recipientQuery.toLowerCase()))
  );

  const filteredChannels = channels.filter((c) =>
    c.name.toLowerCase().includes(channelName.toLowerCase())
  );

  const handleSend = async () => {
    if (!content.trim()) { toast.error("Message content is required"); return; }

    setSending(true);
    try {
      let data: any;
      if (tab === "dm") {
        if (!selectedRecipient) { toast.error("Select a recipient"); setSending(false); return; }
        data = await apiFetch("/api/messages/send", {
          method: "POST",
          body: JSON.stringify({
            recipientName: selectedRecipient.name,
            recipientEmail: selectedRecipient.email,
            content,
            senderName: me.name,
            senderEmail: me.email,
            senderId: me.id,
          }),
        });
        toast.success(`Message sent to ${selectedRecipient.name}`);
        onSent(data.channel.id);
      } else {
        // Channel message — create channel if new name typed, else use selected
        let targetChannel = selectedChannel;
        if (!targetChannel && channelName.trim()) {
          // Create new channel
          const created = await apiFetch("/api/messages/channels", {
            method: "POST",
            body: JSON.stringify({ name: channelName.trim(), type: "channel", members: [me.email] }),
          });
          targetChannel = created.channel;
        }
        if (!targetChannel) { toast.error("Select or create a channel"); setSending(false); return; }
        data = await apiFetch(`/api/messages/channels/${targetChannel.id}/messages`, {
          method: "POST",
          body: JSON.stringify({
            content,
            senderId: me.id,
            senderName: me.name,
            senderEmail: me.email,
          }),
        });
        toast.success(`Message sent to #${targetChannel.name}`);
        onSent(targetChannel.id);
      }
      onClose();
    } catch (err: any) {
      toast.error(`Failed to send: ${err.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-[var(--card)] border border-[var(--border)] rounded-lg w-full max-w-md shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-[#0066ff]" />
            <h2 className="text-sm font-semibold text-[var(--foreground)]">New Message</h2>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)]">
          {(["dm", "channel"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs font-mono uppercase tracking-wider transition-colors border-b-2 ${
                tab === t
                  ? "border-[#0066ff] text-[#0066ff]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {t === "dm" ? (
                <span className="flex items-center justify-center gap-1"><Users className="w-3 h-3" /> Direct Message</span>
              ) : (
                <span className="flex items-center justify-center gap-1"><Hash className="w-3 h-3" /> Channel</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-4">
          {tab === "dm" ? (
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">Recipient</label>
              {selectedRecipient ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#0066ff]/10 border border-[#0066ff]/30 rounded">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                    style={{ backgroundColor: avatarColor(selectedRecipient.name) }}
                  >
                    {getInitials(selectedRecipient.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[var(--foreground)] truncate">{selectedRecipient.name}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)] truncate">{selectedRecipient.email}</p>
                  </div>
                  <button onClick={() => setSelectedRecipient(null)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                    <input
                      autoFocus
                      value={recipientQuery}
                      onChange={(e) => setRecipientQuery(e.target.value)}
                      placeholder="Search by name or email..."
                      className="w-full bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] pl-9 pr-3 py-2 font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[#0066ff]/40 rounded"
                    />
                  </div>
                  {recipientQuery && (
                    <div className="border border-[var(--border)] rounded bg-[var(--background)] max-h-36 overflow-y-auto">
                      {filteredUsers.length === 0 ? (
                        <p className="text-xs text-[var(--muted-foreground)] text-center py-3">No users found</p>
                      ) : (
                        filteredUsers.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => { setSelectedRecipient(u); setRecipientQuery(""); }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0"
                              style={{ backgroundColor: avatarColor(u.name) }}
                            >
                              {getInitials(u.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-[var(--foreground)] truncate">{u.name}</p>
                              <p className="text-[10px] text-[var(--muted-foreground)] truncate">{u.email}</p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">Channel</label>
              {selectedChannel ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#0066ff]/10 border border-[#0066ff]/30 rounded">
                  <Hash className="w-4 h-4 text-[#0066ff]" />
                  <span className="text-xs font-medium text-[var(--foreground)] flex-1">{selectedChannel.name}</span>
                  <button onClick={() => setSelectedChannel(null)} className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="relative">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                    <input
                      autoFocus
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      placeholder="Search channels or type new name..."
                      className="w-full bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] pl-9 pr-3 py-2 font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[#0066ff]/40 rounded"
                    />
                  </div>
                  {channelName && (
                    <div className="border border-[var(--border)] rounded bg-[var(--background)] max-h-36 overflow-y-auto">
                      {filteredChannels.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => { setSelectedChannel(c); setChannelName(c.name); }}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                        >
                          <Hash className="w-3.5 h-3.5 text-[var(--muted-foreground)]" />
                          <span className="text-xs text-[var(--foreground)]">{c.name}</span>
                        </button>
                      ))}
                      {filteredChannels.length === 0 && (
                        <div className="px-3 py-2">
                          <p className="text-[10px] text-[var(--muted-foreground)]">No existing channels. Will create <span className="font-bold text-[#0066ff]">#{channelName}</span></p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Message body */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono uppercase text-[var(--muted-foreground)]">Message</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend();
              }}
              placeholder="Type your message... (Ctrl+Enter to send)"
              rows={4}
              className="w-full bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] px-3 py-2 font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[#0066ff]/40 rounded resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="px-4 py-2 text-xs font-mono text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)] rounded transition-colors">
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !content.trim()}
              className="flex items-center gap-2 px-4 py-2 text-xs font-mono bg-[#0066ff] hover:bg-[#0055dd] disabled:opacity-40 text-white rounded transition-colors"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Send
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ============================================================================
// MESSAGE BUBBLE (Bug 2 — sender identity)
// ============================================================================

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  showSender: boolean;
  onAvatarClick: (id: string, name: string, email: string) => void;
}

function MessageBubble({ message, isMe, showSender, onAvatarClick }: MessageBubbleProps) {
  const color = avatarColor(message.senderName);
  return (
    <div className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0 self-end mb-0.5 cursor-pointer hover:opacity-80 transition-opacity"
        style={{ backgroundColor: color }}
        title={message.senderName}
        onClick={() => onAvatarClick(message.senderId, message.senderName, message.senderEmail)}
      >
        {getInitials(message.senderName)}
      </div>

      <div className={`flex flex-col max-w-[72%] ${isMe ? "items-end" : "items-start"}`}>
        {/* Sender name above bubble */}
        {showSender && (
          <span
            className="text-[10px] font-mono text-[var(--muted-foreground)] mb-0.5 px-1 cursor-pointer hover:text-[#0066ff] transition-colors"
            onClick={() => onAvatarClick(message.senderId, message.senderName, message.senderEmail)}
          >
            {isMe ? "You" : message.senderName}
          </span>
        )}

        {/* Bubble */}
        <div
          className={`px-3 py-2 text-sm break-words rounded-2xl ${
            isMe
              ? "bg-[#0066ff] text-white rounded-br-sm"
              : "bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] rounded-bl-sm"
          }`}
        >
          {message.content}
        </div>

        {/* Timestamp */}
        <span className="text-[9px] font-mono text-[var(--muted-foreground)] mt-0.5 px-1 flex items-center gap-1">
          {formatTime(message.createdAt)}
          {isMe && <CheckCheck className="w-3 h-3 text-[#00e5a0]" />}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// CHANNEL SIDEBAR
// ============================================================================

interface ChannelSidebarProps {
  channels: Channel[];
  selected: Channel | null;
  onSelect: (ch: Channel) => void;
  onNewMessage: () => void;
  currentUserEmail: string;
}

function ChannelSidebar({ channels, selected, onSelect, onNewMessage, currentUserEmail }: ChannelSidebarProps) {
  const dms = channels.filter((c) => c.type === "dm");
  const channelList = channels.filter((c) => c.type === "channel");

  const Section = ({ title, items }: { title: string; items: Channel[] }) => (
    <div className="mb-4">
      <p className="text-[9px] font-mono uppercase tracking-widest text-[var(--muted-foreground)] px-3 mb-1">{title}</p>
      {items.length === 0 && (
        <p className="text-[10px] text-[var(--muted-foreground)] px-3 italic">None yet</p>
      )}
      {items.map((ch) => {
        const isActive = selected?.id === ch.id;
        return (
          <button
            key={ch.id}
            onClick={() => onSelect(ch)}
            className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
              isActive
                ? "bg-[#0066ff]/15 border-l-2 border-[#0066ff] text-[var(--foreground)]"
                : "border-l-2 border-transparent text-[var(--muted-foreground)] hover:bg-white/[0.03] hover:text-[var(--foreground)]"
            }`}
          >
            {ch.type === "channel" ? (
              <Hash className="w-3.5 h-3.5 flex-shrink-0" />
            ) : (
              <div
                className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0"
                style={{ backgroundColor: avatarColor(channelDisplayName(ch, currentUserEmail)) }}
              >
                {getInitials(channelDisplayName(ch, currentUserEmail))}
              </div>
            )}
            <span className="text-xs truncate">{channelDisplayName(ch, currentUserEmail)}</span>
            {isActive && <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-[var(--sidebar)] border-r border-[var(--border)]">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#0066ff]" />
          <span className="text-sm font-semibold text-[var(--foreground)]">Messages</span>
        </div>
        {/* Bug 3 — New Message button triggers compose modal instead of toast */}
        <button
          onClick={onNewMessage}
          title="New Message"
          className="w-7 h-7 flex items-center justify-center bg-[#0066ff]/15 hover:bg-[#0066ff]/25 text-[#0066ff] rounded transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Channel list */}
      <nav className="flex-1 overflow-y-auto py-3">
        <Section title="Channels" items={channelList} />
        <Section title="Direct Messages" items={dms} />
      </nav>
    </div>
  );
}

// ============================================================================
// CHAT VIEW (Bug 1 — polling, Bug 2 — sender identity)
// ============================================================================

interface ChatViewProps {
  channel: Channel;
  currentUser: { id: string; name: string; email: string };
}

function ChatView({ channel, currentUser }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [profileUser, setProfileUser] = useState<{ id: string; name: string; email: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastTimestampRef = useRef<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const displayName =
    channel.type === "channel"
      ? `#${channel.name}`
      : channelDisplayName(channel, currentUser.email);

  // Fetch messages (full load or incremental poll)
  const fetchMessages = useCallback(
    async (since?: string) => {
      try {
        const url =
          `/api/messages/channels/${channel.id}/messages` +
          (since ? `?since=${encodeURIComponent(since)}` : "");
        const data = await apiFetch(url);
        const incoming: Message[] = data.messages || [];

        if (since) {
          // Append only new messages
          if (incoming.length > 0) {
            setMessages((prev) => {
              const existingIds = new Set(prev.map((m) => m.id));
              const newOnes = incoming.filter((m) => !existingIds.has(m.id));
              return newOnes.length > 0 ? [...prev, ...newOnes] : prev;
            });
            lastTimestampRef.current = incoming[incoming.length - 1].createdAt;
          }
        } else {
          setMessages(incoming);
          if (incoming.length > 0) {
            lastTimestampRef.current = incoming[incoming.length - 1].createdAt;
          }
          setLoading(false);
        }
      } catch {
        if (!since) setLoading(false);
      }
    },
    [channel.id]
  );

  // Initial load + start polling (Bug 1)
  useEffect(() => {
    setLoading(true);
    setMessages([]);
    lastTimestampRef.current = null;
    fetchMessages();

    // Poll every 5 seconds for new messages
    pollingRef.current = setInterval(() => {
      fetchMessages(lastTimestampRef.current ?? undefined);
    }, 5000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchMessages, channel.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);

    // Optimistic insert
    const optimistic: Message = {
      id: `opt-${Date.now()}`,
      channelId: channel.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderEmail: currentUser.email,
      content: text,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const data = await apiFetch(`/api/messages/channels/${channel.id}/messages`, {
        method: "POST",
        body: JSON.stringify({
          content: text,
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderEmail: currentUser.email,
        }),
      });
      // Replace optimistic with real message
      setMessages((prev) =>
        prev.map((m) => (m.id === optimistic.id ? data.message : m))
      );
      lastTimestampRef.current = data.message.createdAt;
    } catch {
      toast.error("Failed to send message");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Channel header */}
      <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          {channel.type === "channel" ? (
            <Hash className="w-4 h-4 text-[var(--muted-foreground)]" />
          ) : (
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
              style={{ backgroundColor: avatarColor(displayName) }}
            >
              {getInitials(displayName)}
            </div>
          )}
          <span className="font-semibold text-[var(--foreground)] text-sm">{displayName}</span>
        </div>
        <span className="text-[10px] font-mono text-[var(--muted-foreground)] flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Live · 5s refresh
        </span>
      </div>

      {/* Messages (Bug 2 — sender info on every message) */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-[var(--muted-foreground)]">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-[var(--muted-foreground)]">
            <MessageSquare className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((msg, i) => {
            const isMe = msg.senderId === currentUser.id || msg.senderEmail === currentUser.email;
            const prevMsg = messages[i - 1];
            const showSender =
              !prevMsg || prevMsg.senderId !== msg.senderId ||
              new Date(msg.createdAt).getTime() - new Date(prevMsg.createdAt).getTime() > 5 * 60 * 1000;
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isMe={isMe}
                showSender={showSender}
                onAvatarClick={(id, name, email) => setProfileUser({ id, name, email })}
              />
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t border-[var(--border)] flex-shrink-0">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={`Message ${displayName}...`}
            className="flex-1 bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] px-3 py-2.5 font-mono placeholder:text-[var(--muted-foreground)] focus:outline-none focus:border-[#0066ff]/40 rounded-lg"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="w-10 h-10 flex items-center justify-center bg-[#0066ff] hover:bg-[#0055dd] disabled:opacity-40 text-white rounded-lg transition-colors"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Profile modal */}
      {profileUser && (
        <UserProfileModal
          userId={profileUser.id}
          userName={profileUser.name}
          userEmail={profileUser.email}
          onClose={() => setProfileUser(null)}
          onSendMessage={() => setProfileUser(null)}
          onViewProfile={(id) => { window.location.href = `/u/${id}`; }}
        />
      )}
    </div>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function Messaging() {
  const currentUser = getCurrentUser();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [loadingChannels, setLoadingChannels] = useState(true);

  const fetchChannels = useCallback(async () => {
    try {
      const data = await apiFetch("/api/messages/channels");
      setChannels(data.channels || []);
    } catch {
      // Silently fail — server may not have any channels yet
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  useEffect(() => {
    fetchChannels();
    // Refresh channel list periodically in case new DMs appear from compose
    const interval = setInterval(fetchChannels, 10000);
    return () => clearInterval(interval);
  }, [fetchChannels]);

  const handleComposeSent = (channelId: string) => {
    fetchChannels().then(() => {
      // Navigate to the new/existing channel
      setChannels((prev) => {
        const ch = prev.find((c) => c.id === channelId);
        if (ch) setSelectedChannel(ch);
        return prev;
      });
    });
    setShowCompose(false);
  };

  // After channels load, select after compose
  useEffect(() => {
    if (!selectedChannel && channels.length > 0) {
      // Don't auto-select — let user choose
    }
  }, [channels, selectedChannel]);

  return (
    <DashboardLayout title="Messages">
      <div className="flex h-[calc(100vh-8rem)] -m-4 sm:-m-6 overflow-hidden border border-[var(--border)] rounded-lg">
        {/* Sidebar */}
        <div className="w-60 flex-shrink-0 hidden sm:flex flex-col">
          <ChannelSidebar
            channels={channels}
            selected={selectedChannel}
            onSelect={setSelectedChannel}
            onNewMessage={() => setShowCompose(true)}
            currentUserEmail={currentUser.email}
          />
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0">
          {selectedChannel ? (
            <ChatView channel={selectedChannel} currentUser={currentUser} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-[var(--muted-foreground)]">
              <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-medium mb-1">No conversation selected</p>
              <p className="text-xs mb-4">Pick a channel or DM from the sidebar, or start a new one.</p>
              <button
                onClick={() => setShowCompose(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#0066ff] hover:bg-[#0055dd] text-white text-xs font-mono rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                New Message
              </button>

              {/* Mobile: show channel list inline */}
              {channels.length > 0 && (
                <div className="sm:hidden mt-6 w-full max-w-sm space-y-1 px-4">
                  {channels.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => setSelectedChannel(ch)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded text-left hover:border-[#0066ff]/30 transition-colors"
                    >
                      {ch.type === "channel" ? (
                        <Hash className="w-4 h-4 text-[var(--muted-foreground)]" />
                      ) : (
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                          style={{ backgroundColor: avatarColor(channelDisplayName(ch, currentUser.email)) }}
                        >
                          {getInitials(channelDisplayName(ch, currentUser.email))}
                        </div>
                      )}
                      <span className="text-sm text-[var(--foreground)] truncate">
                        {channelDisplayName(ch, currentUser.email)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal (Bug 3) */}
      <AnimatePresence>
        {showCompose && (
          <ComposeModal
            onClose={() => setShowCompose(false)}
            onSent={handleComposeSent}
          />
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
