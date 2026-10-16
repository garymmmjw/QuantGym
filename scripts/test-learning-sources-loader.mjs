import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLearningSources, requestLearningContent } from '../src/features/learning/learningSourcesLoader.mjs';

const connection = { token: 'fixture-session', baseUrl: 'https://example.invalid/api' };
const record = { id: 'quantvault-14', source: 'quantvault', quantvault: { id: 900, displayId: 14 }, explanation: 'Complete solution' };
const payloads = {
  modules: { modules: [] }, 'problems-index': [{ id: 900, di: 14 }],
  'item-difficulty': { b: {} }, 'item-difficulty-v2': { b: {}, c: {} },
  library: { lessons: [] }, practice: { lists: [] },
};
const response = (status, payload = {}, retryAfter = null) => ({ ok: status === 200, status,
  headers: new Headers(retryAfter === null ? {} : { 'Retry-After': retryAfter }),
  json: async () => payload, body: { cancel: async () => {} } });
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };

test('Learn reuses the gated session catalog after six authorized reads, with at most two requests at once', async () => {
  let active = 0, peak = 0, completed = 0, catalogReads = 0;
  const paths = [];
  const sources = await loadLearningSources({ ...connection,
    getCatalogProblems() { catalogReads++; assert.equal(completed, 6); return [record, { id: 'other', source: 'quantguide' }]; },
    fetchImpl: async (url, options) => {
      paths.push(url); active++; peak = Math.max(peak, active);
      assert.equal(options.headers.Authorization, 'Bearer fixture-session');
      assert.equal(options.credentials, 'omit'); assert.equal(options.cache, 'no-store');
      await new Promise(resolve => setTimeout(resolve, 1));
      active--; completed++;
      return response(200, payloads[url.split('/').at(-1)]);
    },
  });
  assert.equal(paths.length, 6); assert.equal(peak, 2); assert.equal(catalogReads, 1);
  assert.ok(paths.every(path => path.includes('/learning/content/')));
  assert.deepEqual(sources.records, [record]); assert.deepEqual(sources.downloadedProblemIds, [900]);
  assert.equal(sources.records[0], record, 'Reuse original content rather than copy the entire catalog');
});

test('503 observes Retry-After and retries at most twice without changing the authorized request', async () => {
  const delays = [], calls = [];
  const result = await requestLearningContent('library', { ...connection,
    fetchImpl: async (...args) => { calls.push(args); return calls.length < 3 ? response(503, {}, '2') : response(200, { lessons: [] }); },
    waitImpl: async delay => { delays.push(delay); },
  });
  assert.deepEqual(result, { lessons: [] }); assert.equal(calls.length, 3); assert.deepEqual(delays, [2000, 2000]);
  assert.ok(calls.every(([url]) => url === 'https://example.invalid/api/learning/content/library'));
  let attempts = 0;
  await assert.rejects(requestLearningContent('library', { ...connection,
    fetchImpl: async () => { attempts++; return response(503); }, waitImpl: async () => {},
  }), error => error.status === 503);
  assert.equal(attempts, 3);
});

test('denied sessions, missing content, and longer server backoff never retry', async () => {
  for (const [status, retry] of [[401, null], [403, null], [404, null], [503, '60']]) {
    let attempts = 0;
    await assert.rejects(requestLearningContent('practice', { ...connection,
      fetchImpl: async () => { attempts++; return response(status, {}, retry); },
      waitImpl: async () => assert.fail('Must not retry'),
    }), error => error.status === status);
    assert.equal(attempts, 1);
  }
});

test('abort interrupts Retry-After immediately and never sends another request', async () => {
  const controller = new AbortController(), started = deferred();
  let attempts = 0;
  const pending = requestLearningContent('library', { ...connection, signal: controller.signal,
    fetchImpl: async () => { attempts++; started.resolve(); return response(503, {}, '10'); },
  });
  await started.promise;
  // Let the request enter the real ten-second backoff, then cancel its timer.
  await new Promise(resolve => setTimeout(resolve, 0));
  controller.abort();
  await assert.rejects(pending, error => error.name === 'AbortError');
  assert.equal(attempts, 1);
});

test('a session change during a response or retry discards it before the next request', async () => {
  for (const stage of ['response', 'retry']) {
    let current = true, attempts = 0;
    await assert.rejects(requestLearningContent('library', { ...connection, isCurrent: () => current,
      fetchImpl: async () => { attempts++; if (stage === 'response') current = false; return response(503, {}, '0'); },
      waitImpl: async () => { current = false; },
    }), error => error.name === 'AbortError');
    assert.equal(attempts, 1);
  }
});

test('failed authorization cancels its sibling and never reads cached question bodies', async () => {
  let attempts = 0, siblingSignal;
  await assert.rejects(loadLearningSources({ ...connection,
    getCatalogProblems() { assert.fail('Unauthorized sources must not reach the catalog'); },
    fetchImpl: async (_url, options) => {
      attempts++;
      if (attempts === 1) return response(403);
      siblingSignal = options.signal;
      return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true }));
    },
  }), error => error.status === 403);
  assert.equal(attempts, 2); assert.equal(siblingSignal.aborted, true);
});

test('session change before all content resolves never reads another account’s catalog', async () => {
  let current = true;
  await assert.rejects(loadLearningSources({ ...connection, isCurrent: () => current,
    getCatalogProblems() { assert.fail('An old session must not see the current account catalog'); },
    fetchImpl: async () => { current = false; return response(200, {}); },
  }), error => error.name === 'AbortError');
});
