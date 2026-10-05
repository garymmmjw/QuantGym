import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import test from 'node:test';
import { createPublicRssFetcher, isPublicNewsAddress, NewsFetchError } from '../llm-proxy/news-fetch.mjs';

const SOURCE = 'https://feeds.example.com/rss';
const PUBLIC_V4 = { address: '142.250.72.14', family: 4 };
const PUBLIC_V6 = { address: '2001:4860:4860::8888', family: 6 };
const OPTIONS = { allowedHosts: new Set(['feeds.example.com', 'redirect.example.com']), timeoutMs: 500 };
const XML = '<?xml version="1.0"?><rss><channel><title>News 世界</title></channel></rss>';

function fixture({ resolve, responses = [{}] } = {}) {
  const calls = [];
  const dnsCalls = [];
  const lookupResults = [];
  const requests = [];
  const streams = [];
  const fetchRss = createPublicRssFetcher({
    resolve: async (host, options) => {
      dnsCalls.push({ host, options });
      return resolve ? resolve(host, options, dnsCalls.length) : [PUBLIC_V4, PUBLIC_V6];
    },
    request: (url, options, onResponse) => {
      const index = calls.length;
      calls.push({ url: new URL(url), options });
      const description = responses[index] || responses.at(-1);
      if (description.throw) throw description.throw;
      const req = new EventEmitter();
      requests.push(req);
      req.destroyed = false;
      req.destroy = () => { req.destroyed = true; streams[index]?.destroy(); return req; };
      req.end = () => queueMicrotask(() => {
        options.lookup(url.hostname, { all: true }, (error, addresses) => lookupResults.push({ error, addresses }));
        if (req.destroyed) return;
        if (description.requestError) { req.emit('error', description.requestError); return; }
        if (description.noHeaders) return;
        const res = new PassThrough();
        streams[index] = res;
        res.statusCode = description.status ?? 200;
        res.headers = description.headers || {};
        onResponse(res);
        if (res.destroyed) return;
        if (description.body) description.body(res);
        else if (!description.noEnd) res.end(description.text ?? XML);
      });
      return req;
    },
  });
  return { fetchRss, calls, dnsCalls, lookupResults, requests, streams };
}

async function rejectsCode(promise, code) {
  await assert.rejects(promise, (error) => error instanceof NewsFetchError && error.code === code);
}

test('fetches a public RSS feed with bounded identity transport and original TLS hostname', async () => {
  const state = fixture();
  assert.equal(await state.fetchRss(SOURCE, OPTIONS), XML);
  assert.equal(state.dnsCalls.length, 1);
  assert.equal(state.calls.length, 1);
  assert.equal(state.calls[0].url.href, SOURCE);
  const options = state.calls[0].options;
  assert.equal(options.method, 'GET');
  assert.equal(options.agent, false);
  assert.equal(options.servername, 'feeds.example.com');
  assert.equal(options.rejectUnauthorized, true);
  assert.equal(options.maxHeaderSize, 16384);
  assert.equal(options.headers['Accept-Encoding'], 'identity');
  assert.equal(options.headers.Authorization, undefined);
  assert.equal(options.headers.Cookie, undefined);
  assert.deepEqual(state.lookupResults[0], { error: null, addresses: [PUBLIC_V4] });
});

test('accepts public IPv6 DNS and pins it without a second resolver call', async () => {
  const state = fixture({ resolve: (_host, _options, count) => count === 1 ? [PUBLIC_V6] : [{ address: '::1', family: 6 }] });
  assert.equal(await state.fetchRss(SOURCE, OPTIONS), XML);
  const options = state.calls[0].options;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const result = await new Promise((resolve) => options.lookup('feeds.example.com', {}, (...args) => resolve(args)));
    assert.deepEqual(result, [null, PUBLIC_V6.address, 6]);
  }
  assert.equal(state.dnsCalls.length, 1);
});

test('canonicalizes hostname case and trailing root dot with default HTTPS port', async () => {
  const state = fixture();
  await state.fetchRss('https://FEEDS.EXAMPLE.COM.:443/rss#unused', OPTIONS);
  assert.equal(state.calls[0].url.href, SOURCE);
  assert.equal(state.dnsCalls[0].host, 'feeds.example.com');
});

