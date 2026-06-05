export function getIncomingCaptureParam(search = "") {
  return new URLSearchParams(search).get("capture") || "";
}

export function getUrlWithoutCapture(location = window.location) {
  const params = new URLSearchParams(location.search);
  params.delete("capture");
  const nextQuery = params.toString();
  return `${location.pathname}${nextQuery ? `?${nextQuery}` : ""}${location.hash}`;
}

export function parseCapturePayload(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

export function readCaptureProblems(value) {
  const payload = parseCapturePayload(value);
  return Array.isArray(payload) ? payload : [payload];
}

export function getIncomingProblemCaptureResult(location = window.location) {
  const capture = getIncomingCaptureParam(location.search);
  if (!capture) return { status: "none", problems: [], nextUrl: "" };
  try {
    return {
      status: "ok",
      problems: readCaptureProblems(capture),
      nextUrl: getUrlWithoutCapture(location)
    };
  } catch {
    return {
      status: "error",
      problems: [],
      nextUrl: getUrlWithoutCapture(location)
    };
  }
}

export function parseProblemImportJson(raw) {
  const parsed = JSON.parse(String(raw || ""));
  return Array.isArray(parsed) ? parsed : [parsed];
}

export function getProblemImportResult(raw) {
  try {
    return {
      status: "ok",
      problems: parseProblemImportJson(raw)
    };
  } catch {
    return {
      status: "error",
      problems: []
    };
  }
}

export function writePendingProblemCapture(key, problems, storage = sessionStorage) {
  storage.setItem(key, JSON.stringify(Array.isArray(problems) ? problems : [problems]));
}

export function takePendingProblemCapture(key, storage = sessionStorage) {
  const raw = storage.getItem(key);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return null;
  } finally {
    storage.removeItem(key);
  }
}

export function getPendingProblemCaptureResult(key, storage = sessionStorage) {
  const problems = takePendingProblemCapture(key, storage);
  return problems?.length
    ? { status: "ok", problems }
    : { status: "none", problems: [] };
}
