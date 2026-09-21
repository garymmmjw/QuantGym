import test from 'node:test';
import assert from 'node:assert/strict';
import { createProblemsPageApi } from '../src/app/services/problemsPageApi.js';
import { createProblemPersonalStateController } from '../src/modules/problems/personalStateController.js';
import { createLeetcodeHotController } from '../src/modules/problems/leetcodeHotController.js';
import { createProblemCard } from '../src/modules/problems/list.js';
import { normalizeProblemState, mergeProblemStates } from '../src/modules/problems/data.js';
import { countsTowardProblemTotal, hasExplicitProblemCompletion, isLeetcodeCatalogProblem } from '../src/modules/problems/completion.js';
import { getProblemCompletionCount, toggleLeetcodeHotDoneState } from '../src/modules/problems/progress.js';

const NOW = '2026-09-14T12:00:00.000Z';
const problem = (id, category = 'probabilityExpectation', extra = {}) => ({
  id, category, titleEn: `Question ${id}`, titleZh: `题目 ${id}`, promptEn: 'Read the question',
  difficulty: 'Medium', source: 'question-bank', tags: [], ...extra,
});

function fixture() {
  const state = {
    problems: [problem('catalog-one'), problem('technical-one', 'cppProgramming'),
      problem('lc-question', 'leetcode'), problem('mental-one', 'mentalMath')],
    problemStates: [], leetcodeHot100Done: ['hot-one'], skills: { leetcode: 81 },
  };
  const calls = { saves: 0, selected: [], revealed: [] };
  let detailId = '';
  let filters = { viewMode: 'all', source: 'all', theme: 'all', company: 'all', difficulty: 'all' };
  const controller = createProblemPersonalStateController({
    getState: () => state, normalizeProblemState,
    mergeProblemStates: (...lists) => mergeProblemStates(lists),
    nowIso: () => NOW, saveState: () => { calls.saves += 1; },
  });
  const api = createProblemsPageApi({
    getState: () => state, t: key => key, getLanguage: () => 'zh',
    getProblemPersonalState: controller.getPersonalState,
    toggleProblemCompleted: controller.toggleCompleted, toggleProblemSaved: controller.toggleSaved,
    getProblemDetailId: () => detailId, setProblemDetailId: id => { detailId = id; },
    getProblemFilterState: () => filters, setProblemFilterState: value => { filters = value; },
    getProblemCompletionCount: problems => getProblemCompletionCount(problems, controller.getPersonalState),
    selectProblemForInterview: id => calls.selected.push(id),
    revealProblemDetailBlock: (id, block) => calls.revealed.push([id, block]),
    leetcodeHotItems: [{ id: 'hot-one', title: 'Hot question', url: 'https://leetcode.cn/problems/two-sum/' }],
    normalizeLeetcodeHot100Done: ids => ids || [], saveState: () => { calls.saves += 1; },
  });
  return { state, api, controller, calls };
}

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.listeners = {}; this.attributes = {}; }
  append(...nodes) { this.children.push(...nodes); }
  appendChild(node) { this.children.push(node); return node; }
  setAttribute(name, value) { this.attributes[name] = value; }
  addEventListener(type, callback) { this.listeners[type] = callback; }
}

test('opening, searching, filtering, revealing and selecting a question never record completion', () => {
  const { api, state, calls } = fixture();
  const before = structuredClone(state);
  api.getViewModel();
  api.prewarmSearchIndex({ maxItems: 20, budgetMs: 100 });
  api.openDetail('catalog-one');
  api.revealBlock('catalog-one', 'answer');
  api.revealBlock('catalog-one', 'hint');
  api.selectForInterview('catalog-one');
  api.returnToList();
  api.setSearchQuery('technical');
  api.handleSearchKeydown({ key: 'Enter', preventDefault() {} });
  assert.equal(api.getViewModel().detail.id, 'technical-one');
  api.applyFilterAction({ type: 'viewMode', value: 'all' });
  assert.deepEqual(state.problems, before.problems);
  assert.deepEqual(state.skills, before.skills);
  assert.deepEqual(state.leetcodeHot100Done, before.leetcodeHot100Done);
  assert.equal(getProblemCompletionCount(state.problems, id => state.problemStates.find(row => row.problemId === id) || {}), 0);
  assert.ok(state.problemStates.every(row => !row.completed && !row.interviewCount && !(row.freePracticeAttempts || []).length));
  const practice = state.problemStates.find(row => row.problemId === 'catalog-one');
  assert.equal(practice.freePracticeSession.answerViewed, true);
  assert.equal(practice.freePracticeSession.hintViewed, true);
  assert.equal(calls.saves, 2);
  assert.deepEqual(calls.selected, ['catalog-one']);
  assert.equal(calls.revealed.length, 2);
});

test('only explicit non-LeetCode completion writes its timestamp and undo preserves study settings', () => {
  const { api, controller, state, calls } = fixture();
  state.problemStates = [normalizeProblemState({ problemId: 'catalog-one', studyStatus: 'review', favorite: true, note: 'keep this note' })];
  api.openDetail('catalog-one');
  api.toggleCompleted('catalog-one');
  assert.equal(controller.getPersonalState('catalog-one').completed, true);
  assert.equal(controller.getPersonalState('catalog-one').completedAt, NOW);
  assert.equal(api.getViewModel().detail.completed, true);
  assert.equal(getProblemCompletionCount(state.problems, controller.getPersonalState), 1);
  assert.equal(calls.saves, 1);
  api.toggleCompleted('catalog-one');
  const undone = controller.getPersonalState('catalog-one');
  assert.equal(undone.completed, false);
  assert.equal(undone.completedAt, '');
  assert.equal(undone.favorite, true);
  assert.equal(undone.studyStatus, 'review');
  assert.equal(undone.note, 'keep this note');
  assert.equal(getProblemCompletionCount(state.problems, controller.getPersonalState), 0);
  api.toggleCompleted('technical-one');
  assert.equal(controller.getPersonalState('technical-one').completedAt, NOW);
  assert.equal(getProblemCompletionCount(state.problems, controller.getPersonalState), 1);
});