const UNSAFE_URLS = [
  'http://feeds.example.com/rss', 'file:///etc/passwd', 'ftp://feeds.example.com/rss',
  'https://feeds.example.com:444/rss', 'https://user:password@feeds.example.com/rss',
  'https://user@feeds.example.com/rss', 'https://127.0.0.1/rss', 'https://127.1/rss',
  'https://2130706433/rss', 'https://0x7f000001/rss', 'https://0177.0.0.1/rss',
  'https://[::1]/rss', 'https://[::ffff:127.0.0.1]/rss', 'https://[2001:4860:4860::8888]/rss',
  'https://8.8.8.8/rss', 'https://localhost/rss', 'https://metadata.google.internal/rss',
  'https://feeds.local/rss', 'https://home.arpa/rss', 'https://feeds.example.com@127.0.0.1/rss',
  'https://feeds.example.com.evil.com/rss', 'https://evil.com/rss', 'not a URL',
];
for (const url of UNSAFE_URLS) {
  test(`rejects unsafe URL before DNS or socket: ${url}`, async () => {
    const state = fixture();
    await assert.rejects(state.fetchRss(url, OPTIONS), NewsFetchError);
    assert.equal(state.dnsCalls.length, 0);
    assert.equal(state.calls.length, 0);
  });
}

const UNSAFE_ADDRESSES = [
  '0.0.0.0', '0.9.8.7', '10.0.0.1', '100.64.0.1', '100.127.255.254',
  '127.0.0.1', '127.99.0.1', '169.254.169.254', '172.16.0.1', '172.31.255.254',
  '192.0.0.9', '192.0.2.1', '192.88.99.1', '192.168.1.1', '198.18.0.1',
  '198.19.255.254', '198.51.100.1', '203.0.113.1', '224.0.0.1', '239.255.255.255',
  '240.0.0.1', '255.255.255.255', '::', '::1', 'fc00::1', 'fdff::1', 'fe80::1',
  'fe80::1%lo0', 'ff02::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:8.8.8.8',
  '::127.0.0.1', '64:ff9b::7f00:1', '64:ff9b:1::a00:1', '2001::7f00:1',
  '2001:2::1', '2001:10::1', '2001:20::1', '2001:db8::1', '2002:7f00:1::',
  '2002:0808:0808::', '2001:4860::5efe:127.0.0.1', '2001:4860::200:5efe:a00:1',
  '3ffe::1', '3fff::1', '5f00::1', 'not-an-address',
];
for (const address of UNSAFE_ADDRESSES) {
  test(`rejects forbidden DNS answer before socket: ${address}`, async () => {
    assert.equal(isPublicNewsAddress(address), false);
    const state = fixture({ resolve: () => [{ address, family: address.includes(':') ? 6 : 4 }] });
    await rejectsCode(state.fetchRss(SOURCE, OPTIONS), 'UNSAFE_ADDRESS');
    assert.equal(state.calls.length, 0);
  });
}

test('rejects a mixed public/private DNS set instead of choosing only the public record', async () => {
  for (const addresses of [[PUBLIC_V4, { address: '10.0.0.1', family: 4 }], [{ address: '::1', family: 6 }, PUBLIC_V6]]) {
    const state = fixture({ resolve: () => addresses });
    await rejectsCode(state.fetchRss(SOURCE, OPTIONS), 'UNSAFE_ADDRESS');
    assert.equal(state.calls.length, 0);
  }
});

test('rejects mismatched DNS family or empty/failed DNS answers', async () => {
  for (const addresses of [[{ address: PUBLIC_V4.address, family: 6 }], [null]]) {
    const state = fixture({ resolve: () => addresses });
    await rejectsCode(state.fetchRss(SOURCE, OPTIONS), 'UNSAFE_ADDRESS');
    assert.equal(state.calls.length, 0);
  }
  for (const result of [[], undefined]) {
    const state = fixture({ resolve: () => result });
    await rejectsCode(state.fetchRss(SOURCE, OPTIONS), 'DNS_FAILED');
    assert.equal(state.calls.length, 0);
  }
  const state = fixture({ resolve: () => { throw new Error('DNS failure'); } });
  await rejectsCode(state.fetchRss(SOURCE, OPTIONS), 'DNS_FAILED');
  assert.equal(state.calls.length, 0);
});

test('allows neighboring public IPv4 ranges and ordinary global IPv6', () => {
  for (const address of ['8.8.8.8', '1.1.1.1', '100.63.255.255', '100.128.0.1', '172.15.255.255',
    '172.32.0.1', '192.0.1.1', '198.17.255.255', '198.20.0.1', '2001:4860:4860::8888', '2606:4700:4700::1111']) {
    assert.equal(isPublicNewsAddress(address), true, address);
  }
});

test('follows an allowlisted HTTPS redirect only after its DNS is checked', async () => {
  const state = fixture({ responses: [{ status: 302, headers: { location: 'https://redirect.example.com/final' } }, {}] });
  assert.equal(await state.fetchRss(SOURCE, OPTIONS), XML);
  assert.deepEqual(state.dnsCalls.map(({ host }) => host), ['feeds.example.com', 'redirect.example.com']);
  assert.equal(state.calls[1].options.servername, 'redirect.example.com');
  assert.equal(state.streams[0].destroyed, true);
});

