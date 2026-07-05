import { useEffect, useMemo, useRef, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { CoderSticker } from "../shared/CoderSticker.jsx";
import { readFileAsDataUrl, readFileAsText } from "../../lib/files.js";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";

const EMPTY_RESOURCE_FORM = {
  title: "",
  type: "note",
  content: "",
  sources: "",
  previewData: ""
};

/* Category colors follow the design note dots (per resource type). */
const RESOURCE_TYPE_META = {
  note: { label: "笔记", color: "#5b5ff5" },
  tex: { label: "TeX", color: "#8a63e8" },
  image: { label: "图片", color: "#ff9f2e" },
  link: { label: "链接", color: "#2f9be0" }
};

const NOTE_TAGS = [
  ["all", "全部"],
  ["概率", "概率"],
  ["衍生品", "衍生品"],
  ["速算", "速算"],
  ["求职", "求职"]
];

function resourceTypeMeta(type) {
  return RESOURCE_TYPE_META[type] || { label: String(type || "笔记").toUpperCase(), color: "#5b5ff5" };
}

function wordCount(text) {
  return String(text || "").replace(/\s+/g, "").length;
}

/* List rows preview clean prose (design shows no markdown/formula markers). */
function previewText(text) {
  return String(text || "")
    .replace(/\$\$[^]*?\$\$/g, " ")
    .split(/\n+/)
    .map((line) => line.replace(/^#{1,6}\s+/, "").replace(/^[-*·•]\s+/, "").trim())
    .filter(Boolean)
    .join(" ");
}

export function MemoryPageContent() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const { t, skillDefs } = appServices;
  const api = pageApi.memory;
  const userState = useUserStateStore((state) => state.value || {});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_RESOURCE_FORM);
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all");
  const [selectedId, setSelectedId] = useState(null);
  const resourceTitleRef = useRef(null);
  const resourceFileRef = useRef(null);

  const entries = useMemo(() => (userState.entries || []).slice().reverse().slice(0, 12), [userState.entries]);
  const resources = useMemo(() => api.getResources(), [userState.resources, api]);
  const orderedResources = useMemo(() => resources.slice().reverse(), [resources]);
  const filteredResources = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orderedResources.filter((resource) => {
      const hay = `${resource.title || ""} ${resource.content || ""}`.toLowerCase();
      if (tag !== "all" && !hay.includes(tag.toLowerCase())) return false;
      if (q && !hay.includes(q)) return false;
      return true;
    });
  }, [orderedResources, query, tag]);
  const selected = useMemo(
    () => orderedResources.find((resource) => resource.id === selectedId) || filteredResources[0] || null,
    [orderedResources, filteredResources, selectedId]
  );

  useScopedRefreshIcons(pageApi.refreshIcons, ".qg-memory-page", [entries, resources, showForm, selected, tag, query]);

  useEffect(() => {
    if (showForm) resourceTitleRef.current?.focus();
  }, [showForm]);

  const formatNoteDate = (iso) => {
    if (!iso) return "";
    const then = new Date(iso);
    if (Number.isNaN(then.getTime())) return String(iso);
    const dayStart = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const days = Math.round((dayStart(new Date()) - dayStart(then)) / 86400000);
    if (days <= 0) return "今天";
    if (days === 1) return "昨天";
    if (days < 7) return `${days} 天前`;
    if (days < 14) return "上周";
    return pageApi.formatDate?.(iso) || then.toLocaleDateString();
  };

  const parseResourceSources = (text) => {
    const urls = String(text || "").split(/\n+/).map((line) => line.trim()).filter((line) => /^https?:\/\//i.test(line));
    return api.normalizeContentSources?.(urls.map((url) => ({
      url,
      provider: pageApi.inferSource?.(url),
      title: pageApi.inferSource?.(url)
    }))) || [];
  };

  const handleResourceFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (String(file.type || "").startsWith("image/")) {
      if (file.size > 1_500_000) {
        setForm((current) => ({
          ...current,
          title: current.title.trim() ? current.title : file.name,
          type: "image",
          content: `${file.name} (${Math.round(file.size / 1024)} KB)`,
          previewData: ""
        }));
        return;
      }

      const dataUrl = await readFileAsDataUrl(file);
      const uploadResult = await api.uploadResourceMedia?.({
        dataUrl,
        name: file.name || "memory-resource",
        type: file.type || "image/*"
      });
      const previewData = uploadResult?.ok
        ? uploadResult.media?.dataUrl || uploadResult.media?.url || dataUrl
        : dataUrl;
      setForm((current) => ({
        ...current,
        title: current.title.trim() ? current.title : file.name,
        type: "image",
        content: file.name,
        previewData
      }));
      return;
    }

    const content = await readFileAsText(file);
    setForm((current) => ({
      ...current,
      title: current.title.trim() ? current.title : file.name,
      type: file.name.toLowerCase().endsWith(".tex") ? "tex" : "note",
      content,
      previewData: ""
    }));
  };

  const addResource = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    const content = form.content.trim();
    if (!title || !content) return;
    const sources = parseResourceSources(form.sources || content);
    const existing = api.getResources();
    if (editingId && existing.some((resource) => resource.id === editingId)) {
      api.setResources(existing.map((resource) => (resource.id === editingId
        ? {
          ...resource,
          title,
          type: form.type,
          content,
          sources,
          dataUrl: form.previewData || "",
          date: new Date().toISOString()
        }
        : resource)));
      setSelectedId(editingId);
    } else {
      const id = pageApi.makeId?.();
      api.setResources([
        ...existing,
        {
          id,
          title,
          type: form.type,
          content,
          sources,
          dataUrl: form.previewData || "",
          date: new Date().toISOString()
        }
      ]);
      if (id) setSelectedId(id);
    }
    pageApi.saveState?.();
    setForm(EMPTY_RESOURCE_FORM);
    setEditingId(null);
    if (resourceFileRef.current) resourceFileRef.current.value = "";
    setShowForm(false);
  };

  const startEditSelected = () => {
    if (!selected) return;
    setForm({
      title: selected.title || "",
      type: selected.type || "note",
      content: selected.content || "",
      sources: (selected.sources || []).map((source) => source.url).filter(Boolean).join("\n"),
      previewData: selected.dataUrl || ""
    });
    setEditingId(selected.id);
    setShowForm(true);
  };

  const toggleStarSelected = () => {
    if (!selected) return;
    api.setResources(api.getResources().map((resource) => (resource.id === selected.id
      ? { ...resource, starred: !resource.starred }
      : resource)));
    pageApi.saveState?.();
  };

  const selectNote = (id) => setSelectedId(id);

  const renderNoteBlocks = (resource) => {
    const text = String(resource.content || "");
    if (resource.type === "tex") {
      return text.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean).map((chunk, index) => (
        <div key={index} className="memory-block memory-block-f">{chunk}</div>
      ));
    }
    return text.split(/\n+/).map((line) => line.trim()).filter(Boolean).map((line, index) => {
      if (/^#{1,6}\s+/.test(line)) {
        return <div key={index} className="memory-block memory-block-h">{line.replace(/^#{1,6}\s+/, "")}</div>;
      }
      if (/^\$\$[^]*\$\$$/.test(line)) {
        return <div key={index} className="memory-block memory-block-f">{line.replace(/^\$\$|\$\$$/g, "").trim()}</div>;
      }
      if (/^[-*·•]\s+/.test(line)) {
        return <div key={index} className="memory-block memory-block-li">{`· ${line.replace(/^[-*·•]\s+/, "")}`}</div>;
      }
      return <div key={index} className="memory-block memory-block-p">{line}</div>;
    });
  };

  const selectedMeta = selected ? resourceTypeMeta(selected.type) : null;
  const selectedEmbed = selected?.sources?.find((source) => source.embeddable);

  return (
    <div className="qg-support-page qg-memory-page">
      <header className="memory-header">
        <div className="memory-header-copy">
          <span className="memory-kicker">RESOURCES · 资料笔记</span>
          <h1 className="memory-title">
            资料笔记 <span className="memory-title-accent">Notes</span>
          </h1>
        </div>
        <button
          className="memory-new-btn"
          id="addResourceBtn"
          type="button"
          title="新建笔记"
          aria-label="新建笔记"
          onClick={() => {
            if (!showForm) {
              setEditingId(null);
              setForm(EMPTY_RESOURCE_FORM);
            }
            setShowForm((v) => !v);
          }}
        >
          <span className="memory-new-plus" aria-hidden="true">＋</span>
          新建笔记
        </button>
      </header>
      <section className="memory-workspace">
        <div className="resource-panel memory-side">
          <div className="memory-search">
            <i data-lucide="search" aria-hidden="true" />
            <input
              type="search"
              placeholder="搜索笔记…"
              aria-label="搜索笔记"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="memory-tags">
            {NOTE_TAGS.map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`memory-tag${tag === id ? " is-active" : ""}`}
                aria-pressed={tag === id}
                onClick={() => setTag(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <form id="resourceForm" className={`resource-form${showForm ? "" : " hidden"}`} onSubmit={addResource}>
              <input
                id="resourceTitle"
                ref={resourceTitleRef}
                type="text"
                placeholder={t("resourceTitle") || "标题"}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <select
                id="resourceType"
                aria-label={t("resourceTypeLabel") || "资料类型"}
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="tex">TeX</option><option value="image">图片</option><option value="link">链接</option><option value="note">笔记</option>
              </select>
              <input
                id="resourceFile"
                ref={resourceFileRef}
                type="file"
                accept=".tex,.txt,text/*,image/*"
                onChange={handleResourceFile}
              />
              <textarea
                id="resourceContent"
                rows={4}
                placeholder={t("resourceContent") || "粘贴 TeX、图片路径、链接或摘要"}
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value, previewData: "" })}
              />
              <textarea
                id="resourceSources"
                rows={3}
                placeholder={t("resourceSourcesPlaceholder") || "可选：每行一个 YouTube / Bilibili / 原站 URL，作为备用来源"}
                value={form.sources}
                onChange={(e) => setForm({ ...form, sources: e.target.value })}
              />
              <button className="secondary-button" type="submit"><i data-lucide="save" />{t("save")}</button>
            </form>
          <div id="resourceList" className="resource-list">
            {!filteredResources.length ? <EmptyState title={t("resourcesEmpty")} /> : filteredResources.map((resource) => {
              const meta = resourceTypeMeta(resource.type);
              const isSelected = selected?.id === resource.id;
              return (
                <article
                  key={resource.id}
                  className={`resource-item${isSelected ? " is-selected" : ""}`}
                  data-resource-id={resource.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={isSelected}
                  onClick={() => selectNote(resource.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      selectNote(resource.id);
                    }
                  }}
                >
                  <div className="resource-top">
                    <span className="resource-dot" style={{ background: meta.color }} aria-hidden="true" />
                    <strong>{resource.title}</strong>
                  </div>
                  <p>{previewText(resource.content)}</p>
                  <div className="resource-meta">{formatNoteDate(resource.date)} · {wordCount(resource.content)} 字</div>
                </article>
              );
            })}
          </div>
        </div>
        <div className="history-section memory-detail">
          <div className="section-heading">
            <div className="memory-detail-title">
              <div className="memory-note-meta">
                {selected ? (
                  <>
                    <span className="memory-note-tag" style={{ background: selectedMeta.color }}>{selectedMeta.label}</span>
                    <span className="memory-note-date">最近编辑 {formatNoteDate(selected.date)}</span>
                  </>
                ) : (
                  <span className="memory-detail-kicker">最近记忆</span>
                )}
              </div>
              <h2>{selected ? selected.title : (t("memoryHistory") || "记忆")}</h2>
            </div>
            <div className="memory-note-actions">
              {selected ? (
                <>
                  <button
                    className="memory-icon-btn"
                    type="button"
                    title="编辑笔记"
                    aria-label="编辑笔记"
                    onClick={startEditSelected}
                  >
                    <i data-lucide="pencil-line" />
                  </button>
                  <button
                    className={`memory-icon-btn${selected.starred ? " is-starred" : ""}`}
                    type="button"
                    title="收藏笔记"
                    aria-label="收藏笔记"
                    aria-pressed={!!selected.starred}
                    onClick={toggleStarSelected}
                  >
                    <i data-lucide="star" />
                  </button>
                </>
              ) : null}
              <button
                className="icon-button ghost memory-icon-btn"
                id="clearTodayBtn"
                type="button"
                title={t("clearLatestEntry") || "删除最新记录"}
                aria-label={t("clearLatestEntry") || "删除最新记录"}
                onClick={() => api.undoLatestEntry?.()}
              >
                <i data-lucide="undo-2" />
              </button>
            </div>
          </div>
          {selected ? (
            <div className="memory-note-body">
              {selected.dataUrl ? <img className="resource-image" src={selected.dataUrl} alt={selected.title} /> : null}
              {renderNoteBlocks(selected)}
              {selectedEmbed?.embedUrl ? (
                <div className="resource-player">
                  <iframe
                    src={selectedEmbed.embedUrl}
                    title={`${selected.title} - ${selectedEmbed.provider}`}
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
              ) : null}
              {selected.sources?.length ? (
                <div className="memory-links">
                  <span className="memory-links-label">关联</span>
                  {selected.sources.map((source) => (
                    <a
                      key={source.id || source.url}
                      className="memory-link-chip"
                      href={pageApi.safeExternalUrl?.(source.url) || source.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="memory-link-dot" aria-hidden="true" />
                      {source.provider || t("openOriginal")}
                    </a>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <div id="historyList" className="history-list">
          {!entries.length
            ? (selected ? null : <EmptyState title={t("historyEmpty") || "还没有记录。"} />)
            : entries.map((entry) => (
            <article key={entry.id} className="history-item" data-history-id={entry.id}>
              <div className="history-top">
                <strong>{pageApi.formatDate?.(entry.date) || entry.date}</strong>
                <span>+{entry.totalXp} XP</span>
              </div>
              <p>{entry.text}</p>
              <div className="pill-row">
                {Object.entries(entry.gains || {}).map(([key, value]) => {
                  if (!value) return null;
                  const def = skillDefs?.[key];
                  return def ? <span key={key} className="pill">{def.name} +{value}</span> : null;
                })}
              </div>
            </article>
          ))}
          </div>
        </div>
      </section>
      <CoderSticker page="memory" />
    </div>
  );
}
