import { useCloudSession } from "./useCloudSession.js";
import { Link } from "react-router-dom";
import "./cloudSession.css";

export function CloudSessionBadge() {
  const session = useCloudSession();
  if (session.phase === "local") return <Link className="qg-cloud-session-badge" to="/account?section=data">{session.en ? "This device only" : "仅此设备"}</Link>;
  if (session.phase !== "expired") return null;
  return <button className="qg-cloud-session-badge" type="button" onClick={session.reconnect}>{session.label}</button>;
}

export function CloudSessionNotice() {
  const session = useCloudSession();
  if (session.phase !== "expired") return null;
  return <aside className="qg-cloud-session-notice" role="status">
    <div><strong>{session.en ? "Reconnect your cloud account" : "恢复云端登录"}</strong><p>{session.en ? "Your profile is saved on this device, but the server no longer accepts this session. Sign in again to sync; your local training records are kept." : "本机仍记得你的账户，但服务器已不再接受这次登录。重新登录后即可继续同步，本机训练记录会保留。"}</p></div>
    <button type="button" onClick={session.reconnect}>{session.en ? "Sign in again" : "重新登录"}</button>
  </aside>;
}
