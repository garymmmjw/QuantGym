import { createHash } from "node:crypto";

const canonicalizeJson = (value) => {
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalizeJson(value[key])]),
  );
};

function canonicalJsonSha256(value) {
  const canonicalJson = JSON.stringify(canonicalizeJson(value));
  return createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

export function validateDesignSystemContract(contract = {}) {
  const failures = [];
  const exact = (actual, expected, label) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) failures.push(`${label} mismatch`);
  };
  if (contract.version !== 1) failures.push("design contract version must be 1");
  if (contract.themes?.light?.actionPrimary !== "#5b5ff5") failures.push("light actionPrimary mismatch");
  if (contract.themes?.dark?.actionPrimary !== "#7d7bff") failures.push("dark actionPrimary mismatch");
  if (contract.typography?.ui !== "Plus Jakarta Sans") failures.push("UI type family mismatch");
  if (contract.typography?.metrics !== "Space Grotesk") failures.push("metric type family mismatch");
  exact(contract.shape?.radiusPx, [11, 14, 16, 20, 28], "radius scale");
  exact(contract.motion?.microMs, [120, 180], "micro motion range");
  exact(contract.motion?.panelMs, [240, 300], "panel motion range");
  exact((contract.viewports || []).map(({ id, width, height }) => ({ id, width, height })), [
    { id: "desktop", width: 1440, height: 900 },
    { id: "laptop", width: 1280, height: 720 },
    { id: "mobile", width: 390, height: 844 },
    { id: "tablet", width: 1024, height: 768 },
  ], "viewports");
  exact(contract.requiredStates, [
    "loading", "ready", "empty", "error", "disabled", "focus", "active", "reward", "reduced-motion",
  ], "required states");
  exact(contract.routeRecoveryStates, [
    "loading", "empty", "recoverable-error", "non-recoverable-error", "offline-draft",
    "permission-denied", "stale-version-conflict", "retry",
  ], "route recovery states");
  exact(contract.aiJobStates, [
    "queued", "running", "streaming", "completed", "failed", "cancelled", "retry",
  ], "AI job states");
  exact(contract.allowedDeviationReasons, [
    "real-data-density", "accessibility", "performance", "small-screen-usability",
  ], "deviation reasons");
  for (const token of contract.semanticTokens || []) {
    if (/^(?:purple|blue|gray|red|green)-\d+$/i.test(token)) failures.push(`semantic token cannot be raw palette: ${token}`);
  }
  if (contract.motion?.reducedMotionRequired !== true) failures.push("reduced motion is required");
  if (contract.motion?.scrollJackingAllowed !== false) failures.push("scroll jacking must be disabled");
  if (canonicalJsonSha256(contract) !== "aae0b65079c600f6448511af04049d645d3acbd392567e8f00368c3010a1bee7") {
    failures.push("complete approved design-system contract hash mismatch");
  }
  return failures;
}
