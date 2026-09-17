import { useMemo } from 'react';
import { usePersonalData } from '../personal/usePersonalData.js';
import { useLeetCode } from '../leetcode/useLeetCode.js';
import { EMPTY_LEETCODE } from '../leetcode/leetcodeModel.js';
import { collectStagePractice } from './stagePractice.js';

export function useStagePractice({ ownerId, namespace = '' }) {
  const personal = usePersonalData();
  const leetcode = useLeetCode();
  return useMemo(() => {
    if (namespace) return collectStagePractice();
    if (!ownerId || ownerId === 'guest' || personal.ownerId !== ownerId || leetcode.ownerId !== ownerId
      || personal.snapshot.error?.startsWith('read:') || personal.snapshot.conflict
      || (leetcode.enabled && leetcode.data === EMPTY_LEETCODE)) return { records: [], available: false };
    return collectStagePractice(personal.snapshot.data, personal.legacyState, leetcode.data);
  }, [ownerId, namespace, personal.ownerId, personal.snapshot, personal.legacyState, leetcode.ownerId, leetcode.enabled, leetcode.data]);
}
