import test from 'node:test';
import assert from 'node:assert/strict';
import { collectStagePractice, summarizeStagePractice, formatStagePeriod, readStagePractice, resolveStagePractice, stagePracticeKeys } from '../src/features/careerStages/stagePractice.js';
import { EMPTY_LEETCODE } from '../src/features/leetcode/leetcodeModel.js';

const stages = [
  { id: 's3', label: 'Stage 3', recordedDate: '2026-09-17', solvedCount: 999 },
  { id: 's1', label: 'Stage 1', recordedDate: '2026-09-13' },
  { id: 's2', label: 'Stage 2', recordedDate: '2026-09-15', solvedCount: 50 },
];
const stamp = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? `${value}T12:00:00Z` : value;
const done = (problemId, completedAt) => ({ problemId, completedAt: stamp(completedAt), completed: true });

test('counts after each Stage date through the next date inclusively, in natural Stage order', () => {
  const practice = collectStagePractice({}, { problemStates: [
    done('before', '2026-09-14'), done('boundary', '2026-09-15'),
    done('middle', '2026-09-16'), done('end', '2026-09-17'),
    done('next', '2026-09-18'), done('future', '2026-09-20'),
  ] });
  const result = summarizeStagePractice(stages, practice, { today: '2026-09-19' });
  assert.deepEqual(result.map(s => [s.label, s.questionCount]), [['Stage 1', 2], ['Stage 2', 2], ['Stage 3', 1]]);
  assert.equal(result[1].periodStart, '2026-09-15');
  assert.equal(result[1].periodEnd, '2026-09-17');
  assert.deepEqual(stages.map(s => s.id), ['s3', 's1', 's2']);
});

test('deduplicates actual question records without counting local Hot100, manual counts or daily summaries', () => {
  const practice = collectStagePractice({ activities: [
    { id: 'actual', kind: 'quant', problemId: 'bank-1', count: 1, completedAt: stamp('2026-09-16') },
    { id: 'repeat', kind: 'quant', problemId: 'bank-1', count: 1, completedAt: stamp('2026-09-17') },
    { id: 'manual', kind: 'quant', problemId: 'manual-problem', count: 200, completedAt: stamp('2026-09-16'), source: 'manual' },
    { id: 'mental', kind: 'mental', count: 70, completedAt: stamp('2026-09-16') },
    { id: 'summary', kind: 'daily', count: 1, completedAt: stamp('2026-09-16') },
    { id: 'no-question', kind: 'tech', count: 20, completedAt: stamp('2026-09-16') },
  ] }, {
    problemStates: [done('bank-1', '2026-09-16'), done('undated', ''), { ...done('incomplete', '2026-09-16'), completed: false }],
    leetcodeHot100Done: ['leetcode-1', 'leetcode-2', 'leetcode-3'],
    leetcodeHot100CompletedAt: { 'leetcode-1': '2026-09-16', 'leetcode-2': '2026-09-17', 'not-done': '2026-09-17' },
  });
  assert.equal(summarizeStagePractice(stages, practice)[1].questionCount, 1);
});

test('daily question fallbacks deduplicate with activity and source problem, excluding removed answers', () => {
  const personal = {
    activities: [{ id: 'daily:d1:q1', kind: 'tech', sessionId: 'd1', questionId: 'q1', count: 1, completedAt: stamp('2026-09-16') }],
    dailySessions: [{ id: 'd1', questions: [{ id: 'q1', kind: 'tech', sourceProblemId: 'bank-1' }, { id: 'q2', kind: 'behavioral' }, { id: 'q3', kind: 'tech' }], answers: {
      q1: { text: 'Answer', selfAssessment: 'independent', completedAt: stamp('2026-09-16') }, q2: { text: 'Answer', selfAssessment: 'independent', completedAt: stamp('2026-09-17') }, q3: { text: 'Answer', selfAssessment: 'independent', completedAt: stamp('2026-09-17') },
    } }], removedActivityIds: ['daily:d1:q3'],
  };
  const practice = collectStagePractice(personal, { problemStates: [done('bank-1', '2026-09-16')] });
  assert.equal(summarizeStagePractice(stages, practice)[1].questionCount, 2);
});

