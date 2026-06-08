import { useEffect, useRef, useState } from "react";
import { useSettingsPageModel } from "./settingsHooks.js";

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
  const [form, setForm] = useState({
    language: model.currentLanguage || model.getLanguage?.() || "zh",
    country: model.currentUser?.country || "china",
    region: model.currentUser?.region || "",
    llmEndpoint: llmConfig.endpoint || "",
    llmModel: llmConfig.model || "gpt-5-nano",
    cloudApi: cloudConfig.endpoint || model.defaultCloudApiEndpoint || "",
    googleClientId: authConfig.googleClientId || ""
  });
  const [statusMessage, setStatusMessage] = useState(() => text("settingsMessageDefault", "应用偏好和数据管理。"));

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

  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (event) => {
    event.preventDefault();
    const saved = model.save(form);
    if (saved) setStatusMessage(text("settingsSaved", "设置已保存。"));
  };

  const handleSyncCloud = async () => {
    setStatusMessage(text("cloudSyncing", "云端同步中..."));
    const synced = await model.syncCloud?.();
    if (synced) {
      setStatusMessage(model.getCloudStatusText?.() || text("cloudConnected", "云端已连接。"));
    } else {
      setStatusMessage(text("cloudNoSession", "云端还没有登录会话，请先用邮箱密码登录一次。"));
    }
  };

  return (
    <section className="settings-section">
      <div className="section-heading">
        <div>
          <h2>{model.t("settings")}</h2>
          <small id="settingsMessage">{statusMessage}</small>
        </div>
      </div>
      <div className="settings-grid">
        <form id="settingsForm" className="settings-panel" onSubmit={handleSubmit}>
          <h3>{text("settingsPreferences", "偏好")}</h3>
          <label>
            {model.t("language")}
            <select
              id="settingsLanguageSelect"
              aria-label={model.t("language")}
              data-i18n-aria-label="language"
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
          <button className="primary-button" type="submit">
            <i data-lucide="save" />
            {model.t("saveSettings") || "保存设置"}
          </button>
        </form>

        <div className="settings-panel">
          <h3>{text("settingsData", "数据")}</h3>
          <div className="settings-actions">
            <button id="exportBtn" className="secondary-button" type="button" onClick={() => model.exportState?.()}>
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
              {text("importBackup", "导入备份")}
            </label>
            <button id="resetBtn" className="secondary-button danger-action" type="button" onClick={() => model.resetState?.()}>
              <i data-lucide="trash-2" />
              {text("resetMemory", "清空训练记录")}
            </button>
            <button id="syncCloudBtn" className="secondary-button" type="button" onClick={handleSyncCloud}>
              <i data-lucide="cloud-upload" />
              {text("syncCloud", "同步云端")}
            </button>
            <button id="logoutBtn" className="secondary-button" type="button" onClick={() => model.logout?.()}>
              <i data-lucide="log-out" />
              {text("logout", "退出登录")}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
