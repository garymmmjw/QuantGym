import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/AppServicesContext.jsx';
import { LEARNING_CHANGED_EVENT, readLearningReport, submitWengAttempt, saveTrainingPreferences } from './learningStore.mjs';

export function useLearningState(sources) {
  const userId = useAuthStore(state => state.currentUser?.id || '');
  const [state, setState] = useState({ userId: '', sources: null, profile: null, learnProgress: null, report: null, error: '' });
  const refresh = useCallback(() => {
    if (!userId || !sources) return;
    try { setState({ userId, sources, ...readLearningReport(userId, sources), error: '' }); }
    catch (error) { setState({ userId, sources, profile: null, learnProgress: null, report: null, error: `学习记录读取失败，原存档已保留：${error.message}` }); }
  }, [userId, sources]);
  useEffect(() => {
    refresh();
    const changed = event => { if (!event.detail?.userId || event.detail.userId === userId) refresh(); };
    window.addEventListener(LEARNING_CHANGED_EVENT, changed); window.addEventListener('storage', changed);
    return () => { window.removeEventListener(LEARNING_CHANGED_EVENT, changed); window.removeEventListener('storage', changed); };
  }, [userId, refresh]);
  const current = state.userId === userId && state.sources === sources;
  return { userId, ...(current ? state : { profile: null, learnProgress: null, report: null, error: '' }), refresh,
    submitAttempt(problem, answer) { const result = submitWengAttempt(userId, problem, answer, sources); refresh(); return result; },
    updatePreferences(patch) { const next = saveTrainingPreferences(userId, patch, sources); refresh(); return next; } };
}
