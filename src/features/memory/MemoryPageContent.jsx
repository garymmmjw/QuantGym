import { useEffect, useMemo, useRef, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { readFileAsDataUrl, readFileAsText } from "../../lib/files.js";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";

const EMPTY_RESOURCE_FORM = {
  title: "",
  type: "note",
  content: "",
  sources: "",
  previewData: ""
};

export function MemoryPageContent() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const { t, skillDefs } = appServices;
  const api = pageApi.memory;
  const userState = useUserStateStore((state) => state.value || {});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_RESOURCE_FORM);
  const resourceTitleRef = useRef(null);
  const resourceFileRef = useRef(null);

  const entries = useMemo(() => (userState.entries || []).slice().reverse().slice(0, 12), [userState.entries]);
  const resources = useMemo(() => api.getResources(), [userState.resources, api]);

  useScopedRefreshIcons(pageApi.refreshIcons, ".memory-section", [entries, resources, showForm]);

  useEffect(() => {
    if (showForm) resourceTitleRef.current?.focus();
  }, [showForm]);

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
      setForm((current) => ({
        ...current,
        title: current.title.trim() ? current.title : file.name,
        type: "image",
        content: file.name,
        previewData: dataUrl
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
    api.setResources([
      ...api.getResources(),
      {
        id: pageApi.makeId?.(),
        title,
        type: form.type,
        content,
        sources,
        dataUrl: form.previewData || "",
        date: new Date().toISOString()
      }
    ]);
    pageApi.saveState?.();
    setForm(EMPTY_RESOURCE_FORM);
    if (resourceFileRef.current) resourceFileRef.current.value = "";
    setShowForm(false);
  };

  return (
    <>
      <section className="tool-grid single-column">
        <div className="resource-panel">
          <div className="panel-heading">
            <h2>{t("memoryResources") || "资料"}</h2>
            <button
              className="icon-button ghost"
              id="addResourceBtn"
              type="button"
              title={t("addResource") || "添加资料"}
              aria-label={t("addResource") || "添加资料"}
              onClick={() => setShowForm((v) => !v)}
            >
              <i data-lucide="paperclip" />
            </button>
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
            {!resources.length ? <EmptyState title={t("resourcesEmpty")} /> : resources.slice().reverse().map((resource) => (
              <article key={resource.id} className="resource-item" data-resource-id={resource.id}>
                <div className="resource-top">
                  <strong>{resource.title}</strong>
                  <span className="pill">{String(resource.type).toUpperCase()}</span>
                </div>
                <p>{resource.content}</p>
                {resource.sources?.find((source) => source.embeddable)?.embedUrl ? (
                  <div className="resource-player">
                    <iframe
                      src={resource.sources.find((source) => source.embeddable)?.embedUrl}
                      title={`${resource.title} - ${resource.sources.find((source) => source.embeddable)?.provider}`}
                      loading="lazy"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                ) : null}
                {resource.sources?.length ? (
                  <div className="resource-source-links">
                    {resource.sources.map((source) => (
                      <a key={source.id || source.url} href={pageApi.safeExternalUrl?.(source.url) || source.url} target="_blank" rel="noreferrer">
                        {source.provider || t("openOriginal")}
                      </a>
                    ))}
                  </div>
                ) : null}
                {resource.dataUrl ? <img className="resource-image" src={resource.dataUrl} alt={resource.title} /> : null}
              </article>
            ))}
          </div>
        </div>
      </section>
      <section className="history-section">
        <div className="section-heading">
          <h2>{t("memoryHistory") || "记忆"}</h2>
          <button
            className="icon-button ghost"
            id="clearTodayBtn"
            type="button"
            title={t("clearLatestEntry") || "删除最新记录"}
            aria-label={t("clearLatestEntry") || "删除最新记录"}
            onClick={() => api.undoLatestEntry?.()}
          >
            <i data-lucide="undo-2" />
          </button>
        </div>
        <div id="historyList" className="history-list">
          {!entries.length ? <EmptyState title={t("historyEmpty") || "还没有记录。"} /> : entries.map((entry) => (
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
      </section>
    </>
  );
}