test('rechecks DNS on same-host redirects and rejects rebinding to a private address', async () => {
  const state = fixture({
    resolve: (_host, _options, count) => count === 1 ? [PUBLIC_V4] : [{ address: '127.0.0.1', family: 4 }],
    responses: [{ status: 307, headers: { location: '/next' } }],
  });
  await rejectsCode(state.fetchRss(SOURCE, OPTIONS), 'UNSAFE_ADDRESS');
  assert.equal(state.dnsCalls.length, 2);
  assert.equal(state.calls.length, 1);
});

test('blocks redirects to unknown hosts, credentials, IPs, downgrade HTTP and nondefault ports', async () => {
  for (const location of ['https://evil.example.com/rss', '//evil.example.com/rss', 'https://127.0.0.1/rss',
    'https://[::1]/rss', 'http://feeds.example.com/rss', 'https://feeds.example.com:8443/rss',
    'https://user:password@feeds.example.com/rss', 'file:///etc/passwd']) {
    const state = fixture({ responses: [{ status: 302, headers: { location } }] });
    await assert.rejects(state.fetchRss(SOURCE, OPTIONS), NewsFetchError);
    assert.equal(state.calls.length, 1, location);
    assert.equal(state.dnsCalls.length, 1, location);
  }
});

test('enforces redirect count without downloading redirect bodies', async () => {
  const state = fixture({ responses: [{ status: 308, headers: { location: '/loop' }, noEnd: true }] });
  await rejectsCode(state.fetchRss(SOURCE, { ...OPTIONS, maxRedirects: 2 }), 'TOO_MANY_REDIRECTS');
  assert.equal(state.calls.length, 3);
  assert.equal(state.streams.every((stream) => stream.destroyed), true);
});

test('rejects redirect without destination and unsuccessful source status', async () => {
  for (const status of [301, 302, 303, 307, 308]) {
    const state = fixture({ responses: [{ status }] });
    await rejectsCode(state.fetchRss(SOURCE, OPTIONS), 'INVALID_URL');
  }
  for (const status of [400, 404, 429, 500]) {
    const state = fixture({ responses: [{ status }] });
    await rejectsCode(state.fetchRss(SOURCE, OPTIONS), 'HTTP_STATUS');
    assert.equal(state.streams[0].destroyed, true);
  }
});

test('rejects oversized declared response before consuming a body', async () => {
  const state = fixture({ responses: [{ headers: { 'content-length': '1000000' }, noEnd: true }] });
  await rejectsCode(state.fetchRss(SOURCE, { ...OPTIONS, maxBytes: 32 }), 'RESPONSE_TOO_LARGE');
  assert.equal(state.streams[0].destroyed, true);
  assert.equal(state.requests[0].destroyed, true);
});

test('bounds streamed/chunked data even when Content-Length is missing or dishonest', async () => {
  for (const headers of [{}, { 'content-length': '1' }, { 'transfer-encoding': 'chunked' }]) {
    const state = fixture({ responses: [{ headers, body: (stream) => {
      stream.write(Buffer.alloc(16, 'a'));
      stream.write(Buffer.alloc(16, 'b'));
      stream.write(Buffer.alloc(16, 'c'));
    } }] });
    await rejectsCode(state.fetchRss(SOURCE, { ...OPTIONS, maxBytes: 32 }), 'RESPONSE_TOO_LARGE');
    assert.equal(state.streams[0].destroyed, true);
  }
});

test('size budget counts UTF-8 bytes, preserves split characters and permits the exact limit', async () => {
  const bytes = Buffer.from('新闻');
  const state = fixture({ responses: [{ body: (stream) => { stream.write(bytes.subarray(0, 2)); stream.end(bytes.subarray(2)); } }] });
  assert.equal(await state.fetchRss(SOURCE, { ...OPTIONS, maxBytes: 6 }), '新闻');
  const oversized = fixture({ responses: [{ text: '新闻' }] });
  await rejectsCode(oversized.fetchRss(SOURCE, { ...OPTIONS, maxBytes: 5 }), 'RESPONSE_TOO_LARGE');
});

test('rejects compressed bodies without decoding regardless of their declared size', async () => {
  for (const encoding of ['gzip', 'br', 'deflate', 'identity, gzip', ['identity', 'gzip']]) {
    const state = fixture({ responses: [{ headers: { 'content-encoding': encoding, 'content-length': '1' }, noEnd: true }] });
    await rejectsCode(state.fetchRss(SOURCE, OPTIONS), 'UNSUPPORTED_ENCODING');
    assert.equal(state.streams[0].destroyed, true);
  }
  const identity = fixture({ responses: [{ headers: { 'content-encoding': 'identity' } }] });
  assert.equal(await identity.fetchRss(SOURCE, OPTIONS), XML);
});

