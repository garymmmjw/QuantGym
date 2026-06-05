import { listen } from '../../ui/events.js';

export function createMessageSelectionState(initialThreadId = "") {
  let threadId = String(initialThreadId || "");
  return {
    getSelected() {
      return threadId;
    },
    setSelected(value = "") {
      threadId = String(value || "");
      return threadId;
    }
  };
}

export function createMessagesModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const getSelected = () => deps.getSelected?.() || "";
  const setSelected = (threadId) => deps.setSelected?.(threadId || "");
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };

  const markRead = (threadId) => {
    const currentUser = deps.getCurrentUser?.();
    if (!threadId || !currentUser) return;
    const currentId = currentUser.id;
    const store = deps.loadCommunity?.();
    store.threads = store.threads.map((thread) => {
      if (thread.id !== threadId) return thread;
      return deps.normalizeThread?.({
        ...thread,
        messages: thread.messages.map((message) => ({
          ...message,
          readBy: message.readBy.includes(currentId) ? message.readBy : [...message.readBy, currentId]
        }))
      }) || thread;
    });
    deps.setCommunity?.(store);
    deps.saveCommunity?.();
    deps.updateUnreadBadge?.();
  };

  const getOtherParticipant = (thread) => {
    const currentId = deps.getCurrentUser?.()?.id || "local-user";
    return thread?.participants?.find((participant) => participant.id !== currentId)
      || thread?.participants?.[0]
      || deps.normalizeParticipant?.({ id: "unknown", name: "Quant" });
  };

  const renderConversation = (thread) => {
    const els = getElements();
    if (!els.messageConversationHeader || !els.messageConversationBody || !els.messageComposerForm) return;
    els.messageConversationHeader.innerHTML = "";
    els.messageConversationBody.innerHTML = "";
    els.messageComposerForm.classList.toggle("hidden", !thread);
    if (!thread) {
      els.messageConversationHeader.innerHTML = `<strong>${deps.escapeHtml?.(deps.t?.("messages") || "Messages")}</strong><small>${deps.escapeHtml?.(deps.t?.("messageEmpty") || "")}</small>`;
      els.messageConversationBody.appendChild(deps.emptyBlock?.(deps.t?.("messageEmpty")) || document.createTextNode(""));
      return;
    }

    const other = getOtherParticipant(thread);
    els.messageConversationHeader.innerHTML = `
      <span class="avatar">${other.avatar ? `<img src="${deps.escapeAttribute?.(other.avatar)}" alt="">` : deps.escapeHtml?.(deps.getInitials?.(other.name) || "")}</span>
      <div>
        <strong>${deps.escapeHtml?.(other.name)}</strong>
        <small>${deps.escapeHtml?.(String(thread.messages.length))} messages</small>
      </div>
    `;
    const currentId = deps.getCurrentUser?.()?.id || "local-user";
    thread.messages.forEach((message) => {
      const bubble = document.createElement("div");
      bubble.className = `direct-message ${message.senderId === currentId ? "mine" : "theirs"}`;
      bubble.innerHTML = `<p>${deps.escapeHtml?.(message.text)}</p><small>${deps.escapeHtml?.(deps.formatDate?.(message.createdAt))}</small>`;
      els.messageConversationBody.appendChild(bubble);
    });
    window.requestAnimationFrame(() => {
      els.messageConversationBody.scrollTop = els.messageConversationBody.scrollHeight;
    });
  };

  const render = () => {
    const els = getElements();
    if (!els.messageThreadList) return;
    const threads = deps.getThreads?.() || [];
    let selected = getSelected();
    if (!selected && threads.length) {
      selected = threads[0].id;
      setSelected(selected);
    }
    if (selected && !threads.some((thread) => thread.id === selected)) {
      selected = threads[0]?.id || "";
      setSelected(selected);
    }

    els.messageThreadList.innerHTML = "";
    if (!threads.length) {
      els.messageThreadList.appendChild(deps.emptyBlock?.(deps.t?.("messageEmpty")) || document.createTextNode(""));
    } else {
      threads.forEach((thread) => {
        const other = getOtherParticipant(thread);
        const last = thread.messages.at(-1);
        const currentId = deps.getCurrentUser?.()?.id || "";
        const unread = thread.messages.filter((message) => message.senderId !== currentId && !message.readBy.includes(currentId)).length;
        const button = document.createElement("button");
        button.type = "button";
        button.className = `message-thread-item${thread.id === selected ? " active" : ""}`;
        button.dataset.messageThread = thread.id;
        button.innerHTML = `
          <span class="avatar">${other.avatar ? `<img src="${deps.escapeAttribute?.(other.avatar)}" alt="">` : deps.escapeHtml?.(deps.getInitials?.(other.name) || "")}</span>
          <span>
            <strong>${deps.escapeHtml?.(other.name)}</strong>
            <small>${deps.escapeHtml?.(last?.text || deps.t?.("messageEmpty") || "")}</small>
          </span>
          ${unread ? `<b>${deps.escapeHtml?.(String(unread))}</b>` : ""}
        `;
        els.messageThreadList.appendChild(button);
      });
    }

    renderConversation(threads.find((thread) => thread.id === selected));
    deps.updateUnreadBadge?.();
    deps.refreshIcons?.();
  };

  const selectThread = (threadId) => {
    setSelected(threadId);
    markRead(threadId);
    render();
  };

  const send = () => {
    const currentUser = deps.getCurrentUser?.();
    const selected = getSelected();
    const els = getElements();
    if (!currentUser || !selected || !els.messageComposerInput) return;
    const text = els.messageComposerInput.value.trim();
    if (!text) return;
    const store = deps.loadCommunity?.();
    const now = new Date().toISOString();
    store.threads = store.threads.map((thread) => {
      if (thread.id !== selected) return thread;
      return deps.normalizeThread?.({
        ...thread,
        messages: [...thread.messages, {
          id: deps.makeId?.(),
          senderId: currentUser.id,
          text,
          createdAt: now,
          readBy: [currentUser.id]
        }],
        updatedAt: now
      }) || thread;
    });
    deps.setCommunity?.(store);
    els.messageComposerInput.value = "";
    deps.saveCommunity?.();
    render();
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      bind(els.messageThreadList, "click", (event) => {
        const button = event.target.closest("[data-message-thread]");
        if (!button) return;
        selectThread(button.dataset.messageThread || "");
      });

      bind(els.messageComposerForm, "submit", (event) => {
        event.preventDefault();
        send();
      });
    },

    render() {
      render();
    },

    unmount() {},

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
    }
  };
}
