import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiError } from '../src/api/client.js';
import { getNewsEndpoint, getNewsErrorMessage, getNewsRequestHeaders, requestNewsFromApi } from '../src/modules/news/data.js';
import { createNewsControllerBundle } from '../src/modules/news/controllerBundle.js';
import { createNewsSyncController } from '../src/modules/news/sync.js';
import { filterNewsItems } from '../src/features/news/newsViewModel.js';
import { createContentControllerBundles } from '../src/app/contentControllerBundles.js';

const endpoint = 'https://llm.example.test/news';
const savedItem = { id: 'saved', title: 'My recruiting note', sourceType: 'linkedin', summary: 'Saved social link', sourceUrl: 'https://www.linkedin.com/posts/example' };
const freshItem = { id: 'fresh', title: 'Optiver expands market making', sourceType: 'rss', source: 'Market wire', summary: 'New options market', sourceUrl: 'https://news.example.test/optiver' };
const response = (data, status = 200) => ({ ok: status >= 200 && status < 300, status, json: async () => data });

test('news uses only server-supported topic and max, bearer headers and no redirects', async () => {
  let request;
  const items = await requestNewsFromApi({
    endpoint, topic: 'quantFirms', max: 12,
    queries: ['ignored client query'], feeds: ['http://127.0.0.1/private'],
    headers: { Authorization: 'Bearer active-session' },
    normalizeItem: item => ({ ...item, normalized: true }),
    fetchImpl: async (url, options) => { request = { url, options }; return response({ items: [freshItem] }); }
  });
  assert.equal(request.url, endpoint);
  assert.deepEqual(JSON.parse(request.options.body), { topic: 'quantFirms', max: 12 });
  assert.equal(request.options.headers.Authorization, 'Bearer active-session');
  assert.equal(request.options.headers['Content-Type'], 'application/json');
  assert.equal(request.options.credentials, 'omit');
  assert.equal(request.options.redirect, 'error');
  assert.equal(request.options.signal.aborted, false);
  assert.deepEqual(items, [{ ...freshItem, normalized: true }]);
});

test('credentials go only to the deployment service origin, never to a custom URL', () => {
  const headers = { Authorization: 'Bearer session', 'X-Other-Secret': 'private' };
  assert.deepEqual(getNewsRequestHeaders(endpoint, 'https://llm.example.test/interview', headers), {
    'Content-Type': 'application/json', Authorization: 'Bearer session'
  });
  for (const target of ['https://attacker.test/news', 'https://llm.example.test.attacker.test/news',
    'http://llm.example.test/news', 'https://llm.example.test:444/news', 'https://user:pass@llm.example.test/news', 'bad-url']) {
    assert.deepEqual(getNewsRequestHeaders(target, endpoint, headers), { 'Content-Type': 'application/json' });
  }
  assert.deepEqual(getNewsRequestHeaders(endpoint, '', headers), { 'Content-Type': 'application/json' });
  assert.equal(getNewsEndpoint('https://llm.example.test/interview?debug=1#token'), endpoint);
  assert.equal(getNewsEndpoint('file:///interview'), '');
  assert.equal(getNewsEndpoint('https://user:pass@llm.example.test/interview'), '');
  assert.equal(getNewsRequestHeaders('http://127.0.0.1:8787/news', 'http://127.0.0.1:8787/interview', headers).Authorization, 'Bearer session');
});

test('app wiring sends only the active account token, including configured local development defaults', async t => {
  const appState = { currentUser: { id: 'active-user' }, cloudConfig: { userId: 'active-user', token: 'token-one' } };
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    requests.push({ url, options });
    return response({ items: [] });
  });
  const { newsProvider } = createContentControllerBundles({
    appState, userState: { value: { news: [] } },
    DEFAULT_LLM_ENDPOINT: 'http://127.0.0.1:8787/interview',
    getLlmConfig: () => ({ endpoint: '' }),
    getLlmRequestHeaders: () => ({ Authorization: `Bearer ${appState.cloudConfig.token}` }),
    newsFilterState: { getState: () => ({ topic: 'all' }) },
    elements: {}, getLanguage: () => 'en', t: key => key
  });
  await newsProvider.requestFromApi();
  assert.equal(requests.at(-1).url, 'http://127.0.0.1:8787/news');
  assert.equal(requests.at(-1).options.headers.Authorization, 'Bearer token-one');
  appState.cloudConfig.token = 'token-two';
  await newsProvider.requestFromApi();
  assert.equal(requests.at(-1).options.headers.Authorization, 'Bearer token-two');
  appState.currentUser = { id: 'different-user' };
  await newsProvider.requestFromApi();
  assert.equal(requests.at(-1).options.headers.Authorization, undefined);
  appState.currentUser = null;
  await newsProvider.requestFromApi();
  assert.equal(requests.at(-1).options.headers.Authorization, undefined);
});

