import { z } from "zod";

import type {
  ProblemDifficulty,
  ProblemListFilters,
  ProblemStatus,
} from "../../../domains/problems/problems.schema";

const uuidSchema = z.string().uuid();
const sourceSchema = z.string()
  .trim()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9][a-z0-9-]*$/u);
const querySchema = z.string().trim().min(1).max(120);
const cursorSchema = z.string().trim().min(1).max(512);

export type ProblemsView = "all" | "daily" | "hot100" | "saved";

export type ProblemsLocationState = Readonly<{
  cursor: string | null;
  difficulty: ProblemDifficulty | null;
  problemId: string | null;
  q: string;
  sessionId: string | null;
  source: string | null;
  status: ProblemStatus | null;
  taskId: string | null;
  view: ProblemsView;
}>;

export type ParsedProblemsLocation = Readonly<{
  invalid: boolean;
  state: ProblemsLocationState;
}>;

export const EMPTY_PROBLEMS_LOCATION: ProblemsLocationState = Object.freeze({
  cursor: null,
  difficulty: null,
  problemId: null,
  q: "",
  sessionId: null,
  source: null,
  status: null,
  taskId: null,
  view: "all",
});

type KnownProblemsSearchKey =
  | "cursor"
  | "daily"
  | "difficulty"
  | "favorite"
  | "hot100"
  | "problem"
  | "q"
  | "session"
  | "source"
  | "status"
  | "task";

const exactlyOne = (
  params: URLSearchParams,
  key: KnownProblemsSearchKey,
): string | null | undefined => {
  const values = params.getAll(key);
  if (values.length === 0) return undefined;
  return values.length === 1 ? values[0] ?? null : null;
};

const parseOptional = <Value>(
  raw: string | null | undefined,
  schema: z.ZodType<Value>,
): Readonly<{ invalid: boolean; value: Value | null }> => {
  if (raw === undefined || raw === "") return { invalid: false, value: null };
  if (raw === null) return { invalid: true, value: null };
  const parsed = schema.safeParse(raw);
  return parsed.success
    ? { invalid: false, value: parsed.data }
    : { invalid: true, value: null };
};

const parseFlag = (
  raw: string | null | undefined,
): Readonly<{ active: boolean; invalid: boolean }> => {
  if (raw === undefined) return { active: false, invalid: false };
  return raw === "true"
    ? { active: true, invalid: false }
    : { active: false, invalid: true };
};

export const parseProblemsLocation = (
  search: string | URLSearchParams,
): ParsedProblemsLocation => {
  const params = typeof search === "string"
    ? new URLSearchParams(search)
    : new URLSearchParams(search);
  const q = parseOptional(exactlyOne(params, "q"), querySchema);
  const source = parseOptional(exactlyOne(params, "source"), sourceSchema);
  const difficulty = parseOptional(
    exactlyOne(params, "difficulty"),
    z.enum(["Easy", "Medium", "Hard"]),
  );
  const status = parseOptional(
    exactlyOne(params, "status"),
    z.enum(["unstarted", "in_progress", "completed"]),
  );
  const cursor = parseOptional(exactlyOne(params, "cursor"), cursorSchema);
  const problem = parseOptional(exactlyOne(params, "problem"), uuidSchema);
  const session = parseOptional(exactlyOne(params, "session"), uuidSchema);
  const task = parseOptional(exactlyOne(params, "task"), uuidSchema);
  const favorite = parseFlag(exactlyOne(params, "favorite"));
  const hot100 = parseFlag(exactlyOne(params, "hot100"));
  const daily = parseFlag(exactlyOne(params, "daily"));
  const activeViews = [
    favorite.active ? "saved" : null,
    hot100.active ? "hot100" : null,
    daily.active ? "daily" : null,
  ].filter((value): value is Exclude<ProblemsView, "all"> => value !== null);
  const sessionShapeInvalid = (
    (session.value !== null && problem.value === null)
    || (task.value !== null && session.value === null)
  );
  const invalid = [
    q,
    source,
    difficulty,
    status,
    cursor,
    problem,
    session,
    task,
  ].some(({ invalid: fieldInvalid }) => fieldInvalid)
    || favorite.invalid
    || hot100.invalid
    || daily.invalid
    || activeViews.length > 1
    || sessionShapeInvalid;

  return {
    invalid,
    state: {
      cursor: cursor.value,
      difficulty: difficulty.value,
      problemId: sessionShapeInvalid ? null : problem.value,
      q: q.value ?? "",
      sessionId: sessionShapeInvalid ? null : session.value,
      source: source.value,
      status: status.value,
      taskId: sessionShapeInvalid ? null : task.value,
      view: activeViews.length === 1 ? activeViews[0] ?? "all" : "all",
    },
  };
};

export const buildProblemsSearch = (
  state: ProblemsLocationState,
): string => {
  const params = new URLSearchParams();
  if (state.q.trim() !== "") params.set("q", querySchema.parse(state.q));
  if (state.source !== null) params.set("source", sourceSchema.parse(state.source));
  if (state.difficulty !== null) params.set("difficulty", state.difficulty);
  if (state.status !== null) params.set("status", state.status);
  if (state.view === "saved") params.set("favorite", "true");
  if (state.view === "hot100") params.set("hot100", "true");
  if (state.view === "daily") params.set("daily", "true");
  if (state.cursor !== null) params.set("cursor", cursorSchema.parse(state.cursor));
  if (state.problemId !== null) params.set("problem", uuidSchema.parse(state.problemId));
  if (state.sessionId !== null) params.set("session", uuidSchema.parse(state.sessionId));
  if (state.taskId !== null) params.set("task", uuidSchema.parse(state.taskId));
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
};

export const problemListFiltersFromLocation = (
  state: ProblemsLocationState,
): ProblemListFilters => ({
  ...(state.cursor === null ? {} : { cursor: state.cursor }),
  ...(state.difficulty === null ? {} : { difficulty: state.difficulty }),
  ...(state.q === "" ? {} : { q: state.q }),
  ...(state.source === null ? {} : { source: state.source }),
  ...(state.status === null ? {} : { status: state.status }),
  ...(state.view === "daily" ? { daily: true } : {}),
  ...(state.view === "saved" ? { favorite: true } : {}),
  ...(state.view === "hot100" ? { hot100: true } : {}),
  limit: 50,
});

export const replaceProblemsSelection = (
  state: ProblemsLocationState,
  selection: Readonly<{
    problemId: string | null;
    sessionId?: string | null;
    taskId?: string | null;
  }>,
): ProblemsLocationState => ({
  ...state,
  problemId: selection.problemId,
  sessionId: selection.problemId === null ? null : selection.sessionId ?? null,
  taskId: selection.problemId === null ? null : selection.taskId ?? null,
});

export const replaceProblemsFilters = (
  state: ProblemsLocationState,
  filters: Readonly<{
    difficulty: ProblemDifficulty | null;
    q: string;
    source: string | null;
    status: ProblemStatus | null;
    view: ProblemsView;
  }>,
): ProblemsLocationState => ({
  ...state,
  cursor: null,
  difficulty: filters.difficulty,
  problemId: null,
  q: filters.q.trim(),
  sessionId: null,
  source: filters.source,
  status: filters.status,
  taskId: null,
  view: filters.view,
});

export const activeProblemsFilterCount = (
  state: ProblemsLocationState,
): number => [
  state.q !== "",
  state.source !== null,
  state.difficulty !== null,
  state.status !== null,
  state.view !== "all",
].filter(Boolean).length;