test('unknown dates and unavailable sources stay unknown, valid empty ranges and same-day stages are zero', () => {
  const missing = summarizeStagePractice([{ id: 'a', label: 'Stage 1' }, { id: 'b', label: 'Stage 2', recordedDate: '2026-09-17' }], collectStagePractice(), { today: '2026-09-19' });
  assert.deepEqual(missing.map(s => s.questionCount), [null, 0]);
  assert.deepEqual(summarizeStagePractice(stages, { available: false }).map(s => s.questionCount), [null, null, null]);
  assert.deepEqual(summarizeStagePractice(stages, collectStagePractice(), { today: '2026-09-19' }).map(s => s.questionCount), [0, 0, 0]);
  const same = summarizeStagePractice(stages.slice(1).map(s => ({ ...s, recordedDate: '2026-09-17' })), collectStagePractice({}, { problemStates: [done('x', '2026-09-17')] }), { today: '2026-09-19' });
  assert.deepEqual(same.map(s => s.questionCount), [0, 0]);
  assert.equal(same[0].sameDay, true);
});

test('date edits recalculate from records and inverted intervals never produce a guessed number', () => {
  const practice = collectStagePractice({}, { problemStates: [done('x', '2026-09-16'), done('y', '2026-09-18')] });
  const changed = stages.map(s => ({ ...s, recordedDate: s.id === 's2' ? '2026-09-18' : s.id === 's3' ? '2026-09-19' : '2026-09-15' }));
  assert.deepEqual(summarizeStagePractice(changed, practice, { today: '2026-09-19' }).map(s => s.questionCount), [2, 0, 0]);
  changed.find(s => s.id === 's2').recordedDate = '2026-09-14';
  assert.equal(summarizeStagePractice(changed, practice, { today: '2026-09-19' })[0].questionCount, null);
});

test('timestamp records use local calendar dates rather than their UTC date substring', () => {
  const timestamp = new Date(2026, 8, 17, 23, 59).toISOString();
  const practice = collectStagePractice({}, { problemStates: [done('local-date', timestamp), done('invalid', '2026-02-30')] });
  assert.deepEqual(practice.records, [{ key: 'local-date', day: '2026-09-17' }]);
});

test('shared readers use account storage keys and refresh from durable completions over stale homepage props', () => {
  const keys = stagePracticeKeys('alice');
  assert.equal(keys.legacy, 'quantMemoryBoard.userState.v1.alice');
  const values = new Map([[keys.legacy, JSON.stringify({ problemStates: [done('new', '2026-09-17')] })]]);
  const storage = { getItem: key => values.get(key) ?? null };
  const options = { ownerId: 'alice', storage, legacyState: { problemStates: [] } };
  assert.equal(summarizeStagePractice(stages, readStagePractice(options))[1].questionCount, 1);
  values.set(keys.legacy, JSON.stringify({ problemStates: [] }));
  assert.equal(summarizeStagePractice(stages, readStagePractice({ ...options, legacyState: { problemStates: [done('old', '2026-09-17')] } }))[1].questionCount, 0);
  assert.deepEqual(readStagePractice({ ...options, namespace: 'qa' }).records, []);
  assert.deepEqual(readStagePractice({ ...options, ownerId: 'bob', legacyState: undefined }).records, []);
  assert.equal(readStagePractice({ ...options, ownerId: 'guest' }).available, false);
  values.set(keys.personal, JSON.stringify({ version: 1, ownerId: 'bob', data: { activities: [] } }));
  assert.equal(readStagePractice(options).available, false);
});

test('only synced LeetCode ACs count, with distinct problems per Stage and no imported or review credit', () => {
  const submission = (id, slug, submittedAt, status = 'AC') => ({ id, problemSlug: slug, submittedAt, status });
  const leetcode = {
    connection: { site: 'cn', username: 'alice' },
    syncedSubmissions: [
      submission('1', 'two-sum', '2026-09-16T10:00:00Z'),
      submission('2', 'two-sum', '2026-09-16T14:00:00Z'),
      submission('3', 'two-sum', '2026-09-17T14:00:00Z'),
      submission('4', 'valid-parentheses', '2026-09-17T12:00:00Z'),
      submission('5', 'wrong-answer', '2026-09-17T12:00:00Z', 'WA'),
      submission('6', 'future', '2030-09-17T12:00:00Z'),
      submission('7', 'date-only', '2026-09-17'),
    ],
    submissions: [submission('manual-import', 'imported', '2026-09-17T12:00:00Z')],
    calendar: [{ date: '2026-09-17', submissions: 999 }],
    problems: [{ slug: 'reviewed', review: { completedAt: '2026-09-17T12:00:00Z' } }],
  };
  const practice = collectStagePractice({}, {}, leetcode, { now: '2026-09-20T12:00:00Z' });
  assert.equal(summarizeStagePractice(stages, practice)[1].questionCount, 2);
  assert.deepEqual([...new Set(practice.records.map(record => record.key))].sort(), ['leetcode:cn:two-sum', 'leetcode:cn:valid-parentheses']);
  assert.deepEqual(collectStagePractice({}, {}, { ...leetcode, connection: null }).records, []);
});