function harness(fetchImpl, options = {}) {
  let state = { news: [{ ...savedItem }], newsFetchedAt: '2026-10-01T12:00:00.000Z', newsSyncError: '' };
  let user = { id: 'user-a' };
  let token = 'token-a';
  const events = [];
  const bundle = createNewsControllerBundle({
    getState: () => state,
    getCurrentUser: () => user,
    getSessionKey: () => JSON.stringify([user?.id, token]),
    getEndpointBase: () => options.endpoint || 'https://llm.example.test/interview',
    trustedEndpoint: 'https://llm.example.test/interview',
    getHeaders: () => ({ Authorization: `Bearer ${token}` }),
    getFilters: () => ({ topic: 'quantFirms', source: 'social' }),
    normalizeTopic: value => value,
    fetchImpl,
    timeoutMs: options.timeoutMs,
    normalizeNewsSkills: value => Array.isArray(value) ? value : [value],
    saveState: value => events.push({ type: 'save', value }),
    renderNews: () => events.push({ type: 'render', items: state.news, error: state.newsSyncError }),
    refreshIcons: () => events.push({ type: 'icons' }),
    setStatusText: value => events.push({ type: 'status', value }),
    getSyncingLabel: () => 'Refreshing news…'
  });
  return { bundle, events, getState: () => state, setState: value => { state = value; },
    setUser: value => { user = value; }, setToken: value => { token = value; } };
}

test('provider/runtime render new stories while preserving social links and topic/source filtering', async () => {
  const calls = [];
  const h = harness(async (url, options) => {
    calls.push({ url, options });
    return response({ items: [freshItem] });
  });
  const result = await h.bundle.runtime.refresh(true);
  assert.deepEqual(result, { skipped: false, ok: true, count: 1 });
  assert.equal(calls[0].options.headers.Authorization, 'Bearer token-a');
  assert.deepEqual(JSON.parse(calls[0].options.body), { topic: 'quantFirms', max: 24 });
  const state = h.getState();
  assert.equal(state.news.length, 2);
  assert.equal(state.news.find(item => item.id === savedItem.id).sourceUrl, savedItem.sourceUrl);
  assert.equal(state.newsSyncError, '');
  assert.notEqual(state.newsFetchedAt, '2026-10-01T12:00:00.000Z');
  assert.equal(h.events.filter(event => event.type === 'render').length, 1);
  assert.equal(h.events.find(event => event.type === 'render').items.length, 2);
  assert.deepEqual(filterNewsItems(state.news, { source: 'social', topic: 'all' }).map(item => item.id), ['saved']);
  assert.deepEqual(filterNewsItems(state.news, { source: 'news', topic: 'quantFirms' }).map(item => item.id), ['fresh']);
  assert.deepEqual(filterNewsItems(state.news, { source: 'all', topic: 'recruiting' }).map(item => item.id), ['saved']);
});

test('custom services never receive the cloud token through provider wiring', async () => {
  const h = harness(async (url, options) => {
    assert.equal(url, 'https://custom.example.test/news');
    assert.equal(options.headers.Authorization, undefined);
    return response({ items: [] });
  }, { endpoint: 'https://custom.example.test/interview' });
  assert.equal((await h.bundle.runtime.refresh()).ok, true);
});

