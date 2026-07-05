import { useEffect, useMemo, useRef, useState } from "react";
import { useSettingsPageModel } from "./settingsHooks.js";

const THEME_STORAGE_KEY = "quantgym.ui.theme.v1";

/* Design copy overrides — the shared i18n dictionary still says
   「同步云端 / 清空训练记录」; the Playful Precision design uses
   「立即同步 / 清空本地数据…」. Overrides live here because the
   dictionary file is owned by another workstream. */
const COPY_OVERRIDES = {
  zh: { syncCloud: "立即同步", resetMemory: "清空本地数据…", importBackup: "导入备份…" },
  en: { syncCloud: "Sync Now", resetMemory: "Clear Local Data…", importBackup: "Import Backup…" }
};

const IDLE_STATUS_MESSAGES = new Set([
  "应用偏好和数据管理。",
  "App preferences and data management."
]);

function getDocumentTheme() {
  if (typeof document === "undefined") return "light";
  return document.documentElement.getAttribute("data-qg-theme") === "dark" ? "dark" : "light";
}

function formatRelativeSync(iso, zh) {
  const time = new Date(iso).getTime();
  if (!iso || !Number.isFinite(time)) return zh ? "尚未同步" : "not synced yet";
  const diffMinutes = Math.floor((Date.now() - time) / 60000);
  if (diffMinutes < 1) return zh ? "刚刚" : "just now";
  if (diffMinutes < 60) return zh ? `${diffMinutes} 分钟前` : `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return zh ? `${diffHours} 小时前` : `${diffHours} h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return zh ? `${diffDays} 天前` : `${diffDays} d ago`;
}

