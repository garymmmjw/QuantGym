import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { normalizeTechnicalSupplements } from '../src/features/personal/practice/technicalQuestionModel.js';
import {
  validateTechnicalProvenance,
  filterTechnicalQuestions,
  technicalCatalogChapters,
  technicalCatalogSections,
} from '../src/features/personal/practice/technicalQuestionModel.js';

const limits = {
  originalNumber: 100, chapter: 500, section: 500, sourcePage: 100, edition: 300,
  sourceReference: 80000, sourceReferenceEn: 80000, reviewNotes: 80000, reviewNotesEn: 80000,
};
const acceptedUrls = [
  'https://drive.google.com/file/d/book_123-ABC',
  'https://drive.google.com/file/d/book/view',
  'https://drive.google.com/file/d/book/preview/',
  'https://drive.google.com/file/d/book/edit?ts=123#page=4',
  'HTTPS://DRIVE.GOOGLE.COM/file/d/book/view?resourcekey=abc',
  // Python urlsplit treats an empty port as absent.
  'https://drive.google.com:/file/d/book/view',
];
const rejectedUrls = [
  'http://drive.google.com/file/d/book/view',
  'https://drive.google.com.evil.example/file/d/book/view',
  'https://drive.google.com@evil.example/file/d/book/view',
  'https://user@drive.google.com/file/d/book/view',
  'https://@drive.google.com/file/d/book/view',
  'https://drive.google.com:443/file/d/book/view',
  'https://drive.google.com:80/file/d/book/view',
  'https://drive.google.com:/file/d/book/../book/view',
  'https://drive.google.com/file/d/book/../../book/view',
  'https://drive.google.com/FILE/d/book/view',
  'https://drive.google.com/file/d/book/VIEW',
  'https://drive.google.com/file/d/book%2Fview',
  'https://drive.google.com/file/d//view',
  'https://drive.google.com/file/d/book/view/extra',
  'https://drive.google.com/open?id=book',
  'https://docs.google.com/file/d/book/view',
  'https://drive.google.com./file/d/book/view',
  'https://drive.google.com//file/d/book/view',
  'https://drive.google.com\\/file/d/book/view',
  ' https://drive.google.com/file/d/book/view',
  'https://drive.google.com/file/d/book/view?name=two words',
  'https://drive.google.com/file/d/book/view\n',
];

test('optional provenance validates minimal and complete source snapshots without rewriting them', () => {
  const minimal = Object.freeze({ version: 1 });
  assert.equal(validateTechnicalProvenance(minimal), minimal);
  const complete = Object.freeze({
    version: 1, originalNumber: '2.10', chapter: 'Chapter 2', section: '2.3 Probability',
    sourcePage: '32–33', pdfPage: 41, edition: 'Second edition', sourceHashSHA256: 'aB'.repeat(32),
    sourceUrl: acceptedUrls[3], answerStatus: 'corrected',
    sourceReference: 'Source answer.', sourceReferenceEn: 'Source answer.',
    reviewNotes: 'Explanation of correction.', reviewNotesEn: 'Explanation of correction.',
  });
  assert.equal(validateTechnicalProvenance(complete), complete);
  for (const answerStatus of ['source', 'reviewed', 'corrected', 'supplemented', 'missing']) {
    assert.doesNotThrow(() => validateTechnicalProvenance({ version: 1, answerStatus }));
  }
});

test('provenance rejects unknown fields, invalid types, version, pages, hashes, and statuses', () => {
  const invalid = [
    null, undefined, [], 'book', {}, { version: true }, { version: '1' }, { version: 2 },
    { version: 1, unknown: 'field' }, { version: 1, pdfPage: true }, { version: 1, pdfPage: '1' },
    { version: 1, pdfPage: 0 }, { version: 1, pdfPage: 1.5 }, { version: 1, pdfPage: 100001 },
    { version: 1, sourceHashSHA256: 'a'.repeat(63) }, { version: 1, sourceHashSHA256: 'g'.repeat(64) },
    { version: 1, answerStatus: 'verified' }, { version: 1, answerStatus: 1 },
    { version: 1, sourceReference: null }, { version: 1, reviewNotes: {} },
  ];
  for (const value of invalid) assert.throws(() => validateTechnicalProvenance(value));
  for (const pdfPage of [1, 100000]) assert.doesNotThrow(() => validateTechnicalProvenance({ version: 1, pdfPage }));
});

test('text limits count UTF-16 units and reject malformed Unicode like the backend', () => {
  for (const [field, maximum] of Object.entries(limits)) {
    assert.doesNotThrow(() => validateTechnicalProvenance({ version: 1, [field]: 'x'.repeat(maximum) }));
    assert.throws(() => validateTechnicalProvenance({ version: 1, [field]: 'x'.repeat(maximum + 1) }));
    assert.doesNotThrow(() => validateTechnicalProvenance({ version: 1, [field]: '😀'.repeat(maximum / 2) }));
    assert.throws(() => validateTechnicalProvenance({ version: 1, [field]: '😀'.repeat(maximum / 2) + 'x' }));
    for (const malformed of ['\ud800', '\udfff', 'A\ud800B', '\ud800\ud800\udc00', '\ud800\udc00\udfff']) {
      assert.throws(() => validateTechnicalProvenance({ version: 1, [field]: malformed }));
    }
  }
});

