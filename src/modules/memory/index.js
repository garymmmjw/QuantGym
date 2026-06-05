import { readFileAsDataUrl, readFileAsText } from '../../lib/files.js';
import { listen } from '../../ui/events.js';

export function createMemoryModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const getResources = () => deps.normalizeResources?.(deps.getResources?.() || []) || [];
  const getEntries = () => Array.isArray(deps.getEntries?.()) ? deps.getEntries() : [];
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };

  const renderHistory = () => {
    const els = getElements();
    if (!els.historyList) return;
    els.historyList.innerHTML = "";
    const entries = getEntries().slice().reverse();
    if (!entries.length) {
      els.historyList.appendChild(deps.emptyBlock?.("还没有记录。") || document.createTextNode(""));
      return;
    }

    entries.slice(0, 12).forEach((entry) => {
      const item = document.createElement("article");
      item.className = "history-item";
      const top = document.createElement("div");
      top.className = "history-top";
      const date = document.createElement("strong");
      date.textContent = deps.formatDate?.(entry.date) || entry.date;
      const xp = document.createElement("span");
      xp.textContent = `+${entry.totalXp} XP`;
      top.append(date, xp);

      const text = document.createElement("p");
      text.textContent = entry.text;

      const pills = document.createElement("div");
      pills.className = "pill-row";
      Object.entries(entry.gains || {}).forEach(([key, value]) => {
        if (!value) return;
        const def = deps.skillDefs?.[key];
        if (!def) return;
        const pill = document.createElement("span");
        pill.className = "pill";
        pill.textContent = `${def.name} +${value}`;
        pills.appendChild(pill);
      });

      item.append(top, text, pills);
      els.historyList.appendChild(item);
    });
  };

  const parseResourceSources = (text) => {
    const urls = String(text || "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter((line) => /^https?:\/\//i.test(line));
    return deps.normalizeContentSources?.(urls.map((url) => ({
      url,
      provider: deps.inferSource?.(url),
      title: deps.inferSource?.(url)
    }))) || [];
  };

  const renderResources = () => {
    const els = getElements();
    if (!els.resourceList) return;
    els.resourceList.innerHTML = "";
    const resources = getResources();
    if (!resources.length) {
      els.resourceList.appendChild(deps.emptyBlock?.(deps.t?.("resourcesEmpty")) || document.createTextNode(""));
      return;
    }

    resources.slice().reverse().forEach((resource) => {
      const item = document.createElement("article");
      item.className = "resource-item";
      const top = document.createElement("div");
      top.className = "resource-top";
      const title = document.createElement("strong");
      title.textContent = resource.title;
      const type = document.createElement("span");
      type.className = "pill";
      type.textContent = resource.type.toUpperCase();
      top.append(title, type);
      const content = document.createElement("p");
      content.textContent = resource.content;
      item.append(top, content);

      const previewSource = resource.sources.find((source) => source.embeddable);
      if (previewSource?.embedUrl) {
        const player = document.createElement("div");
        player.className = "resource-player";
        const iframe = document.createElement("iframe");
        iframe.src = previewSource.embedUrl;
        iframe.title = `${resource.title} - ${previewSource.provider}`;
        iframe.loading = "lazy";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;
        player.appendChild(iframe);
        item.appendChild(player);
      }

      if (resource.sources.length) {
        const links = document.createElement("div");
        links.className = "resource-source-links";
        resource.sources.forEach((source) => {
          const link = document.createElement("a");
          link.href = deps.safeExternalUrl?.(source.url) || source.url;
          link.target = "_blank";
          link.rel = "noreferrer";
          link.textContent = source.provider || deps.t?.("openOriginal");
          links.appendChild(link);
        });
        item.appendChild(links);
      }

      if (resource.dataUrl) {
        const image = document.createElement("img");
        image.className = "resource-image";
        image.src = resource.dataUrl;
        image.alt = resource.title;
        item.appendChild(image);
      }
      els.resourceList.appendChild(item);
    });
  };

  const addResource = () => {
    const els = getElements();
    const title = els.resourceTitle.value.trim();
    const content = els.resourceContent.value.trim();
    if (!title || !content) return;
    const sources = parseResourceSources(els.resourceSources?.value || content);

    deps.setResources?.([
      ...(deps.getResources?.() || []),
      {
        id: deps.makeId?.(),
        title,
        type: els.resourceType.value,
        content,
        sources,
        dataUrl: els.resourceForm.dataset.previewData || "",
        date: new Date().toISOString()
      }
    ]);

    deps.save?.();
    els.resourceForm.reset();
    delete els.resourceForm.dataset.previewData;
    els.resourceForm.classList.add("hidden");
    renderResources();
    deps.refreshIcons?.();
  };

  const handleResourceFile = async (event) => {
    const els = getElements();
    const file = event.target.files?.[0];
    if (!file) return;

    if (!els.resourceTitle.value.trim()) els.resourceTitle.value = file.name;
    delete els.resourceForm.dataset.previewData;

    if (file.type.startsWith("image/")) {
      els.resourceType.value = "image";
      if (file.size > 1_500_000) {
        els.resourceContent.value = `${file.name} (${Math.round(file.size / 1024)} KB)`;
        return;
      }
      els.resourceForm.dataset.previewData = await readFileAsDataUrl(file);
      els.resourceContent.value = file.name;
      return;
    }

    els.resourceType.value = file.name.toLowerCase().endsWith(".tex") ? "tex" : "note";
    els.resourceContent.value = await readFileAsText(file);
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      bind(els.clearTodayBtn, "click", () => deps.undoLatestEntry?.());

      bind(els.addResourceBtn, "click", () => {
        els.resourceForm?.classList.toggle("hidden");
        if (!els.resourceForm?.classList.contains("hidden")) els.resourceTitle?.focus();
      });

      bind(els.resourceForm, "submit", (event) => {
        event.preventDefault();
        addResource();
      });

      bind(els.resourceFile, "change", handleResourceFile);
    },

    render() {
      renderHistory();
      renderResources();
    },

    unmount() {},

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
    }
  };
}