test('synced LeetCode repeats respect the production interval across Stage boundaries and local dates', () => {
  const before = new Date(2026, 8, 15, 23, 30).toISOString();
  const after = new Date(2026, 8, 16, 0, 30).toISOString();
  const leetcode = { connection: { site: 'cn', username: 'alice' }, syncedSubmissions: [
    { id: 'a', problemSlug: 'two-sum', status: 'AC', submittedAt: before },
    { id: 'b', problemSlug: 'two-sum', status: 'AC', submittedAt: after },
  ] };
  const practice = collectStagePractice({}, {}, leetcode, { now: '2026-09-20T12:00:00Z' });
  assert.deepEqual(summarizeStagePractice(stages, practice).map(stage => stage.questionCount), [1, 0, 0]);
});

test('production completion rules exclude drafts, local coding and undated legacy confirmations', () => {
  const at = '2026-09-17T12:00:00Z';
  const personal = {
    activities: [
      { id: 'practice:finished', source: 'standalone', kind: 'tech', questionId: 'real-tech', count: 1, completedAt: at },
      { id: 'practice:draft', source: 'standalone', kind: 'tech', questionId: 'draft', count: 1, completedAt: at },
      { id: 'practice:coding', source: 'standalone', kind: 'coding', questionId: 'two-sum', count: 1, completedAt: at },
      { id: 'local-lc', kind: 'quant', problemId: 'leetcode-1', count: 1, completedAt: at },
    ],
    practiceSessions: [
      { id: 'finished', status: 'completed', question: { id: 'real-tech', source: 'question-bank' } },
      { id: 'draft', status: 'active', question: { id: 'draft', source: 'question-bank' } },
      { id: 'coding', status: 'completed', question: { id: 'two-sum', source: 'leetcode' } },
    ],
    dailySessions: [{ id: 'daily', questions: [
      { id: 'local-coding', source: 'leetcode', kind: 'coding' },
      { id: 'draft-daily', kind: 'tech' },
    ], answers: {
      'local-coding': { text: 'Review', selfAssessment: 'review', completedAt: at },
      'draft-daily': { completedAt: at },
    } }],
  };
  const legacy = { problemStates: [
    done('real-tech', at), done('leetcode-1', at),
    { problemId: 'undated', completed: true },
    { problemId: 'date-only', completed: true, completedAt: '2026-09-17' },
    { problemId: 'not-done', completed: false, completedAt: at },
  ], entries: [{ problemId: 'score-only', createdAt: at, evaluation: { score: 100 } }],
  leetcodeHot100Done: ['leetcode-1'], leetcodeHot100CompletedAt: { 'leetcode-1': at } };
  assert.deepEqual(collectStagePractice(personal, legacy).records, [{ key: 'real-tech', day: '2026-09-17' }]);
});

test('dated current stages stay live and new interval ownership comes from records without changing saved dates', () => {
  const sequence = [
    { id: 's1', label: 'Stage 1', recordedDate: '2026-08-21' },
    { id: 's2', label: 'Stage 2', recordedDate: '2026-09-13', solvedCount: 999 },
    { id: 's3', label: 'Stage 3', recordedDate: '2026-09-19' },
  ];
  const before = structuredClone(sequence);
  const practice = collectStagePractice({}, { problemStates: [
    done('before-first', '2026-08-20'), done('first-boundary', '2026-08-21'),
    ...Array.from({ length: 34 }, (_, index) => done(`first-${index}`, '2026-09-13')),
    ...Array.from({ length: 37 }, (_, index) => done(`second-${index}`, '2026-09-19')),
    done('tomorrow', '2026-09-20'),
  ] });
  const result = summarizeStagePractice(sequence, practice, { today: '2026-09-19' });
  assert.deepEqual(result.map(stage => stage.questionCount), [34, 37, 0]);
  assert.deepEqual([...result].reverse().map(stage => stage.questionCount), [0, 37, 34]);
  assert.equal(result[2].recordedDate, '2026-09-19');
  assert.equal(result[2].usesTodayBoundary, true);
  assert.equal(result[1].periodStart, '2026-09-13');
  assert.equal(result[1].periodEnd, '2026-09-19');
  assert.equal(result[1].nextLabel, 'Stage 3');
  assert.equal(result[0].usesTodayBoundary, false);
  assert.deepEqual(sequence, before);
  const tomorrow = summarizeStagePractice(sequence, practice, { today: '2026-09-20' });
  assert.deepEqual(tomorrow.map(stage => stage.questionCount), [34, 37, 1]);
  assert.equal(tomorrow[2].periodEnd, '2026-09-20');
});

