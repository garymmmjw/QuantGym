import { resolveWengProblem } from './learningStore.mjs';

const RESOURCE_NAMES = ['modules', 'problems-index', 'item-difficulty', 'item-difficulty-v2', 'library', 'practice'];
const MAX_BUSY_RETRIES = 2;

function ensureActive({ signal, isCurrent = () => true }) {
  if (signal?.aborted || !isCurrent()) throw new DOMException('Learning request cancelled.', 'AbortError');
}

function waitForRetry(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      reject(new DOMException('Learning request cancelled.', 'AbortError'));
    };
    const timer = setTimeout(() => { signal?.removeEventListener('abort', abort); resolve(); }, milliseconds);
    if (signal?.aborted) abort();
    else signal?.addEventListener('abort', abort, { once: true });
  });
}

function busyDelay(response) {
  const value = response.headers?.get('Retry-After');
  if (!value) return 2000;
  const seconds = Number(value);
  const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(value) - Date.now();
  // Do not keep a route waiting indefinitely, or retry earlier than a server's
  // longer requested pause. The visible retry action remains available.
  return Number.isFinite(delay) && delay >= 0 && delay <= 10000 ? delay : null;
}

export async function requestLearningContent(name, options) {
  const { token, baseUrl, signal, fetchImpl = globalThis.fetch, waitImpl = waitForRetry } = options;
  if (!RESOURCE_NAMES.includes(name)) throw new Error('Unknown learning resource.');
  if (!token) throw Object.assign(new Error('请先登录。'), { status: 401 });
  for (let attempt = 0; ; attempt++) {
    ensureActive(options);
    const response = await fetchImpl(`${baseUrl}/learning/content/${name}`, {
      headers: { Authorization: `Bearer ${token}` }, credentials: 'omit', cache: 'no-store', signal,
    });
    ensureActive(options);
    if (response.ok) {
      const payload = await response.json();
      ensureActive(options);
      return payload;
    }
    if (response.status === 503 && attempt < MAX_BUSY_RETRIES) {
      const delay = busyDelay(response);
      if (delay !== null) {
        await response.body?.cancel();
        ensureActive(options);
        await waitImpl(delay, signal);
        ensureActive(options);
        continue;
      }
    }
    throw Object.assign(new Error(response.status === 403 ? '学习内容仅向 VIP 会员开放。请重新检查权限。'
      : response.status === 401 ? '登录已过期，请重新登录。' : '学习内容暂时无法读取，请重试。'), { status: response.status });
  }
}

/** The membership gate has already refreshed this session's shared catalog. */
export async function loadLearningSources({ getCatalogProblems, ...options }) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (options.signal?.aborted) abort();
  else options.signal?.addEventListener('abort', abort, { once: true });
  const requestOptions = { ...options, signal: controller.signal };
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < RESOURCE_NAMES.length) {
      ensureActive(requestOptions);
      const index = next++;
      results[index] = await requestLearningContent(RESOURCE_NAMES[index], requestOptions);
    }
  };
  try {
    // Production's 512 MiB service has two ordinary request slots. Avoid a
    // seven-request burst, and never fetch the full problem catalog twice.
    await Promise.all([worker(), worker()].map(promise => promise.catch(error => { abort(); throw error; })));
    ensureActive(requestOptions);
    const [modules, problemsIndex, difficultyV1, difficultyV2, library, practice] = results;
    const records = (getCatalogProblems() || []).filter(record => record.source === 'quantvault');
    const downloadedProblemIds = records.map(record => resolveWengProblem(record, problemsIndex).id);
    return { modules, problemsIndex, difficultyV1, difficultyV2, library, practice, records, downloadedProblemIds };
  } finally {
    abort();
    options.signal?.removeEventListener('abort', abort);
  }
}
