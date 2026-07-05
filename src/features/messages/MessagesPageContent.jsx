import { useEffect, useMemo, useRef, useState } from "react";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { parseStickerText, stickerLabel, stickerMessageText, useOwnedCosmetic } from "../shared/cosmetics.js";
import { StickerPicker } from "../shared/StickerPicker.jsx";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";

const quickReplies = (t) => [t("msgQuickReply1"), t("msgQuickReply2"), t("msgQuickReply3")];

/* Built-in Shark AI coach thread — the design's always-on bot conversation */
const BOT_ID = "bot-shark";
const BOT_THREAD_ID = "thread-shark-bot";
const BOT_AVATAR = "/assets/generated/playful-precision/avatar-happy-v2.png";
const BOT_HEADER_AVATAR = "/assets/generated/playful-precision/avatar-focused-v2.png";
const botCannedReplies = (t) => [t("msgBotReply1"), t("msgBotReply2"), t("msgBotReply3")];

const createInitialBotMessages = (t) => {
  const base = Date.now() - 45000;
  return [
    {
      id: "shark-bot-welcome",
      senderId: BOT_ID,
      text: t("msgSeedBotGreeting"),
      createdAt: new Date(base).toISOString(),
      readBy: [BOT_ID]
    },
    {
      id: "shark-bot-daily-pick",
      senderId: BOT_ID,
      text: t("msgSeedBotExample"),
      card: { tag: t("msgSeedCardTag"), formula: "E[max] = Σ x·(2x−1)/36 = 161/36 ≈ 4.47" },
      createdAt: new Date(base + 15000).toISOString(),
      readBy: [BOT_ID]
    }
  ];
};

const AVATAR_TONES_COUNT = 4;
const toneFor = (id = "") => {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return String(hash % AVATAR_TONES_COUNT);
};

const ONLINE_WINDOW_MS = 10 * 60 * 1000;

