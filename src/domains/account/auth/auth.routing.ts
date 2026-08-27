import type { AuthMode } from "./EmailAuthForm";
import type { AuthRecoveryPhase } from "./AuthRecovery";

export const DEFAULT_AUTH_REDIRECT = "/";
const GOOGLE_AUTH_ERROR_CODES = [
  "AUTH_CHALLENGE_RATE_LIMITED",
  "AUTH_SERVICE_UNAVAILABLE",
  "GOOGLE_OAUTH_CAPACITY_LIMITED",
  "GOOGLE_OAUTH_FAILED",
  "GOOGLE_OAUTH_UNAVAILABLE",
] as const;
const RESET_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,512}$/u;
const DANGEROUS_PATH_ENCODING_PATTERN = /%(?:2e|2f|5c|25)/iu;
const INVALID_PERCENT_ENCODING_PATTERN = /%(?![0-9a-f]{2})/iu;

const hasUnsafePathSyntax = (pathname: string) => (
  !pathname.startsWith("/")
  || pathname.startsWith("//")
  || pathname.includes("\\")
  || pathname.includes("//")
  || DANGEROUS_PATH_ENCODING_PATTERN.test(pathname)
  || INVALID_PERCENT_ENCODING_PATTERN.test(pathname)
);

const hasControlCharacter = (value: string) => [...value].some((character) => {
  const codePoint = character.codePointAt(0) ?? 0;
  return codePoint < 32 || codePoint === 127;
});

const hasUnsafeDecodedPath = (pathname: string) => (
  pathname.includes("\\")
  || pathname.includes("//")
  || hasControlCharacter(pathname)
  || pathname.split("/").some((segment) => segment === "." || segment === "..")
);

export type GoogleAuthErrorCode = (typeof GOOGLE_AUTH_ERROR_CODES)[number];

export const googleAuthErrorPresentation: Readonly<Record<
  GoogleAuthErrorCode,
  Readonly<{ message: string; title: string }>
>> = {
  AUTH_CHALLENGE_RATE_LIMITED: {
    message: "身份验证请求较多，请稍等片刻后重新尝试。",
    title: "Google 登录暂时繁忙",
  },
  AUTH_SERVICE_UNAVAILABLE: {
    message: "认证服务暂时无法响应，你可以重试 Google 登录或改用邮箱。",
    title: "认证服务暂时不可用",
  },
  GOOGLE_OAUTH_CAPACITY_LIMITED: {
    message: "Google 登录当前较繁忙，请稍后重新尝试或改用邮箱。",
    title: "Google 登录暂时繁忙",
  },
  GOOGLE_OAUTH_FAILED: {
    message: "授权可能已取消或链接已经失效，你可以安全地重新尝试或改用邮箱。",
    title: "Google 登录未完成",
  },
  GOOGLE_OAUTH_UNAVAILABLE: {
    message: "Google 登录暂时无法使用，你可以稍后重试或改用邮箱。",
    title: "Google 登录暂时不可用",
  },
};

export const googleAuthErrorFromSearch = (search: string): GoogleAuthErrorCode | undefined => {
  const candidates = new URLSearchParams(search).getAll("authError");
  if (candidates.length !== 1) return undefined;
  const [candidate] = candidates;
  return GOOGLE_AUTH_ERROR_CODES.find((code) => code === candidate);
};

export const safeAuthRedirectPath = (value: string | null): string => {
  const rawPathname = value?.split("?", 1)[0] ?? "";
  if (
    value === null
    || value.length === 0
    || value.length > 512
    || value.includes("#")
    || /\s/u.test(value)
    || hasControlCharacter(value)
    || hasUnsafePathSyntax(rawPathname)
  ) {
    return DEFAULT_AUTH_REDIRECT;
  }
  try {
    if (hasUnsafeDecodedPath(decodeURIComponent(rawPathname))) {
      return DEFAULT_AUTH_REDIRECT;
    }
    const parsed = new URL(value, window.location.origin);
    if (
      parsed.origin !== window.location.origin
      || parsed.hash.length > 0
      || hasUnsafePathSyntax(parsed.pathname)
    ) {
      return DEFAULT_AUTH_REDIRECT;
    }
    const decodedPathname = decodeURIComponent(parsed.pathname);
    if (hasUnsafeDecodedPath(decodedPathname)) {
      return DEFAULT_AUTH_REDIRECT;
    }
    if (parsed.pathname === "/login" || parsed.pathname === "/auth/reset") {
      return DEFAULT_AUTH_REDIRECT;
    }
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
};

export const resetTokenFromFragment = (hash: string): string | undefined => {
  if (!hash.startsWith("#")) return undefined;
  const fragment = hash.slice(1);
  const candidate = fragment.startsWith("token=")
    ? fragment.slice("token=".length)
    : fragment;
  let decoded: string;
  try {
    decoded = decodeURIComponent(candidate);
  } catch {
    return undefined;
  }
  return RESET_TOKEN_PATTERN.test(decoded) ? decoded : undefined;
};

export const initialAuthView = (
  pathname: string,
  search: string,
): AuthMode | AuthRecoveryPhase => {
  if (pathname === "/auth/reset") return "reset";
  const requested = new URLSearchParams(search).get("mode");
  if (requested === "register" || requested === "forgot") return requested;
  return "login";
};
