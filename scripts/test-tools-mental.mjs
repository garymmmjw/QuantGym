import assert from 'node:assert/strict';
import test from 'node:test';
import { createToolsPageApi } from '../src/app/services/toolsPageApi.js';
import { makeDrill } from '../src/modules/tools/drills.js';

test('an arithmetic session avoids repeated questions even if random draws repeat', () => {
  const random = Math.random;
  Math.random = () => 0.5;
  try {
    for (const mode of ['add', 'sub', 'mul', 'div', 'mixed']) {
      const seen = new Set();
      for (let index = 0; index < 50; index += 1) {
        const drill = makeDrill(mode, { excludeQuestions: seen });
        assert.equal(seen.has(drill.question), false, `${mode}: ${drill.question}`);
        seen.add(drill.question);
      }
      assert.equal(seen.size, 50);
    }
  } finally {
    Math.random = random;
  }
});

test('a delayed advance cannot skip the question reached by a manual advance', () => {
  const state = { mentalMathRecords: [], skills: {}, entries: [] };
  let id = 0;
  const api = createToolsPageApi({ getState: () => state, makeId: () => `drill-${++id}` });
  const first = api.startDrillSession({ count: 3, durationSeconds: 300 }).drill;
  const answered = api.checkDrill(first.options[0].value);
  assert.equal(answered.advance, true);
  const repeated = api.checkDrill(first.options[0].value);
  assert.equal(repeated.changed, false);
  assert.equal(repeated.advance, false);

  const manual = api.advanceDrillQuestion();
  assert.equal(manual.drill.progressText, 'Question 2/3');
  const delayed = api.advanceDrillQuestion({ expectedToken: answered.advanceToken, countSkip: false });
  assert.equal(delayed.drill.progressText, 'Question 2/3');
  assert.equal(delayed.drill.question, manual.drill.question);

  const third = api.advanceDrillQuestion();
  assert.equal(third.drill.progressText, 'Question 3/3');
  const finalAnswer = api.checkDrill(third.drill.options[0].value);
  const finished = api.advanceDrillQuestion({ expectedToken: finalAnswer.advanceToken, countSkip: false });
  assert.equal(finished.drill.completed, true);
  assert.equal(state.mentalMathRecords.length, 1);
  const record = state.mentalMathRecords[0];
  assert.equal(record.skipped, 1);
  assert.equal(record.correct + record.incorrect + record.skipped, record.total);
});

test('a new session ignores an old question advance', () => {
  const state = { mentalMathRecords: [], skills: {}, entries: [] };
  let id = 0;
  const api = createToolsPageApi({ getState: () => state, makeId: () => `drill-${++id}` });
  const first = api.startDrillSession({ count: 12 }).drill;
  const answered = api.checkDrill(first.options[0].value);
  api.startDrillSession({ count: 12 });
  const afterStaleAdvance = api.advanceDrillQuestion({ expectedToken: answered.advanceToken, countSkip: false });
  assert.equal(afterStaleAdvance.drill.progressText, 'Question 1/12');
});
