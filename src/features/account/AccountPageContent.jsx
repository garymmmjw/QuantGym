import { useEffect, useRef } from "react";
import { useAccountPageModel } from "./accountHooks.js";

function countAuthEvents(metrics = {}) {
  return (metrics.audit?.authEvents24h || []).reduce((total, item) => total + Number(item.count || 0), 0);
}

function formatHttpErrors(metrics = {}) {
  const http = metrics.audit?.httpErrors24h || {};
  const total = Number(http.total || 0);
  const serverErrors = Number(http.serverErrors || 0);
  return serverErrors ? `${total} (${serverErrors} 5xx)` : String(total);
}

function getAdminStatusClass(status = "") {
  if (status === "error") return "error";
  if (status === "fail") return "fail";
  return "success";
}

function AdminOverviewPanel({ model }) {
  const admin = model.adminOverview || {};
  const metrics = admin.metrics || {};
  const events = admin.events || [];
  const visible = ["ready", "refreshing", "error"].includes(admin.status);
  if (!visible) return null;

  const loading = admin.status === "refreshing";
  const users = metrics.users || {};
  const sessions = metrics.sessions || {};
  const audit = metrics.audit || {};

  return (
    <aside className="account-panel account-admin-panel" aria-live="polite">
      <div className="account-admin-header">
        <div>
          <h3>{model.t("adminOverviewTitle") || "运维概览"}</h3>
          <small>
            {metrics.generatedAt
              ? `${model.t("adminOverviewUpdated") || "更新"} ${model.formatDate?.(metrics.generatedAt) || metrics.generatedAt}`
              : model.t("adminOverviewLive") || "实时读取云端 API"}
          </small>
        </div>
        <button
          className="icon-button ghost"
          type="button"
          title={model.t("refresh") || "刷新"}
          aria-label={model.t("refresh") || "刷新"}
          disabled={loading}
          onClick={model.refreshAdminOverview}
        >
          <i data-lucide="refresh-cw" />
        </button>
      </div>

      {admin.message ? <p className="account-admin-message">{admin.message}</p> : null}

      <dl className="account-admin-metrics">
        <div>
          <dt>{model.t("adminUsers") || "用户"}</dt>
          <dd>{users.total ?? "-"}</dd>
        </div>
        <div>
          <dt>{model.t("adminSessions") || "活跃会话"}</dt>
          <dd>{sessions.active ?? "-"}</dd>
        </div>
        <div>
          <dt>{model.t("adminAuditEvents") || "审计事件"}</dt>
          <dd>{audit.events ?? "-"}</dd>
        </div>
        <div>
          <dt>{model.t("adminAuth24h") || "24h auth"}</dt>
          <dd>{countAuthEvents(metrics)}</dd>
        </div>
        <div>
          <dt>{model.t("adminHttpErrors24h") || "24h HTTP errors"}</dt>
          <dd>{formatHttpErrors(metrics)}</dd>
        </div>
      </dl>

      <div className="account-admin-subsection">
        <strong>{model.t("adminRecentEvents") || "最近事件"}</strong>
        {events.length ? (
          <ul className="account-admin-events">
            {events.slice(0, 8).map((event) => (
              <li key={event.id || `${event.eventType}-${event.createdAt}`}>
                <span className={`account-admin-status ${getAdminStatusClass(event.status)}`}>
                  {event.status || "ok"}
                </span>
                <div>
                  <b>{event.eventType || "audit.event"}</b>
                  <small>
                    {(event.email || model.t("adminSystemActor") || "system")}
                    {" · "}
                    {model.formatDate?.(event.createdAt) || event.createdAt || "-"}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <small>{model.t("adminNoEvents") || "暂无审计事件。"}</small>
        )}
      </div>
    </aside>
  );
}

export function AccountPageContent() {
  const model = useAccountPageModel();
  const countryRef = useRef(null);
  const regionRef = useRef(null);

  useEffect(() => {
    if (!model.currentUser) return;
    model.renderCountries?.(countryRef.current, model.form.country);
    model.renderRegions?.(regionRef.current, model.form.country, model.form.region);
    model.refreshIcons?.({ root: document.querySelector(".account-section") || document });
  }, [
    model.currentUser,
    model.form.country,
    model.form.region,
    model.adminOverview?.status,
    model.adminOverview?.events?.length,
    model.renderCountries,
    model.renderRegions,
    model.refreshIcons
  ]);

  const initials = model.getInitials?.(model.form.name || model.currentUser?.email || "Q") || "Q";

  const handleSubmit = async (event) => {
    event.preventDefault();
    await model.save();
  };

  return (
    <section className="account-section qg-support-page qg-account-page">
      <div className="section-heading">
        <div>
          <h2>{model.t("accountInfo") || "账户信息"}</h2>
          <small id="accountMessage">{model.message || model.t("accountMessage") || "管理昵称、邮箱、头像和地区。"}</small>
        </div>
      </div>
      <div className="account-grid">
        <form id="accountForm" className="account-panel" onSubmit={handleSubmit}>
          <div className="account-avatar-row">
            <div className="avatar account-avatar-preview" id="accountAvatarPreview" aria-hidden="true">
              {model.avatarPreview ? <img src={model.avatarPreview} alt="" /> : initials}
            </div>
            <div className="avatar-actions">
              <input
                id="accountAvatarUrl"
                type="url"
                placeholder={model.t("avatarUrlPlaceholder") || "头像图片链接"}
                value={model.form.avatarUrl}
                onChange={(event) => model.update("avatarUrl", event.target.value)}
              />
              <div className="avatar-button-row">
                <label className="secondary-button avatar-upload">
                  <input
                    id="accountAvatarFile"
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) model.uploadAvatar(file);
                      event.target.value = "";
                    }}
                  />
                  <i data-lucide="image-plus" />
                  {model.t("uploadAvatar") || "上传头像"}
                </label>
                <button
                  className="icon-button ghost danger"
                  id="accountClearAvatarBtn"
                  type="button"
                  title={model.t("clearAvatar") || "清除头像"}
                  aria-label={model.t("clearAvatar") || "清除头像"}
                  onClick={model.clearAvatar}
                >
                  <i data-lucide="x" />
                </button>
              </div>
            </div>
          </div>
          <label>
            {model.t("nickname") || "昵称"}
            <input
              id="accountNameInput"
              type="text"
              autoComplete="name"
              placeholder={model.t("accountNamePlaceholder") || "你的显示名"}
              value={model.form.name}
              onChange={(event) => model.update("name", event.target.value)}
            />
          </label>
          <label>
            {model.t("email") || "邮箱"}
            <input
              id="accountEmailInput"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={model.form.email}
              onChange={(event) => model.update("email", event.target.value)}
            />
          </label>
          <label>
            {model.t("country") || "国家"}
            <select
              id="accountCountrySelect"
              ref={countryRef}
              aria-label={model.t("accountCountry") || "账户国家"}
              defaultValue={model.form.country}
              onChange={(event) => {
                model.update("country", event.target.value);
                model.renderRegions?.(regionRef.current, event.target.value);
              }}
            />
          </label>
          <label>
            {model.t("region") || "地区"}
            <select
              id="accountRegionSelect"
              ref={regionRef}
              aria-label={model.t("accountRegion") || "账户地区"}
              defaultValue={model.form.region}
              onChange={(event) => model.update("region", event.target.value)}
            />
          </label>
          <label>
            {model.t("graduationTerm") || "毕业时间"}
            <input
              id="accountGraduationTermInput"
              type="month"
              value={model.form.graduationTerm}
              onChange={(event) => model.update("graduationTerm", event.target.value)}
            />
          </label>
          <label>
            {model.t("resumeUpload") || "简历"}
            <input
              id="accountResumeFile"
              type="file"
              accept=".txt,.md,.tex,.pdf,text/plain,text/markdown,application/pdf"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) model.uploadResume(file);
                event.target.value = "";
              }}
            />
            <small id="accountResumeMeta">{model.resumeMeta}</small>
          </label>
          <label>
            {model.t("currentPassword") || "当前密码"}
            <input
              id="accountCurrentPassword"
              type="password"
              autoComplete="current-password"
              placeholder={model.t("currentPasswordPlaceholder") || "仅更改本地账户邮箱时填写"}
              value={model.form.currentPassword}
              onChange={(event) => model.update("currentPassword", event.target.value)}
            />
          </label>
          <button className="primary-button" type="submit">
            <i data-lucide="save" />
            {model.t("saveAccount") || "保存账户"}
          </button>
        </form>
        <div className="account-side-stack">
          <aside className="account-panel account-meta-panel">
            <h3>{model.t("accountInfo") || "账户信息"}</h3>
            <dl>
              <div>
                <dt>{model.t("provider") || "登录方式"}</dt>
                <dd id="accountProviderText">{model.currentUser?.provider === "google" ? "Google" : "Local"}</dd>
              </div>
              <div>
                <dt>{model.t("createdAt") || "账户创建"}</dt>
                <dd id="accountCreatedText">{model.currentUser?.createdAt ? model.formatDate?.(model.currentUser.createdAt) : "-"}</dd>
              </div>
              <div>
                <dt>{model.t("currentRank") || "当前排名"}</dt>
                <dd id="accountRankText">{model.formatRank?.(model.currentUser) || "-"}</dd>
              </div>
            </dl>
            <button className="secondary-button danger" type="button" onClick={model.logout}>
              {model.t("logout") || "退出登录"}
            </button>
          </aside>
          <AdminOverviewPanel model={model} />
        </div>
      </div>
    </section>
  );
}
