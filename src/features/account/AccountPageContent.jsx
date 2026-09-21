import { LeetCodeConnection } from "../leetcode/LeetCodeConnection.jsx";
import { CloudActivationPanel } from "./CloudActivationPanel.jsx";
import { PersonalAccountData } from "./PersonalAccountData.jsx";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAccountPageModel, readLegacyGoal } from "./accountHooks.js";
import { ACCOUNT_SECTIONS, findAccountSections, validPassword } from "./accountCenterData.js";
import { GuardianAccessPanel } from "../guardian/GuardianAccessPanel.jsx";
import { AdminOverviewPanel } from "./AdminOverviewPanel.jsx";
import { AdminInvitationsPanel } from "./AdminInvitationsPanel.jsx";
import { locationDefs } from "../../prep-data.js";
import { getCountryLabel, getRegionLabel, getDefaultRegion } from "../../modules/account/data.js";
import "./accountCenter.css";

const AVATARS = ["happy", "focused", "wink", "wow"].map(name => `/assets/generated/playful-precision/avatar-${name}-v2.png`);
const INVITATIONS_SECTION = { id: "invitations", icon: "ticket", zh: "邀请码管理", en: "Invitations", description: ["生成、查看与停用注册邀请码", "Create, review and revoke registration invitations"], keywords: "邀请码 注册 白名单 invite invitation registration allowlist" };

