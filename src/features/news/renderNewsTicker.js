export function renderNewsTicker(options = {}) {
  const {
    track,
    items = [],
    isEnglish = false,
    emptyLabel = "No news yet",
    onSelect = () => {},
    formatTitle = (item) => item.titleZh || item.title || ""
  } = options;

  if (!track) return;
  track.innerHTML = "";
  const news = items.slice(0, 8);
  if (!news.length) {
    const empty = document.createElement("button");
    empty.className = "news-ticker-item";
    empty.type = "button";
    empty.textContent = emptyLabel;
    track.appendChild(empty);
    return;
  }

  [...news, ...news].forEach((item) => {
    const button = document.createElement("button");
    button.className = "news-ticker-item";
    button.type = "button";
    if (item.id) button.dataset.newsId = item.id;
    button.dataset.newsTickerHandler = "focus-v2";
    button.setAttribute("aria-label", `${item.source || "News"} ${formatTitle(item)}`);
    button.addEventListener("click", () => {
      const targetId = String(item.id || "").trim();
      const windowRef = globalThis.window;
      if (targetId && windowRef) {
        windowRef.__quantgymPendingNewsFocusId = targetId;
        const FocusEvent = windowRef.CustomEvent || CustomEvent;
        const dispatchFocus = () => windowRef.dispatchEvent?.(new FocusEvent("quantgym:news-focus", {
          detail: { id: targetId }
        }));
        dispatchFocus();
        windowRef.setTimeout?.(dispatchFocus, 240);
        windowRef.setTimeout?.(dispatchFocus, 900);
        windowRef.setTimeout?.(dispatchFocus, 1600);
      }
      onSelect(item.id);
    });

    const source = document.createElement("span");
    source.textContent = item.source || "News";
    const title = document.createElement("strong");
    title.textContent = isEnglish ? item.title || item.titleZh : item.titleZh || item.title;
    button.append(source, title);
    track.appendChild(button);
  });
}