test('one total deadline includes stalled DNS and cancels the resolver signal', async () => {
  let resolverSignal;
  const state = fixture({ resolve: (_host, { signal }) => { resolverSignal = signal; return new Promise(() => {}); } });
  await rejectsCode(state.fetchRss(SOURCE, { ...OPTIONS, timeoutMs: 10 }), 'TIMEOUT');
  assert.equal(resolverSignal.aborted, true);
  assert.equal(state.calls.length, 0);
});

test('one total deadline includes stalled connect/TLS/headers and destroys the request', async () => {
  const state = fixture({ responses: [{ noHeaders: true }] });
  await rejectsCode(state.fetchRss(SOURCE, { ...OPTIONS, timeoutMs: 10 }), 'TIMEOUT');
  assert.equal(state.requests[0].destroyed, true);
});

test('one total deadline includes a stalled body and destroys its stream', async () => {
  const state = fixture({ responses: [{ noEnd: true }] });
  await rejectsCode(state.fetchRss(SOURCE, { ...OPTIONS, timeoutMs: 10 }), 'TIMEOUT');
  assert.equal(state.requests[0].destroyed, true);
  assert.equal(state.streams[0].destroyed, true);
});

test('a slow body cannot extend its deadline by sending more chunks', async () => {
  let interval;
  const state = fixture({ responses: [{ body: (stream) => {
    interval = setInterval(() => stream.write('x'), 2);
    stream.on('close', () => clearInterval(interval));
  } }] });
  try {
    await rejectsCode(state.fetchRss(SOURCE, { ...OPTIONS, timeoutMs: 20 }), 'TIMEOUT');
    assert.equal(state.streams[0].destroyed, true);
  } finally { clearInterval(interval); }
});

test('pre-cancelled callers never resolve DNS or create a socket', async () => {
  const controller = new AbortController();
  controller.abort();
  const state = fixture();
  await rejectsCode(state.fetchRss(SOURCE, { ...OPTIONS, signal: controller.signal }), 'ABORTED');
  assert.equal(state.dnsCalls.length, 0);
  assert.equal(state.calls.length, 0);
});

test('caller cancellation interrupts DNS and prevents a later response from opening a socket', async () => {
  const controller = new AbortController();
  let resolveDns;
  const state = fixture({ resolve: () => new Promise((resolve) => { resolveDns = resolve; }) });
  const pending = state.fetchRss(SOURCE, { ...OPTIONS, signal: controller.signal });
  controller.abort();
  await rejectsCode(pending, 'ABORTED');
  resolveDns([PUBLIC_V4]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(state.calls.length, 0);
});

test('caller cancellation interrupts an active response and leaves no later timeout', async () => {
  const controller = new AbortController();
  const state = fixture({ responses: [{ noEnd: true }] });
  const pending = state.fetchRss(SOURCE, { ...OPTIONS, signal: controller.signal });
  await new Promise((resolve) => setImmediate(resolve));
  controller.abort();
  await rejectsCode(pending, 'ABORTED');
  assert.equal(state.requests[0].destroyed, true);
  assert.equal(state.streams[0].destroyed, true);
});

test('request errors, certificate failures and truncated streams reject safely', async () => {
  for (const response of [
    { requestError: Object.assign(new Error('bad cert'), { code: 'CERT_HAS_EXPIRED' }) },
    { throw: new Error('request setup failed') },
    { body: (stream) => stream.destroy(new Error('connection reset')) },
    { body: (stream) => stream.destroy() },
  ]) {
    const state = fixture({ responses: [response] });
    await rejectsCode(state.fetchRss(SOURCE, OPTIONS), 'REQUEST_FAILED');
  }
});

test('requires explicit exact-host allowlist and finite bounded resource settings', async () => {
  for (const options of [{}, { allowedHosts: [] }, { allowedHosts: '*' }, { allowedHosts: ['*.example.com'] },
    { allowedHosts: ['127.0.0.1'] }, { allowedHosts: ['https://feeds.example.com'] },
    { ...OPTIONS, timeoutMs: Infinity }, { ...OPTIONS, timeoutMs: 0 }, { ...OPTIONS, timeoutMs: 15001 },
    { ...OPTIONS, maxBytes: 0 }, { ...OPTIONS, maxBytes: 2 * 1024 * 1024 + 1 },
    { ...OPTIONS, maxRedirects: 4 }, { ...OPTIONS, maxRedirects: -1 }]) {
    const state = fixture();
    await assert.rejects(state.fetchRss(SOURCE, options), NewsFetchError);
    assert.equal(state.calls.length, 0);
  }
});
