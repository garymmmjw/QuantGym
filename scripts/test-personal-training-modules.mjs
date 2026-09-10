import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrial, transitionTrial, getPersonalBests } from '../src/features/personal/mental/mentalEngine.js';
import { createReasoningTrial, transitionReasoningTrial, persistReasoningTransition, cancelTrialPreparation } from '../src/features/personal/mental/reasoningEngine.js';
import { normalizeTrainingSettings, trainingSettingsKey, getTrainingBests, trainerKind } from '../src/features/personal/mental/trainingSettings.js';
import { getAttemptHistory, exportAttemptHistoryCsv } from '../src/features/personal/mental/attemptHistory.js';
import { createPersonalState, validatePersonalData, mergePersonalData } from '../src/features/personal/personalStore.js';
const at = Date.parse('2026-09-10T12:00:00Z');
const mathSettings = { durationSeconds: 10, operations: ['add'], ranges: { add: { minA: 2, maxA: 2, minB: 3, maxB: 3 } } };

for (const trainer of ['math', 'sequence', 'pattern']) {
  test(`${trainer}: preparation blocks answers and uses a full training budget after five seconds`, () => {
    const create = trainer === 'math' ? createTrial : createReasoningTrial;
    const transition = trainer === 'math' ? transitionTrial : transitionReasoningTrial;
    const trial = create(trainer === 'math' ? mathSettings : { trainer, durationSeconds: 10 }, { now: at, id: trainer, preparationSeconds: 5 });
    assert.equal(Date.parse(trial.startedAt), at + 5000);
    assert.equal(Date.parse(trial.deadlineAt), at + 15000);
    assert.equal(trial.currentQuestion.startedAt, trial.startedAt);
    for (const type of ['input', 'submit', 'skip', 'abort', 'tick']) assert.equal(transition(trial, { type, value: String(trial.currentQuestion.answer) }, at + 4999), trial);
    const answered = transition(trial, { type: 'submit', value: String(trial.currentQuestion.answer) }, at + 5600);
    assert.equal(answered.correct, 1);
    assert.equal(answered.questions[0].elapsedMs, 600);
    const finished = transition(answered, { type: 'submit', value: 'anything' }, at + 15000);
    assert.equal(finished.status, 'completed');
    assert.equal(finished.completedAt, trial.deadlineAt);
    assert.equal(finished.correct, 1);
    validatePersonalData({ ...createPersonalState(), trials: [finished] });
  });
}

test('cancel preparation is scoped to one id, creates no attempt, and cannot erase running work', () => {
  const trial = createReasoningTrial({ trainer: 'sequence', durationSeconds: 30 }, { now: at, id: 'cancel' });
  const state = { ...createPersonalState(), activeTrial: trial };
  const cancelled = cancelTrialPreparation(state, 'cancel', at + 1000);
  assert.equal(cancelled.activeTrial, null);
  assert.deepEqual(cancelled.trials, []);
  assert.deepEqual(cancelled.activities, []);
  assert.ok(cancelled.removedActivityIds.includes('cancel-preparation:cancel'));
  assert.equal(cancelTrialPreparation(state, 'other-id', at), state);
  assert.equal(cancelTrialPreparation(state, 'cancel', at + 5000), state);
});

for (const trainer of ['sequence', 'pattern']) {
  test(`${trainer}: typed/selected answer requires submission, feedback survives JSON reload and only one score is recorded`, () => {
    let trial = createReasoningTrial({ trainer, durationSeconds: 60 }, { now: at, id: trainer, preparationSeconds: 0 });
    const correct = trial.currentQuestion.answer;
    trial = transitionReasoningTrial(trial, { type: 'input', value: correct.toLowerCase() }, at + 1000);
    assert.equal(trial.correct, 0);
    assert.equal(trial.questions.length, 0);
    trial = transitionReasoningTrial(trial, { type: 'submit' }, at + 2000);
    assert.equal(trial.correct, 1);
    assert.equal(trial.currentQuestion, null);
    assert.equal(trial.feedbackQuestionId, 'q1');
    assert.equal(trial.questions[0].elapsedMs, 2000);
    const reloaded = JSON.parse(JSON.stringify(persistReasoningTransition(createPersonalState(), trial)));
    validatePersonalData(reloaded);
    assert.equal(transitionReasoningTrial(trial, { type: 'submit', value: correct }, at + 3000), trial);
    const continued = transitionReasoningTrial(reloaded.activeTrial, { type: 'next' }, at + 6000);
    assert.equal(continued.currentQuestion.index, 2);
    assert.equal(continued.currentQuestion.startedAt, new Date(at + 6000).toISOString());
    const second = transitionReasoningTrial(continued, { type: 'submit', value: continued.currentQuestion.answer }, at + 7000);
    assert.equal(second.questions[1].elapsedMs, 1000);
    assert.equal(second.correct, 2);
    const ended = transitionReasoningTrial(second, { type: 'tick' }, at + 60000);
    assert.equal(ended.questions.length, 2);
    assert.equal(ended.status, 'completed');
    const state = persistReasoningTransition(createPersonalState(), ended);
    validatePersonalData(state);
    assert.equal(state.activities[0].kind, trainer);
    assert.equal(state.activities[0].count, 2);
  });
}

