import {
  activeProblemsFilterCount,
  buildProblemsSearch,
  EMPTY_PROBLEMS_LOCATION,
  parseProblemsLocation,
  problemListFiltersFromLocation,
  replaceProblemsFilters,
  replaceProblemsSelection,
} from "./problemsPage.model";

const problemId = "11111111-1111-4111-8111-111111111111";
const sessionId = "22222222-2222-4222-8222-222222222222";
const taskId = "33333333-3333-4333-8333-333333333333";

describe("Problems page URL model", () => {
  it("round-trips canonical filters and a training handoff", () => {
    const search = buildProblemsSearch({
      cursor: "next-page",
      difficulty: "Medium",
      problemId,
      q: "conditional expectation",
      sessionId,
      source: "preview-safe",
      status: "in_progress",
      taskId,
      view: "hot100",
    });

    expect(search).toBe(
      "?q=conditional+expectation&source=preview-safe&difficulty=Medium"
      + "&status=in_progress&hot100=true&cursor=next-page"
      + `&problem=${problemId}&session=${sessionId}&task=${taskId}`,
    );
    expect(parseProblemsLocation(search)).toEqual({
      invalid: false,
      state: {
        cursor: "next-page",
        difficulty: "Medium",
        problemId,
        q: "conditional expectation",
        sessionId,
        source: "preview-safe",
        status: "in_progress",
        taskId,
        view: "hot100",
      },
    });
  });

  it("fails malformed, duplicate, conflicting, and detached session state closed", () => {
    for (const search of [
      `?problem=bad&session=${sessionId}`,
      `?problem=${problemId}&problem=${problemId}`,
      "?favorite=true&hot100=true",
      `?session=${sessionId}`,
      `?problem=${problemId}&task=${taskId}`,
      "?source=%2Faccount",
    ]) {
      expect(parseProblemsLocation(search).invalid).toBe(true);
    }
  });

  it("maps URL state to the exact server filters", () => {
    expect(problemListFiltersFromLocation({
      ...EMPTY_PROBLEMS_LOCATION,
      difficulty: "Hard",
      q: "matrix",
      source: "safe-source",
      status: "completed",
      view: "saved",
    })).toEqual({
      difficulty: "Hard",
      favorite: true,
      limit: 50,
      q: "matrix",
      source: "safe-source",
      status: "completed",
    });
  });

  it("changes filters or selection without retaining incompatible training state", () => {
    const selected = replaceProblemsSelection(EMPTY_PROBLEMS_LOCATION, {
      problemId,
      sessionId,
      taskId,
    });
    expect(replaceProblemsSelection(selected, { problemId: null })).toEqual(
      EMPTY_PROBLEMS_LOCATION,
    );

    const filtered = replaceProblemsFilters(selected, {
      difficulty: "Easy",
      q: "  dice  ",
      source: null,
      status: null,
      view: "daily",
    });
    expect(filtered).toEqual({
      ...EMPTY_PROBLEMS_LOCATION,
      difficulty: "Easy",
      q: "dice",
      view: "daily",
    });
    expect(activeProblemsFilterCount(filtered)).toBe(3);
  });
});
