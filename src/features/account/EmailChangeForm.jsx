import { useEffect, useRef, useState } from "react";

const normalizeEmail = value => String(value || "").trim().toLowerCase();

export function EmailChangeForm({ model }) {
  const { user, copy } = model;
  const [email, setEmail] = useState(user.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [request, setRequest] = useState(null);
  const [resendAt, setResendAt] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [now, setNow] = useState(Date.now);
  const generation = useRef(0);
  const sessionGeneration = useRef(0);
  const targetRef = useRef("");
  const passwordAccount = user.provider === "local";
  const editable = passwordAccount && !user.googleId && model.cloudSession.canManageAccount;
  const target = normalizeEmail(email);
  targetRef.current = target;
  const changing = target !== normalizeEmail(user.email);
  const validTarget = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target);
  const cooldown = Math.max(0, Math.ceil((resendAt - now) / 1000));
  const expired = Boolean(request && now >= request.expiresAt);
  const busy = Boolean(model.busy);
  const ready = editable && changing && request?.email === target && !expired && /^\d{6}$/.test(verificationCode) && currentPassword;

  useEffect(() => {
    generation.current += 1;
    sessionGeneration.current += 1;
    setCurrentPassword("");
    setVerificationCode("");
    setRequest(null);
    setResendAt(0);
    setFeedback(null);
    return () => { generation.current += 1; sessionGeneration.current += 1; };
  }, [user.id, model.cloud?.token, model.cloud?.endpoint, editable]);
  useEffect(() => {
    setEmail(user.email || "");
    setCurrentPassword("");
    setVerificationCode("");
    setRequest(null);
  }, [user.email]);
  useEffect(() => {
    const deadline = Math.max(request?.expiresAt || 0, resendAt);
    if (deadline <= Date.now()) return;
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (current >= deadline) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [request, resendAt]);

  const editTarget = value => {
    if (normalizeEmail(value) !== targetRef.current) {
      generation.current += 1;
      setVerificationCode("");
      setRequest(null);
      setFeedback(null);
    }
    targetRef.current = normalizeEmail(value);
    setEmail(value);
  };
  const sendCode = async () => {
    if (!editable || !changing || !validTarget || !currentPassword || busy || cooldown) return;
    const revision = generation.current;
    const session = sessionGeneration.current;
    const requestedEmail = target;
    setFeedback(null);
    const result = await model.run("emailCode", () => model.api.sendEmailChangeCode({ email: requestedEmail, currentPassword }));
    if (sessionGeneration.current !== session) return;
    const sentAt = Date.now();
    setNow(sentAt);
    // Sending limits belong to the account, even when the target is edited
    // while the request is in flight. Only the code belongs to the target.
    if (result?.ok || result?.code === "rateLimited") setResendAt(sentAt + Math.max(1, Number(result.ok ? result.cooldownSeconds : result.retryAfter) || 60) * 1000);
    if (generation.current !== revision || targetRef.current !== requestedEmail) return;
    if (!result?.ok) { setFeedback(result); return; }
    setVerificationCode("");
    setRequest({ email: requestedEmail, expiresAt: sentAt + Math.max(1, Number(result.expiresInSeconds) || 600) * 1000 });
    setFeedback({ ok: true, message: result.delivery === "dev" && result.devCode
      ? copy(`本地开发验证码：${result.devCode}。`, `Local development code: ${result.devCode}.`)
      : copy(`验证码已发送到 ${requestedEmail}，请查看收件箱。`, `Code sent to ${requestedEmail}. Check your inbox.`) });
  };
  const submit = async event => {
    event.preventDefault();
    if (!ready || busy) return;
    const revision = generation.current;
    const result = await model.run("email", () => model.api.save({ email: target, currentPassword, verificationCode }));
    if (generation.current !== revision) return;
    setFeedback(result);
    if (result?.code === "verificationLocked") { setVerificationCode(""); setRequest(null); }
    if (result?.ok) {
      setCurrentPassword("");
      setVerificationCode("");
      setRequest(null);
    }
  };
  const message = feedback?.code === "saved" ? copy("邮箱已验证并更新，其他设备需要重新登录。", "Email verified and updated. Sign in again on other devices.")
    : feedback?.message?.includes(" / ") ? feedback.message.split(" / ")[model.zh ? 0 : 1] : feedback?.message;

  return <form className="ac-form ac-subsection" onSubmit={submit}>
    <h3>{copy("登录邮箱", "Email address")}</h3>
    <p className="ac-help" id="accountEmailHelp">{passwordAccount && !user.googleId
      ? copy("输入当前密码，将验证码发送到新邮箱。验证完成后才会更换登录邮箱，其他设备需重新登录。", "Enter your current password and send a code to your new email. Your sign-in email changes only after verification. Other devices must sign in again.")
      : user.googleId ? copy("此账户同时关联了 Google 登录，当前保持登录邮箱一致。", "This account is linked to Google sign-in. Its login email is kept consistent.")
      : copy("该邮箱由 Google 管理，请前往 Google 账户更改。", "This email is managed by Google. Update it in your Google account.")}</p>
    <div className="ac-fields">
      <label>{copy("邮箱", "Email")}<input id="accountEmailInput" type="email" required maxLength={254} autoComplete="email" aria-describedby={`accountEmailHelp${message ? " accountEmailFeedback" : ""}`} disabled={!editable || model.busy === "email"} value={email} onChange={event => editTarget(event.target.value)} /></label>
      {editable && changing && <label>{copy("当前密码", "Current password")}<input id="accountEmailPassword" type="password" required autoComplete="current-password" aria-describedby={message ? "accountEmailFeedback" : undefined} disabled={busy} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label>}
      {editable && changing && <label>{copy("新邮箱验证码", "New email verification code")}<input id="accountEmailVerificationCode" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={!request || expired || busy} value={verificationCode} aria-describedby={`accountEmailCodeHelp${message ? " accountEmailFeedback" : ""}`} onChange={event => { setVerificationCode(event.target.value.replace(/\D/g, "").slice(0, 6)); setFeedback(null); }} /></label>}
    </div>
    {editable && changing && <>
      <p className="ac-help" id="accountEmailCodeHelp">{expired ? copy("验证码已过期，请重新发送。", "This code has expired. Send a new code.") : copy("请输入新邮箱收到的 6 位验证码。重新发送后，请使用最新的验证码。", "Enter the 6-digit code from your new email. After resending, use the newest code.")}</p>
      <div className="ac-actions">
        <button type="button" className="secondary-button" disabled={busy || !validTarget || !currentPassword || cooldown > 0} onClick={sendCode}>{model.busy === "emailCode" ? copy("正在发送…", "Sending…") : cooldown > 0 ? copy(`${cooldown} 秒后重新发送`, `Resend in ${cooldown}s`) : request ? copy("重新发送验证码", "Resend code") : copy("发送验证码", "Send code")}</button>
        <button type="submit" className="primary-button" disabled={busy || !ready}>{model.busy === "email" ? copy("正在验证…", "Verifying…") : copy("验证并更新邮箱", "Verify and update email")}</button>
      </div>
    </>}
    {message && <p id="accountEmailFeedback" className={`ac-feedback ${feedback.ok ? "is-success" : "is-error"}`} role={feedback.ok ? "status" : "alert"}>{message}</p>}
  </form>;
}
