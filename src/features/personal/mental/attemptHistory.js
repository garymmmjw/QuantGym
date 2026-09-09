import { getPersonalBests, mentalSettingsKey, normalizeMentalSettings, summarizeTrial } from './mentalEngine.js';

const SYMBOLS = { add: '+', subtract: '−', multiply: '×', divide: '÷' };
const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));
const canonical = value => JSON.stringify(value, (key, nested) => nested && typeof nested === 'object' && !Array.isArray(nested)
  ? Object.fromEntries(Object.keys(nested).sort().map(field => [field, nested[field]])) : nested);

function localDateKey(timestamp) {
  const date = new Date(timestamp);
  return `${date.getFullYear().toString().padStart(4, '0')}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

function rangeLabel(settings, language) {
  const en = language === 'en';
  return settings.operations.map(operation => {
    const { minA, maxA, minB, maxB } = settings.ranges[operation];
    return operation === 'divide'
      ? `${SYMBOLS[operation]} ${en ? 'divisor' : '除数'} ${minA}–${maxA} / ${en ? 'quotient' : '商'} ${minB}–${maxB}`
      : `${SYMBOLS[operation]} A ${minA}–${maxA} / B ${minB}–${maxB}`;
  }).join(' · ');
}

export function formatAttemptSettings(input, language = 'zh') {
  const settings = normalizeMentalSettings(input);
  return `${settings.durationSeconds}${language === 'en' ? 's' : ' 秒'} · ${rangeLabel(settings, language)}`;
}

function completedTrials(trials) {
  const byId = new Map();
  const quality = trial => {
    const questions = Array.isArray(trial.questions) ? trial.questions : [];
    return [trial.correct, questions.filter(question => ['correct', 'skipped'].includes(question.outcome)).length,
      questions.length, questions.reduce((sum, question) => sum + (question.mistakes?.length || 0), 0), Date.parse(trial.completedAt)];
  };
  const prefer = (a, b) => {
    const first = quality(a), second = quality(b);
    for (let index = 0; index < first.length; index += 1) if (first[index] !== second[index]) return first[index] > second[index] ? a : b;
    return compareText(canonical(a), canonical(b)) >= 0 ? a : b;
  };
  for (const trial of Array.isArray(trials) ? trials : []) {
    if (!trial || trial.status !== 'completed' || typeof trial.id !== 'string' || !trial.id.trim()
      || !Number.isSafeInteger(trial.correct) || trial.correct < 0 || !validDate(trial.startedAt) || !validDate(trial.completedAt)
      || !trial.settings || typeof trial.settings !== 'object' || Array.isArray(trial.settings)) continue;
    const previous = byId.get(trial.id);
    byId.set(trial.id, previous ? prefer(previous, trial) : trial);
  }
  return [...byId.values()].sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt) || compareText(a.id, b.id));
}

function timeWindow(timeRange, now) {
  if (timeRange === 'all') return null;
  const days = timeRange === 'last30days' ? 30 : timeRange === 'last90days' ? 90 : null;
  if (!days) throw new RangeError('Unknown attempt time range.');
  const start = new Date(now);
  if (!Number.isFinite(start.getTime())) throw new RangeError('Invalid attempt history date.');
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  start.setDate(start.getDate() - days + 1);
  return { startMs: start.getTime(), endMs: end.getTime() };
}

/** One full trial is one point. Ordinals are assigned before filtering and remain unchanged by filters.
 * Date sorting, date axes and calendar-day windows use the trial's start time in the browser's local timezone.
 * Personal bests always use currentSettings across all dates, even when the plotted history mixes settings.
 */
export function getAttemptHistory(trials = [], {
  settingsFilter = 'all', currentSettings, timeRange = 'all', xAxis = 'attempt', now = Date.now(), language = 'zh',
} = {}) {
  if (!['attempt', 'date'].includes(xAxis)) throw new RangeError('Unknown attempt x-axis.');
  if (typeof settingsFilter !== 'string') throw new TypeError('Invalid attempt settings filter.');
  const window = timeWindow(timeRange, now);
  const complete = completedTrials(trials);
  const recordSettingsKey = mentalSettingsKey(currentSettings);
  const selectedSettingsKey = settingsFilter === 'all' ? null : settingsFilter === 'current' ? recordSettingsKey : settingsFilter;
  const settingsGroups = new Map();
  const allPoints = complete.map((trial, index) => {
    const settings = normalizeMentalSettings(trial.settings);
    const settingsKey = mentalSettingsKey(settings);
    const settingsLabel = formatAttemptSettings(settings, language);
    const timestamp = Date.parse(trial.startedAt);
    const ordinal = index + 1;
    const group = settingsGroups.get(settingsKey);
    settingsGroups.set(settingsKey, { key: settingsKey, value: settingsKey, label: settingsLabel, settings,
      count: (group?.count || 0) + 1, bestCorrect: Math.max(group?.bestCorrect ?? 0, trial.correct) });
    return { id: trial.id, ordinal, x: xAxis === 'date' ? timestamp : ordinal, timestamp,
      startedAt: trial.startedAt, completedAt: trial.completedAt, dateKey: localDateKey(timestamp), score: trial.correct,
      meanMs: summarizeTrial(trial).meanMs, settingsKey, settingsLabel, settings, status: 'completed', trial };
  });
  const points = allPoints.filter(point => (!selectedSettingsKey || point.settingsKey === selectedSettingsKey)
    && (!window || point.timestamp >= window.startMs && point.timestamp < window.endMs));
  return {
    points, allPoints,
    settingsOptions: [...settingsGroups.values()].sort((a, b) => compareText(a.key, b.key)),
    personalBests: getPersonalBests(complete, currentSettings), recordSettingsKey,
    totalCount: allPoints.length, filteredCount: points.length,
    emptyReason: !allPoints.length ? 'no-history' : !points.length ? 'no-match' : null,
    filters: { settingsFilter, selectedSettingsKey, timeRange, xAxis }, window,
    xDomain: points.length ? [points[0].x, points.at(-1).x] : [0, 1],
    yMax: points.reduce((max, point) => Math.max(max, point.score), 1),
  };
}

/** Quote every cell and neutralize spreadsheet formulas in textual values, including whitespace prefixes. */
export function formatCsvCell(value) {
  let text = value == null || typeof value === 'number' && !Number.isFinite(value) ? '' : String(value);
  if (typeof value !== 'number' && (/^[\s\u0000-\u001f\u007f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

/** Export the displayed points, in their displayed order. BOM and CRLF support Excel and Unicode labels. */
export function exportAttemptHistoryCsv(points = [], { language = 'zh', includeBom = true } = {}) {
  const en = language === 'en';
  const header = en
    ? ['Attempt', 'Trial ID', 'Started at', 'Completed at', 'Local date', 'Duration (s)', 'Operations', 'Ranges', 'Score', 'Mean correct time (s)', 'Status']
    : ['完整试次序号', '试次 ID', '开始时间', '完成时间', '本地日期', '时长（秒）', '运算', '数字范围', '正确数', '正确题均时（秒）', '状态'];
  const rows = points.map(point => {
    const settings = normalizeMentalSettings(point.settings);
    return [point.ordinal, point.id, point.startedAt, point.completedAt, point.dateKey, settings.durationSeconds,
      settings.operations.map(operation => SYMBOLS[operation]).join(' '), rangeLabel(settings, language), point.score,
      point.meanMs == null ? '' : point.meanMs / 1000, en ? 'Completed' : '完整完成'];
  });
  return `${includeBom ? '\uFEFF' : ''}${[header, ...rows].map(row => row.map(formatCsvCell).join(',')).join('\r\n')}\r\n`;
}
