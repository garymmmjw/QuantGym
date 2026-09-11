import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useLeetCode } from "./useLeetCode.js";
import { leetcodeError, normalizeProfile } from "./leetcodeModel.js";
import "./leetcode.css";

export function LeetCodeConnection({ connectionState, compact = false }) {
  const ownState = useLeetCode();
  const lc = connectionState || ownState;
  const en = lc.language === "en";
  const t = (zh, english) => en ? english : zh;
  const connection = lc.data?.connection;
  const [input, setInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState("");
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  useEffect(() => { setInput(connection?.profileUrl || ""); setEditing(false); setNotice(""); setConfirmDisconnect(false); }, [lc.ownerId, connection?.username]);
  const connect = async (event) => {
    event.preventDefault();
    const username = normalizeProfile(input);
    if (!username) { setNotice(t("请输入力扣中国站主页链接或用户名。", "Enter your LeetCode China profile URL or username.")); return; }
    setNotice("");
    const result = await lc.connect?.(username);
    if (result) { setEditing(false); setNotice(t("已关联，统计与日历记录已同步。", "Connected. Your statistics and available calendar records are synced.")); }
  };
  return <section className={`lc-connection${compact ? " is-compact" : ""}`} aria-labelledby="lc-connect-title">
    <div className="lc-section-title"><div><p className="lc-eyebrow">CONNECTED ACCOUNT</p><h3 id="lc-connect-title">{t("关联 LeetCode", "Connect LeetCode")}</h3></div><span className={`lc-status${connection ? " is-linked" : ""}`}>{connection ? t("已关联", "Connected") : t("未关联", "Not connected")}</span></div>
    {!lc.enabled ? <p className="lc-muted">{t("登录 QuantGym 云端账户后，即可关联力扣并在不同设备查看记录。", "Sign in to a QuantGym cloud account to connect LeetCode and access your records across devices.")}</p> : <>
      {connection && !editing ? <>
        <div className="lc-linked-profile"><span className="lc-account-mark" aria-hidden="true">&lt;/&gt;</span><div><strong>{connection.displayName || connection.username}</strong><a href={connection.profileUrl} target="_blank" rel="noopener noreferrer">{connection.username} · {t("力扣中国站", "LeetCode China")} ↗</a></div></div>
        <p className="lc-muted">{t("同步公开统计和近期通过记录。更早的题目可通过扩展补充。", "Syncs public statistics and recent accepted submissions. Import older history with the extension.")}</p>
        <div className="lc-actions"><Link className="lc-button is-primary" to="/leetcode">{t("打开 LeetCode 模块", "Open LeetCode")}</Link><button className="lc-button" type="button" disabled={lc.busy} onClick={() => lc.sync?.()}>{lc.phase === "syncing" ? t("同步中…", "Syncing…") : t("立即同步", "Sync now")}</button><button className="lc-text-button" type="button" disabled={lc.busy} onClick={() => { setEditing(true); setNotice(""); }}>{t("更换账号", "Change account")}</button><button className="lc-text-button" type="button" disabled={lc.busy} onClick={() => setConfirmDisconnect(true)}>{t("解除关联", "Disconnect")}</button></div>
        {confirmDisconnect && <div className="lc-notice"><p>{t("解除后将移除 QuantGym 中这次关联的力扣记录，力扣账号本身不受影响。", "This removes the linked LeetCode records from QuantGym. Your LeetCode account is unaffected.")}</p><div className="lc-actions"><button type="button" className="lc-button" onClick={() => setConfirmDisconnect(false)}>{t("取消", "Cancel")}</button><button type="button" className="lc-button" disabled={lc.busy} onClick={async () => { if (await lc.disconnect?.()) setConfirmDisconnect(false); }}>{t("确认解除", "Disconnect account")}</button></div></div>}
      </> : <form onSubmit={connect} className="lc-connect-form">
        <label htmlFor="lc-profile-url">{t("力扣主页链接或用户名", "LeetCode China profile URL or username")}</label>
        <div className="lc-input-row"><input id="lc-profile-url" value={input} onChange={(event) => setInput(event.target.value)} maxLength="240" placeholder="https://leetcode.cn/u/username/" autoComplete="off" spellCheck="false" required disabled={lc.busy} /><button className="lc-button is-primary" type="submit" disabled={lc.busy}>{lc.phase === "connecting" ? t("关联中…", "Connecting…") : t("关联并同步", "Connect & sync")}</button></div>
        <p className="lc-muted">{connection ? t("更换账号会替换此处已同步的力扣记录。", "Changing accounts replaces the LeetCode records saved here.") : t("仅关联公开主页，无需提供力扣密码。", "Links your public profile. No LeetCode password needed.")}</p>
        {connection && <button type="button" className="lc-text-button" disabled={lc.busy} onClick={() => setEditing(false)}>{t("取消更换", "Cancel")}</button>}
      </form>}
      {connection?.lastSyncedAt && <p className="lc-updated">{t("最近同步", "Last synced")} · {new Date(connection.lastSyncedAt).toLocaleString(en ? "en-US" : "zh-CN")}</p>}
    </>}
    {(notice || lc.error) && <p className={`lc-feedback${lc.error ? " is-error" : ""}`} role={lc.error ? "alert" : "status"}>{lc.error ? leetcodeError(lc.error, en) : notice}</p>}
  </section>;
}
