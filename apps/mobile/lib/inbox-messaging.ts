import type { AuthSession } from "@sisg/types";
import type { InboxRecipient, InboxThread, InboxThreadStatus, InboxMessage } from "../components/inbox";

type RequestOptions = {
  baseUrl: string;
  session: AuthSession;
};

type ChannelPayload = {
  id: string | number;
  name?: string;
  type?: "dm" | "channel";
  members?: unknown[];
  displayNames?: Record<string, string>;
  createdAt?: string;
};

type MessagePayload = {
  id: string | number;
  channelId?: string | number;
  senderId?: string | number;
  senderName?: string;
  senderEmail?: string;
  content?: string;
  createdAt?: string;
};

async function requestJson(path: string, options: RequestOptions, init?: RequestInit): Promise<any> {
  const response = await fetch(
    new URL(path, options.baseUrl.endsWith("/") ? options.baseUrl : `${options.baseUrl}/`).toString(),
    {
      ...init,
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${options.session.accessToken}`,
        ...(init?.body ? { "Content-Type": "application/json" } : null),
        ...(init?.headers || {}),
      },
    },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : `Request failed with status ${response.status}`);
  }

  return response.json();
}

function getParticipantNames(channel: ChannelPayload): string[] {
  if (channel.displayNames && typeof channel.displayNames === "object") {
    return Object.values(channel.displayNames).map((value) => String(value));
  }

  if (Array.isArray(channel.members)) {
    return channel.members.map((value) => String(value));
  }

  return [];
}

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) {
    return "No activity";
  }

  const timestamp = new Date(value).getTime();

  if (Number.isNaN(timestamp)) {
    return "Recent";
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));

  if (diffSeconds < 60) return "Just now";
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatMessageTime(value: string | null | undefined): string {
  if (!value) {
    return "Pending";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Pending";
  }

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getThreadStatus(lastMessage: MessagePayload | undefined, currentUserEmail: string | null | undefined): InboxThreadStatus {
  const createdAt = lastMessage?.createdAt ? new Date(lastMessage.createdAt).getTime() : Number.NaN;

  if (Number.isFinite(createdAt) && Date.now() - createdAt > 1000 * 60 * 60 * 72) {
    return "resolved";
  }

  if (lastMessage?.senderEmail && currentUserEmail && lastMessage.senderEmail !== currentUserEmail) {
    return "awaiting_reply";
  }

  return "live";
}

function getPriorityLabel(status: InboxThreadStatus, kind: "dm" | "channel"): string {
  if (status === "awaiting_reply") return "Needs reply";
  if (status === "resolved") return "Quiet lane";
  return kind === "dm" ? "Direct line" : "Channel";
}

function getTeamLabel(kind: "dm" | "channel"): string {
  return kind === "dm" ? "Direct message" : "Team channel";
}

function mapThreadMessage(message: MessagePayload, session: AuthSession): InboxMessage {
  const senderName = message.senderName || "Unknown";
  const senderEmail = message.senderEmail || null;
  const isOwn = Boolean(session.user.email && senderEmail && senderEmail === session.user.email);

  return {
    id: String(message.id),
    body: message.content || "",
    sentAt: message.createdAt || new Date().toISOString(),
    sentAtLabel: formatMessageTime(message.createdAt),
    isOwn,
    state: "sent",
    author: {
      id: String(message.senderId || senderEmail || senderName),
      name: senderName,
      role: isOwn ? "operator" : "client",
      email: senderEmail,
    },
  };
}

async function fetchChannelMessages(channelId: string, options: RequestOptions, limit = 100): Promise<MessagePayload[]> {
  const payload = await requestJson(`/api/messages/channels/${channelId}/messages?limit=${limit}`, options);
  return Array.isArray(payload.messages) ? payload.messages : [];
}

export async function fetchInboxThreads(options: RequestOptions): Promise<InboxThread[]> {
  const channelsPayload = await requestJson("/api/messages/channels", options);
  const channels = Array.isArray(channelsPayload.channels) ? channelsPayload.channels : [];

  const threads = await Promise.all(
    channels.map(async (rawChannel: ChannelPayload) => {
      const kind = rawChannel.type === "dm" ? "dm" : "channel";
      const messages = await fetchChannelMessages(String(rawChannel.id), options, 50);
      const lastMessage = messages[messages.length - 1];
      const status = getThreadStatus(lastMessage, options.session.user.email);
      const participants = getParticipantNames(rawChannel);
      const title =
        kind === "dm"
          ? participants.filter((name) => name !== options.session.user.displayName).join(" / ") || participants[0] || "Direct message"
          : rawChannel.name || "Channel";

      return {
        id: String(rawChannel.id),
        kind,
        title,
        preview: lastMessage?.content || "No messages yet",
        status,
        team: getTeamLabel(kind),
        unreadCount: status === "awaiting_reply" ? 1 : 0,
        priorityLabel: getPriorityLabel(status, kind),
        updatedAt: lastMessage?.createdAt || rawChannel.createdAt || null,
        updatedAtLabel: formatRelativeTime(lastMessage?.createdAt || rawChannel.createdAt || null),
        participants: participants.map((name) => ({
          id: name,
          name,
          role: name === options.session.user.displayName ? "operator" : "client",
        })),
        nextStep:
          status === "awaiting_reply"
            ? `Reply to ${lastMessage?.senderName || "the latest sender"}`
            : kind === "channel"
              ? "Monitor the shared lane for new operator updates."
              : "Keep this line warm for the next handoff.",
      } satisfies InboxThread;
    }),
  );

  return threads.sort((a, b) => (b.updatedAt || "").localeCompare(a.updatedAt || ""));
}

export async function fetchThreadMessages(channelId: string, options: RequestOptions): Promise<InboxMessage[]> {
  const messages = await fetchChannelMessages(channelId, options, 100);
  return messages.map((message) => mapThreadMessage(message, options.session));
}

export async function fetchInboxRecipients(options: RequestOptions): Promise<InboxRecipient[]> {
  const payload = await requestJson("/api/messages/users", options);
  const users = Array.isArray(payload.users) ? payload.users : [];

  return users
    .map((user: any) => ({
      id: String(user.id || user.email || user.name),
      name: user.name || user.email || "Unknown user",
      email: user.email || "",
      role: user.role || null,
    }))
    .filter((user: InboxRecipient) => user.email && user.email !== options.session.user.email);
}

export async function sendThreadMessage(
  channelId: string,
  content: string,
  options: RequestOptions,
): Promise<InboxMessage> {
  const payload = await requestJson(`/api/messages/channels/${channelId}/messages`, options, {
    method: "POST",
    body: JSON.stringify({
      content,
      senderId: options.session.user.id,
      senderName: options.session.user.displayName || options.session.user.email || "Operator",
      senderEmail: options.session.user.email || "",
    }),
  });

  return mapThreadMessage(payload.message as MessagePayload, options.session);
}

export async function sendDirectMessage(
  recipient: InboxRecipient,
  content: string,
  options: RequestOptions,
): Promise<{ channelId: string; message: InboxMessage }> {
  const payload = await requestJson("/api/messages/send", options, {
    method: "POST",
    body: JSON.stringify({
      recipientName: recipient.name,
      recipientEmail: recipient.email,
      content,
      senderId: options.session.user.id,
      senderName: options.session.user.displayName || options.session.user.email || "Operator",
      senderEmail: options.session.user.email || "",
    }),
  });

  return {
    channelId: String(payload.channel?.id),
    message: mapThreadMessage(payload.message as MessagePayload, options.session),
  };
}

export function createPendingMessage(content: string, session: AuthSession): InboxMessage {
  const sentAt = new Date().toISOString();
  return {
    id: `pending-${Date.now()}`,
    body: content,
    sentAt,
    sentAtLabel: formatMessageTime(sentAt),
    isOwn: true,
    state: "pending",
    author: {
      id: String(session.user.id),
      name: session.user.displayName || session.user.email || "Operator",
      role: "operator",
      email: session.user.email || null,
    },
  };
}
