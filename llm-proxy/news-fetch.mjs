import { Resolver } from 'node:dns/promises';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';

const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_BYTES = 1024 * 1024;
const MAX_TIMEOUT_MS = 15000;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export class NewsFetchError extends Error {
  constructor(code, message, options) {
    super(message, options);
    this.name = 'NewsFetchError';
    this.code = code;
  }
}

function failure(code, message, cause) {
  return new NewsFetchError(code, message, cause ? { cause } : undefined);
}

function ipv4Number(address) {
  return address.split('.').reduce((value, part) => (value * 256) + Number(part), 0);
}

function inV4Range(value, network, bits) {
  const blockSize = 2 ** (32 - bits);
  return Math.floor(value / blockSize) === Math.floor(ipv4Number(network) / blockSize);
}

function ipv6Number(address) {
  // isIP has already validated the syntax. Expand the dotted tail before ::.
  let expanded = address;
  if (expanded.includes('.')) {
    const colon = expanded.lastIndexOf(':');
    const tail = ipv4Number(expanded.slice(colon + 1));
    expanded = `${expanded.slice(0, colon)}:${Math.floor(tail / 65536).toString(16)}:${(tail % 65536).toString(16)}`;
  }
  const halves = expanded.split('::');
  const left = halves[0] ? halves[0].split(':') : [];
  const right = halves[1] ? halves[1].split(':') : [];
  const groups = halves.length === 1 ? left : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
  return groups.reduce((value, group) => (value << 16n) | BigInt(`0x${group}`), 0n);
}

function inV6Range(value, network, bits) {
  const shift = BigInt(128 - bits);
  return (value >> shift) === (ipv6Number(network) >> shift);
}

/** Public DNS destinations only; special-use and transition ranges fail closed. */
export function isPublicNewsAddress(address) {
  if (typeof address !== 'string' || address.includes('%')) return false;
  const family = isIP(address);
  if (family === 4) {
    const value = ipv4Number(address);
    return ![
      ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
      ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
      ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
      ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4],
    ].some(([network, bits]) => inV4Range(value, network, bits));
  }
  if (family === 6) {
    const value = ipv6Number(address);
    // Requiring global unicast also rejects loopback, ULA, link-local, multicast,
    // IPv4-mapped/compatible addresses and the well-known NAT64 prefixes.
    if (!inV6Range(value, '2000::', 3)) return false;
    // ISATAP embeds an IPv4 tunnel destination in a global-looking address.
    const interfacePrefix = (value >> 32n) & 0xffffffffn;
    if (interfacePrefix === 0x00005efen || interfacePrefix === 0x02005efen) return false;
    return ![
      ['2001::', 23], // IETF protocol assignments, including Teredo and ORCHID.
      ['2001:db8::', 32], // Documentation.
      ['2002::', 16], // 6to4 can embed an otherwise forbidden IPv4 destination.
      ['3ffe::', 16], // Former 6bone space, returned to reserved use.
      ['3fff::', 20], // Documentation.
    ].some(([network, bits]) => inV6Range(value, network, bits));
  }
  return false;
}

function hostname(value) {
  if (typeof value !== 'string') return '';
  const host = value.toLowerCase().replace(/\.$/, '');
  if (host.length > 253 || !host.includes('.') || host.split('.').some((label) => (
    !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)
  ))) return '';
  if (isIP(host) || /(?:^|\.)(?:localhost|local|internal|invalid|test)$/.test(host)
    || host === 'home.arpa' || host.endsWith('.home.arpa')) return '';
  return host;
}

function allowedHostSet(values) {
  if (!(values instanceof Set) && !Array.isArray(values)) {
    throw failure('HOST_NOT_ALLOWED', 'News sources require an explicit hostname allowlist.');
  }
  const allowed = new Set();
  for (const value of values) {
    const host = hostname(value);
    if (!host) throw failure('HOST_NOT_ALLOWED', 'The news hostname allowlist is invalid.');
    allowed.add(host);
  }
  return allowed;
}

