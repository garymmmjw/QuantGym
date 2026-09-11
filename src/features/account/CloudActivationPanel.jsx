import { useEffect, useState } from "react";
import { useAuthStore } from "../../stores/AppServicesContext.jsx";
import { usePageApi } from "../../stores/usePageApi.js";
import { useCloudSession } from "./useCloudSession.js";
import "./cloudSession.css";

export function CloudActivationPanel() {
  const accountApi = usePageApi("account");
  const user = useAuthStore(state => state.currentUser);
  const session = useCloudSession();
  const [expanded, setExpanded] = useState(false);
  const [password, setPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [pending, setPending] = useState("");
  const [result, setResult] = useState(null);
  const [cooldown, setCooldown] = useState(0);
  const t = (zh, en) => session.en ? en : zh;
  useEffect(() => {
    setExpanded(false); setPassword(""); setVerificationCode(""); setPending(""); setResult(null); setCooldown(0);
  }, [user?.id]);
  useEffect(() => {
    if (!cooldown) return undefined;
    const timer = window.setTimeout(() => setCooldown(value => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  if (!user || session.phase !== "local") return null;
  const run = async (kind) => {
    if (pending) return;
    setPending(kind); setResult(null);
    try {
      const next = kind === "send"
        ? await accountApi.sendCloudActivationCode({ password })
        : await accountApi.activateCloudAccount({ password, verificationCode });
      setResult(next);
      if (kind === "send" && next?.ok) setCooldown(Math.max(1, Number(next.retryAfter) || 60));
      if (kind === "activate" && next?.ok) { setPassword(""); setVerificationCode(""); }
    } catch {
      setResult({ ok: false, message: t("暂时无法连接云端，请稍后重试。", "Cloud is temporarily unavailable. Please try again later.") });
    } finally { setPending(""); }
  };

  return <section className="account-panel qg-cloud-activation" aria-labelledby="cloud-activation-title">
    <div className="account-panel-title" id="cloud-activation-title">{t("启用云同步", "Enable cloud sync")}</div>
    <p>{t("当前使用此设备保存的账户。启用云同步后，可以跨设备查看训练记录并关联 LeetCode。", "You are using the account saved on this device. Enable cloud sync to access your practice across devices and connect LeetCode.")}</p>
    <p className="qg-cloud-activation-email">{user.email}</p>
    {user.provider !== "local" ? <button className="secondary-button" type="button" onClick={session.reconnect}>{t("使用 Google 登录云端", "Sign in to the cloud with Google")}</button>
      : <>
        {!expanded ? <button className="primary-button" type="button" onClick={() => setExpanded(true)}>{t("验证邮箱并启用", "Verify email & enable")}</button> : <form onSubmit={event => { event.preventDefault(); run("activate"); }}>
          <p>{t("验证当前密码和邮箱后，将为这个账户启用云端，原有训练记录会保留并同步。", "Verify your device password and email to enable cloud sync for this account. Your existing practice records will be kept and synced.")}</p>
          <label htmlFor="cloud-activation-password">{t("此设备账户的密码", "This device account's password")}</label>
          <input id="cloud-activation-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} required disabled={Boolean(pending)} />
          <label htmlFor="cloud-activation-code">{t("邮箱验证码", "Email verification code")}</label>
          <div className="qg-cloud-activation-code-row">
            <input id="cloud-activation-code" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={verificationCode} onChange={event => setVerificationCode(event.target.value.replace(/\D/g, ""))} required disabled={Boolean(pending)} />
            <button className="secondary-button" type="button" disabled={!password || Boolean(pending) || cooldown > 0} onClick={() => run("send")}>{pending === "send" ? t("发送中…", "Sending…") : cooldown > 0 ? t(`${cooldown} 秒后重发`, `Resend in ${cooldown}s`) : t("发送验证码", "Send code")}</button>
          </div>
          <div className="qg-cloud-activation-actions">
            <button className="primary-button" type="submit" disabled={!password || verificationCode.length !== 6 || Boolean(pending)}>{pending === "activate" ? t("启用中…", "Enabling…") : t("启用云同步", "Enable cloud sync")}</button>
            <button className="secondary-button" type="button" disabled={Boolean(pending)} onClick={() => { setExpanded(false); setPassword(""); setVerificationCode(""); setResult(null); }}>{t("稍后再说", "Not now")}</button>
          </div>
        </form>}
        {result?.message && <p className={result.ok ? "" : "qg-cloud-activation-error"} role={result.ok ? "status" : "alert"}>{result.message}</p>}
        <button className="qg-cloud-signin-link" type="button" disabled={Boolean(pending)} onClick={session.reconnect}>{t("已有云端账户？登录云端", "Already have a cloud account? Sign in")}</button>
      </>}
  </section>;
}
