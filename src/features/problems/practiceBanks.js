import { normalizeFreePracticeAttempts } from "../../modules/problems/freePracticeAttempts.js";
/** Source-first practice navigation. Problem IDs and objects stay shared with the main catalog. */
export const PRACTICE_BANKS = Object.freeze([
  { id: 'purple', source: 'question-bank', nameZh: '紫皮书', nameEn: 'Purple Book', kind: 'chapters', descriptionZh: '按原书章节与小节练习', descriptionEn: 'Practice by chapter and section', icon: 'book-open' },
  { id: 'quantguide', source: 'quantguide', nameZh: 'QuantGuide', nameEn: 'QuantGuide', kind: 'topics', descriptionZh: '按原站五大主题练习', descriptionEn: 'Explore the five original topics', icon: 'layers' },
  { id: 'xiaohongshu', source: 'interview-xiaohongshu', nameZh: '小红书面经', nameEn: 'Xiaohongshu Interviews', kind: 'companies', descriptionZh: '按公司查看面试题', descriptionEn: 'Interview questions by company', icon: 'message-square' },
  { id: 'onepoint3acres', source: 'interview-onepoint3acres', nameZh: '一亩三分地面经', nameEn: '1Point3Acres Interviews', kind: 'companies', descriptionZh: '按公司查看面试题', descriptionEn: 'Interview questions by company', icon: 'messages-square' },
  { id: 'glassdoor', source: 'interview-glassdoor', nameZh: 'Glassdoor 面经', nameEn: 'Glassdoor Interviews', kind: 'companies', descriptionZh: '按公司查看面试题', descriptionEn: 'Interview questions by company', icon: 'building-2' },
].map(Object.freeze));

