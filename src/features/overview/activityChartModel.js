import { ACTIVITY_WEIGHTS } from './activityMetrics.js';
import { addLocalDays, localDayKey, parseLocalDay } from '../personal/calendar/calendarModel.js';
import { summarizeLeetCodeRange } from '../leetcode/leetcodeProgress.js';

const KINDS = Object.keys(ACTIVITY_WEIGHTS);
const kindSet = new Set(KINDS);
const countsWith = value => Object.fromEntries(KINDS.map(kind => [kind, value]));
const sourceFor = kind => kind === 'applications' ? 'applications' : kind === 'leetcode' ? 'leetcode' : 'personal';

function valueOf(counts, metric) {
  if (KINDS.every(kind => counts[kind] === null)) return null;
  return KINDS.reduce((sum, kind) => sum + (counts[kind] ?? 0) * (metric === 'score' ? ACTIVITY_WEIGHTS[kind] : 1), 0);
}

function sumCounts(days) {
  const counts = countsWith(null);
  for (const day of days) {
    if (day.future) continue;
    for (const kind of KINDS) {
      if (day.counts[kind] !== null) counts[kind] = (counts[kind] ?? 0) + day.counts[kind];
    }
  }
  return counts;
}

function axisCeiling(value) {
  if (!value) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const multiple = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find(step => step * magnitude >= value);
  return multiple * magnitude;
}

/** Chart-only projection: dated daily work is the unit for both day and week views. */
export function buildActivityChart(bundle = {}, { month, today = localDayKey(), granularity = 'day', metric = 'score' } = {}) {
  if (!parseLocalDay(today)) throw new RangeError('Invalid activity chart day.');
  month ??= today.slice(0, 7);
  if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month) || !parseLocalDay(`${month}-01`)) {
    throw new RangeError('Invalid activity chart month.');
  }
  if (!['day', 'week'].includes(granularity)) throw new RangeError('Invalid activity chart granularity.');
  if (!['score', 'count'].includes(metric)) throw new RangeError('Invalid activity chart metric.');

  const monthDays = [];
  for (let day = `${month}-01`; day && day.startsWith(`${month}-`); day = addLocalDays(day, 1)) monthDays.push(day);
  const recordsByDay = new Map(monthDays.map(day => [day, Object.fromEntries(KINDS.map(kind => [kind, new Set()]))]));
  for (const record of Array.isArray(bundle?.records) ? bundle.records : []) {
    if (!record || !kindSet.has(record.kind) || typeof record.key !== 'string' || !record.key.trim()
      || typeof record.day !== 'string' || record.day > today || !parseLocalDay(record.day)) continue;
    recordsByDay.get(record.day)?.[record.kind].add(record.key);
  }

  const days = monthDays.map(day => {
    const future = day > today;
    const counts = countsWith(null);
    let partial = false;
    if (!future) {
      const lcRange = summarizeLeetCodeRange(bundle?.leetcodeProgress, addLocalDays(day, -1), day, bundle?.sources?.leetcode === true);
      for (const kind of KINDS) {
        const available = bundle?.sources?.[sourceFor(kind)] === true;
        const complete = kind === 'leetcode' ? lcRange.leetcodeCountStatus === 'ready'
          : kind === 'applications' ? bundle?.applicationsComplete === true : bundle?.personalComplete === true;
        const recorded = recordsByDay.get(day)[kind].size;
        const confirmedZero = complete || kind === 'leetcode' && lcRange.leetcode === 0;
        counts[kind] = available && (recorded > 0 || confirmedZero) ? recorded : null;
        partial ||= !available || !complete;
      }
    }
    return { key: day, start: day, end: day, label: String(Number(day.slice(-2))), counts,
      value: valueOf(counts, metric), partial, future };
  });

  let buckets = days;
  if (granularity === 'week') {
    const weeks = new Map();
    for (const day of days) {
      const monday = addLocalDays(day.start, -((parseLocalDay(day.start).getDay() + 6) % 7));
      if (!weeks.has(monday)) weeks.set(monday, []);
      weeks.get(monday).push(day);
    }
    buckets = [...weeks.values()].map(week => {
      const start = week[0].start;
      const end = week.at(-1).end;
      const counts = sumCounts(week);
      const startLabel = String(Number(start.slice(-2)));
      const endLabel = String(Number(end.slice(-2)));
      return { key: `week:${start}`, start, end, label: start === end ? startLabel : `${startLabel}–${endLabel}`,
        counts, value: valueOf(counts, metric), partial: week.some(day => !day.future && day.partial),
        future: week.every(day => day.future) };
    });
  }
  const totals = sumCounts(days);
  const maximum = buckets.reduce((max, bucket) => Math.max(max, bucket.value ?? 0), 0);
  return { month, granularity, metric, buckets, totals, totalValue: valueOf(totals, metric),
    axisMax: axisCeiling(maximum), partial: days.some(day => !day.future && day.partial) };
}
