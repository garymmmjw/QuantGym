import { useEffect, useMemo, useState } from "react";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { EmptyState } from "../../components/common/EmptyState.jsx";

export function MessagesPageContent() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const t = appServices.t;
  const api = pageApi.messages;
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState("");
  const currentUser = pageApi.getCurrentUser();

  const threads = useMemo(() => api.getThreads?.() || [], [api, revision]);
  const storedSelected = api.getSelected();
  const selected = threads.some((thread) => thread.id === storedSelected) ? storedSelected : threads[0]?.id || "";

  useEffect(() => {
    if (selected && storedSelected !== selected) api.setSelected(selected);
    api.updateUnreadBadge?.();
    pageApi.refreshIcons?.();
  }, [api, pageApi, selected, storedSelected, revision]);

  const activeThread = threads.find((thread) => thread.id === selected);
  const currentId = currentUser?.id || "";

  const getOther = (thread) => {
    return thread?.participants?.find((p) => p.id !== currentId) || thread?.participants?.[0];
  };

  const selectThread = (threadId) => {
    api.setSelected(threadId);
    const store = api.loadCommunity?.();
    if (!store?.threads) return;
    store.threads = store.threads.map((thread) => {
      if (thread.id !== threadId) return thread;
      return api.normalizeThread?.({
        ...thread,
        messages: thread.messages.map((message) => ({
          ...message,
          readBy: message.readBy.includes(currentId) ? message.readBy : [...message.readBy, currentId]
        }))
      }) || thread;
    });
    api.setCommunity?.(store);
    api.saveCommunity?.();
    api.updateUnreadBadge?.();
    setRevision((v) => v + 1);
  };

  const send = (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !selected || !currentUser) return;
    const store = api.loadCommunity?.();
    if (!store?.threads) return;
    const now = new Date().toISOString();
    store.threads = store.threads.map((thread) => {
      if (thread.id !== selected) return thread;
      return api.normalizeThread?.({
        ...thread,
        messages: [...thread.messages, {
          id: pageApi.makeId?.(),
          senderId: currentUser.id,
          text,
          createdAt: now,
          readBy: [currentUser.id]
        }],
        updatedAt: now
      }) || thread;
    });
    api.setCommunity?.(store);
    api.saveCommunity?.();
    api.updateUnreadBadge?.();
    setDraft("");
    setRevision((v) => v + 1);
  };

  return (
    <section className="messages-section">
      <div className="section-heading">
        <div>
          <h2 id="messagesPageTitle">{t("messages")}</h2>
          <small id="messagesSummary">{t("messagesSummary")}</small>
        </div>
      </div>
      <div className="messages-layout">
        <aside className="message-thread-list" id="messageThreadList" aria-label={t("messageThreadListLabel") || "私信列表"}>
          {!threads.length ? <EmptyState title={t("messageEmpty")} /> : threads.map((thread) => {
            const other = getOther(thread);
            const last = thread.messages.at(-1);
            const unread = thread.messages.filter((m) => m.senderId !== currentId && !m.readBy.includes(currentId)).length;
            return (
              <button
                key={thread.id}
                type="button"
                className={`message-thread-item${thread.id === selected ? " active" : ""}`}
                data-message-thread={thread.id}
                aria-pressed={thread.id === selected}
                onClick={() => selectThread(thread.id)}
              >
                <span className="avatar">{other?.name?.slice(0, 1) || "Q"}</span>
                <span>
                  <strong>{other?.name}</strong>
                  <small>{last?.text || t("messageEmpty")}</small>
                </span>
                {unread ? <b>{unread}</b> : null}
              </button>
            );
          })}
        </aside>
        <section className="message-conversation" aria-live="polite">
          <div id="messageConversationHeader" className="message-conversation-header">
            {activeThread ? (
              <>
                <span className="avatar">
                  {getOther(activeThread)?.avatar ? <img src={getOther(activeThread)?.avatar} alt="" /> : pageApi.getInitials?.(getOther(activeThread)?.name)}
                </span>
                <div>
                  <strong>{getOther(activeThread)?.name}</strong>
                  <small>{activeThread.messages.length} {t("messageCountLabel") || "messages"}</small>
                </div>
              </>
            ) : (
              <>
                <strong>{t("messages")}</strong>
                <small>{t("messageEmpty")}</small>
              </>
            )}
          </div>
          <div id="messageConversationBody" className="message-conversation-body">
            {activeThread ? (
              activeThread.messages.map((message) => (
                <div key={message.id} className={`direct-message ${message.senderId === currentId ? "mine" : "theirs"}`}>
                  <p>{message.text}</p>
                  <small>{pageApi.formatDate?.(message.createdAt)}</small>
                </div>
              ))
            ) : (
              <EmptyState title={t("messageEmpty")} />
            )}
          </div>
          <form id="messageComposerForm" className={`message-composer${activeThread ? "" : " hidden"}`} onSubmit={send}>
            <input
              id="messageComposerInput"
              type="text"
              autoComplete="off"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t("messageComposerPlaceholder") || "写一条消息"}
              disabled={!activeThread}
            />
            <button
              className="icon-button accent"
              type="submit"
              title={t("messageSend") || "发送"}
              aria-label={t("messageSend") || "发送"}
              disabled={!activeThread}
            >
              <i data-lucide="send" />
            </button>
          </form>
        </section>
      </div>
    </section>
  );
}
