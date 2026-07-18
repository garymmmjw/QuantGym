import { readCsrfToken } from "./csrf";
import { ApiError, isApiErrorEnvelope } from "./errors";

const API_BASE = "/api/v2";
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type ApiRequestOptions = Readonly<{
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
}>;

const normalizePath = (value: string) => {
  const rawPath = value.split("?", 1)[0] ?? "";
  let decodedSegments: string[];
  try {
    decodedSegments = rawPath.split("/").map((segment) => decodeURIComponent(segment));
  } catch {
    throw new Error("API_PATH_INVALID");
  }
  if (
    !value.startsWith("/")
    || value.startsWith("//")
    || rawPath.includes("\\")
    || /%2f|%5c/i.test(rawPath)
    || rawPath.includes("//")
    || decodedSegments.some((segment) => segment === "." || segment === "..")
    || value.includes("#")
    || [...value].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint <= 0x20 || codePoint === 0x7f;
    })
  ) {
    throw new Error("API_PATH_INVALID");
  }
  const parsed = new URL(value, "https://quantgym.invalid");
  if (
    parsed.origin !== "https://quantgym.invalid"
    || parsed.pathname.includes("//")
    || parsed.pathname.split("/").some((segment) => segment === "." || segment === "..")
  ) {
    throw new Error("API_PATH_INVALID");
  }
  return `${parsed.pathname}${parsed.search}`;
};

const readResponsePayload = async (response: Response): Promise<unknown> => {
  if (response.status === 204) return null;
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return await response.json() as unknown;
  } catch {
    throw new ApiError({
      code: "API_RESPONSE_INVALID",
      message: "服务返回了无法识别的数据，请稍后重试。",
      requestId: response.headers.get("x-request-id"),
      status: response.status,
    });
  }
};

export const apiRequest = async <ResponseBody>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ResponseBody> => {
  const method = options.method ?? "GET";
  const headers = new Headers(options.headers);
  headers.delete("Authorization");
  headers.delete("Cookie");
  headers.delete("X-QuantGym-Edge-Token");
  headers.delete("Forwarded");
  headers.delete("X-Forwarded-For");
  headers.delete("X-Forwarded-Host");
  headers.delete("X-Forwarded-Proto");
  headers.delete("X-CSRF-Token");
  headers.set("Accept", "application/json");

  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (STATE_CHANGING_METHODS.has(method)) {
    const csrfToken = readCsrfToken();
    if (csrfToken === null) throw new Error("CSRF_TOKEN_REQUIRED");
    headers.set("X-CSRF-Token", csrfToken);
  }

  const init: RequestInit = {
    method,
    headers,
    credentials: "include",
    cache: "no-store",
    redirect: "manual",
  };
  if (options.body !== undefined) init.body = JSON.stringify(options.body);
  if (options.signal !== undefined) init.signal = options.signal;

  const response = await fetch(`${API_BASE}${normalizePath(path)}`, init);
  const payload = await readResponsePayload(response);

  if (!response.ok) {
    const requestId = response.headers.get("x-request-id");
    if (isApiErrorEnvelope(payload)) {
      throw new ApiError({
        code: payload.error.code,
        message: payload.error.message,
        requestId: payload.requestId,
        status: response.status,
      });
    }
    throw new ApiError({
      code: "API_REQUEST_FAILED",
      message: "请求暂时无法完成，请稍后重试。",
      requestId,
      status: response.status,
    });
  }

  return payload as ResponseBody;
};
