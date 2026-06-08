import { useEffect, useRef } from "react";
import { useAccountPageModel } from "./accountHooks.js";

export function AccountPageContent() {
  const model = useAccountPageModel();
  const countryRef = useRef(null);
  const regionRef = useRef(null);

  useEffect(() => {
    if (!model.currentUser) return;
    model.renderCountries?.(countryRef.current, model.form.country);
    model.renderRegions?.(regionRef.current, model.form.country, model.form.region);
    model.refreshIcons?.();
  }, [model, model.currentUser, model.form.country, model.form.region]);

  const initials = model.getInitials?.(model.form.name || model.currentUser?.email || "Q") || "Q";

  const handleSubmit = async (event) => {
    event.preventDefault();
    await model.save();
  };

  return (
    <section className="account-section">
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
      </div>
    </section>
  );
}
