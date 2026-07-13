export type InboxThreadStatus = "live" | "awaiting_reply" | "escalated" | "resolved";

export type InboxParticipantRole = "client" | "operator" | "agent";

export type InboxMessageState = "sent" | "pending" | "failed";

export interface InboxParticipant {
  id: string;
  name: string;
  role: InboxParticipantRole;
  email?: string | null;
}

export interface InboxMessage {
  id: string;
  author: InboxParticipant;
  body: string;
  sentAt: string;
  sentAtLabel: string;
  isOwn: boolean;
  state: InboxMessageState;
}

export interface InboxThread {
  id: string;
  kind: "dm" | "channel";
  title: string;
  preview: string;
  status: InboxThreadStatus;
  team: string;
  unreadCount: number;
  priorityLabel: string;
  updatedAt: string | null;
  updatedAtLabel: string;
  participants: InboxParticipant[];
  nextStep?: string;
}

export interface InboxRecipient {
  id: string;
  name: string;
  email: string;
  role: string | null;
}
