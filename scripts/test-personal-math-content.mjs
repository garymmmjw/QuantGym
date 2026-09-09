import assert from 'node:assert/strict';
import test from 'node:test';
import { scheduleMathContent } from '../src/features/personal/daily/mathContent.js';

const flush = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const node = id => ({ id, isConnected: true });

function environment(math) {
  let nextTimer = 0;
  const timers = new Map();
  const windowRef = {
    MathJax: math,
    setTimeout(callback) {
      const id = ++nextTimer;
      timers.set(id, callback);
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
  };
  return {
    windowRef,
    timers,
    poll() {
      const pending = [...timers.values()];
      timers.clear();
      pending.forEach(callback => callback());
    },
  };
}

function mathEngine(typeset = async () => {}) {
  const rendered = [], cleared = [];
  const math = {
    startup: { promise: Promise.resolve() },
    typesetPromise(targets) {
      rendered.push(...targets);
      return typeset(targets);
    },
    typesetClear(targets) { cleared.push(...targets); },
  };
  return { math, rendered, cleared };
}

test('formulas requested before MathJax loads are rendered once it becomes available', async () => {
  const env = environment({ tex: { inlineMath: [['$', '$']] } });
  const target = node('late-load');
  const job = scheduleMathContent(target, env);
  await flush();
  assert.equal(env.timers.size, 1);

  const engine = mathEngine();
  env.windowRef.MathJax = engine.math;
  env.poll();
  assert.equal(await job.done, true);
  assert.deepEqual(engine.rendered, [target]);
  assert.equal(env.timers.size, 0);
});

test('startup finishes before rendering, and two text blocks never render concurrently', async () => {
  const startup = deferred(), firstRender = deferred(), secondRender = deferred();
  const first = node('question'), second = node('reference');
  let active = 0, maximumActive = 0;
  const engine = mathEngine(async ([target]) => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    await (target === first ? firstRender.promise : secondRender.promise);
    active -= 1;
  });
  engine.math.startup.promise = startup.promise;
  const env = environment(engine.math);
  const firstJob = scheduleMathContent(first, env);
  const secondJob = scheduleMathContent(second, env);
  await flush();
  assert.deepEqual(engine.rendered, []);

  startup.resolve();
  await flush();
  assert.deepEqual(engine.rendered, [first]);
  firstRender.resolve();
  assert.equal(await firstJob.done, true);
  await flush();
  assert.deepEqual(engine.rendered, [first, second]);
  secondRender.resolve();
  assert.equal(await secondJob.done, true);
  assert.equal(maximumActive, 1);
});

test('unmounting before script load cancels polling and never renders the old content', async () => {
  const env = environment();
  const target = node('removed-before-load');
  const job = scheduleMathContent(target, env);
  assert.equal(env.timers.size, 1);
  job.cancel();
  assert.equal(await job.done, false);
  assert.equal(env.timers.size, 0);

  const engine = mathEngine();
  env.windowRef.MathJax = engine.math;
  env.poll();
  await flush();
  assert.deepEqual(engine.rendered, []);
});

test('switching questions cancels a queued old target while letting the new target render', async () => {
  const blockerRender = deferred();
  const blocker = node('another-block'), oldQuestion = node('old-question'), nextQuestion = node('next-question');
  const engine = mathEngine(([target]) => target === blocker ? blockerRender.promise : Promise.resolve());
  const env = environment(engine.math);
  const blockerJob = scheduleMathContent(blocker, env);
  const oldJob = scheduleMathContent(oldQuestion, env);
  await flush();
  assert.deepEqual(engine.rendered, [blocker]);
  oldJob.cancel();
  const nextJob = scheduleMathContent(nextQuestion, env);
  blockerRender.resolve();
  assert.equal(await blockerJob.done, true);
  assert.equal(await oldJob.done, false);
  assert.equal(await nextJob.done, true);
  assert.deepEqual(engine.rendered, [blocker, nextQuestion]);
  assert.ok(engine.cleared.includes(oldQuestion));
});

test('cancelling an in-flight render cleans up its MathJax state again after it settles', async () => {
  const rendering = deferred();
  const engine = mathEngine(() => rendering.promise);
  const env = environment(engine.math);
  const target = node('removed-while-rendering');
  const job = scheduleMathContent(target, env);
  await flush();
  assert.deepEqual(engine.rendered, [target]);
  job.cancel();
  const clearCountBeforeSettling = engine.cleared.length;
  assert.ok(clearCountBeforeSettling > 0);
  rendering.resolve();
  assert.equal(await job.done, false);
  assert.ok(engine.cleared.length > clearCountBeforeSettling);
  assert.ok(engine.cleared.every(item => item === target));
});

test('visibility is checked when queued work starts; a reopened reference can be scheduled again', async () => {
  const startup = deferred();
  const engine = mathEngine();
  engine.math.startup.promise = startup.promise;
  const env = environment(engine.math);
  const target = node('folded-reference');
  let visible = true;
  const job = scheduleMathContent(target, { ...env, isVisible: () => visible });
  await flush();
  visible = false;
  startup.resolve();
  assert.equal(await job.done, false);
  assert.deepEqual(engine.rendered, []);

  visible = true;
  assert.equal(await scheduleMathContent(target, { ...env, isVisible: () => visible }).done, true);
  assert.deepEqual(engine.rendered, [target]);
});

test('detached queued content never reaches MathJax', async () => {
  const startup = deferred();
  const engine = mathEngine();
  engine.math.startup.promise = startup.promise;
  const env = environment(engine.math);
  const target = node('detached');
  const job = scheduleMathContent(target, env);
  await flush();
  target.isConnected = false;
  startup.resolve();
  assert.equal(await job.done, false);
  assert.deepEqual(engine.rendered, []);
});

test('content detached during rendering is cleared when rendering completes', async () => {
  const rendering = deferred();
  const engine = mathEngine(() => rendering.promise);
  const env = environment(engine.math);
  const target = node('detached-in-flight');
  const job = scheduleMathContent(target, env);
  await flush();
  target.isConnected = false;
  rendering.resolve();
  assert.equal(await job.done, false);
  assert.deepEqual(engine.cleared, [target]);
});

test('script-load timeout reports failure, and a later retry can render successfully', async () => {
  const env = environment();
  const target = node('retry-after-load-timeout');
  const failedJob = scheduleMathContent(target, { ...env, timeoutMs: 0 });
  await assert.rejects(failedJob.done, /not loaded/i);
  assert.equal(env.timers.size, 0);

  const engine = mathEngine();
  env.windowRef.MathJax = engine.math;
  assert.equal(await scheduleMathContent(target, env).done, true);
  assert.deepEqual(engine.rendered, [target]);
});

test('a rejected formula render reports failure without blocking later content or retry', async () => {
  const bad = node('failed-formula'), good = node('next-formula');
  let fail = true;
  const engine = mathEngine(async ([target]) => {
    if (target === bad && fail) throw new Error('Temporary font load failure');
  });
  const env = environment(engine.math);
  const failedJob = scheduleMathContent(bad, env);
  const nextJob = scheduleMathContent(good, env);
  await assert.rejects(failedJob.done, /font load/);
  assert.equal(await nextJob.done, true);
  failedJob.cancel();
  assert.ok(engine.cleared.includes(bad));

  fail = false;
  assert.equal(await scheduleMathContent(bad, env).done, true);
  assert.deepEqual(engine.rendered, [bad, good, bad]);
});
