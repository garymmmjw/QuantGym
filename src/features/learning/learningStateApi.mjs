import { reportCloudSessionResponse } from '../../state/cloudSessionStatus.js';

/** Capture credentials for this session; a 409 is reconciled by the sync engine. */
export function createLearningStateApi({ userId, token, baseUrl, signal, isActive = () => true, fetchImpl = globalThis.fetch }) {
  const config = { userId, token, endpoint: String(baseUrl).replace(/\/+$/, '') };
  const ensureActive = () => {
    if (signal?.aborted || !isActive()) throw new DOMException('学习账号已切换。', 'AbortError');
    if (!userId || !token) throw new Error('请先登录云端账号。');
  };
  async function request(method, body) {
    ensureActive();
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(abort, 20000);
    try {
      const response = await fetchImpl(`${config.endpoint}/learning/state`, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        credentials: 'omit', cache: 'no-store', signal: controller.signal,
      });
      ensureActive();
      reportCloudSessionResponse(config, response.status);
      const payload = await response.json().catch(() => null);
      ensureActive();
      if (response.status === 409 && payload) return { ...payload, status: 409 };
      if (!response.ok || !payload) throw Object.assign(new Error(response.status === 401
        ? '登录已过期，请重新登录后同步。'
        : response.status === 413 ? '学习档案已超过云端容量限制，请联系管理员。'
          : '云端学习档案暂时无法保存或读取，请稍后重试。'), { status: response.status });
      return payload;
    } catch (error) {
      ensureActive();
      if (controller.signal.aborted) throw new Error('同步超时，尚未确认保存。请保持页面并重试。');
      throw error;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
    }
  }
  return { load: () => request('GET'), save: body => request('PUT', body) };
}
