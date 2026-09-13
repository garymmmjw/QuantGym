// Keep this optional snapshot contract aligned with api-server/technical_metadata.py.
const PROVENANCE_TEXT_LIMITS = {
  originalNumber: 100,
  chapter: 500,
  section: 500,
  sourcePage: 100,
  edition: 300,
  sourceHashSHA256: 64,
  sourceUrl: 2048,
  sourceReference: 80000,
  sourceReferenceEn: 80000,
  reviewNotes: 80000,
  reviewNotesEn: 80000,
};
const PROVENANCE_FIELDS = new Set(['version', 'pdfPage', 'answerStatus', ...Object.keys(PROVENANCE_TEXT_LIMITS)]);
const ANSWER_STATUSES = new Set(['source', 'reviewed', 'corrected', 'supplemented', 'missing']);
const naturalOrder = new Intl.Collator('en', { numeric: true, sensitivity: 'base' });
const label = value => typeof value === 'string' ? value.trim() : '';

function wellFormedText(value, maximum) {
  if (typeof value !== 'string' || value.length > maximum) return false;
  // Python's UTF-16 encoder rejects unpaired surrogates. JavaScript strings do not.
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return false;
  }
  return true;
}

function validSourceUrl(value) {
  if (typeof value !== 'string' || /[\x00-\x20\\]/.test(value)) return false;
  // Validate the original path: URL() would silently normalize dot segments and
  // the default port, accepting values that the Python contract rejects.
  const origin = /^https:\/\/drive\.google\.com:?((?:\/|\?|#)[\s\S]*|$)/i.exec(value);
  if (!origin) return false;
  const path = origin[1].split(/[?#]/, 1)[0];
  return /^\/file\/d\/[A-Za-z0-9_-]+(?:\/(?:view|preview|edit))?\/?$/.test(path);
}

export function validateTechnicalProvenance(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Reflect.ownKeys(value).some(key => !PROVENANCE_FIELDS.has(key))
    || !Object.hasOwn(value, 'version') || !Number.isInteger(value.version) || value.version !== 1) {
    throw new Error('Invalid Purple Book provenance version or fields.');
  }
  for (const [field, maximum] of Object.entries(PROVENANCE_TEXT_LIMITS)) {
    if (Object.hasOwn(value, field) && !wellFormedText(value[field], maximum)) {
      throw new Error('Invalid Purple Book provenance text.');
    }
  }
  if (Object.hasOwn(value, 'pdfPage') && (!Number.isInteger(value.pdfPage) || value.pdfPage < 1 || value.pdfPage > 100000)) {
    throw new Error('Invalid Purple Book PDF page.');
  }
  if (Object.hasOwn(value, 'sourceHashSHA256') && !/^[A-Fa-f0-9]{64}$/.test(value.sourceHashSHA256)) {
    throw new Error('Invalid Purple Book source hash.');
  }
  if (Object.hasOwn(value, 'sourceUrl') && !validSourceUrl(value.sourceUrl)) {
    throw new Error('Invalid Purple Book source URL.');
  }
  if (Object.hasOwn(value, 'answerStatus') && !ANSWER_STATUSES.has(value.answerStatus)) {
    throw new Error('Invalid Purple Book answer status.');
  }
  return value;
}

function catalogRows(questions) {
  return Array.isArray(questions) ? questions.filter(question => question && typeof question === 'object' && !Array.isArray(question)) : [];
}

function compareOriginalNumber(left, right) {
  const first = label(left.provenance?.originalNumber);
  const second = label(right.provenance?.originalNumber);
  if (!first || !second) return first ? -1 : second ? 1 : 0;
  return naturalOrder.compare(first, second);
}

/** Return matching rows in original-number order; ties retain the source order. */
export function filterTechnicalQuestions(questions = [], { chapter = '', section = '', search = '' } = {}) {
  const selectedChapter = label(chapter);
  const selectedSection = label(section);
  const query = label(search).toLocaleLowerCase('en');
  return catalogRows(questions).filter(question => {
    const provenance = question.provenance;
    if (selectedChapter && label(provenance?.chapter) !== selectedChapter) return false;
    if (selectedSection && label(provenance?.section) !== selectedSection) return false;
    return !query || [provenance?.originalNumber, question.title, question.titleEn, provenance?.chapter, provenance?.section]
      .some(value => label(value).toLocaleLowerCase('en').includes(query));
  }).sort(compareOriginalNumber);
}

/** Unique nonempty chapter labels in natural order. */
export function technicalCatalogChapters(questions = []) {
  return [...new Set(catalogRows(questions).map(question => label(question.provenance?.chapter)).filter(Boolean))]
    .sort(naturalOrder.compare);
}

/** Unique nonempty section labels, optionally limited to one chapter. */
export function technicalCatalogSections(questions = [], chapter = '') {
  const selectedChapter = label(chapter);
  return [...new Set(catalogRows(questions)
    .filter(question => !selectedChapter || label(question.provenance?.chapter) === selectedChapter)
    .map(question => label(question.provenance?.section)).filter(Boolean))].sort(naturalOrder.compare);
}

/** Optional API additions; older responses safely return an empty appendix. */
export function normalizeTechnicalSupplements(payload) {
  const readingList = [], seen = new Set(), groupIds = new Set();
  for (const group of Array.isArray(payload?.readingList) ? payload.readingList : []) {
    if (!group || !wellFormedText(group.id, 100) || !/^[A-Za-z0-9_-]+$/.test(group.id)
      || groupIds.has(group.id) || !wellFormedText(group.label, 500) || !group.label.trim()) continue;
    const questions = [];
    for (const row of Array.isArray(group.questions) ? group.questions : []) {
      if (!row || typeof row.frontendId !== 'string' || !/^[0-9]{1,8}$/.test(row.frontendId) || seen.has(row.frontendId)
        || !wellFormedText(row.slug, 200) || !/^[a-z0-9-]+$/.test(row.slug)
        || row.url !== 'https://leetcode.cn/problems/' + row.slug + '/'
        || !wellFormedText(row.titleZh, 500) || !row.titleZh.trim()
        || !wellFormedText(row.sourcePage, 100) || !row.sourcePage.trim()
        || !Number.isInteger(row.pdfPage) || row.pdfPage < 1 || row.pdfPage > 100000) continue;
      seen.add(row.frontendId);
      questions.push({ frontendId: row.frontendId, titleZh: row.titleZh, slug: row.slug, url: row.url, sourcePage: row.sourcePage, pdfPage: row.pdfPage });
    }
    if (questions.length) {
      groupIds.add(group.id);
      readingList.push({ id: group.id, label: group.label, questions });
    }
  }
  let sourceMetadata = null;
  const metadata = payload?.sourceMetadata;
  if (metadata && [['title', 500], ['author', 300], ['edition', 300], ['sourceUrl', 2048]]
    .every(([field, maximum]) => wellFormedText(metadata[field], maximum) && metadata[field].trim())
    && validSourceUrl(metadata.sourceUrl) && Number.isInteger(metadata.pdfPageCount) && metadata.pdfPageCount > 0 && metadata.pdfPageCount <= 100000) {
    const { title, author, edition, sourceUrl, pdfPageCount } = metadata;
    sourceMetadata = { title, author, edition, sourceUrl, pdfPageCount };
  }
  return { readingList, sourceMetadata };
}
