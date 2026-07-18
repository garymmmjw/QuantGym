const CSRF_COOKIE_NAME = "__Host-qg_csrf";
let fallbackCsrfToken: string | null = null;

const validateToken = (token: string, errorCode: string) => {
  if (!/^[A-Za-z0-9_-]{16,512}$/.test(token)) {
    throw new Error(errorCode);
  }
  return token;
};

export const rememberCsrfToken = (token: string) => {
  fallbackCsrfToken = validateToken(token, "CSRF_TOKEN_INVALID");
};

export const readCsrfToken = () => {
  if (typeof document === "undefined") return fallbackCsrfToken;

  let cookieHeader: string;
  try {
    cookieHeader = document.cookie;
  } catch {
    throw new Error("CSRF_COOKIE_UNAVAILABLE");
  }

  const matchingValues = cookieHeader.split(";").flatMap((cookiePart) => {
    const separator = cookiePart.indexOf("=");
    if (separator < 0) return [];
    const name = cookiePart.slice(0, separator).trim();
    if (name !== CSRF_COOKIE_NAME) return [];
    return [cookiePart.slice(separator + 1)];
  });
  if (matchingValues.length === 0) return null;
  if (matchingValues.length !== 1) throw new Error("CSRF_COOKIE_INVALID");

  try {
    return validateToken(decodeURIComponent(matchingValues[0] ?? ""), "CSRF_COOKIE_INVALID");
  } catch (error) {
    if (error instanceof Error && error.message === "CSRF_COOKIE_INVALID") throw error;
    throw new Error("CSRF_COOKIE_INVALID", { cause: error });
  }
};

export const forgetCsrfToken = () => {
  fallbackCsrfToken = null;
};
