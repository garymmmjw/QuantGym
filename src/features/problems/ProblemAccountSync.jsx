import { useEffect, useRef } from 'react';
import { useAppStore, useAuthStore } from '../../stores/AppServicesContext.jsx';
import { usePageApi } from '../../stores/usePageApi.js';
import { readOwnedProblemNotes } from './problemNotes.js';

export function ProblemNotesMigration({ ownerId }) {
  const config = useAppStore(state => state.cloudConfig || {});
  const api = usePageApi('problems');
  const done = useRef('');
  const scope = JSON.stringify([ownerId, config.endpoint]);
  const ready = config.userId === ownerId && config.problemSyncStatus?.ownerId === ownerId && config.problemSyncStatus?.initialPulled;
  useEffect(() => {
    if (!ready || done.current === scope) return;
    try {
      // Only owned v2 keys are eligible. Original browser copies remain as backups.
      for (const { problemId, text } of readOwnedProblemNotes(window.localStorage, ownerId)) {
        api.saveNote(problemId, text, ownerId, { migrate: true });
      }
      done.current = scope;
    } catch { /* A restricted browser can still use cloud notes. */ }
  }, [ready, scope, ownerId, api]);
  return null;
}

export function ProblemSyncStatus({ isEnglish = false }) {
  const ownerId = useAuthStore(state => state.currentUser?.id || '');
  const config = useAppStore(state => state.cloudConfig || {});
  const api = usePageApi('problems');
  const cloud = config.problemSyncStatus?.ownerId === ownerId ? config.problemSyncStatus : null;
  const connected = ownerId && config.userId === ownerId && config.token;
  const phase = connected ? cloud?.phase || 'loading' : 'disconnected';
  const text = {
    synced: ['做题记录、收藏和笔记已同步到账号', 'Practice records, bookmarks and notes synced to your account'],
    pending: ['已保存在此设备，等待上传…', 'Saved on this device, waiting to upload…'],
    syncing: ['正在同步做题记录、收藏和笔记…', 'Syncing practice records, bookmarks and notes…'],
    loading: ['正在读取账号的做题记录、收藏和笔记…', 'Loading your practice records, bookmarks and notes…'],
    error: ['同步未完成，此设备的记录已保留', 'Sync incomplete. Records are retained on this device'],
    disconnected: ['当前仅保存在此设备，登录云端账号后可同步', 'Saved on this device. Sign in to a cloud account to sync']
  }[phase] || ['', ''];
  return <p className="fp-cloud-status" role="status">{text[isEnglish ? 1 : 0]}{phase === 'error' && <> · <button type="button" onClick={() => api.refreshPractice()}>{isEnglish ? 'Retry' : '重试'}</button></>}</p>;
}
