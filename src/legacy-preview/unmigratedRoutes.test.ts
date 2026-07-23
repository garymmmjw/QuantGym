import {
  buildLegacyPreviewUrl,
  LEGACY_PREVIEW_ORIGIN,
  normalizeUnmigratedPathname,
  resolveUnmigratedRoute,
  UNMIGRATED_ROUTES,
} from "./unmigratedRoutes";

const expectedRoutes = [
  ["overview", "/"],
  ["plan", "/plan"],
  ["skills", "/skills"],
  ["league", "/league"],
  ["interview", "/interview"],
  ["problems", "/problems"],
  ["tools", "/tools"],
  ["poker", "/poker"],
  ["experiences", "/experiences"],
  ["news", "/news"],
  ["community", "/community"],
  ["messages", "/messages"],
  ["network", "/network"],
  ["resume", "/resume"],
  ["jobs", "/jobs"],
  ["companies", "/companies"],
  ["library", "/library"],
  ["courses", "/courses"],
  ["memory", "/memory"],
  ["settings", "/settings"],
  ["account", "/account"],
  ["pk", "/pk"],
] as const;

describe("unmigrated route allowlist", () => {
  it("contains exactly the approved 22 unique routes", () => {
    expect(UNMIGRATED_ROUTES.map(({ id, path }) => [id, path])).toEqual(expectedRoutes);
    expect(new Set(UNMIGRATED_ROUTES.map(({ id }) => id))).toHaveLength(22);
    expect(new Set(UNMIGRATED_ROUTES.map(({ path }) => path))).toHaveLength(22);
  });

  it("normalizes only allowlisted pathnames and removes query or fragment data", () => {
    expect(normalizeUnmigratedPathname("/plan/?token=secret#private")).toBe("/plan");
    expect(normalizeUnmigratedPathname("/problems//")).toBe("/problems");
    expect(resolveUnmigratedRoute("/pk?match=private")?.id).toBe("pk");

    for (const rejected of [
      "https://example.com/plan",
      "//example.com/plan",
      "/unknown",
      "/plan/../account",
      "/plan%2f..%2faccount",
      "\\plan",
      "",
      null,
    ]) {
      expect(normalizeUnmigratedPathname(rejected)).toBeNull();
    }
  });

  it("builds URLs from one fixed HTTPS origin and a pathname only", () => {
    expect(LEGACY_PREVIEW_ORIGIN).toBe(
      "https://legacy-compat.quantgym-v2-preview.pages.dev",
    );
    const result = buildLegacyPreviewUrl("/messages?thread=secret#latest");
    expect(result).toBe(`${LEGACY_PREVIEW_ORIGIN}/messages`);

    const url = new URL(result!);
    expect(url.protocol).toBe("https:");
    expect(url.origin).toBe(LEGACY_PREVIEW_ORIGIN);
    expect(url.pathname).toBe("/messages");
    expect(url.search).toBe("");
    expect(url.hash).toBe("");
    expect(buildLegacyPreviewUrl("/not-allowed")).toBeNull();
  });
});