test('source links accept only original Drive file paths without credentials or explicit ports', () => {
  for (const sourceUrl of acceptedUrls) assert.doesNotThrow(() => validateTechnicalProvenance({ version: 1, sourceUrl }), sourceUrl);
  for (const sourceUrl of rejectedUrls) assert.throws(() => validateTechnicalProvenance({ version: 1, sourceUrl }), sourceUrl);
  const prefix = 'https://drive.google.com/file/d/book/view?q=';
  assert.doesNotThrow(() => validateTechnicalProvenance({ version: 1, sourceUrl: prefix + 'x'.repeat(2048 - prefix.length) }));
  assert.throws(() => validateTechnicalProvenance({ version: 1, sourceUrl: prefix + 'x'.repeat(2049 - prefix.length) }));
});

test('client decisions match the Python metadata validator on boundary and hostile input', () => {
  const cases = [
    null, [], {}, { version: 1 }, { version: true }, { version: 1, extra: '' },
    ...[...acceptedUrls, ...rejectedUrls].map(sourceUrl => ({ version: 1, sourceUrl })),
    ...['source', 'reviewed', 'corrected', 'supplemented', 'missing', 'unknown', null, [], {}]
      .map(answerStatus => ({ version: 1, answerStatus })),
    ...[0, 1, 100000, 100001, 1.5, true, '1', null].map(pdfPage => ({ version: 1, pdfPage })),
    ...['a'.repeat(64), 'A'.repeat(64), 'g'.repeat(64), 'a'.repeat(63), 'a'.repeat(65), 'a'.repeat(63) + '\n']
      .map(sourceHashSHA256 => ({ version: 1, sourceHashSHA256 })),
    ...Object.entries(limits).flatMap(([field, maximum]) => ['', 'x'.repeat(maximum), 'x'.repeat(maximum + 1),
      '😀'.repeat(maximum / 2), '😀'.repeat(maximum / 2) + 'x', '\ud800', '\udfff', '\ud800\udc00', true, null]
      .map(value => ({ version: 1, [field]: value }))),
  ];
  const python = spawnSync('python3', ['-c',
    'import json,sys\nsys.path.insert(0,sys.argv[1])\nfrom technical_metadata import validate_technical_provenance\nresults=[]\nfor value in json.load(sys.stdin):\n try:\n  validate_technical_provenance(value)\n  results.append(True)\n except ValueError:\n  results.append(False)\nprint(json.dumps(results))',
    fileURLToPath(new URL('../api-server', import.meta.url)),
  ], { input: JSON.stringify(cases), encoding: 'utf8', maxBuffer: 1024 * 1024 });
  assert.equal(python.status, 0, python.stderr || python.error?.message);
  const expected = JSON.parse(python.stdout);
  const actual = cases.map(value => { try { validateTechnicalProvenance(value); return true; } catch { return false; } });
  assert.deepEqual(actual, expected);
});

const questions = Object.freeze([
  Object.freeze({ id: 'legacy-a', title: 'Legacy probability', titleEn: 'Old question', prompt: 'SECRET_PROMPT', reference: 'SECRET_ANSWER' }),
  Object.freeze({ id: 'ten', title: '组合', titleEn: 'Combinations', provenance: Object.freeze({ originalNumber: '2.10', chapter: 'Chapter 2', section: '2.10 Counting' }) }),
  Object.freeze({ id: 'nine', title: '硬币', titleEn: 'Coin Probability', provenance: Object.freeze({ originalNumber: '2.9', chapter: 'Chapter 2', section: '2.3 Probability' }) }),
  Object.freeze({ id: 'one', title: '骰子', titleEn: 'Dice', provenance: Object.freeze({ originalNumber: '1.2', chapter: 'Chapter 1', section: '1.1 Basics' }) }),
  Object.freeze({ id: 'nine-again', title: '另一题', provenance: Object.freeze({ originalNumber: '2.9', chapter: 'Chapter 2', section: '2.3 Probability' }) }),
  Object.freeze({ id: 'legacy-b', title: 'Legacy second', provenance: Object.freeze({ chapter: ' ', section: '' }) }),
  Object.freeze({ id: 'chapter-ten', title: 'Process', provenance: Object.freeze({ originalNumber: '10.1', chapter: 'Chapter 10', section: '10.1 Processes' }) }),
]);
const ids = rows => rows.map(question => question.id);

