export const APPLICATION_STATUSES = ['wishlist', 'applied', 'oa', 'interview', 'offer', 'rejected', 'withdrawn'];
export const APPLICATION_FIELDS = ['company', 'role', 'location', 'url', 'status', 'deadline', 'nextAction', 'nextActionDate', 'notes', 'archived'];
export const APPLICATION_DEFAULTS = Object.freeze({ company: '', role: '', location: '', url: '', status: 'wishlist', deadline: '', nextAction: '', nextActionDate: '', notes: '', archived: false });
const limits = { company: 200, role: 300, location: 300, url: 2048, nextAction: 2000, notes: 20000 };
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const validId = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 512;
const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const makeId = prefix => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
export function isApplicationDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function isApplicationTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return false;
  return isApplicationDate(value.slice(0, 10)) && Number(value.slice(11, 13)) < 24 && Number(value.slice(14, 16)) < 60 && Number(value.slice(17, 19)) < 60 && Number.isFinite(Date.parse(value));
}
export function isSafeApplicationUrl(value) {
  if (value === '') return true;
  if (typeof value !== 'string' || /[\s\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && Boolean(url.hostname) && !url.username && !url.password;
  } catch { return false; }
}
export function validateApplicationEvent(event) {
  if (!object(event) || Object.keys(event).some(key => !['id', 'applicationId', 'createdAt', 'changes'].includes(key))
    || !validId(event.id) || !validId(event.applicationId) || !isApplicationTimestamp(event.createdAt) || !object(event.changes)
    || !Object.keys(event.changes).length) throw new Error('Invalid application event.');
  for (const [field, value] of Object.entries(event.changes)) {
    if (!APPLICATION_FIELDS.includes(field)) throw new Error(`Unknown application field: ${field}`);
    if (field === 'archived') { if (typeof value !== 'boolean') throw new Error('Invalid archived flag.'); }
    else if (field === 'status') { if (!APPLICATION_STATUSES.includes(value)) throw new Error('Invalid application status.'); }
    else if (field === 'deadline' || field === 'nextActionDate') { if (value !== '' && !isApplicationDate(value)) throw new Error('Invalid application date.'); }
    else if (typeof value !== 'string' || value.length > limits[field]) throw new Error(`Invalid application ${field}.`);
    if ((field === 'company' || field === 'role') && !value.trim()) throw new Error('Company and role are required.');
    if (field === 'url' && !isSafeApplicationUrl(value)) throw new Error('Use a safe http:// or https:// application link.');
  }
  return event;
}
export const compareApplicationEvents = (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || compareText(a.id, b.id);
export function getApplications(state, { includeArchived = false } = {}) {
  const applications = new Map();
  for (const event of [...(state?.applicationEvents || [])].sort(compareApplicationEvents)) {
    validateApplicationEvent(event);
    const previous = applications.get(event.applicationId) || { ...APPLICATION_DEFAULTS, id: event.applicationId, createdAt: event.createdAt };
    applications.set(event.applicationId, { ...previous, ...event.changes, updatedAt: event.createdAt });
  }
  return [...applications.values()].filter(application => includeArchived || !application.archived)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt) || compareText(a.id, b.id));
}
export function createApplicationEvent(applicationId, changes, { id = makeId('application-event'), now = new Date().toISOString() } = {}) {
  return validateApplicationEvent({ id, applicationId, createdAt: typeof now === 'number' ? new Date(now).toISOString() : now, changes: { ...changes } });
}
export function appendApplicationEvent(state, event) {
  validateApplicationEvent(event);
  const existing = (state.applicationEvents || []).find(row => row.id === event.id);
  if (existing) {
    const canonical = row => JSON.stringify([row.id, row.applicationId, row.createdAt, Object.entries(row.changes).sort(([a], [b]) => compareText(a, b))]);
    if (canonical(existing) !== canonical(event)) throw new Error('Conflicting application event id.');
    return state;
  }
  return { ...state, applicationEvents: [...(state.applicationEvents || []), event].sort(compareApplicationEvents) };
}
/** Diff against the form's opening snapshot, so unrelated edits from another device survive. */
export function saveApplication(state, applicationId, values, { baseline, now = new Date().toISOString(), eventId, newApplicationId } = {}) {
  const current = applicationId ? getApplications(state, { includeArchived: true }).find(row => row.id === applicationId) : null;
  if (applicationId && !current) throw new Error('This application is unavailable.');
  if (!object(values) || Object.keys(values).some(field => !APPLICATION_FIELDS.includes(field))) throw new Error('Invalid application fields.');
  const reference = baseline || current || APPLICATION_DEFAULTS;
  const candidate = { ...current || APPLICATION_DEFAULTS };
  const changes = {};
  for (const [field, raw] of Object.entries(values)) {
    if (raw === reference[field]) continue;
    const value = typeof raw === 'string' ? raw.trim() : raw;
    candidate[field] = value;
    if (value !== reference[field]) changes[field] = value;
  }
  if (!candidate.company || !candidate.role) throw new Error('Company and role are required.');
  if (!Object.keys(changes).length) return state;
  const at = typeof now === 'number' ? now : Date.parse(now);
  const createdAt = new Date(Math.max(at, current ? Date.parse(current.updatedAt) + 1 : at)).toISOString();
  return appendApplicationEvent(state, createApplicationEvent(applicationId || newApplicationId || makeId('application'), changes, { id: eventId, now: createdAt }));
}
export function setApplicationArchived(state, applicationId, archived, options = {}) {
  return saveApplication(state, applicationId, { archived }, options);
}
export function getUpcomingApplications(state, today) {
  if (!isApplicationDate(today)) throw new Error('A valid local calendar date is required.');
  return getApplications(state).filter(row => !['rejected', 'withdrawn'].includes(row.status)).flatMap(row => {
    const dates = [['nextAction', row.nextActionDate], ['deadline', row.deadline]].filter(([, date]) => date).sort((a, b) => compareText(a[1], b[1]));
    if (!dates.length) return [];
    const [upcomingKind, upcomingDate] = dates[0];
    return [{ ...row, upcomingKind, upcomingDate, overdue: upcomingDate < today }];
  }).sort((a, b) => compareText(a.upcomingDate, b.upcomingDate) || compareText(a.id, b.id));
}
