import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { colors, radii, spacing } from "@sisg/ui-tokens";
import type { InboxMessage, InboxRecipient, InboxThread, InboxThreadStatus } from "./types";

export interface InboxSurfaceProps {
  title?: string;
  subtitle?: string;
  threads: InboxThread[];
  selectedThreadId: string | null;
  selectedMessages: InboxMessage[];
  recipients: InboxRecipient[];
  errorMessage?: string | null;
  messageError?: string | null;
  composeError?: string | null;
  isLoadingThreads?: boolean;
  isLoadingMessages?: boolean;
  isLoadingRecipients?: boolean;
  isSending?: boolean;
  onRefresh?: () => void;
  onSelectThread?: (thread: InboxThread) => void;
  onSendMessage?: (content: string) => Promise<void> | void;
  onCreateMessage?: (recipient: InboxRecipient, content: string) => Promise<void> | void;
}

export function InboxSurface({
  title = "Inbox",
  subtitle = "Live operator messaging across direct lines and internal channels.",
  threads,
  selectedThreadId,
  selectedMessages,
  recipients,
  errorMessage,
  messageError,
  composeError,
  isLoadingThreads = false,
  isLoadingMessages = false,
  isLoadingRecipients = false,
  isSending = false,
  onRefresh,
  onSelectThread,
  onSendMessage,
  onCreateMessage,
}: InboxSurfaceProps) {
  const [query, setQuery] = useState("");
  const [replyDraft, setReplyDraft] = useState("");
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeQuery, setComposeQuery] = useState("");
  const [composeDraft, setComposeDraft] = useState("");
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filteredThreads = useMemo(
    () =>
      threads.filter((thread) => {
        if (!normalizedQuery) {
          return true;
        }

        return [
          thread.title,
          thread.preview,
          thread.team,
          thread.priorityLabel,
          thread.nextStep || "",
        ].some((value) => value.toLowerCase().includes(normalizedQuery));
      }),
    [normalizedQuery, threads],
  );

  const selectedThread =
    filteredThreads.find((thread) => thread.id === selectedThreadId) ||
    threads.find((thread) => thread.id === selectedThreadId) ||
    filteredThreads[0] ||
    null;
  const unreadCount = threads.reduce((sum, thread) => sum + thread.unreadCount, 0);
  const urgentCount = threads.filter((thread) => thread.status === "awaiting_reply" || thread.status === "escalated").length;
  const liveCount = threads.filter((thread) => thread.status === "live").length;
  const normalizedComposeQuery = composeQuery.trim().toLowerCase();
  const filteredRecipients = recipients.filter((recipient) => {
    if (!normalizedComposeQuery) {
      return true;
    }

    return [recipient.name, recipient.email, recipient.role || ""].some((value) =>
      value.toLowerCase().includes(normalizedComposeQuery),
    );
  });
  const selectedRecipient =
    recipients.find((recipient) => recipient.id === selectedRecipientId) || filteredRecipients[0] || null;

  useEffect(() => {
    if (!composeOpen) {
      setComposeDraft("");
      setComposeQuery("");
      setSelectedRecipientId(null);
    }
  }, [composeOpen]);

  async function handleReply() {
    const content = replyDraft.trim();

    if (!content || !onSendMessage) {
      return;
    }

    setReplyDraft("");
    await onSendMessage(content);
  }

  async function handleCreateMessage() {
    const content = composeDraft.trim();

    if (!content || !selectedRecipient || !onCreateMessage) {
      return;
    }

    await onCreateMessage(selectedRecipient, content);
    setComposeOpen(false);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.heroCard}>
        <View style={styles.heroGlowPrimary} />
        <View style={styles.heroGlowSecondary} />
        <View style={styles.heroHeader}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>OPERATOR MESSAGING</Text>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          </View>
          <View style={styles.heroActions}>
            <Pressable onPress={onRefresh} style={[styles.secondaryButton, styles.compactButton]}>
              <Text style={styles.secondaryButtonText}>Refresh</Text>
            </Pressable>
            <Pressable onPress={() => setComposeOpen((current) => !current)} style={[styles.primaryButton, styles.compactButton]}>
              <Text style={styles.primaryButtonText}>{composeOpen ? "Close" : "New message"}</Text>
            </Pressable>
          </View>
        </View>
        <View style={styles.metricRow}>
          <MetricCard label="Unread" value={String(unreadCount)} accent={colors.accent} />
          <MetricCard label="Needs reply" value={String(urgentCount)} accent={colors.warning} />
          <MetricCard label="Live" value={String(liveCount)} accent={colors.success} />
        </View>
      </View>

      {composeOpen ? (
        <View style={styles.composeCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Start a direct line</Text>
            <Text style={styles.sectionMeta}>{filteredRecipients.length} operators available</Text>
          </View>
          <TextInput
            value={composeQuery}
            onChangeText={setComposeQuery}
            placeholder="Search by name, email, or role"
            placeholderTextColor={colors.muted}
            style={styles.searchInput}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isLoadingRecipients ? (
            <View style={styles.inlineFeedback}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.feedbackBody}>Loading recipient roster.</Text>
            </View>
          ) : null}
          {!isLoadingRecipients && filteredRecipients.length > 0 ? (
            <View style={styles.stack}>
              {filteredRecipients.slice(0, 6).map((recipient) => (
                <Pressable
                  key={recipient.id}
                  onPress={() => setSelectedRecipientId(recipient.id)}
                  style={[
                    styles.recipientCard,
                    recipient.id === selectedRecipient?.id ? styles.recipientCardActive : null,
                  ]}
                >
                  <View style={styles.recipientCopy}>
                    <Text style={styles.recipientName}>{recipient.name}</Text>
                    <Text style={styles.recipientMeta}>{recipient.role || recipient.email}</Text>
                  </View>
                  <Text style={styles.recipientEmail}>{recipient.email}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          {!isLoadingRecipients && filteredRecipients.length === 0 ? (
            <EmptyCard
              title="No recipients match"
              body="Try a different operator name or email to open a direct message lane."
            />
          ) : null}
          <TextInput
            value={composeDraft}
            onChangeText={setComposeDraft}
            placeholder={selectedRecipient ? `Message ${selectedRecipient.name}` : "Select a recipient first"}
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, styles.composerInput]}
            multiline
            textAlignVertical="top"
          />
          {composeError ? <ErrorCard title="Compose blocked" message={composeError} /> : null}
          <Pressable
            onPress={() => {
              void handleCreateMessage();
            }}
            style={[styles.primaryButton, !selectedRecipient || !composeDraft.trim() || isSending ? styles.buttonDisabled : null]}
            disabled={!selectedRecipient || !composeDraft.trim() || isSending}
          >
            <Text style={styles.primaryButtonText}>{isSending ? "Sending..." : "Open conversation"}</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.searchCard}>
        <Text style={styles.searchLabel}>Search conversations</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Recipient, channel, message, next step"
          placeholderTextColor={colors.muted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {errorMessage ? <ErrorCard title="Inbox needs attention" message={errorMessage} /> : null}

      {isLoadingThreads ? (
        <View style={styles.feedbackCard}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.feedbackTitle}>Syncing threads</Text>
          <Text style={styles.feedbackBody}>Pulling the latest channel and direct-message activity.</Text>
        </View>
      ) : null}

      {!isLoadingThreads && filteredThreads.length === 0 ? (
        <EmptyCard
          title="Inbox is clear"
          body="No conversations match the current search. Try another operator, channel, or message keyword."
        />
      ) : null}

      {!isLoadingThreads && filteredThreads.length > 0 ? (
        <>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Active lanes</Text>
            <Text style={styles.sectionMeta}>{filteredThreads.length} visible threads</Text>
          </View>
          <View style={styles.stack}>
            {filteredThreads.map((thread) => (
              <ThreadListCard
                key={thread.id}
                thread={thread}
                isActive={thread.id === selectedThread?.id}
                onPress={() => onSelectThread?.(thread)}
              />
            ))}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Thread detail</Text>
            <Text style={styles.sectionMeta}>{selectedThread?.updatedAtLabel || "No activity"}</Text>
          </View>
          {selectedThread ? (
            <ThreadDetailCard
              thread={selectedThread}
              messages={selectedMessages}
              isLoading={isLoadingMessages}
              isSending={isSending}
              draft={replyDraft}
              messageError={messageError}
              onChangeDraft={setReplyDraft}
              onSend={() => {
                void handleReply();
              }}
            />
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}

function MetricCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={[styles.metricAccent, { backgroundColor: accent }]} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function ThreadListCard({
  thread,
  isActive,
  onPress,
}: {
  thread: InboxThread;
  isActive: boolean;
  onPress?: () => void;
}) {
  const tone = getThreadTone(thread.status);

  return (
    <Pressable onPress={onPress} style={[styles.threadCard, isActive ? styles.threadCardActive : null]}>
      <View style={styles.threadRow}>
        <Text style={styles.threadTeam}>{thread.team}</Text>
        <View style={[styles.statusPill, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
          <Text style={[styles.statusPillText, { color: tone.color }]}>{formatThreadStatus(thread.status)}</Text>
        </View>
      </View>
      <Text style={styles.threadSubject}>{thread.title}</Text>
      <Text style={styles.threadPreview}>{thread.preview}</Text>
      <View style={styles.threadRow}>
        <Text style={styles.threadMeta}>{thread.priorityLabel}</Text>
        <Text style={styles.threadMeta}>{thread.updatedAtLabel}</Text>
      </View>
      <View style={styles.threadFooter}>
        <Text style={styles.threadParticipants}>
          {thread.participants.map((participant) => participant.name.split(" ")[0]).join(" / ")}
        </Text>
        {thread.unreadCount > 0 ? (
          <View style={styles.unreadBubble}>
            <Text style={styles.unreadBubbleText}>{thread.unreadCount}</Text>
          </View>
        ) : (
          <Text style={styles.threadMeta}>Current</Text>
        )}
      </View>
    </Pressable>
  );
}

function ThreadDetailCard({
  thread,
  messages,
  isLoading,
  isSending,
  draft,
  messageError,
  onChangeDraft,
  onSend,
}: {
  thread: InboxThread;
  messages: InboxMessage[];
  isLoading: boolean;
  isSending: boolean;
  draft: string;
  messageError?: string | null;
  onChangeDraft: (value: string) => void;
  onSend: () => void;
}) {
  return (
    <View style={styles.previewCard}>
      <View style={styles.previewHeader}>
        <View style={styles.previewHeaderCopy}>
          <Text style={styles.previewTitle}>{thread.title}</Text>
          <Text style={styles.previewSubtitle}>{thread.nextStep || "No outstanding action."}</Text>
        </View>
        <View style={styles.previewBadge}>
          <Text style={styles.previewBadgeText}>{thread.priorityLabel}</Text>
        </View>
      </View>
      {isLoading ? (
        <View style={styles.inlineFeedback}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.feedbackBody}>Loading message history.</Text>
        </View>
      ) : null}
      {!isLoading && messages.length === 0 ? (
        <EmptyCard title="No messages yet" body="This lane exists, but it has not carried any message traffic yet." />
      ) : null}
      {!isLoading && messages.length > 0 ? (
        <View style={styles.stack}>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </View>
      ) : null}
      {messageError ? <ErrorCard title="Reply blocked" message={messageError} /> : null}
      <View style={styles.replyCard}>
        <Text style={styles.searchLabel}>Reply</Text>
        <TextInput
          value={draft}
          onChangeText={onChangeDraft}
          placeholder="Write the next operator update"
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, styles.composerInput]}
          multiline
          textAlignVertical="top"
        />
        <Pressable
          onPress={onSend}
          style={[styles.primaryButton, !draft.trim() || isSending ? styles.buttonDisabled : null]}
          disabled={!draft.trim() || isSending}
        >
          <Text style={styles.primaryButtonText}>{isSending ? "Sending..." : "Send reply"}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function MessageBubble({ message }: { message: InboxMessage }) {
  const bubbleTone =
    message.state === "failed"
      ? styles.messageFailed
      : message.state === "pending"
        ? styles.messagePending
        : null;

  return (
    <View style={[styles.messageBubble, message.isOwn ? styles.messageOwn : styles.messageOther, bubbleTone]}>
      <View style={styles.threadRow}>
        <Text style={styles.messageAuthor}>{message.author.name}</Text>
        <Text style={styles.messageTime}>
          {message.state === "failed" ? "Failed" : message.state === "pending" ? "Sending..." : message.sentAtLabel}
        </Text>
      </View>
      <Text style={styles.messageBody}>{message.body}</Text>
    </View>
  );
}

function ErrorCard({ title, message }: { title: string; message: string }) {
  return (
    <View style={[styles.feedbackCard, styles.errorCard]}>
      <Text style={styles.feedbackTitle}>{title}</Text>
      <Text style={styles.feedbackBody}>{message}</Text>
    </View>
  );
}

function EmptyCard({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.feedbackCard}>
      <Text style={styles.feedbackTitle}>{title}</Text>
      <Text style={styles.feedbackBody}>{body}</Text>
    </View>
  );
}

function formatThreadStatus(status: InboxThreadStatus): string {
  switch (status) {
    case "awaiting_reply":
      return "Awaiting reply";
    case "escalated":
      return "Escalated";
    case "resolved":
      return "Resolved";
    default:
      return "Live";
  }
}

function getThreadTone(status: InboxThreadStatus) {
  switch (status) {
    case "awaiting_reply":
      return {
        backgroundColor: "rgba(245, 158, 11, 0.12)",
        borderColor: "rgba(245, 158, 11, 0.35)",
        color: colors.warning,
      };
    case "escalated":
      return {
        backgroundColor: "rgba(239, 68, 68, 0.12)",
        borderColor: "rgba(239, 68, 68, 0.35)",
        color: colors.danger,
      };
    case "resolved":
      return {
        backgroundColor: "rgba(16, 185, 129, 0.12)",
        borderColor: "rgba(16, 185, 129, 0.35)",
        color: colors.success,
      };
    default:
      return {
        backgroundColor: "rgba(34, 211, 238, 0.12)",
        borderColor: "rgba(34, 211, 238, 0.35)",
        color: colors.accent,
      };
  }
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xl * 2,
    gap: spacing.lg,
  },
  heroCard: {
    position: "relative",
    overflow: "hidden",
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.28)",
    backgroundColor: colors.surface,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroGlowPrimary: {
    position: "absolute",
    right: -72,
    top: -72,
    height: 180,
    width: 180,
    borderRadius: 90,
    backgroundColor: "rgba(34, 211, 238, 0.14)",
  },
  heroGlowSecondary: {
    position: "absolute",
    left: -48,
    bottom: -64,
    height: 160,
    width: 160,
    borderRadius: 80,
    backgroundColor: "rgba(37, 99, 235, 0.12)",
  },
  heroHeader: {
    gap: spacing.md,
  },
  heroCopy: {
    gap: spacing.sm,
  },
  heroActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  heroTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
  },
  heroSubtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  compactButton: {
    flex: 1,
  },
  primaryButton: {
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButton: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  metricRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricCard: {
    flex: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metricAccent: {
    height: 3,
    width: 28,
    borderRadius: radii.pill,
  },
  metricValue: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "700",
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  composeCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.md,
  },
  searchCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  searchLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6,
  },
  searchInput: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.background,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 15,
  },
  composerInput: {
    minHeight: 112,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
  },
  sectionMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  stack: {
    gap: spacing.sm,
  },
  feedbackCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  inlineFeedback: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  feedbackTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  feedbackBody: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    flexShrink: 1,
  },
  errorCard: {
    borderColor: "rgba(239, 68, 68, 0.32)",
  },
  recipientCard: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surfaceAlt,
    padding: spacing.md,
    gap: spacing.xs,
  },
  recipientCardActive: {
    borderColor: "rgba(34, 211, 238, 0.42)",
    backgroundColor: colors.surface,
  },
  recipientCopy: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  recipientName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  recipientMeta: {
    color: colors.accent,
    fontSize: 12,
  },
  recipientEmail: {
    color: colors.muted,
    fontSize: 12,
  },
  threadCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.sm,
  },
  threadCardActive: {
    borderColor: "rgba(34, 211, 238, 0.42)",
    shadowColor: colors.accent,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  threadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  threadTeam: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: "700",
  },
  statusPill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  threadSubject: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  threadPreview: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  threadMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  threadFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
  },
  threadParticipants: {
    color: colors.text,
    fontSize: 12,
    flex: 1,
  },
  unreadBubble: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  unreadBubbleText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  previewCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
    backgroundColor: colors.surface,
    padding: spacing.md,
    gap: spacing.md,
  },
  previewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  previewHeaderCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  previewTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
  },
  previewSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  previewBadge: {
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  previewBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "700",
  },
  messageBubble: {
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  messageOwn: {
    backgroundColor: "rgba(37, 99, 235, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.28)",
  },
  messageOther: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.surfaceAlt,
  },
  messagePending: {
    opacity: 0.85,
  },
  messageFailed: {
    borderColor: "rgba(239, 68, 68, 0.4)",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
  },
  messageAuthor: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  messageTime: {
    color: colors.muted,
    fontSize: 11,
  },
  messageBody: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  replyCard: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceAlt,
    paddingTop: spacing.md,
  },
});
