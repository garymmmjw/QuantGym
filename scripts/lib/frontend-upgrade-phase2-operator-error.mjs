const SAFE_FAILURE_CODE_PATTERN = /^[A-Z][A-Z0-9_]{2,127}$/u;
const SAFE_FAILURE_PHASE_PATTERN = /^[a-z][a-z0-9-]{1,63}$/u;
const OPERATOR_FAILURE_CAUSES = new WeakMap();

const clean = (value) => typeof value === "string" ? value.trim() : "";

export class Phase2OperatorError extends Error {
  constructor(code, phase) {
    const normalizedCode = clean(code);
    const normalizedPhase = clean(phase);
    if (
      !SAFE_FAILURE_CODE_PATTERN.test(normalizedCode)
      || !SAFE_FAILURE_PHASE_PATTERN.test(normalizedPhase)
    ) throw new Error("invalid Phase 2 operator failure");
    super(`${normalizedCode} (${normalizedPhase})`);
    this.name = "Phase2OperatorError";
    this.code = normalizedCode;
    this.phase = normalizedPhase;
    OPERATOR_FAILURE_CAUSES.set(this, Object.freeze({
      code: normalizedCode,
      phase: normalizedPhase,
    }));
  }
}

export const readPhase2OperatorFailureCause = (error) => {
  try {
    const cause = OPERATOR_FAILURE_CAUSES.get(error);
    return cause === undefined ? null : { ...cause };
  } catch {
    return null;
  }
};