function Icon({ name }) { return <i data-lucide={name} aria-hidden="true" />; }
function Feedback({ model, section }) {
  const result = model.status[section];
  const message = result?.code === "saved" ? model.copy("修改已保存。", "Changes saved.") : result?.message?.includes(" / ") ? result.message.split(" / ")[model.zh ? 0 : 1] : result?.message;
  return message ? <p className={`ac-feedback ${result.ok ? "is-success" : "is-error"}`} role={result.ok ? "status" : "alert"}>{message}</p> : null;
}
function SectionHead({ title, children }) {
  return <header className="ac-section-head"><h2>{title}</h2><p>{children}</p></header>;
}
function SaveBar({ model, section, dirty, children }) {
  return <footer className="ac-save-bar"><span>{dirty ? model.copy("有尚未保存的修改", "You have unsaved changes") : model.copy("所有修改均已保存", "All changes saved")}</span><button className="primary-button" type="submit" disabled={!dirty || Boolean(model.busy)}>{model.busy === section ? model.copy("正在保存…", "Saving…") : children || model.copy("保存修改", "Save changes")}</button></footer>;
}
function useDraft(initial) {
  const signature = JSON.stringify(initial);
  const [value, setValue] = useState(initial);
  const previous = useRef(signature);
  useEffect(() => {
    // A background store refresh must not discard a form that is being edited.
    const expected = previous.current;
    setValue(current => JSON.stringify(current) === expected ? initial : current);
    previous.current = signature;
  }, [signature]);
  return [value, (key, next) => setValue(current => ({ ...current, [key]: next })), JSON.stringify(value) !== signature, setValue];
}
function LocationFields({ model, form, update }) {
  const language = model.zh ? "zh" : "en";
  return <div className="ac-fields">
    <label>{model.copy("国家", "Country")}<select id="accountCountrySelect" value={form.country} onChange={e => { update("country", e.target.value); update("region", getDefaultRegion(e.target.value)); }}>{Object.keys(locationDefs).map(country => <option key={country} value={country}>{getCountryLabel(country, language)}</option>)}</select></label>
    <label>{model.copy("地区", "Region")}<select id="accountRegionSelect" value={form.region} onChange={e => update("region", e.target.value)}>{(locationDefs[form.country]?.regions || []).map(region => <option key={region} value={region}>{getRegionLabel(region, language)}</option>)}</select></label>
  </div>;
}
function Profile({ model }) {
  const { user, copy, api } = model;
  const [form, update, dirty] = useDraft({ name: user.name || "", graduationTerm: user.graduationTerm || "", goal: readLegacyGoal(user), picture: user.picture || "" });
  const uploadRef = useRef(null);
  const resumeRef = useRef(null);
  const submit = async e => {
    e.preventDefault();
    await model.run("profile", async () => {
      const result = await api.save({ name: form.name, graduationTerm: form.graduationTerm, goal: form.goal, avatarUrl: form.picture, avatarCleared: !form.picture });
      if (result.ok) { try { localStorage.removeItem(`qg-account-goal:${user.id}`); } catch {} }
      return result;
    });
  };
  const uploadAvatar = file => model.run("avatar", async () => {
    if (!file || !/^image\/(png|jpeg|webp|gif)$/.test(file.type) || file.size > 1_800_000) return { ok: false, message: copy("请选择小于 1.8 MB 的 PNG、JPG、WebP 或 GIF 图片。", "Choose a PNG, JPG, WebP or GIF image under 1.8 MB.") };
    const dataUrl = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error(copy("图片无法读取", "Could not read image"))); reader.readAsDataURL(file); });
    if (model.services.appState?.currentUser?.id !== user.id) return { ok: false, message: copy("账户已切换。", "Account changed.") };
    const uploaded = model.connected ? await api.uploadAvatarMedia({ dataUrl, name: file.name }) : null;
    if (model.connected && !uploaded?.ok) return { ok: false, message: copy("头像上传失败，请重试。", "Avatar upload failed. Try again.") };
    update("picture", uploaded?.media?.url || uploaded?.media?.dataUrl || dataUrl);
    return { ok: true, message: copy("头像已预览，保存资料后生效。", "Avatar preview ready. Save your profile to apply.") };
  });
  return <>
    <SectionHead title={copy("个人资料", "Profile")}>{copy("让你的训练空间更有个人风格。", "Make this training space your own.")}</SectionHead>
    <form className="ac-form" onSubmit={submit}>
      <div className="ac-avatar-editor">
        <div className="ac-avatar">{form.picture ? <img src={form.picture} alt={copy("头像预览", "Avatar preview")} /> : (form.name || "Q").slice(0, 2).toUpperCase()}</div>
        <div><h3>{copy("你的头像", "Your avatar")}</h3><p>{copy("选择一个伙伴，或上传自己的照片。", "Choose a companion or upload a photo.")}</p><div className="ac-avatar-choices">{AVATARS.map((src, index) => <button type="button" key={src} aria-label={`${copy("选择头像", "Choose avatar")} ${index + 1}`} aria-pressed={form.picture === src} onClick={() => update("picture", src)}><img src={src} alt="" /></button>)}</div><div className="ac-text-actions"><button type="button" onClick={() => uploadRef.current.click()} disabled={Boolean(model.busy)}>{copy("上传图片", "Upload image")}</button>{form.picture && <button type="button" onClick={() => update("picture", "")}>{copy("移除", "Remove")}</button>}</div></div>
        <input ref={uploadRef} hidden type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={e => { uploadAvatar(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      <Feedback model={model} section="avatar" />
      <div className="ac-fields"><label>{copy("昵称", "Display name")}<input id="accountNameInput" required maxLength={80} autoComplete="nickname" value={form.name} onChange={e => update("name", e.target.value)} /></label><label>{copy("毕业时间", "Graduation date")}<input id="accountGraduationTermInput" type="month" value={form.graduationTerm} onChange={e => update("graduationTerm", e.target.value)} /></label><label className="ac-full">{copy("备考方向", "Preparation goal")}<input id="accountGoalInput" maxLength={160} placeholder={copy("例如：2027 届量化研究实习", "e.g. Quant research internship, 2027")} value={form.goal} onChange={e => update("goal", e.target.value)} /><small>{copy("随账户保存，方便在不同设备上继续准备。", "Saved with your account so you can continue on another device.")}</small></label></div>
      <Feedback model={model} section="profile" /><SaveBar model={model} section="profile" dirty={dirty} />
    </form>
    <div className="ac-row ac-resume-row"><div><h3>{copy("我的简历", "My resume")}</h3><p>{api.getResumeMeta?.() || copy("上传简历，为面试准备补充背景。", "Upload a resume to support your interview preparation.")}</p></div><button className="secondary-button" type="button" disabled={Boolean(model.busy)} onClick={() => resumeRef.current.click()}><Icon name="upload" />{copy("上传简历", "Upload resume")}</button><input ref={resumeRef} hidden type="file" accept=".txt,.md,.tex,.pdf" onChange={e => { const file = e.target.files?.[0]; if (file) model.run("resume", async () => { const result = await api.uploadResume(file); return { ...result, message: result.ok ? copy("简历已保存。", "Resume saved.") : result.message }; }); e.target.value = ""; }} /></div><Feedback model={model} section="resume" />
  </>;
}
function Security({ model }) {
  const { user, copy } = model;
  const [email, setEmail] = useState(user.email || "");
  const [emailPassword, setEmailPassword] = useState("");
  const [password, setPassword] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState(false);
  const passwordAccount = user.provider === "local";
  const canManageAccount = model.cloudSession.canManageAccount;
  const emailEditable = passwordAccount && !user.googleId && canManageAccount;
  const update = (key, value) => setPassword(current => ({ ...current, [key]: value }));
  const mismatch = Boolean(password.confirmPassword && password.confirmPassword !== password.newPassword);
  const canSave = canManageAccount && password.currentPassword && validPassword(password.newPassword) && password.newPassword === password.confirmPassword && password.newPassword !== password.currentPassword;
  return <>
    <SectionHead title={copy("登录与安全", "Login & security")}>{copy("在这里管理登录凭证，修改时验证当前密码。", "Manage your sign-in details and verify changes with your current password.")}</SectionHead>
    {!canManageAccount && <p className="ac-notice" role="status">{model.cloudSession.needsVerification ? copy("完成账号验证后，即可在线更改邮箱和密码。", "Complete account verification before changing your email or password online.") : model.cloudSession.phase === "expired" ? copy("登录已过期，请重新登录后更改邮箱或密码。", "Your session expired. Sign in again before changing your email or password.") : model.cloudSession.phase === "unknown" ? copy("正在确认账号连接，连接成功后可更改邮箱和密码。", "Checking your connection. Email and password changes will be available once connected.") : copy("邮箱和密码需要在线更改，请等待账号连接恢复。", "Email and password changes require an active connection. Please wait for your account to reconnect.")}</p>}
    <div className="ac-row"><div><h3>{copy("登录方式", "Sign-in method")}</h3><p>{passwordAccount ? (user.googleId ? copy("邮箱与密码 · 已关联 Google", "Email and password · Google linked") : copy("邮箱与密码", "Email and password")) : "Google"}</p></div><span className="ac-badge">{passwordAccount ? copy("邮箱登录", "Email sign-in") : copy("Google 登录", "Google sign-in")}</span></div>
    <form className="ac-form ac-subsection" onSubmit={e => { e.preventDefault(); if (!emailEditable) return; model.run("email", async () => { const result = await model.api.save({ email, currentPassword: emailPassword }); if (result.ok) setEmailPassword(""); return result; }); }}>
      <h3>{copy("登录邮箱", "Email address")}</h3><p className="ac-help">{passwordAccount && !user.googleId ? copy("更改邮箱后，使用新邮箱和原密码登录。其他设备需重新登录。", "Use your new email with your existing password. Other devices must sign in again.") : user.googleId ? copy("此账户同时关联了 Google 登录，当前保持登录邮箱一致。", "This account is linked to Google sign-in. Its login email is kept consistent.") : copy("该邮箱由 Google 管理，请前往 Google 账户更改。", "This email is managed by Google. Update it in your Google account.")}</p>
      <div className="ac-fields"><label>{copy("邮箱", "Email")}<input id="accountEmailInput" type="email" required autoComplete="email" disabled={!emailEditable} value={email} onChange={e => setEmail(e.target.value)} /></label>{emailEditable && email.trim().toLowerCase() !== user.email && <label>{copy("当前密码", "Current password")}<input type="password" required autoComplete="current-password" value={emailPassword} onChange={e => setEmailPassword(e.target.value)} /></label>}</div>
      {emailEditable && email.trim().toLowerCase() !== user.email && <button className="primary-button" disabled={Boolean(model.busy) || !emailPassword}>{copy("更新邮箱", "Update email")}</button>}<Feedback model={model} section="email" />
    </form>
    {passwordAccount ? <form className="ac-form ac-subsection" onSubmit={e => { e.preventDefault(); if (!canManageAccount) return; model.run("password", async () => { const result = await model.api.changePassword(password); if (result.ok) setPassword({ currentPassword: "", newPassword: "", confirmPassword: "" }); return result; }); }}>
      <div className="ac-row-heading"><h3>{copy("修改密码", "Change password")}</h3><button type="button" className="ac-text-button" aria-pressed={show} onClick={() => setShow(!show)}>{show ? copy("隐藏密码", "Hide passwords") : copy("显示密码", "Show passwords")}</button></div>
      <p className="ac-help">{copy("修改登录密码后，其他设备需要重新登录。", "Changing your password signs out other devices.")}</p>
      <p className="ac-help">{copy("新密码需要 8–128 位，包含字母和数字。", "Use 8–128 characters, including letters and numbers.")}</p>
      <div className="ac-fields"><label className="ac-full">{copy("当前密码", "Current password")}<input id="accountCurrentPassword" type={show ? "text" : "password"} required disabled={!canManageAccount} autoComplete="current-password" value={password.currentPassword} onChange={e => update("currentPassword", e.target.value)} /></label><label>{copy("新密码", "New password")}<input id="accountNewPassword" type={show ? "text" : "password"} required disabled={!canManageAccount} minLength={8} maxLength={128} autoComplete="new-password" value={password.newPassword} onChange={e => update("newPassword", e.target.value)} /></label><label>{copy("确认新密码", "Confirm new password")}<input type={show ? "text" : "password"} required disabled={!canManageAccount} autoComplete="new-password" aria-invalid={mismatch} aria-describedby={mismatch ? "passwordMismatch" : undefined} value={password.confirmPassword} onChange={e => update("confirmPassword", e.target.value)} /></label></div>
      {mismatch && <p id="passwordMismatch" className="ac-error">{copy("两次输入的新密码不一致。", "The new passwords do not match.")}</p>}<Feedback model={model} section="password" /><button className="primary-button" disabled={!canSave || Boolean(model.busy)}>{model.busy === "password" ? copy("正在更新…", "Updating…") : copy("更新密码", "Update password")}</button>
    </form> : <a className="secondary-button" href="https://myaccount.google.com/security" target="_blank" rel="noreferrer">{copy("管理 Google 账户", "Manage Google account")} ↗</a>}
    <div className="ac-row ac-subsection"><div><h3>{copy("退出当前账户", "Sign out")}</h3><p>{copy("退出后，保存在此设备上的训练记录仍会保留。", "Training records saved on this device will be retained.")}</p></div><button className="secondary-button" type="button" onClick={() => model.api.logout()}>{copy("退出登录", "Sign out")}<Icon name="log-out" /></button></div>
  </>;
}
function Preferences({ model }) {
  const { user, copy } = model;
  const [form, update, dirty] = useDraft({ country: user.country || "china", region: user.region || "上海" });
  const [theme, setTheme] = useState(() => document.documentElement.dataset.qgTheme === "dark" ? "dark" : "light");
  useEffect(() => { const observer = new MutationObserver(() => setTheme(document.documentElement.dataset.qgTheme === "dark" ? "dark" : "light")); observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-qg-theme"] }); return () => observer.disconnect(); }, []);
  const apply = (key, value) => model.run("preferences", async () => {
    const result = await model.api.save({ preferences: { ...user.preferences, language: model.zh ? "zh" : "en", theme, [key]: value } });
    if (result.ok && key === "language") model.services.setLanguage(value);
    return result;
  });
  return <><SectionHead title={copy("语言与偏好", "Preferences")}>{copy("按你的习惯设置，语言与外观选择后保存。", "Set up your workspace. Language and appearance save when selected.")}</SectionHead>
    <div className="ac-row"><div><h3>{copy("界面语言", "Language")}</h3><p>{copy("应用于导航、页面与提示。", "Used for navigation, pages and messages.")}</p></div><div className="ac-segment" role="group" aria-label={copy("界面语言", "Language")}>{[["zh", "简体中文"], ["en", "English"]].map(([id, label]) => <button key={id} type="button" disabled={Boolean(model.busy)} aria-pressed={(model.zh ? "zh" : "en") === id} onClick={() => apply("language", id)}>{label}</button>)}</div></div>
    <div className="ac-row"><div><h3>{copy("外观主题", "Appearance")}</h3><p>{copy("为不同光线下的训练选择合适的外观。", "Choose a comfortable appearance for your surroundings.")}</p></div><div className="ac-segment" role="group" aria-label={copy("外观主题", "Appearance")}>{[["light", copy("浅色", "Light")], ["dark", copy("深色", "Dark")]].map(([id, label]) => <button key={id} type="button" disabled={Boolean(model.busy)} aria-pressed={theme === id} onClick={() => apply("theme", id)}>{label}</button>)}</div></div><Feedback model={model} section="preferences" />
    <form className="ac-form ac-subsection" onSubmit={e => { e.preventDefault(); model.run("location", () => model.api.save(form)); }}><h3>{copy("所在地区", "Location")}</h3><p className="ac-help">{copy("统一用于个人资料和地区排行榜。更换国家时会自动匹配可用地区。", "Used by your profile and regional leaderboard. Changing the country updates the available regions.")}</p><LocationFields model={model} form={form} update={update} /><Feedback model={model} section="location" /><SaveBar model={model} section="location" dirty={dirty} /></form>
  </>;
}
function Connections({ model }) {
  const { copy } = model;
  return <><SectionHead title={copy("关联账户", "Connections")}>{copy("管理力扣关联、同步与公开主页。", "Manage your LeetCode connection, sync and public profile.")}</SectionHead>
    <LeetCodeConnection />
    {!model.connected && <Link className="ac-related-link" to="/account?section=data">{copy("管理账号登录与同步", "Manage sign-in and sync")} <Icon name="arrow-up-right" /></Link>}
  </>;
}
function DataSettings({ model }) {
  const { copy, cloud, services } = model;
  const input = useRef(null);
  const [reset, setReset] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const recoveryCount = model.api.getDeviceRecordRecovery?.()?.count || 0;
  const restoreDeviceRecords = event => {
    event.preventDefault();
    if (!model.connected || !recoveryPassword || model.busy) return;
    const ownerId = model.user.id;
    model.run("recovery", async () => {
      const restored = await model.api.restoreDeviceRecords({ password: recoveryPassword });
      if (!restored?.ok) return restored;
      setRecoveryPassword("");
      if (model.services.appState?.currentUser?.id !== ownerId) return { ok: false, code: "sessionChanged", message: copy("账号已切换，请在当前账号检查恢复结果。", "The account changed. Check restored records in the current account.") };
      try {
        const synced = await model.syncAccountData();
        return synced.ok
          ? { ok: true, message: copy("旧记录已合并到当前账号，并已完成同步。", "Previous records were merged into your current account and synced.") }
          : { ok: false, code: synced.code || "syncIncomplete", message: `${copy("旧记录已合并并保存在此设备。", "Previous records were merged and saved on this device.")} ${synced.message || copy("同步尚未完成，请通过上方「立即同步」重试。", "Sync is incomplete. Use Sync now above to retry.")}` };
      } catch {
        return { ok: false, code: "syncIncomplete", message: copy("旧记录已合并并保存在此设备，但同步尚未完成。请通过上方「立即同步」重试。", "Previous records were merged and saved on this device, but sync is incomplete. Use Sync now above to retry.") };
      }
    });
  };
  const state = model.state || {};
  const syncLabel = !model.connected ? model.cloudSession.label : model.busy === "sync" ? copy("同步中…", "Syncing…") : model.status.sync?.ok === false || cloud.lastError ? copy("同步需要处理", "Sync needs attention") : copy("账号同步已连接", "Account sync connected");
  return <><SectionHead title={copy("数据与同步", "Data & sync")}>{copy("确认数据存在哪里，再选择同步、备份或恢复。", "See where your data is saved, then sync, back up or restore it.")}</SectionHead>
    <CloudActivationPanel /><div className="ac-sync-panel"><div className="ac-row"><div><span className={`ac-status-dot ${model.connected && !cloud.lastError ? "is-connected" : ""}`} /><h3>{syncLabel}</h3><p>{model.connected && cloud.lastSyncAt ? `${copy("上次同步", "Last synced")} ${new Date(cloud.lastSyncAt).toLocaleString(model.zh ? "zh-CN" : "en-US")}` : copy("训练、投递记录和求职阶段使用同一个账号同步。离线修改会保留，连接恢复后继续同步。", "Practice, applications and preparation stages sync with the same account. Offline changes are kept and sync when the connection returns.")}</p></div><button className="secondary-button" type="button" disabled={!model.connected || Boolean(model.busy)} onClick={() => model.run("sync", () => model.syncAccountData())}><Icon name="refresh-cw" />{model.busy === "sync" ? copy("同步中…", "Syncing…") : copy("立即同步", "Sync now")}</button></div>
    {cloud.lastError && <p className="ac-error" role="status">{copy("上次同步失败。请检查连接，必要时重新登录。", "The last sync failed. Check your connection or sign in again.")}</p>}
    <dl className="ac-data-counts"><div><dt>{copy("训练记录", "Training records")}</dt><dd>{(state.entries || []).length}</dd></div><div><dt>{copy("资料笔记", "Notes")}</dt><dd>{(state.resources || []).length}</dd></div></dl></div><Feedback model={model} section="sync" />
    {recoveryCount > 0 && <form className="ac-form ac-subsection" onSubmit={restoreDeviceRecords}>
      <h3>{copy("恢复此设备旧记录", "Restore previous records from this device")}</h3>
      <p className="ac-help">{copy("发现此邮箱在设备上保存的旧记录。输入保存这些记录时使用的原密码，验证后合并到当前账号。", "Previous records for this email were found on this device. Enter the password used when they were saved to verify ownership and merge them into your current account.")}</p>
      <div className="ac-fields"><label>{copy("原密码", "Previous password")}<input id="accountRecoveryPassword" type="password" autoComplete="off" required value={recoveryPassword} disabled={!model.connected || Boolean(model.busy)} onChange={event => setRecoveryPassword(event.target.value)} /></label></div>
      {!model.connected && <p className="ac-help">{copy("请等待账号连接恢复后再验证旧记录。", "Reconnect your account before verifying previous records.")}</p>}
      <button className="primary-button" type="submit" disabled={!model.connected || !recoveryPassword || Boolean(model.busy)}>{model.busy === "recovery" ? copy("正在合并与同步…", "Merging and syncing…") : copy("验证并合并记录", "Verify and merge records")}</button>
    </form>}
    <Feedback model={model} section="recovery" />
    <div className="ac-row ac-subsection"><div><h3>{copy("训练日志与笔记备份", "Training log & notes backup")}</h3><p>{copy("导出训练数据为 JSON。导入前会校验备份格式，并合并可恢复的记录。", "Export training data as JSON. Imports validate the backup and merge recoverable records.")}</p></div><div className="ac-actions"><button type="button" className="secondary-button" onClick={() => services.exportState?.()}><Icon name="download" />{copy("导出备份", "Export")}</button><button type="button" className="secondary-button" disabled={Boolean(model.busy)} onClick={() => input.current.click()}><Icon name="upload" />{copy("导入备份", "Import")}</button><input ref={input} hidden type="file" accept="application/json,.json" onChange={e => { const file = e.target.files?.[0]; const node = e.target; if (file) model.run("backup", () => services.importState(file, node)); }} /></div></div><Feedback model={model} section="backup" />
    <PersonalAccountData model={model} /><details className="ac-danger-zone"><summary>{copy("清空训练日志与进度", "Clear training log & progress")}</summary><p>{copy("清空训练日志、XP、笔记和任务进度；已连接云端时也会同步清空。日历、速算、面试和 LeetCode 的独立记录保留。此操作不能撤销，请先导出备份。", "Clear training logs, XP, notes and task progress, including the cloud copy when connected. Separate calendar, math, interview and LeetCode records are retained. Export a backup first; this cannot be undone.")}</p><button className="secondary-button" type="button" onClick={() => setReset(true)}>{copy("清空训练数据…", "Clear training data…")}</button>{reset && <div className="ac-confirm"><label>{copy("输入 CLEAR 确认", "Type CLEAR to confirm")}<input value={confirmation} onChange={e => setConfirmation(e.target.value)} autoComplete="off" /></label><div className="ac-actions"><button type="button" className="secondary-button" onClick={() => { setReset(false); setConfirmation(""); }}>{copy("取消", "Cancel")}</button><button className="secondary-button ac-danger-text" type="button" disabled={confirmation !== "CLEAR" || Boolean(model.busy)} onClick={() => model.run("reset", async () => { const result = services.resetState({ confirmed: true }); setReset(false); setConfirmation(""); return result; })}>{copy("确认清空", "Confirm clear")}</button></div></div>}</details><Feedback model={model} section="reset" /><AdminOverviewPanel model={model} />
  </>;
}
function Advanced({ model }) {
  const { copy, services } = model;
  const llm = services.getLlmConfig?.() || {};
  const auth = services.appState?.auth || {};
  const [form, update, dirty] = useDraft({ llmEndpoint: llm.endpoint || "", llmModel: llm.model || "gpt-5-nano", cloudApi: model.cloud.endpoint || services.defaultCloudApiEndpoint || "", googleClientId: auth.googleClientId || "" });
  const changedEndpoint = form.cloudApi !== model.cloud.endpoint;
  return <><SectionHead title={copy("高级设置", "Advanced")}>{copy("仅在需要连接自定义服务时修改。日常训练无需调整。", "Change these only when connecting custom services. Daily training needs no changes here.")}</SectionHead>
    <form className="ac-form" onSubmit={e => { e.preventDefault(); model.run("advanced", async () => { for (const endpoint of [form.cloudApi, form.llmEndpoint]) { if (endpoint && !/^https?:\/\//i.test(endpoint)) return { ok: false, message: copy("服务地址必须以 http:// 或 https:// 开头。", "Service URLs must start with http:// or https://.") }; } const ok = services.saveSettingsFromValues({ ...form, language: model.zh ? "zh" : "en", country: model.user.country, region: model.user.region }); return { ok, message: ok ? copy("服务设置已保存。", "Service settings saved.") : copy("保存失败，请重试。", "Could not save. Try again.") }; }); }}><h3>{copy("面试模型", "Interview model")}</h3><div className="ac-fields"><label className="ac-full">{copy("模型服务地址", "Model endpoint")}<input id="settingsLlmEndpointInput" type="url" value={form.llmEndpoint} onChange={e => update("llmEndpoint", e.target.value)} /></label><label className="ac-full">{copy("模型名称", "Model name")}<input id="settingsLlmModelInput" value={form.llmModel} onChange={e => update("llmModel", e.target.value)} /></label></div><div className="ac-subsection"><h3>{copy("账户服务", "Account service")}</h3><div className="ac-fields"><label className="ac-full">Cloud API Endpoint<input id="settingsCloudApiInput" type="url" value={form.cloudApi} onChange={e => update("cloudApi", e.target.value)} /><small>{copy("更换服务地址后会清除原登录会话，需要重新登录。", "Changing this URL clears the current session and requires sign-in.")}</small></label><label className="ac-full">Google Client ID<input id="settingsGoogleClientIdInput" value={form.googleClientId} onChange={e => update("googleClientId", e.target.value)} autoComplete="off" spellCheck="false" /><small>{copy("这是应用接入配置，不代表你的 Google 账户已绑定。", "This configures the app; it does not link your Google account.")}</small></label></div></div>{changedEndpoint && <p className="ac-notice">{copy("保存后需要重新登录。", "You will need to sign in again after saving.")}</p>}<Feedback model={model} section="advanced" /><SaveBar model={model} section="advanced" dirty={dirty} /></form>
  </>;
}
export function AccountPageContent() {
  const model = useAccountPageModel();
  const [params, setParams] = useSearchParams();
  const admin = Boolean(model.user?.isAdmin || model.user?.subscriptionTier === "admin");
  const sections = admin ? [...ACCOUNT_SECTIONS, INVITATIONS_SECTION] : ACCOUNT_SECTIONS;
  const section = sections.some(item => item.id === params.get("section")) ? params.get("section") : "profile";
  const [query, setQuery] = useState("");
  const results = findAccountSections(query, sections);
  const navigate = id => { setQuery(""); setParams(previous => { const next = new URLSearchParams(previous); next.set("section", id); return next; }); };
  useEffect(() => { model.services.services?.refreshIcons?.({ root: document.querySelector(".ac-center") }); }, [section, query, model.zh, model.user, model.busy, model.status]);
  if (!model.user) return null;
  const copy = model.copy;
  const title = item => model.zh ? item.zh : item.en;
  const panels = { profile: Profile, security: Security, preferences: Preferences, connections: Connections, data: DataSettings, advanced: Advanced };
  return <section className="ac-center" data-react-owned="true" key={model.user.id}>
    <header className="ac-heading"><div><span className="ac-eyebrow">YOUR SPACE</span><h1>{copy("账户与设置", "Account & settings")}</h1><p>{copy("你的资料、偏好与连接，都在这里。", "Your profile, preferences and connections, together.")}</p></div><span className={`ac-cloud-label ${model.connected && !model.cloud.lastError ? "is-connected" : ""}`}><span className="ac-status-dot" />{model.cloudSession.label}</span></header>
    <div className="ac-workspace"><aside className="ac-sidebar"><div className="ac-identity"><div className="ac-mini-avatar">{model.user.picture ? <img src={model.user.picture} alt="" /> : (model.user.name || "Q").slice(0, 2)}</div><div><strong>{model.user.name}</strong><span>Lv.{model.stats.level} · {model.stats.xp.toLocaleString()} XP</span></div></div>
      <div className="ac-search"><Icon name="search" /><input type="search" aria-label={copy("搜索账户设置", "Search account settings")} placeholder={copy("搜索设置…", "Find a setting…")} value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.nativeEvent.isComposing) return; if (e.key === "Escape") setQuery(""); if (e.key === "Enter" && results.length) { e.preventDefault(); navigate(results[0].id); } }} />{query && <button type="button" aria-label={copy("清除搜索", "Clear search")} onClick={() => setQuery("")}>×</button>}</div>
      <nav className="ac-nav" aria-label={copy("账户设置导航", "Account settings navigation")}>{sections.map(item => <button key={item.id} type="button" aria-current={!query && section === item.id ? "page" : undefined} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span>{title(item)}</span><Icon name="chevron-right" /></button>)}</nav><p className="ac-sidebar-note">{copy("专注下一次进步。", "Make room for your next step.")}</p>
    </aside><div className="ac-content">
      {query ? <section className="ac-search-results" aria-live="polite"><SectionHead title={copy("搜索结果", "Search results")}>{results.length ? copy(`找到 ${results.length} 个相关设置`, `${results.length} matching settings`) : copy("未找到相关设置。试试“密码”“语言”或“LeetCode”。", "No matches. Try password, language or LeetCode.")}</SectionHead>{results.map(item => <button type="button" key={item.id} onClick={() => navigate(item.id)}><Icon name={item.icon} /><span><strong>{title(item)}</strong><small>{item.description[model.zh ? 0 : 1]}</small></span><Icon name="arrow-right" /></button>)}</section> : null}
      {Object.entries(panels).map(([id, Panel]) => <div key={`${model.user.id}-${id}`} hidden={Boolean(query) || section !== id}><Panel model={model} /></div>)}
      {!query && section === "invitations" && admin && <AdminInvitationsPanel key={model.user.id} model={model} />}
      {!query && section === "guardian" && <><SectionHead title={copy("监护人", "Guardian")}>{copy("由你决定谁可以查看进度，以及何时停止共享。", "You decide who can see your progress and when sharing ends.")}</SectionHead><GuardianAccessPanel /></>}
    </div></div>
  </section>;
}