test('wrong and skipped reasoning questions are final, retain answers and never raise score', () => {
  let trial = createReasoningTrial({ trainer: 'sequence', sequenceType: 'letters' }, { now: at, preparationSeconds: 0 });
  trial = transitionReasoningTrial(trial, { type: 'submit', value: 'ZZZZ' }, at + 2000);
  assert.equal(trial.correct, 0);
  assert.equal(trial.questions[0].outcome, 'wrong');
  assert.equal(trial.questions[0].submittedAnswer, 'ZZZZ');
  trial = transitionReasoningTrial(trial, { type: 'next' }, at + 3000);
  trial = transitionReasoningTrial(trial, { type: 'skip' }, at + 4000);
  assert.equal(trial.questions[1].outcome, 'skipped');
  assert.equal(trial.correct, 0);
  const finished = transitionReasoningTrial(trial, { type: 'abort' }, at + 5000);
  assert.equal(finished.questions.length, 2);
  assert.equal(finished.status, 'aborted');
  validatePersonalData(persistReasoningTransition(createPersonalState(), finished));
});

test('malformed or empty submitted answers do not consume a question', () => {
  for (const trainer of ['sequence', 'pattern']) {
    const trial = createReasoningTrial({ trainer }, { now: at, preparationSeconds: 0 });
    for (const value of ['', ' ', '-', '+', '12abc', '∞', '<svg>']) assert.equal(transitionReasoningTrial(trial, { type: 'submit', value }, at + 1000), trial);
    if (trainer === 'pattern') assert.equal(transitionReasoningTrial(trial, { type: 'submit', value: 'G' }, at + 1000), trial);
  }
});

test('settings, personal bests, charts and exports distinguish all modules and levels', () => {
  const configs = [mathSettings, { trainer: 'sequence', durationSeconds: 10, difficulty: 'easy', sequenceType: 'numbers' }, { trainer: 'sequence', durationSeconds: 10, difficulty: 'hard', sequenceType: 'letters' }, { trainer: 'pattern', durationSeconds: 10, difficulty: 'medium' }];
  assert.equal(new Set(configs.map(trainingSettingsKey)).size, 4);
  const trials = configs.map((settings, index) => {
    const kind = trainerKind(settings);
    const create = kind === 'math' ? createTrial : createReasoningTrial;
    const transition = kind === 'math' ? transitionTrial : transitionReasoningTrial;
    const trial = create(settings, { now: at + index * 20000, preparationSeconds: 0, id: `trial-${index}` });
    return transition(trial, { type: 'tick' }, Date.parse(trial.deadlineAt));
  });
  for (const settings of configs) {
    assert.equal(getTrainingBests(trials, settings).trialCount, 1);
    const history = getAttemptHistory(trials, { settingsFilter: 'current', currentSettings: settings });
    assert.equal(history.points.length, 1);
    assert.equal(history.points[0].score, 0);
    assert.equal(history.points[0].settingsKey, trainingSettingsKey(settings));
    const csv = exportAttemptHistoryCsv(history.points, { language: 'en' });
    assert.ok(csv.includes('"Trainer","Difficulty","Sequence type"'));
    assert.ok(csv.includes(`"${trainerKind(settings)}"`));
  }
  assert.equal(getPersonalBests(trials, mathSettings).trialCount, 1);
  assert.equal(normalizeTrainingSettings({ trainer: 'sequence', durationSeconds: -5 }).durationSeconds, 10);
  assert.equal(normalizeTrainingSettings({ trainer: 'pattern', difficulty: '???' }).difficulty, 'medium');
  const restored = mergePersonalData(createPersonalState(), { ...createPersonalState(), trials });
  assert.equal(restored.trials.length, 4);
  assert.deepEqual(restored.activities.map(activity => activity.kind), ['mental', 'sequence', 'sequence', 'pattern']);
});