function checkedUrl(input, allowedHosts) {
  let url;
  try { url = new URL(input); } catch (cause) { throw failure('INVALID_URL', 'Invalid news source URL.', cause); }
  if (url.protocol !== 'https:' || (url.port && url.port !== '443') || url.username || url.password) {
    throw failure('INVALID_URL', 'News sources require HTTPS on port 443 without credentials.');
  }
  const host = hostname(url.hostname);
  if (!host) throw failure('INVALID_URL', 'News sources require a public DNS hostname.');
  if (!allowedHosts.has(host)) throw failure('HOST_NOT_ALLOWED', 'News source hostname is not allowed.');
  url.hostname = host;
  url.hash = '';
  return url;
}

function abortFailure(signal) {
  return signal.reason instanceof NewsFetchError ? signal.reason : failure('ABORTED', 'News request was cancelled.');
}

function throwIfAborted(signal) {
  if (signal.aborted) throw abortFailure(signal);
}

function withAbort(promise, signal) {
  return new Promise((resolve, reject) => {
    const onAbort = () => {
      signal.removeEventListener('abort', onAbort);
      reject(abortFailure(signal));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) onAbort();
    Promise.resolve(promise).then(resolve, reject).finally(() => signal.removeEventListener('abort', onAbort));
  });
}

async function resolvePublicDns(host, { signal }) {
  const resolver = new Resolver();
  const cancel = () => resolver.cancel();
  signal.addEventListener('abort', cancel, { once: true });
  try {
    throwIfAborted(signal);
    const results = await Promise.allSettled([resolver.resolve4(host), resolver.resolve6(host)]);
    throwIfAborted(signal);
    const addresses = [];
    for (const [index, result] of results.entries()) {
      if (result.status === 'fulfilled') {
        addresses.push(...result.value.map((address) => ({ address, family: index === 0 ? 4 : 6 })));
      } else if (!['ENODATA', 'ENOTFOUND'].includes(result.reason?.code)) {
        throw failure('DNS_FAILED', 'News source DNS lookup failed.', result.reason);
      }
    }
    return addresses;
  } finally {
    signal.removeEventListener('abort', cancel);
  }
}

function positiveInteger(value, fallback, max, name, allowZero = false) {
  const number = value === undefined ? fallback : value;
  if (!Number.isInteger(number) || number < (allowZero ? 0 : 1) || number > max) {
    throw failure('INVALID_OPTIONS', `Invalid news request ${name}.`);
  }
  return number;
}

function receiveResponse(url, address, { request, signal, maxBytes }) {
  return new Promise((resolve, reject) => {
    let req;
    let response;
    let settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      if (error) {
        response?.destroy();
        req?.destroy();
        reject(error);
      } else {
        resolve(result);
      }
    };
    const onAbort = () => finish(abortFailure(signal));
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) { onAbort(); return; }
    try {
      req = request(url, {
        method: 'GET',
        agent: false,
        servername: url.hostname,
        rejectUnauthorized: true,
        maxHeaderSize: 16384,
        headers: {
          Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1',
          'Accept-Encoding': 'identity',
          'User-Agent': 'QuantGym-News/1.0',
        },
        // The socket must use the inspected address, never perform a second DNS
        // lookup. Keeping the URL hostname preserves Host, SNI and cert checks.
        lookup: (_host, options, callback) => {
          if (typeof options === 'function') { callback = options; options = {}; }
          if (signal.aborted) { callback(abortFailure(signal)); return; }
          if (options?.all) callback(null, [address]);
          else callback(null, address.address, address.family);
        },
      }, (incoming) => {
        response = incoming;
        response.on('error', (cause) => finish(failure('REQUEST_FAILED', 'News response failed.', cause)));
        response.on('aborted', () => finish(failure('REQUEST_FAILED', 'News response ended early.')));
        if (settled || signal.aborted) { response.destroy(); onAbort(); return; }
        const status = response.statusCode || 0;
        if (REDIRECT_STATUSES.has(status)) {
          const location = response.headers.location;
          if (typeof location !== 'string' || !location) {
            finish(failure('INVALID_URL', 'News redirect has no valid destination.'));
            return;
          }
          // No redirect body is downloaded. The caller validates the next URL
          // and its complete DNS answer set before opening another socket.
          finish(null, { location });
          response.destroy();
          req?.destroy();
          return;
        }
        if (status < 200 || status >= 300) {
          finish(failure('HTTP_STATUS', 'News source returned an unsuccessful status.'));
          return;
        }
        // Do not transparently decompress attacker-controlled bytes. Feeds must
        // honor identity; compressed replies fail closed, including gzip bombs.
        const encoding = response.headers['content-encoding'];
        if (encoding && (typeof encoding !== 'string' || encoding.trim().toLowerCase() !== 'identity')) {
          finish(failure('UNSUPPORTED_ENCODING', 'Compressed news responses are not accepted.'));
          return;
        }
        const length = response.headers['content-length'];
        if (length !== undefined && (typeof length !== 'string' || !/^\d+$/.test(length) || Number(length) > maxBytes)) {
          finish(failure('RESPONSE_TOO_LARGE', 'News response exceeds the size limit.'));
          return;
        }
        let bytes = 0;
        const chunks = [];
        response.on('data', (data) => {
          if (settled) return;
          const chunk = Buffer.isBuffer(data) ? data : Buffer.from(data);
          bytes += chunk.length;
          if (bytes > maxBytes) {
            finish(failure('RESPONSE_TOO_LARGE', 'News response exceeds the size limit.'));
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () => finish(null, { text: Buffer.concat(chunks, bytes).toString('utf8') }));
        response.on('close', () => {
          if (!settled) finish(failure('REQUEST_FAILED', 'News response ended early.'));
        });
      });
      req.on('error', (cause) => finish(cause instanceof NewsFetchError ? cause : failure('REQUEST_FAILED', 'News request failed.', cause)));
      // The aggregate abort covers DNS, connection, TLS, headers and every body
      // chunk. An idle-only socket timeout would not stop a slow trickle.
      if (settled || signal.aborted) { req.destroy(); onAbort(); return; }
      req.end();
    } catch (cause) {
      finish(cause instanceof NewsFetchError ? cause : failure('REQUEST_FAILED', 'News request failed.', cause));
    }
  });
}

