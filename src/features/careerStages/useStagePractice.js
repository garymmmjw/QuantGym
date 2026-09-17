import { useEffect, useMemo, useState } from 'react';
import { usePersonalData } from '../personal/usePersonalData.js';
import { useLeetCode } from '../leetcode/useLeetCode.js';
import { localDayKey } from '../personal/calendar/calendarModel.js';
import { resolveStagePractice } from './stagePractice.js';

export function useStagePractice({ ownerId, namespace = '' }) {
  const personal = usePersonalData();
  const leetcode = useLeetCode();
  const [today, setToday] = useState(() => localDayKey(new Date()));
  useEffect(() => {
    const refreshDay = () => setToday(localDayKey(new Date()));
    const timer = window.setInterval(refreshDay, 60000);
    window.addEventListener('focus', refreshDay);
    document.addEventListener('visibilitychange', refreshDay);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refreshDay);
      document.removeEventListener('visibilitychange', refreshDay);
    };
  }, []);
  return useMemo(() => ({ ...resolveStagePractice({ ownerId, namespace, personal, leetcode }), asOfDay: today }),
    [ownerId, namespace, personal.ownerId, personal.snapshot, personal.legacyState,
      leetcode.ownerId, leetcode.enabled, leetcode.data, leetcode.phase, today]);
}
