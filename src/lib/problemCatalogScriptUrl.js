/** A release must not reuse the previous same-origin catalog's browser cache. */
export function versionProblemCatalogScript(source, buildCommit, pageUrl) {
  const script = String(source || "").trim();
  const version = String(buildCommit || "").trim();
  if (!script || !version) return script;
  try {
    const page = new URL(pageUrl);
    const url = new URL(script, page);
    if (!/^https?:$/.test(url.protocol) || url.origin !== page.origin) return script;
    url.searchParams.set("build", version);
    return script.startsWith("/") && !script.startsWith("//")
      ? `${url.pathname}${url.search}${url.hash}`
      : url.href;
  } catch {
    return script;
  }
}
