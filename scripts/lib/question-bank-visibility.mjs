export function explicitProblemVisibility(problem) {
  return String(problem?.visibility || "").trim().toLowerCase();
}

export function selectExplicitlyPublicProblems(problems = []) {
  return (Array.isArray(problems) ? problems : []).filter((problem) => (
    explicitProblemVisibility(problem) === "public"
  ));
}

export function selectReleaseProblems(problems = [], approvedSourceSlugs = new Set()) {
  const approved = approvedSourceSlugs instanceof Set
    ? approvedSourceSlugs
    : new Set(Array.isArray(approvedSourceSlugs) ? approvedSourceSlugs : []);
  return selectExplicitlyPublicProblems(problems).filter((problem) => (
    approved.has(String(problem?.source || "").trim())
  ));
}

export function assertExplicitlyPublicProblems(problems = [], label = "problem catalog") {
  const nonPublic = (Array.isArray(problems) ? problems : []).filter((problem) => (
    explicitProblemVisibility(problem) !== "public"
  ));
  if (nonPublic.length) {
    const sampleIds = nonPublic
      .slice(0, 5)
      .map((problem) => String(problem?.id || "<missing-id>"))
      .join(", ");
    throw new Error(`${label} contains ${nonPublic.length} non-public problem(s): ${sampleIds}`);
  }
  return problems;
}
