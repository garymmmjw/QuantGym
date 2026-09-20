import { Component, useEffect, useRef, useState } from "react";
import { usePersonalData } from "./usePersonalData.js";
import "./personalWorkspace.css";

class PersonalErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" className="personal-recovery"><p>这页暂时无法显示，已保存的训练记录仍然保留。请先导出备份，再刷新页面。</p><button type="button" onClick={() => window.location.reload()}>重新加载</button></div>;
    return this.props.children;
  }
}

export function PersonalWorkspace({ children }) {
  const personal = usePersonalData();
  if (!personal.ownerId) return <p role="status">请先登录你的个人账户。</p>;
  return <ScopedWorkspace key={personal.ownerId} personal={personal}>{children}</ScopedWorkspace>;
}

function ScopedWorkspace({ personal, children }) {
  const { store, snapshot, language, legacyState } = personal;
  const [backupMessage, setBackupMessage] = useState("");
  const inputRef = useRef(null);
  const en = language === "en";

  useEffect(() => {
    if (!snapshot.dirty) return undefined;
    const warn = (event) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [snapshot.dirty]);

  const exportBackup = () => {
    const blob = new Blob([store.exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `quantgym-personal-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importBackup = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("Backup too large.");
      const result = store.restoreBackup(await file.text());
      setBackupMessage(result.ok ? (en ? "Missing records restored; current work kept." : "已补回缺失记录，当前进度保持不变。") : (en ? "Restored in memory. Export before leaving." : "已恢复到本页内存，请先导出再离开。"));
    } catch {
      setBackupMessage(en ? "Cannot restore this file. Use a valid backup from this account; current records are unchanged." : "无法恢复此文件。请选择当前账户的有效备份；现有记录未被覆盖。");
    }
  };

  return <section className="personal-workspace">
    {snapshot.error && <div className="personal-recovery" role="alert">
      <strong>{en ? "Training is not saved to this browser." : "训练记录暂未保存到浏览器。"}</strong>
      <p>{en ? "Keep this tab open and export a backup. Existing saved records have not been deleted." : "请保留此页面并导出备份，已有存档没有被删除。"}</p>
      <button type="button" onClick={exportBackup}>{en ? "Export current work" : "导出当前记录"}</button>
      {!snapshot.conflict && <button type="button" onClick={store.retry}>{en ? "Retry saving" : "重试保存"}</button>}
    </div>}
    <PersonalErrorBoundary>{children({ state: snapshot.data, update: store.update, legacyState, language })}</PersonalErrorBoundary>
    <footer className="personal-workspace-footer">
      <div><button type="button" onClick={exportBackup}>{en ? "Export backup" : "导出备份"}</button><button type="button" onClick={() => inputRef.current?.click()}>{en ? "Restore backup" : "恢复备份"}</button></div>
      <input ref={inputRef} type="file" accept=".json,application/json" hidden onChange={importBackup} aria-label={en ? "Restore training backup" : "恢复训练备份"} />
      {backupMessage && <p role="status">{backupMessage}</p>}
    </footer>
  </section>;
}