export function MessagesPageContent() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const t = appServices.t;
  const api = pageApi.messages;
  const [revision, setRevision] = useState(0);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [mobileView, setMobileView] = useState("list");
  const [botMessages, setBotMessages] = useState(() => createInitialBotMessages(t));
  const [botTyping, setBotTyping] = useState(false);
  const botTimerRef = useRef(null);
  const conversationBodyRef = useRef(null);
  const currentUser = pageApi.getCurrentUser();
  const currentId = currentUser?.id || "";
  // 讲师鲨鱼表情包 (shop item `teacher`): unowned users see no picker at all.
  const stickerPackOwned = useOwnedCosmetic("teacher");
  const [stickerOpen, setStickerOpen] = useState(false);

  useEffect(() => () => clearTimeout(botTimerRef.current), []);

  const botThread = useMemo(() => ({
    id: BOT_THREAD_ID,
    isBot: true,
    participants: [
      { id: currentId || "local-user", name: currentUser?.name || "Quant" },
      { id: BOT_ID, name: t("msgBotName"), avatar: BOT_AVATAR, isBot: true }
    ],
    messages: botMessages.map((message) => ({
      ...message,
      readBy: message.readBy.includes(currentId) ? message.readBy : [...message.readBy, currentId]
    })),
    updatedAt: botMessages.at(-1)?.createdAt || new Date().toISOString()
  }), [botMessages, currentId, currentUser]);

  const threads = useMemo(
    () => [botThread, ...(api.getThreads?.() || [])],
    [api, revision, botThread]
  );
  const storedSelected = api.getSelected();
  const selected = threads.some((thread) => thread.id === storedSelected) ? storedSelected : threads[0]?.id || "";

  useEffect(() => {
    if (selected && storedSelected !== selected) api.setSelected(selected);
    api.updateUnreadBadge?.();
  }, [api, selected, storedSelected, revision]);

  useScopedRefreshIcons(pageApi.refreshIcons, ".messages-section", [threads, selected, revision, stickerPackOwned, stickerOpen]);

  const activeThread = threads.find((thread) => thread.id === selected);

  useEffect(() => {
    setStickerOpen(false);
  }, [selected]);

  useEffect(() => {
    const body = conversationBodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [selected, activeThread?.messages?.length, botTyping]);

  const getOther = (thread) => {
    return thread?.participants?.find((p) => p.id !== currentId) || thread?.participants?.[0];
  };

  const isThreadOnline = (thread, other) => {
    if (other?.isBot) return true;
    const updated = new Date(thread?.updatedAt || 0).getTime();
    return Number.isFinite(updated) && Date.now() - updated < ONLINE_WINDOW_MS;
  };

  const formatRelativeTime = (iso) => {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const now = new Date();
    if (now.getTime() - date.getTime() < 60000) return t("msgJustNow");
    const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const dayDiff = Math.round((startOfDay(now) - startOfDay(date)) / 86400000);
    if (dayDiff <= 0) {
      return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
    }
    if (dayDiff === 1) return t("msgYesterday");
    if (dayDiff < 7) {
      const locale = pageApi.getLanguage?.() === "en" ? "en-US" : "zh-CN";
      return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(date);
    }
    return pageApi.formatDate?.(iso) || "";
  };

  const selectThread = (threadId) => {
    setMobileView("thread");
    api.setSelected(threadId);
    if (threadId === BOT_THREAD_ID) {
      setRevision((v) => v + 1);
      return;
    }
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

  const makeLocalId = () => pageApi.makeId?.() || `shark-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const sendToBot = (text) => {
    const now = new Date().toISOString();
    setBotMessages((messages) => [...messages, {
      id: makeLocalId(),
      senderId: currentId || "local-user",
      text,
      createdAt: now,
      readBy: [currentId || "local-user"]
    }]);
    setBotTyping(true);
    clearTimeout(botTimerRef.current);
    botTimerRef.current = setTimeout(() => {
      const replies = botCannedReplies(t);
      setBotMessages((messages) => [...messages, {
        id: makeLocalId(),
        senderId: BOT_ID,
        text: replies[Math.floor(Math.random() * replies.length)],
        createdAt: new Date().toISOString(),
        readBy: [BOT_ID]
      }]);
      setBotTyping(false);
    }, 1100);
  };

  /* Single delivery path for typed text AND stickers (sticker = real message
     whose text is the `[sticker:<id>]` token) — no parallel message channel. */
  const deliverText = (text) => {
    if (!text || !selected || !currentUser) return false;
    if (selected === BOT_THREAD_ID) {
      sendToBot(text);
      return true;
    }
    const store = api.loadCommunity?.();
    if (!store?.threads) return false;
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
    setRevision((v) => v + 1);
    return true;
  };

  const send = (event) => {
    event.preventDefault();
    if (deliverText(draft.trim())) setDraft("");
  };

  const sendSticker = (sticker) => {
    setStickerOpen(false);
    if (sticker?.id) deliverText(stickerMessageText(sticker.id));
  };

  const activeOther = activeThread ? getOther(activeThread) : null;
  const activeInitials = pageApi.getInitials?.(activeOther?.name) || activeOther?.name?.slice(0, 1) || "Q";
  const activeIsBot = Boolean(activeOther?.isBot);
  const activeStatus = activeThread
    ? (activeIsBot ? t("msgBotStatus") : (isThreadOnline(activeThread, activeOther) ? t("msgOnline") : t("msgRecentlyActive")))
    : "";

  const normalizedQuery = query.trim().toLowerCase();
  const visibleThreads = normalizedQuery
    ? threads.filter((thread) => {
        const other = getOther(thread);
        const last = thread.messages.at(-1);
        return `${other?.name || ""} ${last?.text || ""}`.toLowerCase().includes(normalizedQuery);
      })
    : threads;

  return (
    <section className="messages-section qg-support-page qg-messages-page">
      <div className="section-heading messages-heading">
        <div>
          <span className="messages-kicker" aria-hidden="true">{t("msgKicker")}</span>
          <h2 id="messagesPageTitle">
            {t("messages")} <span>Chat</span>
          </h2>
          <small id="messagesSummary" className="messages-summary-sr">{t("messagesSummary")}</small>
        </div>
      </div>

      <div className={`messages-layout messages-chat${activeThread ? "" : " is-empty"}`} data-mobile-view={mobileView}>
        <aside className="message-thread-list" id="messageThreadList" aria-label={t("messageThreadListLabel") || "私信列表"}>
          <div className="message-thread-search">
            <span className="message-thread-search-icon" aria-hidden="true"><i data-lucide="search" /></span>
            <input
              type="text"
              className="message-thread-search-input"
              placeholder={t("msgSearchPlaceholder")}
              aria-label={t("msgSearchAria")}
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="message-thread-scroll">
            {!threads.length ? (
              <div className="empty-state qg-empty-state">
                <img src="/assets/generated/playful-precision/mascot-sleep.png" alt="" />
                <strong>{t("messageEmpty")}</strong>
              </div>
            ) : null}
            {threads.length && !visibleThreads.length ? (
              <p className="message-thread-no-result">{t("msgNoResult")}</p>
            ) : null}
            {visibleThreads.map((thread) => {
              const other = getOther(thread);
              const isBot = Boolean(other?.isBot);
              const last = thread.messages.at(-1);
              const unread = thread.messages.filter((m) => m.senderId !== currentId && !m.readBy.includes(currentId)).length;
              const initials = pageApi.getInitials?.(other?.name) || other?.name?.slice(0, 1) || "Q";
              const online = isThreadOnline(thread, other);
              return (
                <button
                  key={thread.id}
                  type="button"
                  className={`message-thread-item${thread.id === selected ? " active" : ""}`}
                  data-message-thread={thread.id}
                  aria-pressed={thread.id === selected}
                  onClick={() => selectThread(thread.id)}
                >
                  <span className="message-thread-avatar-wrap">
                    <span className="message-thread-avatar avatar" data-tone={isBot ? undefined : toneFor(other?.id)}>
                      {other?.avatar ? <img src={other.avatar} alt="" /> : initials}
                    </span>
                    {online ? <span className="message-thread-online" aria-hidden="true" /> : null}
                  </span>
                  <span className="message-thread-body">
                    <span className="message-thread-top">
                      <strong>{other?.name}</strong>
                      {isBot ? <span className="message-thread-ai" aria-hidden="true">AI</span> : null}
                      {last?.createdAt ? <em className="message-thread-time">{formatRelativeTime(last.createdAt)}</em> : null}
                    </span>
                    <small>{last ? (parseStickerText(last.text) ? t("msgStickerLast") : last.text) : t("messageEmpty")}</small>
                  </span>
                  {unread ? <b className="message-thread-unread">{unread}</b> : null}
                </button>
              );
            })}
          </div>
        </aside>
        <section className="message-conversation" aria-live="polite">
          <div id="messageConversationHeader" className="message-conversation-header">
            {activeThread ? (
              <>
                <button
                  type="button"
                  className="message-thread-back"
                  aria-label={t("back") || "返回"}
                  onClick={() => setMobileView("list")}
                >
                  ‹
                </button>
                <span className="message-conversation-avatar avatar" data-tone={activeIsBot ? undefined : toneFor(activeOther?.id)}>
                  {activeIsBot
                    ? <img src={BOT_HEADER_AVATAR} alt="" />
                    : (activeOther?.avatar ? <img src={activeOther.avatar} alt="" /> : activeInitials)}
                </span>
                <div className="message-conversation-meta">
                  <strong>
                    {activeOther?.name}
                    {activeIsBot ? <span className="message-conversation-badge">{t("msgBotBadge")}</span> : null}
                  </strong>
                  <small>{activeStatus}</small>
                </div>
                <button type="button" className="message-conversation-more" aria-label={t("msgMoreAria")}>
                  <i data-lucide="more-horizontal" />
                </button>
              </>
            ) : (
              <div className="message-conversation-meta">
                <strong>{t("messages")}</strong>
                <small>{t("messageEmpty")}</small>
              </div>
            )}
          </div>
          <div id="messageConversationBody" className="message-conversation-body" ref={conversationBodyRef}>
            {activeThread ? (
              <>
                {activeThread.messages.map((message, index) => {
                  const mine = message.senderId === currentId;
                  const next = activeThread.messages[index + 1];
                  const grouped = !mine && next?.senderId === message.senderId;
                  const sticker = parseStickerText(message.text);
                  return (
                    <div key={message.id} className={`direct-message ${mine ? "mine" : "theirs"}${grouped ? " is-grouped" : ""}`}>
                      {!mine && !grouped ? (
                        <span className="direct-message-avatar" data-tone={activeIsBot ? undefined : toneFor(activeOther?.id)}>
                          {activeOther?.avatar ? <img src={activeOther.avatar} alt="" /> : activeInitials}
                        </span>
                      ) : null}
                      <div className="direct-message-col">
                        {sticker ? (
                          <img
                            className="qg-dm-sticker"
                            src={sticker.src}
                            alt={t("msgStickerAlt", { label: stickerLabel(sticker, t) })}
                            title={stickerLabel(sticker, t)}
                            draggable="false"
                          />
                        ) : (
                          <p>{message.text}</p>
                        )}
                        {message.card ? (
                          <div className="direct-message-card">
                            <div className="direct-message-card-tag">{message.card.tag}</div>
                            <div className="direct-message-card-formula">{message.card.formula}</div>
                            <div className="direct-message-card-actions">
                              <button type="button" className="direct-message-card-primary">{t("msgCardPractice")}</button>
                              <button type="button" className="direct-message-card-save">{t("msgCardSave")}</button>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
                {botTyping && activeIsBot ? (
                  <div className="direct-message theirs is-typing" aria-label={t("msgBotTyping")}>
                    <span className="direct-message-avatar">
                      <img src={BOT_AVATAR} alt="" />
                    </span>
                    <div className="direct-message-typing" aria-hidden="true">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="empty-state qg-empty-state">
                <img src="/assets/generated/playful-precision/mascot-search.png" alt="" />
                <strong>{t("msgEmptyThread")}</strong>
              </div>
            )}
          </div>
          <form id="messageComposerForm" className={`message-composer${activeThread ? "" : " hidden"}`} onSubmit={send}>
            {stickerPackOwned && stickerOpen && activeThread ? (
              <StickerPicker onPick={sendSticker} onClose={() => setStickerOpen(false)} />
            ) : null}
            <div className="message-composer-quick" aria-hidden={!activeThread}>
              {quickReplies(t).map((label) => (
                <button
                  key={label}
                  type="button"
                  className="message-composer-chip"
                  disabled={!activeThread}
                  onClick={() => setDraft(label)}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="message-composer-row">
              {stickerPackOwned ? (
                <button
                  type="button"
                  className={`icon-button ghost qg-sticker-btn${stickerOpen ? " is-open" : ""}`}
                  title={t("msgSendStickerTitle")}
                  aria-label={t("msgSendStickerTitle")}
                  aria-expanded={stickerOpen}
                  disabled={!activeThread}
                  onClick={() => setStickerOpen((open) => !open)}
                >
                  <i data-lucide="sticker" />
                </button>
              ) : null}
              <input
                id="messageComposerInput"
                type="text"
                autoComplete="off"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={activeIsBot ? t("msgBotComposerPlaceholder") : (t("messageComposerPlaceholder") || "写一条消息")}
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
            </div>
          </form>
        </section>
      </div>
    </section>
  );
}