/** Dependency injection is for deterministic tests, never a runtime bypass. */
export function createPublicRssFetcher({ resolve = resolvePublicDns, request = httpsRequest } = {}) {
  return async function fetchRss(input, options = {}) {
    const allowedHosts = allowedHostSet(options.allowedHosts);
    const timeoutMs = positiveInteger(options.timeoutMs, DEFAULT_TIMEOUT_MS, MAX_TIMEOUT_MS, 'timeout');
    const maxBytes = positiveInteger(options.maxBytes, DEFAULT_MAX_BYTES, MAX_RESPONSE_BYTES, 'size limit');
    const maxRedirects = positiveInteger(options.maxRedirects, 3, 3, 'redirect limit', true);
    const controller = new AbortController();
    const { signal } = controller;
    const externalAbort = () => controller.abort(failure('ABORTED', 'News request was cancelled.'));
    options.signal?.addEventListener('abort', externalAbort, { once: true });
    if (options.signal?.aborted) externalAbort();
    const timer = setTimeout(() => controller.abort(failure('TIMEOUT', 'News request timed out.')), timeoutMs);
    try {
      let url = checkedUrl(input, allowedHosts);
      for (let redirects = 0; ; redirects += 1) {
        throwIfAborted(signal);
        let addresses;
        try {
          addresses = await withAbort(resolve(url.hostname, { signal }), signal);
        } catch (cause) {
          throw cause instanceof NewsFetchError ? cause : failure('DNS_FAILED', 'News source DNS lookup failed.', cause);
        }
        throwIfAborted(signal);
        if (!Array.isArray(addresses) || addresses.length === 0) throw failure('DNS_FAILED', 'News source has no DNS addresses.');
        if (addresses.some((entry) => !entry || !isPublicNewsAddress(entry.address) || isIP(entry.address) !== entry.family)) {
          throw failure('UNSAFE_ADDRESS', 'News source resolved to a forbidden address.');
        }
        const result = await receiveResponse(url, { address: addresses[0].address, family: addresses[0].family }, { request, signal, maxBytes });
        if (result.text !== undefined) return result.text;
        if (redirects >= maxRedirects) throw failure('TOO_MANY_REDIRECTS', 'News source redirected too many times.');
        try { url = checkedUrl(new URL(result.location, url), allowedHosts); }
        catch (cause) { throw cause instanceof NewsFetchError ? cause : failure('INVALID_URL', 'Invalid news redirect.', cause); }
      }
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', externalAbort);
    }
  };
}

export const fetchPublicRss = createPublicRssFetcher();
