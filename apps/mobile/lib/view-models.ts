export type ContractCardVM = {
  id: string;
  title: string;
  clientName: string;
  status: "draft" | "active" | "rfp" | "completed" | "unknown";
  value: number | null;
  startDate: string | null;
  endDate: string | null;
  ownerName: string | null;
  summary: string;
  paymentTerms: string | null;
  tags: string[];
};

export type ProjectCardVM = {
  id: string;
  title: string;
  client: string;
  status: "active" | "planning" | "in_progress" | "completed" | "unknown";
  priority: string | null;
  budget: number | null;
  teamSize: number | null;
  dueLabel: string | null;
  progress: number;
  color: string | null;
  summary: string;
  capabilities: string[];
};

export type InboxThreadVM = {
  id: string;
  kind: "dm" | "channel";
  title: string;
  participantNames: string[];
  lastMessagePreview: string;
  lastMessageAt: string | null;
  lastSenderName: string | null;
  unreadCount: number;
};

export type MessageVM = {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderEmail: string | null;
  body: string;
  createdAt: string;
  isOwn: boolean;
};

export type AgentCardVM = {
  id: string;
  slug: string;
  name: string;
  handle: string | null;
  category: string;
  status: string;
  schedule: string | null;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastResult: string | null;
  errorCount: number;
  successCount: number;
  totalRuns: number;
  capabilities: string[];
  summary: string;
};

export type NotificationVM = {
  id: string;
  source: "activity" | "sisg-agent" | "clawbot" | "digest";
  title: string;
  body: string;
  severity: "info" | "warning" | "critical" | "success";
  createdAt: string | null;
  actionLabel: string | null;
  actionTarget: string | null;
  relatedEntityId: string | null;
};

export type ProfileVM = {
  id: string;
  name: string;
  role: string;
  department: string | null;
  email: string | null;
  status: string | null;
  joinDate: string | null;
  initials: string | null;
  bio: string;
  clearance: string | null;
  utilization: number | null;
  skills: string[];
  certifications: string[];
};
