import { localDayKey } from '../personal/calendar/calendarModel.js';
import { leetcodeSubmissionDay } from '../personal/calendar/leetcodeCalendar.js';
import { hasExplicitProblemCompletion } from '../../modules/problems/completion.js';
import { sortCareerStages } from './stageStore.js';

const list = value => Array.isArray(value) ? value : [];
const identity = value => typeof value === 'string' && value.trim() ? value : '';

/** Project the first submission without changing its saved date, year or Stage. */
export function applicationStageRecord(application, { dayOf, now = Date.now(), timeZone } = {}) {
  const event = list(application.events).find(item => item?.type === 'submitted');
  const partialDate = /^(\d{1,2})\/(\d{1,2})$/.exec(event?.date || '');
  const yearless = event?.year == null && partialDate;
  let day = '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(event?.date || '')) day = localDayKey(event.date);
  else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(event?.date || '')) {
    const timestampDay = dayOf || (timestamp => {
      if (!hasExplicitProblemCompletion({ completed: true, completedAt: timestamp })
        || Date.parse(timestamp) > new Date(now).getTime()) return '';
      return timeZone ? leetcodeSubmissionDay(timestamp, timeZone) : localDayKey(timestamp);
    });
    day = timestampDay(event.date);
  } else if (partialDate && Number.isInteger(event.year) && event.year >= 1 && event.year <= 9999) {
    day = localDayKey(`${String(event.year).padStart(4, '0')}-${partialDate[1].padStart(2, '0')}-${partialDate[2].padStart(2, '0')}`);
  }
  return {
    key: application.id,
    day,
    applicationStageId: identity(application.prepPhase),
    applicationDateIsExplicit: Boolean(event?.date && !yearless),
    applicationMonthDay: yearless ? `${partialDate[1].padStart(2, '0')}-${partialDate[2].padStart(2, '0')}` : '',
  };
}

/**
 * Assign application records to the same timeline used by the Stage overview.
 * Dates own (Stage date, next Stage date]; the first Stage owns earlier history.
 * Undated imports can use saved Stage aliases. Missing, invalid, future or
 * ambiguous dates stay unassigned. The Map contains canonical Stage IDs only.
 */
export function getStageApplicationAssignments(stages = [], records = [], { today = localDayKey() } = {}) {
  const ordered = sortCareerStages(stages);
  const endToday = localDayKey(today);
  const periods = ordered.map((stage, index) => {
    const periodStart = localDayKey(stage.recordedDate);
    const periodEnd = ordered[index + 1] ? localDayKey(ordered[index + 1].recordedDate) : endToday;
    return { periodStart, periodEnd, known: Boolean(periodStart && periodEnd && periodStart <= periodEnd) };
  });
  // Infer years for grouping only. Stage dates, rather than the moving clock,
  // keep historical yearless imports in place when a new calendar year begins.
  const years = new Set(periods.map(period => period.periodStart).filter(Boolean).map(day => day.slice(0, 4)));
  const applicationYear = periods.every(period => period.known) && years.size === 1 ? [...years][0] : '';
  const assignments = new Map();
  records.forEach(record => {
    // Missing years can be inferred; impossible calendar days cannot. Use a
    // leap year here so a genuine February 29 remains eligible for inference.
    if (record.applicationMonthDay && !localDayKey(`2000-${record.applicationMonthDay}`)) return;
    const assignedIndex = ordered.findIndex(stage => record.applicationStageId
      && [stage.id, ...list(stage.importedIds)].includes(record.applicationStageId));
    const assignedPeriod = periods[assignedIndex];
    const assignedYear = assignedIndex >= 0 && assignedIndex < ordered.length - 1 && assignedPeriod.known
      && assignedPeriod.periodStart.slice(0, 4) === assignedPeriod.periodEnd.slice(0, 4) ? assignedPeriod.periodStart.slice(0, 4) : '';
    const year = assignedYear || applicationYear;
    const inferredDay = year && record.applicationMonthDay ? localDayKey(`${year}-${record.applicationMonthDay}`) : '';
    if (year && record.applicationMonthDay && !inferredDay) return;
    const canInferCandidates = !year && record.applicationMonthDay && periods.every(period => period.known);
    const candidateDays = canInferCandidates
      ? [...years].map(value => localDayKey(`${value}-${record.applicationMonthDay}`)).filter(Boolean) : [];
    if (canInferCandidates && !candidateDays.length) return;
    const candidates = candidateDays.filter(day => day <= endToday);
    const day = record.day || inferredDay || (candidates.length === 1 ? candidates[0] : '');
    const matches = periods.flatMap((period, index) => {
      if (!period.known) return [];
      if (day) return day <= endToday && day <= period.periodEnd && (index === 0 || day > period.periodStart) ? [index] : [];
      if (record.applicationDateIsExplicit) return [];
      const stage = ordered[index];
      return record.applicationStageId && [stage.id, ...list(stage.importedIds)].includes(record.applicationStageId) ? [index] : [];
    });
    if (matches.length === 1) assignments.set(record.key, ordered[matches[0]].id);
  });
  return { assignments, ordered, periods };
}
