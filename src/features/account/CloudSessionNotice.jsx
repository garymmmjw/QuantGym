import { useCloudSession } from "./useCloudSession.js";
import { Link } from "react-router-dom";
import "./cloudSession.css";

export function CloudSessionBadge() {
  const session = useCloudSession();
  if (session.needsVerification) return <Link className="qg-cloud-session-badge" to="/account?section=data">{session.label}</Link>;
  if (session.phase === "expired") return <button className="qg-cloud-session-badge" type="button" onClick={session.reconnect}>{session.label}</button>;
  if (session.phase === "offline") return <span className="qg-cloud-session-badge" role="status">{session.label}</span>;
  return null;
}

export function CloudSessionNotice() {
  const session = useCloudSession();
  if (!["expired", "offline", "verification-required"].includes(session.phase)) return null;
  const description = session.phase === "offline"
    ? (session.en ? "You are still using the same account. Changes are kept on this device and will sync when the connection returns." : "你仍在使用同一个账号。修改会保存在此设备，连接恢复后继续同步。")
    : session.needsVerification
      ? (session.en ? "Your previous records are kept. Verify your email or sign in to merge them into your account." : "旧记录已保留。完成邮箱验证或登录后，记录会合并到你的账号。")
      : (session.en ? "Sign in again to continue syncing this account. Records saved on this device are kept." : "请重新登录以继续同步此账号。保存在此设备上的记录会保留。");
  return <aside className="qg-cloud-session-notice" role="status">
    <div><strong>{session.label}</strong><p>{description}</p></div>
    {session.phase === "expired" && <button type="button" onClick={session.reconnect}>{session.en ? "Sign in again" : "重新登录"}</button>}
    {session.needsVerification && <Link to="/account?section=data">{session.en ? "Complete verification" : "完成验证"}</Link>}
  </aside>;
}
