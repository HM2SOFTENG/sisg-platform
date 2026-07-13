import type { AuthSession } from "@sisg/types";
import type {
  AgentCardVM,
  ContractCardVM,
  InboxThreadVM,
  MessageVM,
  NotificationVM,
  ProfileVM,
  ProjectCardVM,
} from "./view-models";

type RequestOptions = {
  baseUrl: string;
  session: AuthSession;
};

async function requestJson(path: string, options: RequestOptions): Promise<any> {
  const response = await fetch(new URL(path, options.baseUrl.endsWith("/") ? options.baseUrl : options.baseUrl + "/").toString(), {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${options.session.accessToken}`,
    },
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : `Request failed with status ${response.status}`);
  }

  return response.json();
}

function normalizeContractStatus(value: unknown): ContractCardVM["status"] {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "draft" || normalized === "active" || normalized === "rfp" || normalized === "completed") {
    return normalized;
  }
  return "unknown";
}

function normalizeProjectStatus(value: unknown): ProjectCardVM["status"] {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "active") return "active";
  if (normalized === "planning") return "planning";
  if (normalized === "completed") return "completed";
  if (normalized === "in progress" || normalized === "in_progress") return "in_progress";
  return "unknown";
}

export async function fetchContractCards(options: RequestOptions): Promise<ContractCardVM[]> {
  const contracts = (await requestJson("/api/admin/contracts", options)) as any[];
  return contracts.map((contract) => ({
    id: String(contract.id),
    title: contract.name || contract.title || "Untitled contract",
    clientName: contract.client || contract.clientName || "Confidential client",
    status: normalizeContractStatus(contract.status),
    value: typeof contract.value === "number" ? contract.value : null,
    startDate: contract.startDate || null,
    endDate: contract.endDate || null,
    ownerName: contract.ownerName || null,
    summary: contract.summary || contract.description || "",
    paymentTerms: contract.paymentTerms || null,
    tags: Array.isArray(contract.tags) ? contract.tags : [],
  }));
}

export async function fetchProjectCards(options: RequestOptions): Promise<ProjectCardVM[]> {
  const projects = (await requestJson("/api/public/projects", options)) as any[];
  return projects.map((project) => ({
    id: String(project.id),
    title: project.title || project.name || "Untitled project",
    client: project.client || "Confidential client",
    status: normalizeProjectStatus(project.status),
    priority: project.priority || null,
    budget: typeof project.budget === "number" ? project.budget : null,
    teamSize: typeof project.team === "number" ? project.team : null,
    dueLabel: project.due || null,
    progress: typeof project.progress === "number" ? project.progress : 0,
    color: project.color || null,
    summary: project.summary || project.description || "",
    capabilities: Array.isArray(project.capabilities) ? project.capabilities : [],
  }));
}

export async function fetchInboxThreads(options: RequestOptions): Promise<InboxThreadVM[]> {
  const channelsPayload = await requestJson("/api/messages/channels", options);
  const channels = Array.isArray(channelsPayload.channels) ? channelsPayload.channels : [];

  const threads = await Promise.all(
    channels.map(async (channel: any) => {
      const messagePayload = await requestJson(`/api/messages/channels/${channel.id}/messages?limit=50`, options);
      const messages = Array.isArray(messagePayload.messages) ? messagePayload.messages : [];
      const lastMessage = messages[messages.length - 1];
      const participantNames: unknown[] =
        channel.displayNames && typeof channel.displayNames === "object"
          ? Object.values(channel.displayNames)
          : Array.isArray(channel.members)
            ? channel.members
            : [];

      return {
        id: String(channel.id),
        kind: channel.type === "dm" ? "dm" : "channel",
        title: channel.type === "dm" ? participantNames.join(" / ") : channel.name || "Channel",
        participantNames: participantNames.map((value) => String(value)),
        lastMessagePreview: lastMessage?.content || "No messages yet",
        lastMessageAt: lastMessage?.createdAt || null,
        lastSenderName: lastMessage?.senderName || null,
        unreadCount: channel.type === "dm" && lastMessage ? 1 : 0,
      } satisfies InboxThreadVM;
    }),
  );

  return threads.sort((a, b) => (b.lastMessageAt || "").localeCompare(a.lastMessageAt || ""));
}

export async function fetchThreadMessages(
  channelId: string,
  options: RequestOptions,
): Promise<MessageVM[]> {
  const payload = await requestJson(`/api/messages/channels/${channelId}/messages?limit=100`, options);
  const messages = Array.isArray(payload.messages) ? payload.messages : [];
  return messages.map((message: any) => ({
    id: String(message.id),
    threadId: String(message.channelId),
    senderId: String(message.senderId || ""),
    senderName: message.senderName || "Unknown",
    senderEmail: message.senderEmail || null,
    body: message.content || "",
    createdAt: message.createdAt || new Date().toISOString(),
    isOwn: Boolean(options.session.user.email && message.senderEmail === options.session.user.email),
  }));
}

export async function fetchAgentCards(options: RequestOptions): Promise<AgentCardVM[]> {
  const payload = await requestJson("/api/admin/agents/dashboard", options);
  const agents = Array.isArray(payload?.data?.agents) ? payload.data.agents : [];
  return agents.map((agent: any) => ({
    id: String(agent.id || agent.slug),
    slug: String(agent.slug),
    name: agent.name || agent.slug,
    handle: agent.handle || null,
    category: agent.category || "general",
    status: agent.status || "unknown",
    schedule: agent.schedule || null,
    nextRunAt: agent.nextRun || null,
    lastRunAt: agent.lastRun && agent.lastRun !== "never" ? agent.lastRun : null,
    lastResult: agent.lastResult || null,
    errorCount: typeof agent.errorCount === "number" ? agent.errorCount : 0,
    successCount: typeof agent.successCount === "number" ? agent.successCount : 0,
    totalRuns: typeof agent.totalRuns === "number" ? agent.totalRuns : 0,
    capabilities: Array.isArray(agent.capabilities) ? agent.capabilities : [],
    summary: agent.description || "",
  }));
}

export async function fetchNotifications(options: RequestOptions): Promise<NotificationVM[]> {
  const [activityPayload, agentPayload] = await Promise.all([
    requestJson("/api/admin/activity", options).catch(() => []),
    requestJson("/api/admin/agents/dashboard", options).catch(() => ({ data: { agents: [], latestRuns: {} } })),
  ]);

  const activity = Array.isArray(activityPayload) ? activityPayload : [];
  const agentRuns = agentPayload?.data?.latestRuns && typeof agentPayload.data.latestRuns === "object"
    ? Object.entries(agentPayload.data.latestRuns)
    : [];

  const activityNotifications = activity.map((item: any) => ({
    id: String(item.id),
    source: "activity",
    title: item.title || item.type || "Activity",
    body: item.details || "",
    severity: item.severity === "critical" || item.severity === "warning" || item.severity === "success" ? item.severity : "info",
    createdAt: item.createdAt || null,
    actionLabel: "Open",
    actionTarget: null,
    relatedEntityId: String(item.id),
  })) as NotificationVM[];

  const agentNotifications = agentRuns.map(([slug, run]: [string, any]) => ({
    id: `agent-${slug}`,
    source: "sisg-agent",
    title: `${slug} latest run`,
    body: run?.summary || run?.status || "Latest agent execution summary available.",
    severity: run?.status === "failed" ? "warning" : "info",
    createdAt: run?.startedAt || null,
    actionLabel: "Inspect",
    actionTarget: slug,
    relatedEntityId: slug,
  })) as NotificationVM[];

  return [...activityNotifications, ...agentNotifications].sort(
    (a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""),
  );
}

export async function fetchProfile(options: RequestOptions): Promise<ProfileVM> {
  const teamPayload = (await requestJson("/api/public/team", options)) as any[];
  const candidate = teamPayload[0] || {};

  return {
    id: String(candidate.id || options.session.user.id),
    name: candidate.name || options.session.user.displayName,
    role: candidate.role || options.session.user.roles[0] || "Operator",
    department: candidate.dept || candidate.department || null,
    email: options.session.user.email,
    status: "active",
    joinDate: null,
    initials: candidate.initials || null,
    bio: candidate.bio || "",
    clearance: candidate.clearance || null,
    utilization: typeof candidate.utilization === "number" ? candidate.utilization : null,
    skills: Array.isArray(candidate.skills) ? candidate.skills : [],
    certifications: Array.isArray(candidate.certifications) ? candidate.certifications : [],
  };
}
