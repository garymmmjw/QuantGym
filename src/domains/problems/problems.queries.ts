import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiRequest } from "../../shared/api/client";
import { runOwnerScopedQuery } from "../../shared/api/ownerScopedQueries";
import {
  problemDetailSchema,
  problemIdSchema,
  problemListFiltersSchema,
  problemListResponseSchema,
  type ProblemDetail,
  type ProblemDifficulty,
  type ProblemListFilters,
  type ProblemListResponse,
  type ProblemStatus,
} from "./problems.schema";

export type NormalizedProblemListFilters = Readonly<{
  cursor: string | null;
  daily: boolean;
  difficulty: ProblemDifficulty | null;
  favorite: boolean | null;
  hot100: boolean | null;
  limit: number;
  q: string | null;
  source: string | null;
  status: ProblemStatus | null;
}>;

export const normalizeProblemListFilters = (
  filters: ProblemListFilters = {},
): NormalizedProblemListFilters => {
  const parsed = problemListFiltersSchema.parse(filters);
  return {
    cursor: parsed.cursor ?? null,
    daily: parsed.daily ?? false,
    difficulty: parsed.difficulty ?? null,
    favorite: parsed.favorite ?? null,
    hot100: parsed.hot100 ?? null,
    limit: parsed.limit ?? 20,
    q: parsed.q ?? null,
    source: parsed.source ?? null,
    status: parsed.status ?? null,
  };
};

export const problemQueryKeys = {
  all: ["problems"] as const,
  forOwner: (ownerScope: string) => ["problems", ownerScope] as const,
  lists: (ownerScope: string) => ["problems", ownerScope, "list"] as const,
  list: (ownerScope: string, filters: ProblemListFilters = {}) => (
    ["problems", ownerScope, "list", normalizeProblemListFilters(filters)] as const
  ),
  details: (ownerScope: string) => ["problems", ownerScope, "detail"] as const,
  detail: (ownerScope: string, problemId: string) => (
    ["problems", ownerScope, "detail", problemIdSchema.parse(problemId)] as const
  ),
} as const;

const problemsPath = (filters: NormalizedProblemListFilters): string => {
  const search = new URLSearchParams();
  if (filters.q !== null) search.set("q", filters.q);
  if (filters.source !== null) search.set("source", filters.source);
  if (filters.difficulty !== null) search.set("difficulty", filters.difficulty);
  if (filters.status !== null) search.set("status", filters.status);
  if (filters.favorite !== null) search.set("favorite", String(filters.favorite));
  if (filters.hot100 !== null) search.set("hot100", String(filters.hot100));
  if (filters.daily) search.set("daily", "true");
  if (filters.cursor !== null) search.set("cursor", filters.cursor);
  if (filters.limit !== 20) search.set("limit", String(filters.limit));
  const query = search.toString();
  return query.length === 0 ? "/problems" : `/problems?${query}`;
};

export const getProblems = async (
  filters: ProblemListFilters = {},
  signal?: AbortSignal,
): Promise<ProblemListResponse> => {
  const response = await apiRequest<unknown>(problemsPath(normalizeProblemListFilters(filters)), {
    ...(signal === undefined ? {} : { signal }),
  });
  return problemListResponseSchema.parse(response);
};

export const getProblem = async (
  problemId: string,
  signal?: AbortSignal,
): Promise<ProblemDetail> => {
  const validatedId = problemIdSchema.parse(problemId);
  const response = await apiRequest<unknown>(`/problems/${encodeURIComponent(validatedId)}`, {
    ...(signal === undefined ? {} : { signal }),
  });
  return problemDetailSchema.parse(response);
};

export type ProblemsQueryOptions = Readonly<{
  enabled?: boolean;
  filters?: ProblemListFilters;
  ownerScope: string;
}>;

export const problemsQueryOptions = ({
  enabled = true,
  filters = {},
  ownerScope,
}: ProblemsQueryOptions) => queryOptions({
  enabled,
  queryFn: ({ signal }) => runOwnerScopedQuery(
    ownerScope,
    () => getProblems(filters, signal),
    signal,
  ),
  queryKey: problemQueryKeys.list(ownerScope, filters),
});

export const useProblemsQuery = (options: ProblemsQueryOptions) => (
  useQuery(problemsQueryOptions(options))
);

export type ProblemDetailQueryOptions = Readonly<{
  enabled?: boolean;
  ownerScope: string;
  problemId: string;
}>;

export const problemDetailQueryOptions = ({
  enabled = true,
  ownerScope,
  problemId,
}: ProblemDetailQueryOptions) => queryOptions({
  enabled,
  queryFn: ({ signal }) => runOwnerScopedQuery(
    ownerScope,
    () => getProblem(problemId, signal),
    signal,
  ),
  queryKey: problemQueryKeys.detail(ownerScope, problemId),
});

export const useProblemDetailQuery = (options: ProblemDetailQueryOptions) => (
  useQuery(problemDetailQueryOptions(options))
);
