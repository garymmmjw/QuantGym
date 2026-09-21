// Titles are used only to recover an account's previously saved answers. They
// never seed a new account, and no example answer is copied into personal data.
const LEGACY_TITLES = {
  'general-introduction': 'Tell me about yourself.',
  'general-strength': 'What is your greatest strength?',
  'general-weakness': 'What is a weakness you are working on?',
  'general-conflict': 'Tell me about a time you handled a conflict.',
  'general-leadership': 'Tell me about a time you demonstrated leadership.',
  'bofa-why': 'Why Bank of America?',
};
const RECOVERED_AT = '1970-01-01T00:00:00.000Z';
const FIELDS = ['id', 'title', 'createdAt', 'updatedAt', 'deletedAt'];
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const wellFormed = value => !/[\uD800-\uDFFF]/.test(value.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, ''));
const identity = value => typeof value === 'string' && wellFormed(value) && value.trim() === value && value.length > 0 && value.length <= 200;
function instant(value) {
  if (typeof value !== 'string') return false;
  const parts = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:Z|([+-])(\d{2}):(\d{2}))$/.exec(value);
  if (!parts || +parts[1] < 1 || +parts[4] > 23 || +parts[5] > 59 || +parts[6] > 59 || +parts[8] > 23 || +parts[9] > 59) return false;
  const date = new Date(`${parts[1]}-${parts[2]}-${parts[3]}T00:00:00.000Z`);
  return Number.isFinite(Date.parse(value)) && Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value.slice(0, 10);
}
function titleText(title) {
  if (typeof title !== 'string' || !wellFormed(title) || !title.trim() || title.length > 4000) throw new Error('Invalid behavioral question title.');
  return title.trim();
}

export function validateBehavioralQuestions(rows = []) {
  if (!Array.isArray(rows) || rows.length > 10000 || new Set(rows.map(row => row?.id)).size !== rows.length) {
    throw new Error('Invalid behavioral questions in training backup.');
  }
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row) || Object.keys(row).length !== FIELDS.length
      || FIELDS.some(key => !Object.hasOwn(row, key)) || !identity(row.id)
      || typeof row.title !== 'string' || !wellFormed(row.title) || !row.title.trim() || row.title.length > 4000
      || !instant(row.createdAt) || !instant(row.updatedAt) || Date.parse(row.createdAt) > Date.parse(row.updatedAt)
      || row.deletedAt !== null && (!instant(row.deletedAt) || Date.parse(row.deletedAt) < Date.parse(row.createdAt)
        || Date.parse(row.deletedAt) > Date.parse(row.updatedAt))) throw new Error('Invalid behavioral question in training backup.');
  }
  return rows;
}

export function migrateBehavioralQuestions(state) {
  const questions = validateBehavioralQuestions(state.behavioralQuestions);
  const known = new Set(questions.map(question => question.id));
  const recovered = [];
  for (const answer of state.behavioralAnswers || []) {
    // Malformed legacy identifiers remain in the answer backup, not in the
    // editable library. Actual legacy catalog identifiers all fit this bound.
    if (known.has(answer.id) || !identity(answer.id)) continue;
    known.add(answer.id);
    recovered.push({ id: answer.id, title: Object.hasOwn(LEGACY_TITLES, answer.id) ? LEGACY_TITLES[answer.id] : 'Recovered question',
      createdAt: RECOVERED_AT, updatedAt: RECOVERED_AT, deletedAt: null });
  }
  // A fixed recovery revision cannot overwrite a title edited by the account,
  // even if an older device later edits its answer and omits this new field.
  return recovered.length ? validateBehavioralQuestions([...questions, ...recovered]) : questions;
}

export function getBehavioralQuestions(state) {
  return migrateBehavioralQuestions(state).filter(question => question.deletedAt === null)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || compare(a.id, b.id));
}

export function mergeBehavioralQuestions(...sources) {
  const byId = new Map();
  const revision = row => JSON.stringify(FIELDS.map(key => row[key]));
  for (const rows of sources) for (const row of validateBehavioralQuestions(rows)) {
    const current = byId.get(row.id);
    if (!current || Boolean(row.deletedAt) > Boolean(current.deletedAt)
      || Boolean(row.deletedAt) === Boolean(current.deletedAt) && (Date.parse(row.updatedAt) > Date.parse(current.updatedAt)
        || Date.parse(row.updatedAt) === Date.parse(current.updatedAt) && compare(revision(row), revision(current)) > 0)) byId.set(row.id, row);
  }
  return [...byId.values()].sort((a, b) => compare(a.id, b.id));
}

export function mergeBehavioralAnswers(...sources) {
  const byId = new Map();
  for (const answers of sources) for (const answer of answers || []) {
    const current = byId.get(answer.id);
    if (!current || Date.parse(answer.updatedAt) > Date.parse(current.updatedAt)
      || Date.parse(answer.updatedAt) === Date.parse(current.updatedAt) && answer.text >= current.text) byId.set(answer.id, answer);
  }
  return [...byId.values()].sort((a, b) => compare(a.id, b.id));
}

// Metadata fast paths also merge personal question records and explicit answer
// clears. Missing fields from an old client never mean deletion.
export function retainBehavioralData(base, ...sources) {
  const all = [base, ...sources];
  const behavioralQuestions = mergeBehavioralQuestions(...all.map(migrateBehavioralQuestions));
  const behavioralAnswers = mergeBehavioralAnswers(...all.map(state => state.behavioralAnswers));
  return JSON.stringify(behavioralQuestions) === JSON.stringify(base.behavioralQuestions)
    && JSON.stringify(behavioralAnswers) === JSON.stringify(base.behavioralAnswers)
    ? base : { ...base, behavioralQuestions, behavioralAnswers };
}

export function addBehavioralQuestion(state, title, now = new Date(), { id = crypto.randomUUID() } = {}) {
  const questions = migrateBehavioralQuestions(state);
  if (!identity(id) || questions.some(question => question.id === id)) throw new Error('Invalid or duplicate behavioral question identity.');
  const timestamp = new Date(now).toISOString();
  const question = { id, title: titleText(title), createdAt: timestamp, updatedAt: timestamp, deletedAt: null };
  return { ...state, behavioralQuestions: validateBehavioralQuestions([...questions, question]) };
}

export function updateBehavioralQuestion(state, questionId, title, now = new Date()) {
  const questions = migrateBehavioralQuestions(state);
  const current = questions.find(question => question.id === questionId);
  if (!current || current.deletedAt !== null) return state;
  const nextTitle = titleText(title);
  if (nextTitle === current.title) return state;
  const updatedAt = new Date(Math.max(new Date(now).getTime(), Date.parse(current.updatedAt) + 1)).toISOString();
  return { ...state, behavioralQuestions: questions.map(question => question.id === questionId ? { ...question, title: nextTitle, updatedAt } : question) };
}

export function deleteBehavioralQuestion(state, questionId, now = new Date()) {
  const questions = migrateBehavioralQuestions(state);
  const current = questions.find(question => question.id === questionId);
  if (!current || current.deletedAt !== null) return state;
  const deletedAt = new Date(Math.max(new Date(now).getTime(), Date.parse(current.updatedAt) + 1)).toISOString();
  return { ...state, behavioralQuestions: questions.map(question => question.id === questionId ? { ...question, updatedAt: deletedAt, deletedAt } : question) };
}

export function getBehavioralAnswer(question, answers = []) {
  return answers.find(answer => answer.id === question.id)?.text ?? '';
}
