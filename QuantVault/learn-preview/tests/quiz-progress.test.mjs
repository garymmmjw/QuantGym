import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createQuizProgress } from '../src/quiz-progress.mjs';
import { createRendererStorage } from '../src/embed-bridge.mjs';

function account() {
  let progress = { xp: 20, completed: ['lesson'], renderer: {} };
  return createRendererStorage({ readProgress: () => structuredClone(progress), writeProgress: value => { progress = structuredClone(value); } });
}
const numeric = { n: 3, type: 'quiz', quiz: { type: 'numeric', question: 'Count the outcomes.', answer: 15600, explanation: 'There are 15600 outcomes.' } };
const mc = { n: 4, type: 'quiz', quiz: { type: 'mc', question: 'Choose A.', choices: ['A', 'B'], correct: 0, explanation: 'A is correct.' } };
const lesson = { id: 'counting', slides: [{ n: 1, type: 'content', md: 'Intro' }, numeric, mc, { n: 5, type: 'content', md: 'End' }] };

// Exercise the generated renderer's real render/grade/review paths. Only visual
// DOM setup, scrolling and audio are replaced; grading and storage remain live.
function renderer(storage, input = { value: '15600' }) {
  const source = readFileSync(new URL('../public/private/assets/slide-viewer-local.js', import.meta.url), 'utf8');
  const instrumented = source.replace('    render, goToSlide, nextSlide, prevSlide,', `
    __open(lesson) {
      buildUI = goToSlide = attachKeyboard = attachSwipe = maybeShowSwipeHint = updateXpDisplay = quizSound = showXpFloat = () => {};
      return render(lesson, {});
    },
    __html: buildQuiz, __xp: () => xp,
    render, goToSlide, nextSlide, prevSlide,`);
  const window = { LocalQuizProgress: createQuizProgress(storage), addEventListener() {}, removeEventListener() {} };
  vm.runInNewContext(instrumented, { window, localStorage: storage, document: { getElementById: () => input }, location: { href: 'http://127.0.0.1:5188/learn-embed/' }, URL, console, setTimeout, clearTimeout });
  return window.SlideViewer;
}

test('numeric and MCQ submitted review state survives a new renderer in the same account', async () => {
  const storage = account(), first = renderer(storage);
  await first.__open(lesson);
  first.submitNumeric(3);
  first.handleQuizAnswer(4, 1);
  assert.match(first.__html(numeric), /Your answer: <strong>15600<\/strong>/);
  assert.match(first.__html(numeric), /Correct!/);
  assert.match(first.__html(mc), /Not quite/);
  const reopened = renderer(storage);
  await reopened.__open(lesson);
  assert.match(reopened.__html(numeric), /Your answer: <strong>15600<\/strong>/);
  assert.match(reopened.__html(numeric), /Correct!/);
  assert.doesNotMatch(reopened.__html(numeric), /sv__num-input|>Check</);
  assert.match(reopened.__html(mc), /sv__mc-btn--no/);
  assert.match(reopened.__html(mc), /Not quite/);
  assert.doesNotMatch(reopened.__html(mc), /onclick=/);
  assert.equal(reopened.__xp(), 5);
  reopened.submitNumeric(3);
  reopened.handleQuizAnswer(4, 0);
  assert.equal(reopened.__xp(), 5);
  assert.match(reopened.__html(mc), /Not quite/);
});

test('a correct MCQ restores its feedback and cannot award the same accuracy bonus again', async () => {
  const storage = account(), first = renderer(storage);
  await first.__open(lesson); first.handleQuizAnswer(4, 0);
  const reopened = renderer(storage); await reopened.__open(lesson);
  assert.match(reopened.__html(mc), /Correct!/);
  assert.doesNotMatch(reopened.__html(mc), /onclick=/);
  assert.equal(reopened.__xp(), 5);
  reopened.handleQuizAnswer(4, 0);
  assert.equal(reopened.__xp(), 5);
});

test('another account has fresh quizzes, and existing XP flags do not fabricate submitted answers', async () => {
  const storage = account(), first = renderer(storage);
  await first.__open(lesson); first.submitNumeric(3);
  const other = renderer(account()); await other.__open(lesson);
  assert.match(other.__html(numeric), /sv__num-input/);
  assert.equal(other.__xp(), 0);
  const legacyStorage = account(); legacyStorage.setItem('sv-xp-counting-3', '1');
  const legacy = renderer(legacyStorage); await legacy.__open(lesson);
  assert.match(legacy.__html(numeric), /sv__num-input/);
  assert.equal(legacy.__xp(), 5);
});

test('changed quiz content and malformed saved state are ignored without breaking the reader', () => {
  const storage = account(), progress = createQuizProgress(storage);
  progress.save('counting', numeric, { answered: true, correct: true, userAnswer: '15600' });
  assert.equal(progress.restore('counting', [numeric])[3].userAnswer, '15600');
  assert.deepEqual(progress.restore('counting', [{ ...numeric, quiz: { ...numeric.quiz, answer: 16000 } }]), {});
  storage.setItem('sv-quiz-state-counting-3', '{broken');
  assert.deepEqual(progress.restore('counting', [numeric]), {});
});