test('catalog sorts original numbers naturally, keeps equal and legacy rows stable, and preserves snapshots', () => {
  const filtered = filterTechnicalQuestions(questions);
  assert.deepEqual(ids(filtered), ['one', 'nine', 'nine-again', 'ten', 'chapter-ten', 'legacy-a', 'legacy-b']);
  assert.notEqual(filtered, questions);
  assert.equal(filtered.find(row => row.id === 'nine'), questions[2]);
  assert.deepEqual(ids(questions), ['legacy-a', 'ten', 'nine', 'one', 'nine-again', 'legacy-b', 'chapter-ten']);
  assert.deepEqual(ids(filterTechnicalQuestions(questions.filter(question => question.id.startsWith('legacy')))), ['legacy-a', 'legacy-b']);
});

test('catalog combines chapter, section, and case-insensitive metadata/title search without searching private answer text', () => {
  assert.deepEqual(ids(filterTechnicalQuestions(questions, { chapter: 'Chapter 2' })), ['nine', 'nine-again', 'ten']);
  assert.deepEqual(ids(filterTechnicalQuestions(questions, { chapter: 'Chapter 2', section: '2.3 Probability' })), ['nine', 'nine-again']);
  assert.deepEqual(ids(filterTechnicalQuestions(questions, { chapter: 'Chapter 1', section: '2.3 Probability' })), []);
  assert.deepEqual(ids(filterTechnicalQuestions(questions, { search: ' COIN ' })), ['nine']);
  assert.deepEqual(ids(filterTechnicalQuestions(questions, { search: '硬币' })), ['nine']);
  assert.deepEqual(ids(filterTechnicalQuestions(questions, { search: '2.10' })), ['ten']);
  assert.deepEqual(ids(filterTechnicalQuestions(questions, { search: 'chapter 10' })), ['chapter-ten']);
  assert.deepEqual(ids(filterTechnicalQuestions(questions, { search: 'counting' })), ['ten']);
  assert.deepEqual(ids(filterTechnicalQuestions(questions, { search: 'OLD QUESTION' })), ['legacy-a']);
  assert.deepEqual(ids(filterTechnicalQuestions(questions, { search: 'SECRET' })), []);
  assert.deepEqual(ids(filterTechnicalQuestions(questions, { chapter: 'Chapter 2', section: '2.3 Probability', search: 'coin' })), ['nine']);
});

test('catalog choices are unique, naturally ordered, and scoped to the selected chapter', () => {
  assert.deepEqual(technicalCatalogChapters(questions), ['Chapter 1', 'Chapter 2', 'Chapter 10']);
  assert.deepEqual(technicalCatalogSections(questions, 'Chapter 2'), ['2.3 Probability', '2.10 Counting']);
  assert.deepEqual(technicalCatalogSections(questions), ['1.1 Basics', '2.3 Probability', '2.10 Counting', '10.1 Processes']);
  assert.deepEqual(technicalCatalogSections(questions, 'Absent chapter'), []);
  for (const rows of [undefined, null, {}, [null, undefined, 'bad', []]]) {
    assert.deepEqual(filterTechnicalQuestions(rows), []);
    assert.deepEqual(technicalCatalogChapters(rows), []);
    assert.deepEqual(technicalCatalogSections(rows), []);
  }
});
test('optional private reading list retains source grouping but never enters question snapshots', () => {
  const row = { frontendId: '32', titleZh: '最长有效括号', slug: 'longest-valid-parentheses', url: 'https://leetcode.cn/problems/longest-valid-parentheses/', sourcePage: '161', pdfPage: 161 };
  const sourceMetadata = { title: 'Fixture source', author: 'Fixture author', edition: '162-page fixture', pdfPageCount: 162, sourceUrl: 'https://drive.google.com/file/d/fixture-source/view' };
  const result = normalizeTechnicalSupplements({ readingList: [{ id: 'dp', label: 'Source section', questions: [row] }], sourceMetadata });
  assert.deepEqual(result, { readingList: [{ id: 'dp', label: 'Source section', questions: [row] }], sourceMetadata });
  assert.equal('questions' in result, false);
  assert.deepEqual(normalizeTechnicalSupplements({ questions: [] }), { readingList: [], sourceMetadata: null });
});

test('reading list rejects external links, invalid source credits and duplicate identities', () => {
  const row = { frontendId: '32', titleZh: 'Fixture', slug: 'longest-valid-parentheses', url: 'https://leetcode.cn/problems/longest-valid-parentheses/', sourcePage: '161', pdfPage: 161 };
  const result = normalizeTechnicalSupplements({
    readingList: [{ id: 'dp', label: 'DP', questions: [row, row, { ...row, frontendId: '42', url: 'https://attacker.invalid/' }] }],
    sourceMetadata: { title: 'Fixture', author: 'Fixture', edition: 'Fixture', pdfPageCount: 162, sourceUrl: 'https://attacker.invalid/' },
  });
  assert.equal(result.readingList[0].questions.length, 1);
  assert.equal(result.sourceMetadata, null);
});