test('legacy undated flags do not count; an explicit click creates a real completion', () => {
  const { api, state, controller } = fixture();
  state.problemStates = [{ problemId: 'catalog-one', completed: true, completedAt: '' }];
  api.openDetail('catalog-one');
  assert.equal(api.getViewModel().detail.completed, false);
  assert.equal(getProblemCompletionCount(state.problems, controller.getPersonalState), 0);
  api.toggleCompleted('catalog-one');
  assert.equal(controller.getPersonalState('catalog-one').completedAt, NOW);
  assert.equal(api.getViewModel().detail.completed, true);
});

test('catalog LeetCode local completion is blocked at both the page API and state controller', () => {
  const { api, state, controller, calls } = fixture();
  state.problemStates = [{ problemId: 'lc-question', completed: true, completedAt: NOW, favorite: true }];
  const before = structuredClone(state);
  api.openDetail('lc-question');
  assert.equal(api.getViewModel().detail.completed, false);
  assert.equal(api.getViewModel().detail.manualCompletionAllowed, false);
  assert.equal(api.getViewModel().detail.favorite, true);
  api.toggleCompleted('lc-question');
  controller.toggleCompleted('lc-question');
  controller.toggleCompleted('missing-question');
  assert.deepEqual(state, before);
  assert.equal(calls.saves, 0);
  assert.equal(getProblemCompletionCount(state.problems, controller.getPersonalState), 0);
});

test('legacy Hot 100 actions cannot mutate completion lists or inflate LeetCode skills', () => {
  const { api, state, calls } = fixture();
  const before = structuredClone(state);
  const legacy = createLeetcodeHotController({ getState: () => state,
    items: [{ id: 'hot-one' }], normalizeDoneIds: ids => ids,
    saveState: () => { calls.saves += 1; } });
  assert.equal(api.toggleLeetcodeHotDone('hot-one'), null);
  assert.equal(legacy.toggleDone('hot-one'), null);
  assert.equal(toggleLeetcodeHotDoneState({ problemId: 'hot-one', doneIds: ['hot-one'], hotItems: [{ id: 'hot-one' }] }), null);
  assert.deepEqual(state, before);
  assert.equal(calls.saves, 0);
  const chrome = api.getViewModel().chrome;
  assert.deepEqual(chrome.collections.leetcode.doneIds, []);
  assert.ok(Array.isArray(chrome.progress));
  assert.ok(!chrome.progress.some(item => item.key === 'leetcode-hot'));
  assert.equal(chrome.progress.find(item => item.key === 'all').total, 3);
});

test('completed-problem totals include trainers but exclude LeetCode and duplicate catalog entries', () => {
  const completed = { completed: true, completedAt: NOW };
  const questions = [problem('one'), problem('one'), problem('two', 'cppProgramming'),
    problem('math', 'mentalMath'), problem('mental', 'mental_math'), problem('sequence', 'sequence'), problem('pattern', 'pattern'),
    problem('lc', 'leetcode'), problem('lc-url', 'coding', { sourceUrl: 'https://leetcode.cn/problems/two-sum/' })];
  assert.equal(getProblemCompletionCount(questions, () => completed), 6);
  assert.equal(countsTowardProblemTotal(problem('trainer', 'probabilityExpectation', { source: 'trainer' })), true);
  for (const value of [{ completed: false, completedAt: NOW }, { completed: true }, { completed: true, completedAt: '2026-09-14' }, null]) {
    assert.equal(hasExplicitProblemCompletion(value), false);
  }
  for (const metadata of [{ category: 'leetcode' }, { source: 'leetcode' }, { sourceType: 'leetcode' },
    { sourceUrl: 'https://www.leetcode.com/problems/two-sum/' }, { id: 'leetcode-two-sum' }]) {
    assert.equal(isLeetcodeCatalogProblem(metadata), true);
  }
  assert.equal(isLeetcodeCatalogProblem({ sourceUrl: 'https://leetcode.cn.example.invalid/problems/two-sum/' }), false);
  assert.equal(isLeetcodeCatalogProblem(problem('technical-coding', 'coding')), false);
});

test('list clicks and keyboard navigation only open a question; only its dedicated completion button counts', () => {
  const originalDocument = globalThis.document;
  globalThis.document = { createElement: tag => new Element(tag) };
  try {
    const opened = [], completed = [];
    const card = createProblemCard(problem('catalog-one'), { openProblem: id => opened.push(id), toggleCompleted: id => completed.push(id) });
    card.listeners.click();
    card.listeners.keydown({ key: 'Enter', preventDefault() {} });
    card.listeners.keydown({ key: ' ', preventDefault() {} });
    assert.deepEqual(opened, ['catalog-one', 'catalog-one', 'catalog-one']);
    assert.deepEqual(completed, []);
    const button = card.children.find(node => node.className?.includes('problem-complete-button'));
    assert.equal(button.title, '我做完了');
    button.listeners.click({ stopPropagation() {} });
    assert.deepEqual(completed, ['catalog-one']);
    const lcCard = createProblemCard(problem('lc-question', 'leetcode'), { toggleCompleted: id => completed.push(id) });
    const lcButton = lcCard.children.find(node => node.className?.includes('problem-complete-button'));
    assert.equal(lcButton.hidden, true);
    lcButton.listeners.click({ stopPropagation() {} });
    assert.deepEqual(completed, ['catalog-one']);
  } finally {
    globalThis.document = originalDocument;
  }
});
