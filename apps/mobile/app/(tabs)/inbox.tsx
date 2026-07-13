import { useEffect, useMemo, useState } from "react";
import { InboxSurface, type InboxMessage, type InboxRecipient, type InboxThread } from "../../components/inbox";
import { useAuth } from "../../lib/auth";
import {
  createPendingMessage,
  fetchInboxRecipients,
  fetchInboxThreads,
  fetchThreadMessages,
  sendDirectMessage,
  sendThreadMessage,
} from "../../lib/inbox-messaging";

export default function InboxRoute() {
  const { apiBaseUrl, session } = useAuth();
  const [threads, setThreads] = useState<InboxThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, InboxMessage[]>>({});
  const [recipients, setRecipients] = useState<InboxRecipient[]>([]);
  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [messageError, setMessageError] = useState<string | null>(null);
  const [composeError, setComposeError] = useState<string | null>(null);

  const requestOptions = useMemo(() => {
    if (!session) {
      return null;
    }

    return {
      baseUrl: apiBaseUrl,
      session,
    };
  }, [apiBaseUrl, session]);

  useEffect(() => {
    let cancelled = false;

    async function loadThreads() {
      if (!requestOptions) {
        return;
      }

      setIsLoadingThreads(true);

      try {
        const nextThreads = await fetchInboxThreads(requestOptions);

        if (cancelled) {
          return;
        }

        setThreads(nextThreads);
        setSelectedThreadId((current) => {
          if (current && nextThreads.some((thread) => thread.id === current)) {
            return current;
          }

          return nextThreads[0]?.id ?? null;
        });
        setErrorMessage(null);
      } catch (error) {
        if (!cancelled) {
          setThreads([]);
          setErrorMessage(error instanceof Error ? error.message : "Failed to load inbox threads");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingThreads(false);
        }
      }
    }

    void loadThreads();

    return () => {
      cancelled = true;
    };
  }, [requestOptions]);

  useEffect(() => {
    if (!requestOptions || !selectedThreadId) {
      return;
    }

    const threadId = selectedThreadId;
    const options = requestOptions;
    let cancelled = false;

    async function loadMessages() {
      setIsLoadingMessages(true);

      try {
        const nextMessages = await fetchThreadMessages(threadId, options);

        if (cancelled) {
          return;
        }

        setMessages((current) => ({
          ...current,
          [threadId]: nextMessages,
        }));
        setMessageError(null);
      } catch (error) {
        if (!cancelled) {
          setMessageError(error instanceof Error ? error.message : "Failed to load thread messages");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMessages(false);
        }
      }
    }

    void loadMessages();

    return () => {
      cancelled = true;
    };
  }, [requestOptions, selectedThreadId]);

  useEffect(() => {
    if (!requestOptions) {
      return;
    }

    const options = requestOptions;
    let cancelled = false;

    async function loadRecipients() {
      setIsLoadingRecipients(true);

      try {
        const nextRecipients = await fetchInboxRecipients(options);

        if (!cancelled) {
          setRecipients(nextRecipients);
          setComposeError(null);
        }
      } catch (error) {
        if (!cancelled) {
          setComposeError(error instanceof Error ? error.message : "Failed to load recipients");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingRecipients(false);
        }
      }
    }

    void loadRecipients();

    return () => {
      cancelled = true;
    };
  }, [requestOptions]);

  useEffect(() => {
    if (!requestOptions || !selectedThreadId) {
      return;
    }

    const threadId = selectedThreadId;
    const options = requestOptions;
    const interval = setInterval(() => {
      void fetchThreadMessages(threadId, options)
        .then((nextMessages) => {
          setMessages((current) => ({
            ...current,
            [threadId]: nextMessages,
          }));
          setMessageError(null);
        })
        .catch(() => {});

      void fetchInboxThreads(options)
        .then((nextThreads) => {
          setThreads(nextThreads);
          setErrorMessage(null);
        })
        .catch(() => {});
    }, 15000);

    return () => clearInterval(interval);
  }, [requestOptions, selectedThreadId]);

  const selectedMessages = selectedThreadId ? messages[selectedThreadId] || [] : [];

  async function refreshInbox() {
    if (!requestOptions) {
      return;
    }

    setIsLoadingThreads(true);

    try {
      const nextThreads = await fetchInboxThreads(requestOptions);
      setThreads(nextThreads);
      setSelectedThreadId((current) => {
        if (current && nextThreads.some((thread) => thread.id === current)) {
          return current;
        }

        return nextThreads[0]?.id ?? null;
      });

      if (selectedThreadId) {
        const nextMessages = await fetchThreadMessages(selectedThreadId, requestOptions);
        setMessages((current) => ({
          ...current,
          [selectedThreadId]: nextMessages,
        }));
      }

      setErrorMessage(null);
      setMessageError(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to refresh inbox");
    } finally {
      setIsLoadingThreads(false);
    }
  }

  async function handleSendMessage(content: string) {
    if (!requestOptions || !selectedThreadId || !session) {
      return;
    }

    const pendingMessage = createPendingMessage(content, session);
    setIsSending(true);
    setMessageError(null);
    setMessages((current) => ({
      ...current,
      [selectedThreadId]: [...(current[selectedThreadId] || []), pendingMessage],
    }));
    setThreads((current) =>
      current.map((thread) =>
        thread.id === selectedThreadId
          ? {
              ...thread,
              preview: content,
              status: "live",
              unreadCount: 0,
              priorityLabel: thread.kind === "dm" ? "Direct line" : "Channel",
              updatedAt: pendingMessage.sentAt,
              updatedAtLabel: "Just now",
            }
          : thread,
      ),
    );

    try {
      const sentMessage = await sendThreadMessage(selectedThreadId, content, requestOptions);
      setMessages((current) => ({
        ...current,
        [selectedThreadId]: (current[selectedThreadId] || []).map((message) =>
          message.id === pendingMessage.id ? sentMessage : message,
        ),
      }));
    } catch (error) {
      setMessages((current) => ({
        ...current,
        [selectedThreadId]: (current[selectedThreadId] || []).map((message) =>
          message.id === pendingMessage.id ? { ...message, state: "failed" } : message,
        ),
      }));
      setMessageError(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsSending(false);
      void refreshInbox();
    }
  }

  async function handleCreateMessage(recipient: InboxRecipient, content: string) {
    if (!requestOptions) {
      return;
    }

    setIsSending(true);
    setComposeError(null);

    try {
      const result = await sendDirectMessage(recipient, content, requestOptions);
      const nextThreads = await fetchInboxThreads(requestOptions);
      setThreads(nextThreads);
      setSelectedThreadId(result.channelId);
      const nextMessages = await fetchThreadMessages(result.channelId, requestOptions);
      setMessages((current) => ({
        ...current,
        [result.channelId]: nextMessages,
      }));
    } catch (error) {
      setComposeError(error instanceof Error ? error.message : "Failed to create direct message");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <InboxSurface
      threads={threads}
      selectedThreadId={selectedThreadId}
      selectedMessages={selectedMessages}
      recipients={recipients}
      isLoadingThreads={isLoadingThreads}
      isLoadingMessages={isLoadingMessages}
      isLoadingRecipients={isLoadingRecipients}
      isSending={isSending}
      errorMessage={errorMessage}
      messageError={messageError}
      composeError={composeError}
      onRefresh={refreshInbox}
      onSelectThread={(thread) => {
        setSelectedThreadId(thread.id);
        setMessageError(null);
      }}
      onSendMessage={handleSendMessage}
      onCreateMessage={handleCreateMessage}
    />
  );
}
