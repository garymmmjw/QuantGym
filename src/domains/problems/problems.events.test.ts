import {
  PROBLEM_DRAFT_CHANGED_EVENT,
  publishProblemDraftChanged,
  subscribeProblemDraftChanges,
} from "./problems.events";

describe("problem draft browser notifications", () => {
  it("notifies only the matching owner and stops after unsubscribe", () => {
    const ownerScope = "acct-1234567890abcdef";
    const listener = vi.fn();
    const unrelated = vi.fn();
    const stop = subscribeProblemDraftChanges(ownerScope, listener);
    const stopUnrelated = subscribeProblemDraftChanges(
      "acct-fedcba0987654321",
      unrelated,
    );

    publishProblemDraftChanged(ownerScope);

    expect(listener).toHaveBeenCalledOnce();
    expect(unrelated).not.toHaveBeenCalled();

    stop();
    stopUnrelated();
    publishProblemDraftChanged(ownerScope);

    expect(listener).toHaveBeenCalledOnce();
  });

  it("uses a stable local event name", () => {
    expect(PROBLEM_DRAFT_CHANGED_EVENT).toBe("qg-v2-problem-draft-changed");
  });
});
