import { Component, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { NavLink } from "react-router-dom";
import { useAuthStore, useAppStore, useAppServicesContext, useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { createPersonalStore } from "./personalStore.js";
import { ReconnectAccount } from "./ReconnectAccount.jsx";
import { createPersonalCloudSync } from "./personalCloud.js";
import "./personalWorkspace.css";

const stores = new Map();
function getStore(ownerId) {
  if (!stores.has(ownerId)) {
    let storage;
    try { storage = window.localStorage; } catch { /* Render a visible recovery state below. */ }
    stores.set(ownerId, createPersonalStore({ ownerId, storage, eventTarget: window }));
  }
  return stores.get(ownerId);
}

class PersonalErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <div role="alert" className="personal-recovery"><p>这页暂时无法显示，已保存的训练记录仍然保留。请先导出备份，再刷新页面。</p><button type="button" onClick={() => window.location.reload()}>重新加载</button></div>;
    return this.props.children;
  }
}

export function PersonalWorkspace({ children }) {
  const services = useAppServicesContext();
  const user = useAuthStore((state) => state.currentUser);
  const legacyState = useUserStateStore((state) => state.value || {});
  const cloudConfig = useAppStore((state) => state.cloudConfig);
  const language = services.getLanguage?.() || "zh";
  const ownerId = user?.id;
  if (!ownerId) return <p role="status">请先登录你的个人账户。</p>;
  return <ScopedWorkspace key={ownerId} ownerId={ownerId} user={user} cloudConfig={cloudConfig} language={language} legacyState={legacyState}>{children}</ScopedWorkspace>;
}

function ScopedWorkspace({ ownerId, user, cloudConfig = {}, language, legacyState, children }) {
  const store = useMemo(() => getStore(ownerId), [ownerId]);
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const [reconnectOpen, setReconnectOpen] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const inputRef = useRef(null);
  const syncRef = useRef(null);
  const [cloud, setCloud] = useState({ phase: "local" });
  const en = language === "en";

  useEffect(() => {
    let storage;
    try { storage = window.localStorage; } catch { /* Local recovery message remains visible. */ }
    const sync = createPersonalCloudSync({ store, ownerId, config: cloudConfig, storage, eventTarget: window, onStatus: setCloud });
    syncRef.current = sync;
    sync.start();
    return () => { sync.stop(); syncRef.current = null; };
  }, [store, ownerId, cloudConfig.endpoint, cloudConfig.token, cloudConfig.userId]);

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
    } catch (error) {
      setBackupMessage(error.code === 'active_training_conflict'
        ? (en ? "Training is still active on more than one copy. Records were kept. Finish or end the trials before restoring; export each copy as a backup." : "两个副本仍有进行中的速算，记录均已保留。请先完成或结束试次再恢复，并分别导出备份。")
        : (en ? "Cannot restore this file. Use a valid backup from this account; current records are unchanged." : "无法恢复此文件。请选择当前账户的有效备份；现有记录未被覆盖。"));
    }
  };

  return <section className="personal-workspace">
    <header className="personal-workspace-bar">
      <div><span className="personal-workspace-kicker">{en ? "MY PREPARATION" : "我的申请备考"}</span><p>{en ? "Practice, review, repeat." : "训练、复盘，记录每一天。"}</p></div>
      <nav aria-label={en ? "Personal preparation" : "个人备考导航"} className="personal-workspace-nav">
        <NavLink to="/calendar">{en ? "Calendar" : "训练日历"}</NavLink>
        <NavLink to="/daily-mock">Daily Mock</NavLink>
        <NavLink to="/tools">Mental Math</NavLink>
      </nav>
    </header>
    {snapshot.error && <div className="personal-recovery" role="alert">
      <strong>{en ? "Training is not saved to this browser." : "训练记录暂未保存到浏览器。"}</strong>
      <p>{en ? "Keep this tab open and export a backup. Existing saved records have not been deleted." : "请保留此页面并导出备份，已有存档没有被删除。"}</p>
      <button type="button" onClick={exportBackup}>{en ? "Export current work" : "导出当前记录"}</button>
      {!snapshot.conflict && <button type="button" onClick={store.retry}>{en ? "Retry saving" : "重试保存"}</button>}
    </div>}
    <div className={`personal-cloud-status personal-cloud-${cloud.phase}`} role="status">
      <span>{({
        local: en ? "Saved on this browser. Sign in to a cloud account to sync across devices." : "已保存在本机；连接账户后可跨设备同步。",
        pending: en ? "Saved locally · waiting to sync" : "已保存在本机 · 等待云端同步",
        syncing: en ? "Syncing your private training records…" : "正在同步个人训练记录…",
        synced: en ? "Saved to your account · synced across devices" : "已保存到你的账户 · 支持跨设备继续",
        auth: en ? "Cloud login expired. Sign in again; local records are kept." : "云端登录已过期，请重新登录；本机记录已保留。",
        error: en ? "Cloud sync is unavailable. Local records are kept; retry when connected." : "云端暂未同步，本机记录已保留；联网后可重试。",
        'training-conflict': en ? "Training is active on multiple devices. Local and cloud records are kept. Finish or end each trial, then sync again; you can export a backup on each device." : "多设备仍在训练，本机与云端记录均已保留。请先在各设备完成或结束速算试次，再同步；也可分别导出备份。",
      })[cloud.phase]}</span>
      {['auth','local'].includes(cloud.phase) ? <button type="button" onClick={() => setReconnectOpen(true)}>{en ? "Connect account" : "恢复账户同步"}</button> : <button type="button" disabled={cloud.phase === "syncing"} onClick={() => syncRef.current?.sync()}>{en ? "Sync now" : "立即同步"}</button>}
    </div>
    {reconnectOpen && <ReconnectAccount user={user} language={language} onClose={() => setReconnectOpen(false)} />}
    <PersonalErrorBoundary>{children({ state: snapshot.data, update: store.update, legacyState, language })}</PersonalErrorBoundary>
    <footer className="personal-workspace-footer">
      <span>{en ? "Account-specific records with a local copy. Export a backup whenever you need one." : "训练记录按账户保存，本机保留副本；也可随时导出备份。"}</span>
      <div><button type="button" onClick={exportBackup}>{en ? "Export backup" : "导出备份"}</button><button type="button" onClick={() => inputRef.current?.click()}>{en ? "Restore backup" : "恢复备份"}</button></div>
      <input ref={inputRef} type="file" accept=".json,application/json" hidden onChange={importBackup} aria-label={en ? "Restore training backup" : "恢复训练备份"} />
      {backupMessage && <p role="status">{backupMessage}</p>}
    </footer>
  </section>;
}
