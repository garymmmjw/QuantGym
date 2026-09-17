export const STATUS_META = Object.freeze({
  submitted: { label: '已投递', tone: 'neutral' },
  oa_received: { label: '收到 OA', tone: 'blue' },
  oa_completed: { label: 'OA 已完成', tone: 'blue' },
  interview: { label: '面试中', tone: 'purple' },
  offer: { label: 'Offer', tone: 'green' },
  rejected: { label: '未通过', tone: 'red' },
  withdrawn: { label: '已撤回', tone: 'muted' },
});

const STATUS_GROUPS = Object.freeze({
  submitted: 'awaiting',
  oa_received: 'oa',
  oa_completed: 'oa',
  interview: 'interview',
  offer: 'offer',
  rejected: 'closed',
  withdrawn: 'closed',
});

// Event order is intentional. Original workbook dates do not have a year,
// so sorting them as absolute dates would invent a chronology.
export function getCurrentStatus(application) {
  return application.events?.at(-1)?.type ?? 'submitted';
}

export function getCurrentDeadline(application) {
  return getCurrentDeadlineEvent(application)?.dueDate || '';
}

export function getCurrentDeadlineEvent(application) {
  const event = application.events?.at(-1);
  return event?.dueDate ? event : null;
}

// Deadlines are the date and clock time entered by the user, not a UTC instant.
export function formatDeadline(event, { fullDate = false } = {}) {
  if (!event?.dueDate) return '';
  const date = fullDate ? event.dueDate.replaceAll('-', '.') : event.dueDate.slice(5).replace('-', '/');
  return `${date}${event.dueTime ? ` ${event.dueTime}` : ''}`;
}

export function deadlineDateTime(event) {
  if (!event?.dueDate) return '';
  return `${event.dueDate}${event.dueTime ? `T${event.dueTime}` : ''}`;
}

export function localToday(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSummary(applications) {
  const summary = { total: applications.length, awaiting: 0, oa: 0, interview: 0, offer: 0, closed: 0 };
  for (const application of applications) {
    const group = STATUS_GROUPS[getCurrentStatus(application)];
    if (group) summary[group] += 1;
  }
  return summary;
}

export function filterApplications(applications, { query = '', status = 'all', phase = 'all' } = {}) {
  const normalizedQuery = String(query).trim().toLocaleLowerCase();
  return applications.filter(application => {
    if (phase && phase !== 'all' && application.prepPhase !== phase) return false;
    const group = STATUS_GROUPS[getCurrentStatus(application)];
    if (status === 'interview-offer') {
      if (group !== 'interview' && group !== 'offer') return false;
    } else if (status && status !== 'all' && group !== status) return false;
    if (!normalizedQuery) return true;
    return [application.company, application.role]
      .some(value => String(value ?? '').toLocaleLowerCase().includes(normalizedQuery));
  });
}

function sourceRow(application) {
  const match = /^app-(\d+)$/.exec(application.id ?? '');
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function submissionDate(application) {
  const event = application.events?.find(item => item.type === 'submitted');
  if (!event) return null;
  const value = String(event.date ?? '').trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const partial = /^(\d{1,2})\/(\d{1,2})$/.exec(value);
  if (!iso && !partial) return null;
  const explicitYear = Number(event.year);
  const year = iso ? Number(iso[1])
    : (Number.isInteger(explicitYear) && explicitYear >= 1 ? explicitYear : null);
  const month = Number(iso ? iso[2] : partial[1]);
  const day = Number(iso ? iso[3] : partial[2]);
  const leap = year === null || (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));
  const maxDay = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
  if (!maxDay || day < 1 || day > maxDay || (year !== null && (year < 1 || year > 9999))) return null;
  return { year, monthDay: month * 100 + day };
}

export function sortApplications(applications, order = 'recent') {
  const sourceSorted = [...applications].sort((a, b) => sourceRow(a) - sourceRow(b));
  if (order === 'company') {
    return sourceSorted.sort((a, b) => String(a.company ?? '').trim().localeCompare(
      String(b.company ?? '').trim(), 'en', { sensitivity: 'base', numeric: true },
    ));
  }
  if (order !== 'recent') return sourceSorted;
  const addedOrder = new Map(sourceSorted.map((application, index) => [application, index]));
  const dates = new Map(sourceSorted.map(application => [application, submissionDate(application)]));
  // Yearless imports use the latest explicitly recorded year only as a sort
  // reference. Keep their stored/displayed year unknown. One reference for the
  // whole list avoids contradictory pairwise comparisons across year boundaries.
  const referenceYear = Math.max(0, ...[...dates.values()].map(date => date?.year || 0));
  return sourceSorted.sort((a, b) => {
    const left = dates.get(a);
    const right = dates.get(b);
    if (!left || !right) return left ? -1 : right ? 1 : 0;
    const leftKey = (left.year ?? referenceYear) * 10000 + left.monthDay;
    const rightKey = (right.year ?? referenceYear) * 10000 + right.monthDay;
    return rightKey - leftKey || addedOrder.get(b) - addedOrder.get(a);
  });
}

// Keep Stage groups together while letting the selected sort determine both
// their first visible application and the order of the groups themselves.
export function groupApplications(sortedApplications, stages) {
  const groups = stages.map(stage => ({ stage, applications: [], rank: Infinity }));
  const byStage = new Map();
  for (const group of groups) {
    for (const id of [group.stage.id, ...(group.stage.importedIds || [])]) byStage.set(id, group);
  }
  const ungrouped = { stage: { id: '', label: '未分组', description: '' }, applications: [], rank: Infinity };
  sortedApplications.forEach((application, rank) => {
    const group = byStage.get(application.prepPhase) || ungrouped;
    group.rank = Math.min(group.rank, rank);
    group.applications.push(application);
  });
  if (ungrouped.applications.length) groups.push(ungrouped);
  return groups.sort((a, b) => a.rank - b.rank);
}
