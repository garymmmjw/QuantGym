import { useEffect, useRef } from "react";
import { getQuantySrc, resolveLegacyQuantySrc } from "@/lib/quantyAssets.js";
import { useAccountPageModel } from "./accountHooks.js";

const PRESET_AVATARS = Object.freeze([
  getQuantySrc("happy", 160),
  getQuantySrc("focused", 160),
  getQuantySrc("wink", 160),
  getQuantySrc("wow", 160)
]);

function resolvePresetAvatar(src = "") {
  return resolveLegacyQuantySrc(src, 160);
}

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
    model.refreshIcons?.({ root: document.querySelector(".qg-account-page") || document });
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

  const activeAvatar = resolvePresetAvatar(model.avatarPreview);
  const displayName = model.form.name || model.currentUser?.name || "Quant";
  const displayEmail = model.form.email || model.currentUser?.email || "";
  const displayRegion = model.currentUser?.region || model.form.region || "";

  return (
    // No "account-section" class on the section: src/ui/languageText.js
    // rewrites ".account-section h2" to 账户信息 after every save/renderAll.
    <section className="qg-support-page qg-account-page">
      <div className="section-heading account-header">
        <div>
          <span className="account-kicker">{model.t("accountKicker") || "ACCOUNT · 云同步已开启"}</span>
          <h2>{model.t("accountHeading") || "账户"}</h2>
          <small id="accountMessage">{model.message || model.t("accountHeaderSub") || "个人资料 · 头像 · 登录与安全"}</small>
        </div>
      </div>
      <div className="account-grid">
        <div className="account-side-stack">
          <aside className="account-panel account-identity-card">
            <div className="avatar account-avatar-preview" id="accountAvatarPreview" aria-hidden="true">
              {activeAvatar ? <img src={activeAvatar} alt="" /> : initials}
            </div>
            <div className="account-identity-name">{displayName}</div>
            <div className="account-identity-sub">
              {[displayEmail, displayRegion].filter(Boolean).join(" · ")}
            </div>
            <div className="account-identity-chips">
              <span className="account-rank-chip">Lv.{model.stats.level} · {model.stats.tier}</span>
              <span className="account-streak-chip">{model.t("accountStreakChip", { days: model.stats.streak }) || `🔥 ${model.stats.streak} 天`}</span>
            </div>

            <div className="account-avatar-picker">
              <div className="account-avatar-picker-label">{model.t("accountChooseAvatar") || "选择头像"}</div>
              <div className="account-avatar-grid">
                {PRESET_AVATARS.map((src) => (
                  <button
                    key={src}
                    type="button"
                    className={`account-avatar-thumb${activeAvatar === src ? " is-active" : ""}`}
                    onClick={() => model.update("avatarUrl", src)}
                    aria-label={model.t("accountChooseAvatar") || "选择头像"}
                  >
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
              <details className="account-avatar-more">
                <summary>{model.t("accountCustomAvatar") || "自定义头像"}</summary>
                <div className="account-avatar-actions avatar-actions">
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
              </details>
            </div>
          </aside>

          {/* Class intentionally NOT "account-meta-panel": the legacy language
              applier (src/ui/languageText.js) rewrites that panel's h3/dt texts
              back to the old 账户信息 copy after every save/renderAll. */}
          <aside className="account-panel account-stats-panel">
            <h3>{model.t("accountDataOverview") || "数据概览"}</h3>
            <dl>
              <div>
                <dt>{model.t("accountTotalXp") || "累计 XP"}</dt>
                <dd>{model.stats.totalXp.toLocaleString("en-US")}</dd>
              </div>
              <div>
                <dt>{model.t("accountSolvedProblems") || "已解题目"}</dt>
                <dd>{model.stats.solved}</dd>
              </div>
              <div>
                <dt>{model.t("accountStreakLabel") || "连胜"}</dt>
                <dd>{model.t("accountStreakDays", { days: model.stats.streak }) || `${model.stats.streak} 天`}</dd>
              </div>
              <div>
                <dt>{model.t("accountRegisteredAt") || "注册时间"}</dt>
                <dd id="accountCreatedText">{model.registeredLabel}</dd>
              </div>
              <div>
                <dt>{model.t("currentRank") || "当前排名"}</dt>
                <dd id="accountRankText">{model.formatRank?.(model.currentUser) || "-"}</dd>
              </div>
            </dl>
          </aside>
          <AdminOverviewPanel model={model} />
        </div>

        <div className="account-main-stack">
          <form id="accountForm" className="account-panel account-profile-panel" onSubmit={handleSubmit}>
            <div className="account-panel-title">{model.t("accountProfileTitle") || "个人资料"}</div>
            <div className="account-fields">
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
                {model.t("accountGoalDirection") || "目标方向"}
                <input
                  id="accountGoalInput"
                  type="text"
                  placeholder={model.t("accountGoalPlaceholder") || "如：量化研究 / 交易 2027 届"}
                  value={model.form.goal}
                  onChange={(event) => model.update("goal", event.target.value)}
                />
              </label>
              <label className="account-field-email">
                {model.t("accountEmailLoginLabel") || "邮箱（登录名）"}
                <input
                  id="accountEmailInput"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={model.form.email}
                  onChange={(event) => model.update("email", event.target.value)}
                />
              </label>
              <label className="account-field-resume">
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
            </div>
            <button className="primary-button account-save-btn" type="submit">
              <i data-lucide="save" />
              {model.t("accountSaveProfile") || "保存资料"}
            </button>
          </form>

          <aside className="account-panel account-security-panel">
            <div className="account-panel-title">{model.t("accountSecurityTitle") || "登录与安全"}</div>
            <div className="account-security-meta">
              <span id="accountProviderText">
                {model.currentUser?.provider === "google"
                  ? (model.t("accountProviderGoogle") || "已绑定 Google 登录")
                  : (model.t("accountProviderLocal") || "本地账户")}
              </span>
              {model.lastAuthenticatedAt
                ? model.t("accountLastLogin", { date: model.formatDate?.(model.lastAuthenticatedAt) || model.lastAuthenticatedAt })
                : ""}
              {model.currentUser?.region ? ` · ${model.currentUser.region}` : ""}
            </div>
            <div className="account-security-fields">
              <label>
                {model.t("currentPassword") || "当前密码"}
                <input
                  id="accountCurrentPassword"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={model.form.currentPassword}
                  onChange={(event) => model.update("currentPassword", event.target.value)}
                />
              </label>
              <label>
                {model.t("accountNewPasswordLabel") || "新密码（≥8 位，含字母数字）"}
                <input
                  id="accountNewPassword"
                  type="password"
                  autoComplete="new-password"
                  placeholder={model.t("accountNewPasswordPlaceholder") || "设置新密码"}
                  value={model.form.newPassword}
                  onChange={(event) => model.update("newPassword", event.target.value)}
                />
              </label>
            </div>
            <div className="account-security-actions">
              <button
                className={`account-password-btn${model.passwordValid ? "" : " is-disabled"}`}
                type="button"
                onClick={model.changePassword}
              >
                {model.t("accountChangePassword") || "修改密码"}
              </button>
              <button className="secondary-button danger account-logout-btn" type="button" onClick={model.logout}>
                {model.t("logout") || "退出登录"} →
              </button>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