test('missing adjacent dates and inverted ranges stay unknown instead of borrowing another Stage boundary', () => {
  const sequence = [
    { id: 's1', label: 'Stage 1', recordedDate: '2026-08-21' },
    { id: 's2', label: 'Stage 2', recordedDate: null },
    { id: 's3', label: 'Stage 3', recordedDate: '2026-09-17' },
  ];
  const practice = collectStagePractice({}, { problemStates: [done('x', '2026-09-17')] });
  const result = summarizeStagePractice(sequence, practice, { today: '2026-09-17' });
  assert.deepEqual(result.map(stage => stage.questionCount), [null, null, 0]);
  assert.equal(result[0].periodEnd, '');
  assert.equal(result[1].periodStart, '');
  assert.equal(result[2].periodStart, '2026-09-17');
  assert.equal(result[1].usesTodayBoundary, false);
  const only = summarizeStagePractice([{ id: 's1', label: 'Stage 1', recordedDate: null }], practice, { today: '2026-09-17' })[0];
  assert.equal(only.questionCount, null);
  assert.equal(only.periodStart, '');
  assert.equal(only.usesTodayBoundary, true);
  const inverted = summarizeStagePractice(sequence, practice, { today: '2026-08-20' });
  assert.equal(inverted.at(-1).questionCount, null);
  assert.equal(inverted.at(-1).countSourceNote, '暂无法确定统计区间');
});

test('live ranges use the viewer local day and update from the hook day metadata', () => {
  const stage = [{ id: 's1', label: 'Stage 1', recordedDate: '2026-09-16' }];
  const practice = collectStagePractice({}, { problemStates: [done('x', '2026-09-17'), done('y', '2026-09-18')] });
  const localLateNight = new Date(2026, 8, 17, 23, 59);
  const today = summarizeStagePractice(stage, practice, { today: localLateNight })[0];
  assert.equal(today.periodEnd, '2026-09-17');
  assert.equal(today.questionCount, 1);
  const tomorrow = summarizeStagePractice(stage, { ...practice, asOfDay: '2026-09-18' })[0];
  assert.equal(tomorrow.periodEnd, '2026-09-18');
  assert.equal(tomorrow.questionCount, 2);
});

test('period labels use short boundaries and include years across a year boundary', () => {
  assert.equal(formatStagePeriod({ periodStart: '2026-09-13', periodEnd: '2026-09-19' }), '9/13 - 9/19');
  assert.equal(formatStagePeriod({ periodStart: '2026-09-19', periodEnd: '2026-09-19', usesTodayBoundary: true }), '9/19 - 至今');
  assert.equal(formatStagePeriod({ periodStart: '2025-12-31', periodEnd: '2026-01-02' }), '2025/12/31 - 2026/1/2');
  assert.equal(formatStagePeriod({ periodStart: '2025-12-31', periodEnd: '2026-01-02', usesTodayBoundary: true }), '2025/12/31 - 至今');
  assert.equal(formatStagePeriod({ periodStart: '', periodEnd: '2026-09-19' }), '日期待补充');
  assert.equal(formatStagePeriod({ periodStart: '2026-09-20', periodEnd: '2026-09-19' }), '日期待校正');
});

test('distinct questions are counted once per shifted interval and a boundary event is never counted twice', () => {
  const practice = { available: true, countStatus: 'ready', records: [
    { key: 'repeat', day: '2026-09-14' }, { key: 'repeat', day: '2026-09-15' },
    { key: 'boundary', day: '2026-09-15' },
    { key: 'repeat', day: '2026-09-16' }, { key: 'repeat', day: '2026-09-17' },
  ] };
  assert.deepEqual(summarizeStagePractice(stages, practice, { today: '2026-09-19' }).map(stage => stage.questionCount), [2, 1, 0]);
});

