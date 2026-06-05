import {
  mergeDuplicateNews as mergeDuplicateNewsValue,
  mergeNews as mergeNewsValue,
  newsDedupeKey as newsDedupeKeyValue
} from './data.js';
import { normalizeNewsSkills as normalizeNewsSkillsValue } from '../problems/data.js';

export function createNewsDataAdapter(deps = {}) {
  const normalizeSkills = (value) => normalizeNewsSkillsValue(value, {
    parseTags: deps.parseTags,
    skillDefs: deps.skillDefs
  });

  return {
    normalizeSkills,

    merge(seed, saved) {
      return mergeNewsValue(seed, saved, {
        parseTags: deps.parseTags,
        normalizeSkills,
        stableId: deps.stableId,
        makeId: deps.makeId,
        inferSource: deps.inferSource,
        latestIso: deps.latestIso
      });
    },

    dedupeKey(item) {
      return newsDedupeKeyValue(item);
    },

    mergeDuplicate(previous, next) {
      return mergeDuplicateNewsValue(previous, next, {
        latestIso: deps.latestIso
      });
    }
  };
}