const TOPICS = [
  { id: 'probability', zh: '概率', en: 'Probability' },
  { id: 'brainteasers', zh: '脑筋急转弯', en: 'Brainteasers' },
  { id: 'finance', zh: '金融', en: 'Finance' },
  { id: 'statistics', zh: '统计', en: 'Statistics' },
  { id: 'pure-math', zh: '纯数学', en: 'Pure Math' },
];
const naturalOrder = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const companyKey = (value) => String(value || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
const companyAliases = new Map();
const aliasFamilies = [
  ['SIG', 'Susquehanna International Group', 'Susquehanna International Group (SIG)', 'Susquehanna'],
  ['J.P. Morgan', 'JPMorgan', 'JP Morgan', 'J.P. Morgan (QR & AI Research)'],
  ['Squarepoint Capital', 'Squarepoint'],
  ['D.E. Shaw', 'D. E. Shaw', 'DE Shaw'],
  ['IMC Trading', 'IMC'],
  ['Akuna Capital', 'Akuna'],
  ['Virtu Financial', 'Virtu'],
  ['Qube Research & Technologies', 'Qube Research', 'QRT'],
  ['PIMCO', 'Pimco'],
  ['AQR Capital Management', 'AQR'],
  ['Balyasny Asset Management', 'Balyasny'],
  ['Headlands Technologies', 'Headlands'],
  ['Old Mission Capital', 'Old Mission'],
  ['Tower Research Capital', 'Tower Research'],
  ['Millennium Management', 'Millennium'],
  ['Schonfeld Strategic Advisors', 'Schonfeld'],
  ['Da Vinci Trading', 'Da Vinci'],
  ['Capula Investment Management', 'Capula'],
  ['Goldman Sachs', 'Goldman Sachs (Strats & QIS)'],
  ['Morgan Stanley', 'Morgan Stanley (QDS & PDT)'],
  ['BNP Paribas', 'BNP Paribas (QIS)'],
  ['Citi', 'Citi (Quantitative Analysis)'],
  ['UBS', 'UBS (Quant Research & ETD)'],
  ['Deutsche Bank', 'Deutsche Bank (Quant Research)'],
  ['Invesco', 'Invesco (Quantitative Strategies)'],
  ['九坤投资', '九坤'],
  ['Cubist', 'Cubist (Point72)', 'Point72 / Cubist'],
];
for (const [name, ...aliases] of aliasFamilies) {
  for (const alias of [name, ...aliases]) companyAliases.set(companyKey(alias), name);
}

function isGeneralCompany(name) {
  return /^(?:unknown(?:\s*\/\s*general)?|general|unspecified\b.*|hedge fund|prop trading firm|quant(?:itative)? private fund|n\/?a|none|null|company unknown)$/i.test(name)
    || /\b(?:MFE|MFin|MBA)\b/i.test(name)
    || /^(?:未知|不详|未明确|未披露|通用|某公司|某私募|某量化私募|量化私募|私募基金|券商|银行|对冲基金)(?:公司)?$/.test(name);
}

function companyId(name) {
  return `company-${name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')}`;
}

/** Returns a catalog descriptor, or null for sources outside these five banks. */
export function getPracticeBank(problem) {
  return PRACTICE_BANKS.find((bank) => bank.source === problem?.source) || null;
}

/** Other Library sources keep a scoped list without becoming a sixth home bank. */
export function getSourcePracticeBank(problems = [], source = '') {
  if (!source) return null;
  const supported = getPracticeBank({ source });
  if (supported) return supported;
  const first = problems.find(problem => problem?.source === source || problem?.bookSlug === source);
  const label = first?.bookName || source;
  return {
    id: `source:${source}`, source, kind: 'source', nameZh: label, nameEn: label,
    descriptionZh: '练习这份资料中的题目', descriptionEn: 'Practice questions from this source'
  };
}

export function getPracticeBrowserProblems(problems = [], bank) {
  if (!bank) return [];
  if (bank.kind !== 'source') return getBankProblems(problems, bank.id);
  const unique = new Map();
  for (const problem of problems) {
    if (problem?.id && (problem.source === bank.source || problem.bookSlug === bank.source) && !unique.has(problem.id)) {
      unique.set(problem.id, problem);
    }
  }
  return [...unique.values()];
}

/** Generic labels are discarded; an entirely unassigned question belongs to unknown. */
export function getPracticeCompanies(problem) {
  const raw = Array.isArray(problem?.companies) ? problem.companies : [];
  const companies = new Map();
  for (const value of raw) {
    if (typeof value !== 'string') continue;
    const label = value.trim().replace(/\s+/g, ' ');
    if (!label || isGeneralCompany(label)) continue;
    const name = companyAliases.get(companyKey(label)) || label;
    const id = companyId(name);
    if (!companies.has(id)) companies.set(id, { id, name });
  }
  return companies.size
    ? [...companies.values()].sort((a, b) => naturalOrder.compare(a.name, b.name))
    : [{ id: 'unknown', name: '公司未明确' }];
}

function order(value) {
  if (value == null || value === '') return Number.POSITIVE_INFINITY;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : Number.POSITIVE_INFINITY;
}

function compareProblems(a, b, bankId) {
  const aTaxonomy = a.practiceTaxonomy || {};
  const bTaxonomy = b.practiceTaxonomy || {};
  const pairs = bankId === 'purple'
    ? ['chapterOrder', 'sectionOrder', 'questionOrder'].map((key) => [aTaxonomy[key], bTaxonomy[key]])
    : bankId === 'quantguide' ? [[a.quantguide?.orderId, b.quantguide?.orderId]] : [];
  for (const [left, right] of pairs) {
    const delta = order(left) - order(right);
    if (delta && !Number.isNaN(delta)) return delta;
  }
  // Sort is stable, so missing metadata retains the source catalog's ordering.
  return 0;
}

/** Never clones a question or rewrites its ID. Duplicate IDs count only once. */
export function getBankProblems(problems = [], bankId) {
  const bank = PRACTICE_BANKS.find((item) => item.id === bankId);
  if (!bank) return [];
  const unique = new Map();
  for (const problem of problems || []) {
    if (problem?.source === bank.source && problem.id && !unique.has(problem.id)) unique.set(problem.id, problem);
  }
  return [...unique.values()].sort((a, b) => compareProblems(a, b, bankId));
}

function topicId(problem) {
  const topic = String(problem?.quantguide?.topic || '').trim().toLowerCase().replace(/[\s_]+/g, '-');
  return TOPICS.some((item) => item.id === topic) ? topic : 'unknown';
}

function chapterId(problem) {
  return String(problem?.practiceTaxonomy?.chapterId || 'unknown');
}

function sectionId(problem) {
  // Keep sections scoped to their chapter even when the source repeats section IDs.
  const chapter = chapterId(problem);
  const section = String(problem?.practiceTaxonomy?.sectionId || 'unknown');
  return section.startsWith(`${chapter}-`) ? section : `${encodeURIComponent(chapter)}::${encodeURIComponent(section)}`;
}

/** Groups are scoped to a source even when groupId is all. */
export function matchesBankGroup(problem, bankId, groupId = 'all', selectedSectionId = 'all') {
  const bank = getPracticeBank(problem);
  if (!bank || bank.id !== bankId) return false;
  if (bank.kind === 'chapters') {
    return (groupId === 'all' || chapterId(problem) === groupId)
      && (selectedSectionId === 'all' || sectionId(problem) === selectedSectionId);
  }
  if (groupId === 'all') return true;
  if (bank.kind === 'topics') return topicId(problem) === groupId;
  return getPracticeCompanies(problem).some((company) => company.id === groupId);
}

export function hasPracticeRecord(state) {
  return Boolean(state?.completed || normalizeFreePracticeAttempts(state?.freePracticeAttempts).length);
}

function completedIds(problemStates = []) {
  const states = new Map();
  for (const state of problemStates || []) {
    if (!state?.problemId) continue;
    const previous = states.get(state.problemId);
    const priorDate = Date.parse(previous?.updatedAt || previous?.lastPracticedAt || '') || 0;
    const currentDate = Date.parse(state.updatedAt || state.lastPracticedAt || '') || 0;
    if (!previous || currentDate >= priorDate) states.set(state.problemId, state);
  }
  return new Set([...states.values()].filter(hasPracticeRecord).map((state) => state.problemId));
}

function localized(taxonomy, prefix, isEnglish, fallback) {
  const preferred = taxonomy[`${prefix}${isEnglish ? 'En' : 'Zh'}`];
  return preferred || taxonomy[`${prefix}${isEnglish ? 'Zh' : 'En'}`] || fallback;
}

/** Real groups only: callers may add their own all option. Counts use unique problem IDs. */
export function getBankGroups(problems = [], bankId, { isEnglish = false, problemStates = [] } = {}) {
  const bank = PRACTICE_BANKS.find((item) => item.id === bankId);
  if (!bank) return [];
  const rows = getBankProblems(problems, bankId);
  const completed = completedIds(problemStates);
  const groups = new Map();
  const add = (map, id, label, problem) => {
    if (!map.has(id)) map.set(id, { id, label, count: 0, completed: 0 });
    const group = map.get(id);
    group.count += 1;
    if (completed.has(problem.id)) group.completed += 1;
    return group;
  };
  for (const problem of rows) {
    if (bank.kind === 'chapters') {
      const taxonomy = problem.practiceTaxonomy || {};
      const chapter = add(groups, chapterId(problem), localized(taxonomy, 'chapter', isEnglish, isEnglish ? 'Unassigned chapter' : '待归类章节'), problem);
      chapter.sections ||= new Map();
      add(chapter.sections, sectionId(problem), localized(taxonomy, 'section', isEnglish, isEnglish ? 'Unassigned section' : '待归类小节'), problem);
    } else if (bank.kind === 'topics') {
      const id = topicId(problem);
      const topic = TOPICS.find((item) => item.id === id);
      add(groups, id, topic ? topic[isEnglish ? 'en' : 'zh'] : isEnglish ? 'Unassigned topic' : '待归类主题', problem);
    } else {
      for (const company of getPracticeCompanies(problem)) {
        add(groups, company.id, company.id === 'unknown' && isEnglish ? 'Company unspecified' : company.name, problem);
      }
    }
  }
  const result = [...groups.values()];
  if (bank.kind === 'chapters') return result.map(({ sections, ...chapter }) => ({ ...chapter, children: [...sections.values()] }));
  if (bank.kind === 'topics') {
    const topicOrder = [...TOPICS.map((item) => item.id), 'unknown'];
    return result.sort((a, b) => topicOrder.indexOf(a.id) - topicOrder.indexOf(b.id));
  }
  return result.sort((a, b) => Number(a.id === 'unknown') - Number(b.id === 'unknown') || b.count - a.count || naturalOrder.compare(a.label, b.label));
}

/** Completion is shared across every view by the existing stable problem ID. */
export function getBankStats(problems = [], problemStates = [], bankId) {
  const rows = getBankProblems(problems, bankId);
  const completed = completedIds(problemStates);
  return {
    total: rows.length,
    completed: rows.filter((problem) => completed.has(problem.id)).length,
    nextProblemId: rows.find((problem) => !completed.has(problem.id))?.id || null,
  };
}
