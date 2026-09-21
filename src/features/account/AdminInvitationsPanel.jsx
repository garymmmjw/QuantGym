import { useCallback, useEffect, useRef, useState } from "react";

export function AdminInvitationsPanel({ model }) {
  const { api, copy, connected, zh } = model;
  const [invitations, setInvitations] = useState([]);
  const [created, setCreated] = useState([]);
  const [form, setForm] = useState({ count: 1, maxUses: 1, expiresInDays: 7, email: "" });
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const mounted = useRef(false);
  const busyRef = useRef(false);
  const translate = message => String(message || "").split(" / ")[zh ? 0 : 1] || message;
  const load = useCallback(async () => {
    const result = await api.listInvitations();
    if (!mounted.current) return;
    if (result.ok) { setInvitations(result.invitations || []); setLoaded(true); }
    else setFeedback({ ok: false, message: result.message });
  }, [api]);
  useEffect(() => {
    mounted.current = true;
    if (connected) load();
    return () => { mounted.current = false; };
  }, [connected, load]);
  const run = async (action, callback) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(action);
    setFeedback(null);
    try { await callback(); }
    catch { if (mounted.current) setFeedback({ ok: false, message: copy("操作未完成，请重试。", "Could not complete the request. Try again.") }); }
    finally { busyRef.current = false; if (mounted.current) setBusy(""); }
  };
  const update = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const create = event => {
    event.preventDefault();
    run("create", async () => {
      const result = await api.createInvitations(form);
      if (!mounted.current) return;
      if (!result.ok) { setFeedback(result); return; }
      setCreated(previous => [...previous, ...(result.invitations || [])]);
      setFeedback({ ok: true, message: copy("邀请码已生成，请复制保存后再离开此页。", "Invitations created. Copy and save the codes before leaving this page.") });
      await load();
    });
  };
  const revoke = invitation => run(invitation.id, async () => {
    const result = await api.revokeInvitation(invitation.id);
    if (!mounted.current) return;
    if (!result.ok) { setFeedback(result); return; }
    setCreated(previous => previous.filter(item => item.id !== invitation.id));
    setFeedback({ ok: true, message: copy("邀请码已停用；已经注册的账户不受影响。", "Invitation revoked. Existing accounts are unaffected.") });
    await load();
  });
  const formatDate = value => value ? new Date(value).toLocaleDateString(zh ? "zh-CN" : "en-US") : copy("无期限", "No expiry");
  const status = invitation => invitation.revokedAt ? copy("已停用", "Revoked") : Number(invitation.uses) >= Number(invitation.maxUses) ? copy("已用完", "Used up") : invitation.expiresAt && Date.parse(invitation.expiresAt) <= Date.now() ? copy("已过期", "Expired") : copy("可使用", "Available");
  return <section className="ac-invitations">
    <header className="ac-section-head"><h2>{copy("邀请码管理", "Invitations")}</h2><p>{copy("生成邀请码并交给受邀用户。注册成功后扣除名额，已有账户无需再次受邀。", "Create codes for invited users. A use is counted only after successful registration; existing accounts need no invitation.")}</p></header>
    {!connected ? <p className="ac-notice">{copy("请先登录云端管理员账户。", "Sign in with a cloud administrator account.")}</p> : <>
      <form className="ac-form" onSubmit={create}>
        <div className="ac-fields">
          <label>{copy("生成数量", "Number of codes")}<input type="number" required min="1" max="50" step="1" value={form.count} onChange={event => update("count", Number(event.target.value))} /></label>
          <label>{copy("每码可注册人数", "Registrations per code")}<input type="number" required min="1" max="1000" step="1" value={form.maxUses} onChange={event => update("maxUses", Number(event.target.value))} /><small>{copy("默认 1 人，适合定向邀请。", "Defaults to one person for individual invitations.")}</small></label>
          <label>{copy("有效天数", "Valid for (days)")}<input type="number" required min="1" max="365" step="1" value={form.expiresInDays} onChange={event => update("expiresInDays", Number(event.target.value))} /></label>
          <label>{copy("限定邮箱（可选）", "Restrict to email (optional)")}<input type="email" autoComplete="off" maxLength={254} value={form.email} onChange={event => update("email", event.target.value)} placeholder="you@example.com" /></label>
        </div>
        <button type="submit" className="primary-button" disabled={Boolean(busy)}>{busy === "create" ? copy("生成中…", "Creating…") : copy("生成邀请码", "Create invitations")}</button>
      </form>
      {feedback?.message && <p className={`ac-feedback ${feedback.ok ? "is-success" : "is-error"}`} role={feedback.ok ? "status" : "alert"}>{translate(feedback.message)}</p>}
      {created.length > 0 && <div className="ac-invitation-codes ac-subsection">
        <div className="ac-row-heading"><h3>{copy("本次生成的邀请码", "New invitation codes")}</h3><button className="secondary-button" type="button" onClick={() => run("copy", async () => { await navigator.clipboard.writeText(created.map(item => item.code).join("\n")); if (mounted.current) setFeedback({ ok: true, message: copy("已复制邀请码。", "Invitation codes copied.") }); })} disabled={Boolean(busy)}>{copy("复制全部", "Copy all")}</button></div>
        <p className="ac-help">{copy("完整邀请码仅在生成后显示，离开此页后无法再次查看。请先复制保存。", "Full codes are shown only after creation and cannot be retrieved after leaving this page. Copy and save them first.")}</p>
        {created.map(item => <label key={item.id}>{copy("邀请码", "Invitation code")}<input readOnly value={item.code} aria-label={copy("新邀请码", "New invitation code")} onFocus={event => event.target.select()} /></label>)}
      </div>}
      <div className="ac-subsection"><div className="ac-row-heading"><h3>{copy("邀请码记录", "Invitation history")}</h3><button className="secondary-button" type="button" disabled={Boolean(busy)} onClick={() => run("refresh", load)}>{copy("刷新", "Refresh")}</button></div>
        <p className="ac-help">{copy("展示最近 200 个邀请码。停用后不能再用于注册。", "Showing the latest 200 invitations. Revoked codes cannot be used for registration.")}</p>
        {!loaded ? <p>{copy("正在读取…", "Loading…")}</p> : invitations.length === 0 ? <p>{copy("还没有邀请码。", "No invitations yet.")}</p> : <ul className="ac-invitation-history">{invitations.map(item => <li key={item.id}>
          <div><strong>{item.label || item.id.slice(0, 12)}</strong><span className="ac-badge">{status(item)}</span><p>{copy(`已用 ${item.uses} / ${item.maxUses} 人 · 到期 ${formatDate(item.expiresAt)}`, `${item.uses} / ${item.maxUses} registrations · Expires ${formatDate(item.expiresAt)}`)}</p>{(item.email || item.emailRestriction) && <small>{item.email || item.emailRestriction}</small>}</div>
          <button type="button" className="secondary-button" disabled={Boolean(busy) || Boolean(item.revokedAt) || Number(item.uses) >= Number(item.maxUses) || Boolean(item.expiresAt && Date.parse(item.expiresAt) <= Date.now())} onClick={() => revoke(item)}>{busy === item.id ? copy("处理中…", "Working…") : copy("停用", "Revoke")}</button>
        </li>)}</ul>}
      </div>
    </>}
  </section>;
}