export function SettingsPageContent() {
  const model = useSettingsPageModel();
  const countryRef = useRef(null);
  const regionRef = useRef(null);
  const llmConfig = model.getLlmConfig?.() || {};
  const cloudConfig = model.cloudConfig || model.getCloudConfig?.() || {};
  const authConfig = model.auth || model.getAuth?.() || {};
  const text = (key, fallback) => {
    const value = model.t(key);
    return value && value !== key ? value : fallback;
  };
  const zh = (model.currentLanguage || model.getLanguage?.() || "zh") !== "en";
  const label = (key, fallback) => COPY_OVERRIDES[zh ? "zh" : "en"]?.[key] || text(key, fallback);
  const settingsMessageDefault = text("settingsMessageDefault", "应用偏好和数据管理。");
  const [form, setForm] = useState({
    language: model.currentLanguage || model.getLanguage?.() || "zh",
    country: model.currentUser?.country || "china",
    region: model.currentUser?.region || "",
    llmEndpoint: llmConfig.endpoint || "",
    llmModel: llmConfig.model || "gpt-5-nano",
    cloudApi: cloudConfig.endpoint || model.defaultCloudApiEndpoint || "",
    googleClientId: authConfig.googleClientId || ""
  });
  const [statusMessage, setStatusMessage] = useState(() => settingsMessageDefault);
  const [theme, setThemeState] = useState(getDocumentTheme);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!model.currentUser) return;
    model.renderCountries?.(countryRef.current, form.country);
    model.renderRegions?.(regionRef.current, form.country, form.region);
    model.renderCloudStatus?.();
  }, [form.country, form.region, model.currentLanguage, model.currentUser]);

  useEffect(() => {
    setForm((prev) => ({ ...prev, language: model.currentLanguage || model.getLanguage?.() || "zh" }));
  }, [model.currentLanguage]);

  useEffect(() => {
    setStatusMessage((current) => (IDLE_STATUS_MESSAGES.has(current) ? settingsMessageDefault : current));
  }, [model.currentLanguage, settingsMessageDefault]);

  useEffect(() => {
    if (!model.currentUser) return;
    setForm((prev) => ({
      ...prev,
      country: model.currentUser?.country || "china",
      region: model.currentUser?.region || ""
    }));
  }, [model.currentUser?.id, model.currentUser?.country, model.currentUser?.region]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      llmEndpoint: llmConfig.endpoint || "",
      llmModel: llmConfig.model || "gpt-5-nano"
    }));
  }, [llmConfig.endpoint, llmConfig.model]);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      cloudApi: cloudConfig.endpoint || model.defaultCloudApiEndpoint || "",
      googleClientId: authConfig.googleClientId || ""
    }));
  }, [authConfig.googleClientId, cloudConfig.endpoint, model.defaultCloudApiEndpoint]);

  /* Keep the theme segmented control in sync with the top-bar ☀️/🌙 toggle. */
  useEffect(() => {
    if (typeof MutationObserver === "undefined") return undefined;
    const observer = new MutationObserver(() => setThemeState(getDocumentTheme()));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-qg-theme"] });
    return () => observer.disconnect();
  }, []);

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const applyLanguage = (value) => {
    update("language", value);
    model.setLanguage?.(value);
  };

  const applyTheme = (next) => {
    if (next === getDocumentTheme()) {
      setThemeState(next);
      return;
    }
    const shellToggle = document.getElementById("themeToggleBtn");
    if (shellToggle) {
      shellToggle.click();
    } else {
      const root = document.documentElement;
      if (next === "dark") root.setAttribute("data-qg-theme", "dark");
      else root.removeAttribute("data-qg-theme");
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {}
    }
    setThemeState(next);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextForm = readCurrentSettingsForm(event.currentTarget, form);
    setForm(nextForm);
    const saved = model.save(nextForm);
    if (saved) setStatusMessage(text("settingsSaved", "设置已保存。"));
  };

  const handleSyncCloud = async () => {
    if (syncing) return;
    setSyncing(true);
    setStatusMessage(text("cloudSyncing", "云端同步中..."));
    try {
      const synced = await model.syncCloud?.();
      if (synced) {
        setStatusMessage(typeof synced === "string" ? synced : model.getCloudStatusText?.() || text("cloudConnected", "云端已连接。"));
      } else {
        setStatusMessage(text("cloudNoSession", "云端还没有登录会话，请先用邮箱密码登录一次。"));
      }
    } finally {
      setSyncing(false);
    }
  };

  const syncButtonLabel = syncing ? (zh ? "同步中…" : "Syncing…") : label("syncCloud", "立即同步");
  const resetButtonLabel = label("resetMemory", "清空本地数据…");
  const importButtonLabel = label("importBackup", "导入备份…");

  /* src/ui/languageText.js imperatively rewrites #syncCloudBtn / #resetBtn /
     the import file-label from the i18n dictionary on every renderAll().
     Until the dictionary itself adopts the design copy, re-apply our labels
     whenever those nodes get overwritten. */
  useEffect(() => {
    const setInlineLabel = (node, value) => {
      if (!node) return;
      if ((node.textContent || "").trim() === value.trim()) return;
      const icon = node.querySelector("svg, i");
      const input = node.querySelector("input");
      node.textContent = "";
      if (input) node.appendChild(input);
      if (icon) node.append(icon, document.createTextNode(` ${value}`));
      else node.append(value);
    };
    const targets = () => [
      [document.getElementById("syncCloudBtn"), syncButtonLabel],
      [document.getElementById("resetBtn"), resetButtonLabel],
      [document.getElementById("importInput")?.closest("label"), importButtonLabel]
    ];
    const enforce = () => targets().forEach(([node, value]) => setInlineLabel(node, value));
    enforce();
    if (typeof MutationObserver === "undefined") return undefined;
    const observer = new MutationObserver(enforce);
    targets().forEach(([node]) => {
      if (node) observer.observe(node, { childList: true, characterData: true, subtree: true });
    });
    return () => observer.disconnect();
  }, [syncButtonLabel, resetButtonLabel, importButtonLabel]);

  const accountEmail = model.currentUser?.email || "";
  const lastSyncAt = cloudConfig.lastSyncAt || "";
  const syncLine = accountEmail
    ? (zh
      ? `账号 ${accountEmail} · 上次同步 ${formatRelativeSync(lastSyncAt, true)} · 端到端加密`
      : `Account ${accountEmail} · Last sync ${formatRelativeSync(lastSyncAt, false)} · End-to-end encrypted`)
    : text("cloudSyncNote", "端到端加密 · 训练记录、笔记与计划自动上云");

  const trainingEntries = model.trainingEntries || [];
  const entriesCount = trainingEntries.length;
  const notesCount = (model.noteResources || []).length;
  const pendingCount = useMemo(() => {
    if (!lastSyncAt) return entriesCount + notesCount;
    return trainingEntries.filter((entry) => String(entry?.date || "") > lastSyncAt).length;
  }, [trainingEntries, entriesCount, notesCount, lastSyncAt]);
  const syncStats = [
    { key: "records", label: zh ? "训练记录" : "Training records", value: zh ? `${entriesCount.toLocaleString()} 条` : entriesCount.toLocaleString() },
    { key: "notes", label: zh ? "资料笔记" : "Notes", value: zh ? `${notesCount.toLocaleString()} 张` : notesCount.toLocaleString() },
    { key: "pending", label: zh ? "待上传变更" : "Pending changes", value: zh ? `${pendingCount.toLocaleString()} 项` : pendingCount.toLocaleString() }
  ];

  const statusIsIdle = IDLE_STATUS_MESSAGES.has(statusMessage);

  return (
    <section className="settings-section qg-support-page qg-settings-page">
      <div className="qg-settings-head">
        <span className="qg-settings-kicker">SETTINGS</span>
        <h2>{model.t("settings")}</h2>
        <p className="qg-settings-sub">{text("settingsTagline", "语言 · 外观 · 云同步 · 备份")}</p>
        <small id="settingsMessage" className="qg-settings-status" data-idle={statusIsIdle ? "true" : "false"}>{statusMessage}</small>
      </div>

      <div className="settings-grid qg-settings-stack">
        <div className="settings-panel qg-settings-card qg-card-prefs">
          <div className="qg-settings-row">
            <div className="qg-settings-row-label">
              <div className="qg-row-title">{zh ? "界面语言" : "Interface Language"}</div>
              <div className="qg-row-desc">{text("settingsLangNote", zh ? "切换后全站文案即时生效" : "Copy updates across the app instantly")}</div>
            </div>
            <div className="qg-seg-group" role="group" aria-label={model.t("language")}>
              <button
                type="button"
                className={`qg-seg-btn${form.language !== "en" ? " is-active" : ""}`}
                aria-pressed={form.language !== "en"}
                onClick={() => applyLanguage("zh")}
              >
                简体中文
              </button>
              <button
                type="button"
                className={`qg-seg-btn${form.language === "en" ? " is-active" : ""}`}
                aria-pressed={form.language === "en"}
                onClick={() => applyLanguage("en")}
              >
                English
              </button>
            </div>
            <label className="qg-settings-row-control qg-visually-hidden">
              <select
                id="settingsLanguageSelect"
                aria-label={model.t("language")}
                data-i18n-aria-label="language"
                tabIndex={-1}
                aria-hidden="true"
                value={form.language}
                onChange={(event) => {
                  update("language", event.target.value);
                  model.setLanguage?.(event.target.value);
                }}
              >
                <option value="zh">中文</option>
                <option value="en">English</option>
              </select>
            </label>
          </div>

          <div className="qg-settings-divider" />

          <div className="qg-settings-row">
            <div className="qg-settings-row-label">
              <div className="qg-row-title">{zh ? "外观主题" : "Appearance"}</div>
              <div className="qg-row-desc">{zh ? "与顶栏 ☀️/🌙 按钮联动，全站记忆" : "Linked to the top-bar ☀️/🌙 toggle, remembered site-wide"}</div>
            </div>
            <div className="qg-seg-group" role="group" aria-label={zh ? "外观主题" : "Appearance"}>
              <button
                type="button"
                className={`qg-seg-btn${theme !== "dark" ? " is-active" : ""}`}
                aria-pressed={theme !== "dark"}
                onClick={() => applyTheme("light")}
              >
                {zh ? "浅色" : "Light"}
              </button>
              <button
                type="button"
                className={`qg-seg-btn${theme === "dark" ? " is-active" : ""}`}
                aria-pressed={theme === "dark"}
                onClick={() => applyTheme("dark")}
              >
                {zh ? "深色" : "Dark"}
              </button>
            </div>
          </div>
        </div>

        <form id="settingsForm" className="settings-panel qg-settings-card qg-card-advanced" onSubmit={handleSubmit}>
          <div className="qg-settings-card-head">
            <div>
              <h3>{zh ? "高级 / 模型接入" : "Advanced / Model Access"}</h3>
              <p className="qg-card-note">{zh ? "默认地区与模型接入，保存后生效。" : "Default region and model endpoints. Applied on save."}</p>
            </div>
          </div>

          <div className="qg-settings-fields">
            <label>
              {model.t("defaultCountry") || "默认国家"}
              <select id="settingsCountrySelect" ref={countryRef} aria-label={model.t("defaultCountry")} value={form.country} onChange={(event) => {
                setForm((prev) => ({ ...prev, country: event.target.value, region: "" }));
                model.renderRegions?.(regionRef.current, event.target.value);
              }} />
            </label>
            <label>
              {model.t("defaultRegion") || "默认地区"}
              <select id="settingsRegionSelect" ref={regionRef} aria-label={model.t("defaultRegion")} value={form.region} onChange={(event) => update("region", event.target.value)} />
            </label>
            <label>
              LLM Endpoint
              <input
                id="settingsLlmEndpointInput"
                type="url"
                value={form.llmEndpoint}
                placeholder="http://127.0.0.1:8787/interview"
                onChange={(event) => update("llmEndpoint", event.target.value)}
              />
            </label>
            <label>
              LLM Model
              <select id="settingsLlmModelInput" aria-label="LLM Model" value={form.llmModel} onChange={(event) => update("llmModel", event.target.value)}>
                <option value="gpt-5-nano">gpt-5-nano · 最便宜</option>
                <option value="gpt-5-mini">gpt-5-mini · 更稳</option>
                <option value="gpt-5">gpt-5 · 更强</option>
                <option value="gpt-5.4-mini">gpt-5.4-mini · 新 mini</option>
                <option value="gpt-5.4">gpt-5.4 · 高质量</option>
                <option value="gpt-4o-mini">gpt-4o-mini · 旧版低价</option>
                <option value="gpt-4.1-nano">gpt-4.1-nano · 旧版 nano</option>
              </select>
            </label>
            <label>
              Cloud API Endpoint
              <input
                id="settingsCloudApiInput"
                type="url"
                value={form.cloudApi}
                placeholder="http://127.0.0.1:8790/api"
                onChange={(event) => update("cloudApi", event.target.value)}
              />
            </label>
            <label>
              Google Client ID
              <input
                id="settingsGoogleClientIdInput"
                type="text"
                spellCheck="false"
                value={form.googleClientId}
                placeholder="xxxx.apps.googleusercontent.com"
                onChange={(event) => update("googleClientId", event.target.value)}
              />
            </label>
          </div>

          <button className="primary-button" type="submit">
            <i data-lucide="save" />
            {model.t("saveSettings") || "保存设置"}
          </button>
        </form>

        <div className="settings-panel qg-settings-card qg-card-sync">
          <div className="qg-settings-card-head qg-sync-head">
            <div>
              <h3 className="qg-sync-title"><span className="qg-sync-dot" aria-hidden="true" />{text("cloudSyncTitle", "云同步")}</h3>
              <p className="qg-card-note qg-sync-line">{syncLine}</p>
            </div>
            <button id="syncCloudBtn" className="secondary-button qg-sync-now" type="button" disabled={syncing} onClick={handleSyncCloud}>
              <i data-lucide="cloud-upload" />
              {syncButtonLabel}
            </button>
          </div>
          <div className="qg-sync-stats">
            {syncStats.map((stat) => (
              <div key={stat.key} className="qg-sync-stat">
                <div className="k">{stat.label}</div>
                <div className="v">{stat.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="settings-panel qg-settings-card qg-card-backup">
          <div className="qg-settings-card-head">
            <div>
              <h3>{text("backupRestore", "备份与恢复")}</h3>
              <p className="qg-card-note">{text("backupNote", "导出为 JSON 文件（含训练记录、笔记、计划）；导入时校验格式，不合法的备份会被拒绝且不影响现有数据。")}</p>
            </div>
          </div>
          <div className="settings-actions qg-backup-actions">
            <button id="exportBtn" className="primary-button" type="button" onClick={() => model.exportState?.()}>
              <i data-lucide="download" />
              {text("exportBackup", "导出备份")}
            </button>
            <label className="secondary-button file-button settings-file-button">
              <input
                id="importInput"
                type="file"
                accept="application/json"
                onChange={(event) => model.importState?.(event.currentTarget.files?.[0], event.currentTarget)}
              />
              <i data-lucide="upload" />
              {importButtonLabel}
            </label>
          </div>
        </div>

        <div className="settings-panel qg-settings-card qg-card-danger">
          <div className="qg-settings-card-head">
            <div>
              <h3 className="qg-danger-title">{text("dangerZone", "危险区")}</h3>
              <p className="qg-card-note">{text("dangerNote", "清空本地训练数据（XP、连胜、任务进度）。云端副本不受影响，可随时重新拉取。")}</p>
            </div>
          </div>
          <div className="settings-actions qg-danger-actions">
            <button id="resetBtn" className="secondary-button danger-action" type="button" onClick={() => model.resetState?.()}>
              <i data-lucide="trash-2" />
              {resetButtonLabel}
            </button>
            <button id="logoutBtn" className="secondary-button qg-logout-btn" type="button" onClick={() => model.logout?.()}>
              <i data-lucide="log-out" />
              {text("logout", "退出登录")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function readCurrentSettingsForm(formNode, fallback = {}) {
  const value = (selector, defaultValue = "") => formNode.querySelector(selector)?.value ?? defaultValue;
  return {
    ...fallback,
    language: value("#settingsLanguageSelect", fallback.language || "zh"),
    country: value("#settingsCountrySelect", fallback.country || "china"),
    region: value("#settingsRegionSelect", fallback.region || ""),
    llmEndpoint: value("#settingsLlmEndpointInput", fallback.llmEndpoint || ""),
    llmModel: value("#settingsLlmModelInput", fallback.llmModel || "gpt-5-nano"),
    cloudApi: value("#settingsCloudApiInput", fallback.cloudApi || ""),
    googleClientId: value("#settingsGoogleClientIdInput", fallback.googleClientId || "")
  };
}