for (const [name, fetchImpl, errorCode] of [
  ['expired login', async () => response({ error: 'Sign in' }, 401), 'auth'],
  ['forbidden session', async () => response({}, 403), 'auth'],
  ['rate limiting', async () => response({}, 429), 'rate_limit'],
  ['source outage', async () => response({}, 503), 'unavailable'],
  ['network failure', async () => { throw new TypeError('Failed to fetch'); }, 'unavailable'],
  ['malformed response', async () => response({ error: 'Invalid response' }), 'unavailable']
]) {
  test(`${name} preserves saved news and the last successful update, and renders a useful status`, async () => {
    const h = harness(fetchImpl);
    const before = structuredClone(h.getState());
    const result = await h.bundle.runtime.refresh(true);
    assert.equal(result.ok, false);
    assert.deepEqual(h.getState().news, before.news);
    assert.equal(h.getState().newsFetchedAt, before.newsFetchedAt);
    assert.equal(h.getState().newsSyncError, errorCode);
    assert.equal(h.events.find(event => event.type === 'render').error, errorCode);
    assert.match(getNewsErrorMessage(errorCode, 'en'), /saved stories/i);
    assert.match(getNewsErrorMessage(errorCode, 'zh'), /已保存的内容/);
    assert.equal(h.bundle.runtime.getSyncController().isInFlight(), false);
  });
}

test('deadline aborts the fetch, preserves news, and allows a later retry', async () => {
  let attempts = 0;
  let signal;
  const h = harness(async (_url, options) => {
    attempts += 1;
    if (attempts > 1) return response({ items: [freshItem] });
    signal = options.signal;
    return await new Promise((_, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
    });
  }, { timeoutMs: 10 });
  const before = structuredClone(h.getState());
  assert.equal((await h.bundle.runtime.refresh()).ok, false);
  assert.equal(signal.aborted, true);
  assert.equal(h.getState().newsSyncError, 'timeout');
  assert.deepEqual(h.getState().news, before.news);
  assert.equal(h.getState().newsFetchedAt, before.newsFetchedAt);
  assert.equal((await h.bundle.runtime.refresh()).ok, true);
  assert.equal(h.getState().news.length, 2);
});

test('deadline also bounds a stalled response body, and successful requests clear their timer', async () => {
  let signal;
  await assert.rejects(requestNewsFromApi({ endpoint, timeoutMs: 10, fetchImpl: async (_url, options) => {
    signal = options.signal;
    return { ok: true, json: () => new Promise(() => {}) };
  } }), error => error.code === 'timeout');
  assert.equal(signal.aborted, true);
  let completedSignal;
  await requestNewsFromApi({ endpoint, timeoutMs: 10, fetchImpl: async (_url, options) => {
    completedSignal = options.signal;
    return response({ items: [] });
  } });
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(completedSignal.aborted, false);
});

for (const transition of ['account', 'token', 'state', 'logout']) {
  for (const fail of [false, true]) {
    test(`late ${fail ? 'failure' : 'success'} after ${transition} change cannot write or render into the current session`, async () => {
      let finish;
      const h = harness(() => new Promise(resolve => { finish = resolve; }));
      const original = h.getState();
      const pending = h.bundle.runtime.refresh();
      const newState = { news: [{ id: 'other-user-note' }], newsFetchedAt: '', newsSyncError: '' };
      if (transition === 'account') { h.setUser({ id: 'user-b' }); h.setState(newState); }
      if (transition === 'logout') h.setUser(null);
      if (transition === 'token') h.setToken('rotated-token');
      if (transition === 'state') h.setState(newState);
      finish(response(fail ? {} : { items: [freshItem] }, fail ? 401 : 200));
      assert.deepEqual(await pending, { skipped: true, stale: true });
      assert.deepEqual(original.news, [savedItem]);
      assert.equal(original.newsFetchedAt, '2026-10-01T12:00:00.000Z');
      assert.equal(original.newsSyncError, '');
      assert.deepEqual(newState, { news: [{ id: 'other-user-note' }], newsFetchedAt: '', newsSyncError: '' });
      assert.deepEqual(h.events, []);
      assert.equal(h.bundle.runtime.getSyncController().isInFlight(), false);
    });
  }
}

test('refresh coalesces concurrent actions and background failures also update the status', async () => {
  const state = { news: [savedItem] };
  let reject;
  let calls = 0;
  let renders = 0;
  const controller = createNewsSyncController({
    getState: () => state,
    requestNews: () => { calls += 1; return new Promise((_, fail) => { reject = fail; }); },
    renderNews: () => { renders += 1; }
  });
  const pending = controller.refresh(false);
  assert.deepEqual(await controller.refresh(true), { skipped: true });
  reject(new ApiError('Rate limited', { status: 429 }));
  assert.equal((await pending).ok, false);
  assert.equal(calls, 1);
  assert.equal(renders, 1);
  assert.equal(state.newsSyncError, 'rate_limit');
});
