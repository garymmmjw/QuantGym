import { DEFAULT_CLOUD_API_ENDPOINT } from "../../constants.js";

export const MEMBERSHIP_CHANGED_EVENT = "quantgym:membership-changed";

export function membershipConnection(config = {}, userId = "") {
  return {
    connected: Boolean(userId && config.token && config.userId === userId),
    token: config.token || "",
    baseUrl: String(config.endpoint || DEFAULT_CLOUD_API_ENDPOINT).trim().replace(/\/+$/, "")
  };
}

export async function membershipRequest(path, { token, baseUrl = DEFAULT_CLOUD_API_ENDPOINT, method = "GET", body, signal } = {}) {
  if (!token) throw Object.assign(new Error("请先登录云端账户。 / Sign in with a cloud account."), { status: 401 });
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(abort, 15000);
  try {
    const response = await fetch(`${String(baseUrl).replace(/\/+$/, "")}${path}`, {
      method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      cache: "no-store", credentials: "omit", signal: controller.signal
    });
    const payload = await response.json();
    if (!response.ok) throw Object.assign(new Error(response.status === 403
      ? "仅管理员可以管理会员邮箱。 / Only administrators can manage membership emails."
      : response.status === 401 ? "登录已过期，请重新登录。 / Your session expired. Sign in again."
      : response.status === 400 ? "请填写有效的邮箱地址。 / Enter a valid email address."
      : "会员信息读取失败，请重试。 / Could not load membership information. Try again."), { status: response.status });
    return payload;
  } catch (error) {
    if (controller.signal.aborted && !signal?.aborted) throw new Error("连接超时，请重试。 / The connection timed out. Try again.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

export function notifyMembershipChanged() {
  globalThis.window?.dispatchEvent(new Event(MEMBERSHIP_CHANGED_EVENT));
}
