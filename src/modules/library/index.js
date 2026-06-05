import { listen } from '../../ui/events.js';

export function createLibraryModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const getLanguage = () => deps.getLanguage?.() || "zh";
  const isEnglish = () => getLanguage() === "en";
  const escape = (value) => deps.escapeHtml?.(String(value ?? "")) ?? String(value ?? "");
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };
  const getKindFilter = () => deps.getKindFilter?.() || "all";
  const getTitle = (entry) => deps.getTitle?.(entry, isEnglish()) || entry.titleEn || entry.titleZh || entry.id;
  const getSubtitle = (entry) => deps.getSubtitle?.(entry, isEnglish()) || entry.category || "";
  const getKindLabel = (entry) => deps.getKindLabel?.(entry) || (entry.kind === "questionSet" ? "Question Set" : "Book");
  const hasRead = (entry) => Boolean(entry.readUrl || entry.readAssetId);
  const hasPractice = (entry) => Boolean(entry.sourceSlug && entry.problemCount > 0);

  const createActionButton = (entryId, action, iconName, label) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "secondary-button compact";
    button.dataset.libraryId = entryId;
    button.dataset.libraryAction = action;
    button.innerHTML = `<i data-lucide="${iconName}"></i>${escape(label)}`;
    return button;
  };

  const createCard = (entry, compact = false) => {
    const title = getTitle(entry);
    const subtitle = getSubtitle(entry);
    const readable = hasRead(entry);
    const practicable = hasPractice(entry);
    const card = document.createElement("article");
    card.className = `library-card${compact ? " compact" : ""}${entry.kind === "questionSet" ? " question-set" : ""}`;
    card.dataset.libraryId = entry.id;
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${deps.getCardActionLabel?.(entry) || ""}: ${title}`);

    const cover = document.createElement("button");
    cover.type = "button";
    cover.className = "library-cover-button";
    cover.dataset.libraryId = entry.id;
    cover.dataset.libraryAction = readable ? "read" : "practice";
    cover.innerHTML = `
      <img src="${escape(entry.coverUrl || "assets/generated/brand-q-mark.webp?v=premium-system-2")}" alt="${escape(title)}" loading="lazy">
      <span>${escape(getKindLabel(entry))}</span>
    `;

    const copy = document.createElement("div");
    copy.className = "library-card-copy";
    copy.innerHTML = `
      <h3>${escape(title)}</h3>
      <p>${escape(subtitle)}</p>
      <div class="library-card-meta">
        <span>${escape(entry.category || "Quant")}</span>
        <span>${escape(entry.language || "EN + ZH")}</span>
        ${entry.problemCount ? `<span>${escape(entry.problemCount)} ${escape(deps.getProblemCountLabel?.() || "problems")}</span>` : ""}
      </div>
    `;

    const actions = document.createElement("div");
    actions.className = "library-card-actions";
    if (readable) {
      actions.appendChild(createActionButton(entry.id, "read", "book-open", deps.getReadLabel?.() || "Read"));
    }
    if (practicable) {
      actions.appendChild(createActionButton(entry.id, "practice", "list-checks", deps.getPracticeLabel?.() || "Practice"));
    }
    if (!readable && !practicable) {
      actions.innerHTML = `<span class="library-card-note">${escape(deps.getReferenceOnlyLabel?.() || "Reference only")}</span>`;
    }

    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      if (readable) deps.openReader?.(entry.id);
      else if (practicable) deps.openPractice?.(entry.sourceSlug);
    });
    card.append(cover, copy, actions);
    return card;
  };

  const renderShelf = (container, entries, compact = false) => {
    if (!container) return;
    container.innerHTML = "";
    if (!entries.length) {
      container.appendChild(deps.emptyBlock?.(deps.getEmptyLabel?.()) || document.createTextNode(""));
      return;
    }
    entries.forEach((entry) => {
      container.appendChild(createCard(entry, compact));
    });
  };

  const render = () => {
    const els = getElements();
    if (!els.libraryBookGrid || !els.libraryQuestionGrid) return;
    const allEntries = deps.getEntries?.() || [];
    const entries = deps.getVisibleEntries?.() || [];
    const books = entries.filter((entry) => entry.kind === "book");
    const questionSets = entries.filter((entry) => entry.kind === "questionSet");
    const readable = entries.filter((entry) => entry.readUrl || entry.readAssetId).slice(0, 7);

    els.libraryKindTabs?.querySelectorAll("[data-library-kind]").forEach((button) => {
      const kind = ["book", "questionSet"].includes(button.dataset.libraryKind) ? button.dataset.libraryKind : "all";
      button.classList.toggle("active", kind === getKindFilter());
      button.setAttribute("aria-selected", String(kind === getKindFilter()));
    });

    if (els.libraryStats) {
      const bookCount = allEntries.filter((entry) => entry.kind === "book").length;
      const setCount = allEntries.filter((entry) => entry.kind === "questionSet").length;
      els.libraryStats.innerHTML = `
        <span><strong>${escape(bookCount)}</strong><small>${escape(deps.getBooksLabel?.() || "Books")}</small></span>
        <span><strong>${escape(setCount)}</strong><small>${escape(deps.getSetsLabel?.() || "Sets")}</small></span>
        <span><strong>${escape(deps.getTotalProblems?.() || 0)}</strong><small>${escape(deps.getLinkedProblemsLabel?.() || "Linked Problems")}</small></span>
      `;
    }

    renderShelf(els.libraryContinueShelf, readable, true);
    renderShelf(els.libraryBookGrid, books, false);
    renderShelf(els.libraryQuestionGrid, questionSets, false);
    els.libraryEmpty?.classList.toggle("hidden", entries.length > 0);
    deps.refreshIcons?.();
  };

  const handleAction = (event) => {
    const actionNode = event.target.closest("[data-library-action]");
    const card = event.target.closest("[data-library-id]");
    const entryId = actionNode?.dataset.libraryId || card?.dataset.libraryId || "";
    const entry = (deps.getEntries?.() || []).find((item) => item.id === entryId);
    if (!entry) return;
    const action = actionNode?.dataset.libraryAction || (hasRead(entry) ? "read" : "practice");
    if (action === "practice") {
      deps.openPractice?.(entry.sourceSlug);
      return;
    }
    deps.openReader?.(entry.id);
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      bind(els.librarySearch, "input", () => {
        deps.setQuery?.(els.librarySearch.value);
        render();
      });

      bind(els.libraryKindTabs, "click", (event) => {
        const button = event.target.closest("[data-library-kind]");
        if (!button) return;
        deps.setKindFilter?.(button.dataset.libraryKind);
        render();
      });

      [els.libraryContinueShelf, els.libraryBookGrid, els.libraryQuestionGrid]
        .filter(Boolean)
        .forEach((container) => {
          bind(container, "click", handleAction);
        });

      bind(els.libraryReaderClose, "click", () => {
        deps.closeReader?.();
      });

      bind(els.libraryReaderOverlay, "click", (event) => {
        if (event.target === els.libraryReaderOverlay) deps.closeReader?.();
      });

      bind(document, "keydown", (event) => {
        if (event.key === "Escape" && !els.libraryReaderOverlay?.classList.contains("hidden")) {
          deps.closeReader?.();
        }
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
