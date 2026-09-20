import { useRef, useState } from "react";
import { usePersonalData } from "../personal/usePersonalData.js";

export function PersonalAccountData({ model }) {
  const { copy } = model;
  const { store, snapshot, cloud: status } = usePersonalData();
  const [message, setMessage] = useState("");
  const input = useRef(null);
  const exportBackup = () => {
    const url = URL.createObjectURL(new Blob([store.exportBackup()], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quantgym-personal-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const phases = {
    local: model.connected ? copy("等待同步", "Waiting to sync") : model.cloudSession.label, pending: copy("等待同步", "Waiting to sync"),
    syncing: copy("同步中…", "Syncing…"), synced: copy("已同步到账户", "Synced to account"),
    auth: copy("登录已过期，请重新登录", "Session expired; sign in again"),
    error: copy("同步失败，此设备的记录已保留", "Sync failed; records on this device are kept")
  };
  return <section className="ac-subsection">
    <div className="ac-row-heading"><h3>{copy("投递与训练记录备份", "Application & practice backup")}</h3><span className="ac-badge" role="status">{phases[status.phase]}</span></div>
    <p className="ac-help">{copy("包含 Tracker 投递记录、求职准备阶段，以及日历、速算和面试训练记录。所有记录归属于当前账号，可通过上方「立即同步」统一同步。", "Includes Tracker applications, preparation stages, calendar, mental math and interview practice. These records belong to your account; use Sync now above to sync them together.")}</p>
    <div className="ac-actions"><button type="button" className="secondary-button" onClick={exportBackup}>{copy("导出投递与训练备份", "Export application & practice backup")}</button><button type="button" className="secondary-button" onClick={() => input.current.click()}>{copy("恢复投递与训练备份", "Restore application & practice backup")}</button></div>
    <input ref={input} hidden type="file" accept=".json,application/json" onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = "";
      if (!file) return;
      try {
        const result = store.restoreBackup(await file.text());
        setMessage(result.ok ? copy("备考记录已合并，当前进度已保留。", "Preparation records merged; current progress retained.") : copy("恢复记录尚未写入本机，请导出后重试。", "Restored data is not yet saved locally. Export it before retrying."));
      } catch { setMessage(copy("无法恢复，请选择当前账户的有效备考备份。", "Choose a valid preparation backup belonging to this account.")); }
    }} />
    {snapshot.error && <p className="ac-error" role="alert">{copy("本机存储需要处理，请先导出备考备份，再到训练页恢复。", "Local storage needs attention. Export a preparation backup, then recover on the training page.")}</p>}
    {message && <p className="ac-feedback" role="status">{message}</p>}
  </section>;
}