test('a current empty interval is zero only when sources are complete', () => {
  const stage = [{ id: 's1', label: 'Stage 1', recordedDate: '2026-09-19' }];
  for (const [countStatus, available, expected] of [['ready', true, 0], ['partial', true, null], ['unavailable', false, null]]) {
    const result = summarizeStagePractice(stage, { records: [], available, countStatus }, { today: '2026-09-19' })[0];
    assert.equal(result.questionCount, expected);
    assert.equal(result.countStatus, countStatus);
  }
});

const personalSource = (records = []) => ({ ownerId: 'alice', snapshot: { data: {}, error: '', conflict: false }, legacyState: { problemStates: records } });
const pendingLeetCode = { ownerId: 'alice', enabled: true, data: EMPTY_LEETCODE, phase: 'loading' };

test('LeetCode loading does not hide known site completions and an unknown combined zero stays unknown', () => {
  const practice = resolveStagePractice({ ownerId: 'alice', personal: personalSource([done('site', '2026-09-17')]), leetcode: pendingLeetCode });
  assert.equal(practice.available, true);
  assert.equal(practice.countStatus, 'partial');
  assert.equal(practice.sources.leetcode, 'loading');
  assert.match(practice.countSourceNote, /LeetCode.*加载/);
  const stage = summarizeStagePractice(stages, practice)[1];
  assert.equal(stage.questionCount, 1);
  assert.equal(stage.countStatus, 'partial');
  const unknownZero = resolveStagePractice({ ownerId: 'alice', personal: personalSource(), leetcode: pendingLeetCode });
  assert.equal(summarizeStagePractice(stages, unknownZero)[1].questionCount, null);
  const failed = resolveStagePractice({ ownerId: 'alice', personal: personalSource([done('site', '2026-09-17')]), leetcode: { ...pendingLeetCode, phase: 'error' } });
  assert.equal(failed.countStatus, 'partial');
  assert.equal(failed.sources.leetcode, 'unavailable');
  assert.doesNotMatch(failed.countSourceNote, /加载/);
  assert.equal(summarizeStagePractice(stages)[1].questionCount, null);
});

test('confirmed unconnected and disabled LeetCode sources allow accurate local counts including zero', () => {
  for (const leetcode of [
    { ownerId: 'alice', enabled: true, phase: 'ready', data: { ...EMPTY_LEETCODE } },
    { ownerId: 'alice', enabled: false, phase: 'local', data: EMPTY_LEETCODE },
  ]) {
    const empty = resolveStagePractice({ ownerId: 'alice', personal: personalSource(), leetcode });
    assert.equal(empty.countStatus, 'ready');
    assert.equal(empty.countSourceNote, '');
    assert.equal(summarizeStagePractice(stages, empty)[1].questionCount, 0);
    const completed = resolveStagePractice({ ownerId: 'alice', personal: personalSource([done('site', '2026-09-17')]), leetcode });
    assert.equal(summarizeStagePractice(stages, completed)[1].questionCount, 1);
  }
});

test('valid synced LeetCode counts survive unavailable site records and incomplete sources cannot fabricate a total', () => {
  const leetcode = { ownerId: 'alice', enabled: true, phase: 'ready', data: {
    connection: { site: 'cn', username: 'alice' },
    syncedSubmissions: [{ id: '1', problemSlug: 'two-sum', status: 'AC', submittedAt: '2026-09-17T12:00:00Z' }],
  } };
  const personal = { ...personalSource([done('not-trusted', '2026-09-17')]), snapshot: { data: {}, error: 'read:failed' } };
  const practice = resolveStagePractice({ ownerId: 'alice', personal, leetcode, leetcodeOptions: { now: '2026-09-20T12:00:00Z' } });
  assert.equal(practice.countStatus, 'partial');
  assert.match(practice.countSourceNote, /站内/);
  assert.deepEqual(practice.records.map(record => record.key), ['leetcode:cn:two-sum']);
  assert.equal(summarizeStagePractice(stages, practice)[1].questionCount, 1);
  const missing = resolveStagePractice({ ownerId: 'alice', personal, leetcode: pendingLeetCode });
  assert.equal(missing.available, false);
  assert.equal(summarizeStagePractice(stages, missing)[1].questionCount, null);
  const otherOwner = resolveStagePractice({ ownerId: 'bob', personal: personalSource([done('alice-private', '2026-09-17')]), leetcode });
  assert.deepEqual(otherOwner.records, []);
  assert.equal(otherOwner.available, false);
});
