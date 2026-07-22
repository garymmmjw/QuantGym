import {
  DEFAULT_AUTH_REDIRECT,
  googleAuthErrorFromSearch,
  initialAuthView,
  resetTokenFromFragment,
  safeAuthRedirectPath,
} from "./auth.routing";

describe("auth routing boundaries", () => {
  it("keeps ordinary same-origin paths and queries", () => {
    expect(safeAuthRedirectPath("/practice?mode=mental-math")).toBe(
      "/practice?mode=mental-math",
    );
  });

  it.each([
    null,
    "",
    "dashboard",
    "//evil.example",
    "/foo//bar",
    "/foo\\bar",
    "/foo#section",
    "/foo bar",
    `/foo?${"x".repeat(513)}`,
    "/foo/%",
    "/foo/../bar",
    "/foo/./bar",
    "/foo/%2e%2e/bar",
    "/foo/%252e%252e/bar",
    "/foo/%2f%2fevil.example",
    "/foo/%5cevil.example",
    "/foo/%2e%2e//evil.example",
    "/login",
    "/auth/reset",
  ])("falls back for unsafe redirect %s", (candidate) => {
    expect(safeAuthRedirectPath(candidate)).toBe(DEFAULT_AUTH_REDIRECT);
  });

  it("rejects a path that becomes network-relative during URL normalization", () => {
    expect(safeAuthRedirectPath("/foo/%2e%2e//evil.example")).toBe("/");
  });

  it("reads only bounded reset tokens from the fragment", () => {
    const token = "a".repeat(32);
    expect(resetTokenFromFragment(`#${token}`)).toBe(token);
    expect(resetTokenFromFragment(`#token=${token}`)).toBe(token);
    expect(resetTokenFromFragment("#short")).toBeUndefined();
    expect(resetTokenFromFragment("#%E0%A4%A")).toBeUndefined();
  });

  it("selects only approved authentication views", () => {
    expect(initialAuthView("/login", "?mode=register")).toBe("register");
    expect(initialAuthView("/login", "?mode=forgot")).toBe("forgot");
    expect(initialAuthView("/login", "?mode=admin")).toBe("login");
    expect(initialAuthView("/auth/reset", "?mode=register")).toBe("reset");
  });

  it.each([
    "AUTH_CHALLENGE_RATE_LIMITED",
    "AUTH_SERVICE_UNAVAILABLE",
    "GOOGLE_OAUTH_CAPACITY_LIMITED",
    "GOOGLE_OAUTH_FAILED",
    "GOOGLE_OAUTH_UNAVAILABLE",
  ] as const)("accepts the allowlisted Google UI error %s", (code) => {
    expect(googleAuthErrorFromSearch(`?authError=${code}`)).toBe(code);
  });

  it.each([
    "",
    "?authError=",
    "?authError=UNKNOWN_ERROR",
    "?authError=GOOGLE_OAUTH_FAILED&authError=AUTH_SERVICE_UNAVAILABLE",
  ])("ignores an absent, unknown, or ambiguous Google UI error in %s", (search) => {
    expect(googleAuthErrorFromSearch(search)).toBeUndefined();
  });
});
