import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/AppServicesContext.jsx';
import { usePersonalData } from '../personal/usePersonalData.js';
import { useLeetCode } from '../leetcode/useLeetCode.js';
import { useCareerStages } from '../careerStages/useCareerStages.js';
import { localDayKey } from '../personal/calendar/calendarModel.js';
import { resolveOverviewActivity } from './activityMetrics.js';

const EMPTY_TRACKER = Object.freeze({ applications: [], error: '' });
const noSubscribe = () => () => {};
const emptyTracker = () => EMPTY_TRACKER;

export function useOverviewActivity() {
  const ownerId = useAuthStore(state => state.currentUser?.id) || 'guest';
  const location = useLocation();
  const namespace = new URLSearchParams(location.search).has('qa')
    || new URLSearchParams(globalThis.location?.search || '').has('qa') ? 'qa' : '';
  const personal = usePersonalData({ enabled: !namespace && ownerId !== 'guest' });
  const leetcode = useLeetCode({ enabled: !namespace && ownerId !== 'guest' });
  const career = useCareerStages({ ownerId, namespace });
  const tracker = useSyncExternalStore(career.trackerStore?.subscribe || noSubscribe,
    career.trackerStore?.getSnapshot || emptyTracker, emptyTracker);
  const [today, setToday] = useState(() => localDayKey());
  useEffect(() => {
    const refresh = () => setToday(localDayKey());
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return useMemo(() => resolveOverviewActivity({ ownerId, namespace, personal: { ...personal, cloudExpected: leetcode.enabled }, leetcode,
    tracker: { ...tracker, ownerId, syncError: career.syncError }, stages: career.snapshot.stages }, { today }),
  [ownerId, namespace, personal.ownerId, personal.snapshot, personal.legacyState, personal.cloud, leetcode.ownerId,
    leetcode.enabled, leetcode.data, leetcode.phase, tracker, career.syncError, career.snapshot, today]);
}
