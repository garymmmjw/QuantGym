import { z } from "zod";

const uuidSchema = z.string().uuid();

export type ProblemTrainingRoute = Readonly<{
  problemId: string;
  sessionId: string;
}>;

export const buildProblemTrainingRoute = ({
  problemId,
  sessionId,
}: ProblemTrainingRoute): string => {
  const search = new URLSearchParams({
    problem: uuidSchema.parse(problemId),
    session: uuidSchema.parse(sessionId),
  });
  return `/problems?${search.toString()}`;
};

export const parseProblemTrainingRoute = (
  search: string | URLSearchParams,
): ProblemTrainingRoute | null => {
  const params = typeof search === "string"
    ? new URLSearchParams(search)
    : search;
  if (
    params.size !== 2
    || params.getAll("problem").length !== 1
    || params.getAll("session").length !== 1
  ) return null;
  const parsed = z.object({
    problemId: uuidSchema,
    sessionId: uuidSchema,
  }).safeParse({
    problemId: params.get("problem"),
    sessionId: params.get("session"),
  });
  return parsed.success ? parsed.data : null;
};
