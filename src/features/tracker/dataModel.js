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
  return application.events?.at(-1)?.dueDate || '';
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

export function sortApplications(applications, order = 'original') {
  const sourceSorted = [...applications].sort((a, b) => sourceRow(a) - sourceRow(b));
  if (order === 'company') {
    return sourceSorted.sort((a, b) => String(a.company ?? '').trim().localeCompare(
      String(b.company ?? '').trim(), 'en', { sensitivity: 'base', numeric: true },
    ));
  }
  if (order !== 'recent') return sourceSorted;
  return sourceSorted.sort((a, b) => {
    const left = submissionDate(a);
    const right = submissionDate(b);
    if (!left || !right) return left ? -1 : right ? 1 : 0;
    // A recruitment season is not an event year. Compare complete dates only
    // when both are known; month/day is the available order for imported dates.
    if (left.year !== null && right.year !== null && left.year !== right.year) {
      return right.year - left.year;
    }
    return right.monthDay - left.monthDay;
  });
}
