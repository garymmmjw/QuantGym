import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAppServicesContext, useAppStore, useAuthStore } from "../../stores/AppServicesContext.jsx";
import { useCloudSession } from "../account/useCloudSession.js";
import { guardianOwnerRequest } from "./guardianOwnerApi.js";
import "./guardianAccess.css";

export function GuardianAccessPanel() {
  const services = useAppServicesContext();
  const user = useAuthStore(state => state.currentUser);
  const config = useAppStore(state => state.cloudConfig || services.appState?.cloudConfig || {});
  const cloudSession = useCloudSession();
  const [access, setAccess] = useState(null);
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const connected = Boolean(user?.id && config.endpoint && config.token && config.userId === user.id)
    && !["expired", "restricted"].includes(cloudSession.phase);
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const ownerKey = JSON.stringify([user?.id, config.endpoint, config.userId, config.token]);
  const ownerRef = useRef(ownerKey);
  const requestEpoch = useRef(0);
  ownerRef.current = ownerKey;

  useEffect(() => {
    const epoch = ++requestEpoch.current;
    setAccess(null);
    setVisible(false);
    setError("");
    setMessage("");
    setBusy("");
    if (!connected) return;
    const controller = new AbortController();
    const current = () => !controller.signal.aborted && requestEpoch.current === epoch && ownerRef.current === ownerKey;
    setBusy("load");
    guardianOwnerRequest(`/guardian/access?timeZone=${encodeURIComponent(timeZone)}`, { config, signal: controller.signal })
      .then(result => { if (current()) setAccess(result); })
      .catch(error => { if (current()) setError(error.message); })
      .finally(() => { if (current()) setBusy(""); });
    return () => { controller.abort(); requestEpoch.current += 1; };
  }, [connected, ownerKey, timeZone]);

  async function change(action) {
    if (busy || !connected) return;
    const epoch = requestEpoch.current;
    const current = () => requestEpoch.current === epoch && ownerRef.current === ownerKey;
    setBusy(action);
    setError("");
    setMessage("");
    try {
      const path = `/guardian/access${action === "load" ? `?timeZone=${encodeURIComponent(timeZone)}` : `/${action}`}`;
      const result = await guardianOwnerRequest(path, { method: action === "load" ? "GET" : "POST", config });
      if (!current()) return;
      setAccess(result);
      setVisible(false);
      if (action === "rotate") setMessage("新监护码已生成。旧监护码和已打开的监护会话已失效。");
      if (action === "revoke") setMessage("监护访问已停用，未完成的目标和排队中的邮件已取消。重新生成监护码即可恢复访问。");
    } catch (error) { if (current()) setError(error.message); }
    finally { if (current()) setBusy(""); }
  }

  async function copyCode() {
    setError("");
    try {
      await navigator.clipboard.writeText(access.code);
      setMessage("监护码已复制，可分享给你信任的监护人。");
    } catch {
      setVisible(true);
      setMessage("请选中下方监护码手动复制。");
    }
  }

  return (
    <section className="account-panel qg-guardian-access" aria-labelledby="guardianAccessHeading">
      <div className="qg-guardian-access-heading">
        <div><span className="qg-guardian-access-kicker">一起保持进步</span><h3 id="guardianAccessHeading">监护人</h3></div>
        <Link to="/guardian">监护人入口 ↗</Link>
      </div>
      <p>分享监护码，对方无需注册，即可查看你的刷题概况、设置目标与奖励，并向你的账户邮箱发送提醒。</p>
      {!connected ? <div className="qg-guardian-access-notice">
        <p>{cloudSession.phase === "expired" ? "云端登录已过期，请重新登录后管理监护码。" : cloudSession.phase === "restricted" ? "云端账户访问受限，请恢复账户访问后管理监护码。" : "请连接云端账户后获取监护码。监护人查看的是已同步到云端的记录。"}</p>
        {cloudSession.phase === "expired" && <button type="button" className="secondary-button" onClick={cloudSession.reconnect}>重新登录云端</button>}
      </div> : <>
        {busy === "load" && <p role="status">正在读取监护码…</p>}
        {access && <>
          <div className="qg-guardian-code-row">
            <code aria-label="监护码">{!access.enabled ? "监护访问已停用" : visible ? access.code : "•••• •••• •••• ••••"}</code>
            {access.enabled && <button type="button" onClick={() => setVisible(value => !value)} aria-expanded={visible}>{visible ? "隐藏" : "显示"}</button>}
          </div>
          <div className="qg-guardian-access-actions">
            {access.enabled && <button type="button" className="primary-button" onClick={copyCode} disabled={Boolean(busy)}>复制监护码</button>}
            <button type="button" className="secondary-button" onClick={() => change("rotate")} disabled={Boolean(busy)}>{busy === "rotate" ? "正在生成…" : access.enabled ? "重置监护码" : "重新启用并生成监护码"}</button>
            {access.enabled && <button type="button" className="qg-guardian-access-revoke" onClick={() => change("revoke")} disabled={Boolean(busy)}>{busy === "revoke" ? "正在停用…" : "停用监护访问"}</button>}
          </div>
          <small>持有码的人即可使用监护功能，请只分享给信任的人。重置或停用后，旧码及已有监护会话立即失效。停用还会取消未完成的目标和尚未发送的邮件。</small>
          {!access.emailConfigured && <p className="qg-guardian-access-notice">邮件服务尚未配置，提醒和达标邮件暂时无法发出。</p>}
          {access.goals?.length > 0 && <div className="qg-guardian-owner-goals">
            <h4>监护人为你设定的目标</h4>
            {access.goals.map(goal => <article key={goal.id}>
              <div><strong>{goal.title}</strong><span>{goal.status === "completed" ? "已达成" : goal.status === "cancelled" ? "已取消" : goal.status === "expired" ? "已结束" : "进行中"}</span></div>
              <p>{goal.progress} / {goal.targetCount} 题 · {goal.startDate} — {goal.endDate}</p>
              <p>奖励：{goal.reward || "未设置奖励"}</p>
            </article>)}
            <small>奖励由监护人兑现，达标后通过邮件通知你。</small>
          </div>}
        </>}
        {!access && !busy && <button className="secondary-button" type="button" onClick={() => change("load")}>重新加载</button>}
      </>}
      {message && <p className="qg-guardian-access-message" role="status">{message}</p>}
      {error && <p className="qg-guardian-access-error" role="alert">{error}</p>}
    </section>
  );
}
