import { useCallback, useEffect, useRef, useState } from "react";
import { membershipConnection, membershipRequest, notifyMembershipChanged } from "../membership/membershipApi.js";

export function AdminMembershipPanel({ model }) {
  const { copy, zh, cloud, user } = model;
  const connection = membershipConnection(cloud, user?.id);
  const { token, baseUrl } = connection;
  const connected = model.connected && connection.connected;
  const [memberships, setMemberships] = useState([]);
  const [email, setEmail] = useState("");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const active = useRef(null);
  const operation = useRef(false);
  const translate = message => String(message || "").split(" / ")[zh ? 0 : 1] || message;
  const load = useCallback(async signal => {
    const payload = await membershipRequest("/admin/memberships", { token, baseUrl, signal });
    if (!signal?.aborted) { setMemberships(payload.memberships || []); setLoaded(true); }
  }, [token, baseUrl]);
  useEffect(() => {
    const controller = new AbortController();
    active.current = controller;
    setMemberships([]); setLoaded(false); setFeedback(null);
    if (connected) load(controller.signal).catch(error => {
      if (!controller.signal.aborted) setFeedback({ ok: false, message: error.message });
    });
    return () => controller.abort();
  }, [connected, load]);
  const run = async (key, action) => {
    if (operation.current || !connected) return;
    operation.current = true; setBusy(key); setFeedback(null);
    const signal = active.current?.signal;
    try { await action(signal); }
    catch (error) { if (!signal?.aborted) setFeedback({ ok: false, message: error.message }); }
    finally { operation.current = false; if (!signal?.aborted) setBusy(""); }
  };
  const add = event => {
    event.preventDefault();
    run("add", async signal => {
      await membershipRequest("/admin/memberships", { method: "POST", body: { email: email.trim().toLowerCase() }, token, baseUrl, signal });
      if (signal?.aborted) return;
      setEmail("");
      setFeedback({ ok: true, message: copy("会员邮箱已添加。该邮箱登录后即可使用葵花宝典。", "Membership added. This email can access the Sunflower Manual after signing in.") });
      notifyMembershipChanged();
      await load(signal);
    });
  };
  const remove = member => run(member.email, async signal => {
    await membershipRequest(`/admin/memberships/${encodeURIComponent(member.email)}`, { method: "DELETE", token, baseUrl, signal });
    if (signal?.aborted) return;
    setFeedback({ ok: true, message: copy("已移除会员权限；原有做题记录仍会保留。", "Membership removed. Existing practice history is retained.") });
    notifyMembershipChanged();
    await load(signal);
  });
  const filtered = memberships.filter(member => member.email.includes(query.trim().toLowerCase()));
  return <section className="ac-memberships">
    <header className="ac-section-head"><h2>{copy("会员邮箱名单", "Membership emails")}</h2><p>{copy("添加邮箱即可开放葵花宝典，支持提前添加尚未注册的邮箱。会员权限与注册邀请码分别管理。", "Add an email to grant access to the Sunflower Manual, even before registration. Membership and registration invitations are managed separately.")}</p></header>
    {!connected ? <p className="ac-notice">{copy("请先登录云端管理员账户。", "Sign in with a cloud administrator account.")}</p> : <>
      <form className="ac-form" onSubmit={add}><div className="ac-fields"><label className="ac-full">{copy("会员邮箱", "Member email")}<input required type="email" maxLength={254} autoComplete="off" value={email} onChange={event => setEmail(event.target.value)} placeholder="member@example.com" /></label></div><button type="submit" className="primary-button" disabled={Boolean(busy)}>{busy === "add" ? copy("添加中…", "Adding…") : copy("添加会员", "Add member")}</button></form>
      {feedback?.message && <p className={`ac-feedback ${feedback.ok ? "is-success" : "is-error"}`} role={feedback.ok ? "status" : "alert"}>{translate(feedback.message)}</p>}
      <div className="ac-subsection"><div className="ac-row-heading"><h3>{copy(`会员名单 · ${memberships.length}`, `Members · ${memberships.length}`)}</h3><button type="button" className="secondary-button" disabled={Boolean(busy)} onClick={() => run("refresh", load)}>{copy("刷新", "Refresh")}</button></div>
        <p className="ac-help">{copy("移除后即收回葵花宝典访问权限，可随时重新添加。管理员始终拥有访问权限。", "Remove an email to revoke access, or add it again at any time. Administrators always have access.")}</p>
        <label className="ac-membership-search">{copy("搜索会员邮箱", "Find a member")}<input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={copy("输入邮箱搜索…", "Search by email…")} /></label>
        {!loaded ? <p>{feedback?.ok === false ? copy("名单尚未加载，请点击刷新重试。", "The list could not be loaded. Select Refresh to retry.") : copy("正在读取…", "Loading…")}</p> : !filtered.length ? <p>{query ? copy("没有匹配的会员邮箱。", "No matching members.") : copy("还没有添加会员邮箱。", "No member emails have been added.")}</p> : <ul className="ac-invitation-history">{filtered.map(member => <li key={member.email}><div><strong>{member.email}</strong><p>{copy("添加于 ", "Added ")}{new Date(member.updatedAt).toLocaleDateString(zh ? "zh-CN" : "en-US")}</p></div><button type="button" className="secondary-button" disabled={Boolean(busy)} onClick={() => remove(member)}>{busy === member.email ? copy("处理中…", "Working…") : copy("移除会员", "Remove member")}</button></li>)}</ul>}
      </div>
    </>}
  </section>;
}
