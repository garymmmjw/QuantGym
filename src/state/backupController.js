import {
  createBackupDownload,
  mergeBackupFile
} from './backup.js';
import {
  downloadJsonFile,
  readFileAsText
} from '../lib/files.js';

export function createBackupController(deps = {}) {
  const windowRef = deps.windowRef || globalThis.window;
  const resetMessage = deps.resetMessage || "清空当前账户的训练记录？已连接云端时也会同步为空。";
  const importErrorMessage = deps.importErrorMessage || "备份文件无法读取。";

  function resetState() {
    const ok = windowRef.confirm?.(resetMessage);
    if (!ok) return;
    const currentUser = deps.getCurrentUser?.();
    if (currentUser) deps.clearStateForUser?.(currentUser.id);
    deps.setState?.(deps.loadState?.());
    deps.clearProblemLookupCaches?.();
    deps.saveState?.();
    deps.renderAll?.();
  }

  function exportState() {
    const backup = createBackupDownload({
      currentUser: deps.getCurrentUser?.(),
      serializeState: deps.serializeState,
      state: deps.getState?.(),
      now: deps.now?.() || new Date()
    });
    downloadJsonFile(backup.payload, backup.filename);
  }

  async function importState(eventOrFile, inputOverride = null) {
    const input = inputOverride || eventOrFile?.target || eventOrFile?.currentTarget || null;
    const file = eventOrFile instanceof File
      ? eventOrFile
      : input?.files?.[0] || eventOrFile?.files?.[0];
    if (!file) return;
    try {
      const result = await mergeBackupFile(file, deps.getState?.(), {
        readFileAsText,
        normalizeMentalMathRecords: deps.normalizeMentalMathRecords,
        normalizeGameRecords: deps.normalizeGameRecords,
        mergeProblemStates: deps.mergeProblemStates,
        problemStatesFromFavorites: deps.problemStatesFromFavorites,
        defaultLeaderboardSettings: deps.defaultLeaderboardSettings,
        mergeProblems: deps.mergeProblems,
        mergeNews: deps.mergeNews,
        normalizeState: deps.normalizeState,
        nowIso: deps.nowIso?.() || new Date().toISOString()
      });
      if (!result.changed) return;
      deps.setState?.(result.state);
      deps.clearProblemLookupCaches?.();
      deps.saveState?.();
      deps.renderAll?.();
    } catch (error) {
      console.error("[QuantGym] Failed to import backup", error?.stack || error?.message || error);
      windowRef.alert?.(importErrorMessage);
    } finally {
      if (input) input.value = "";
    }
  }

  return {
    exportState,
    importState,
    resetState
  };
}
