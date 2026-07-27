import {
  buildProblemTrainingRoute,
  parseProblemTrainingRoute,
} from "./problems.routes";

const problemId = "29584c83-7297-44ef-b985-f38e6c95de76";
const sessionId = "19584c83-7297-44ef-b985-f38e6c95de76";

describe("problem training route handoff", () => {
  it("round-trips the selected problem and acknowledged session", () => {
    const route = buildProblemTrainingRoute({ problemId, sessionId });

    expect(route).toBe(`/problems?problem=${problemId}&session=${sessionId}`);
    expect(parseProblemTrainingRoute(route.split("?")[1] ?? "")).toEqual({
      problemId,
      sessionId,
    });
  });

  it("fails closed for partial, malformed, or duplicate-looking values", () => {
    expect(parseProblemTrainingRoute(`?problem=${problemId}`)).toBeNull();
    expect(parseProblemTrainingRoute("?problem=not-a-uuid&session=also-bad"))
      .toBeNull();
    expect(parseProblemTrainingRoute(
      `?problem=${problemId}&session=${sessionId}&redirect=%2Faccount`,
    )).toBeNull();
    expect(parseProblemTrainingRoute(
      `?problem=${problemId}&problem=${problemId}&session=${sessionId}`,
    )).toBeNull();
    expect(() => buildProblemTrainingRoute({ problemId: "bad", sessionId }))
      .toThrow();
  });
});
