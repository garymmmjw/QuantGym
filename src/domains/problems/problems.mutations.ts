import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { apiRequest } from "../../shared/api/client";
import { createIdempotencyKey } from "../../shared/api/mutationRecovery";
import {
  runOwnerVerifiedOperation,
  verifyCurrentSessionOwner,
} from "../../shared/api/ownerScopedQueries";
import {
  favoriteStateSchema,
  problemIdSchema,
  problemNoteSchema,
  saveProblemNoteInputSchema,
  setProblemFavoriteInputSchema,
  type FavoriteState,
  type ProblemDetail,
  type ProblemListResponse,
  type ProblemNote,
  type ProblemSummary,
  type SaveProblemNoteInput,
  type SetProblemFavoriteInput,
} from "./problems.schema";
import { problemQueryKeys } from "./problems.queries";

type BaseProblemIntent = Readonly<{
  /** Stable local draft/retry identity; Problems does not send this as an API header. */
  idempotencyKey: string;
  problemId: string;
}>;

export type SetProblemFavoriteIntent = BaseProblemIntent & Readonly<{
  expectedStateId: string | null;
  expectedVersion: number | null;
  favorite: boolean;
  kind: "set-favorite";
}>;

export type SaveProblemNoteIntent = BaseProblemIntent & Readonly<{
  body: string;
  expectedVersion: number | null;
  kind: "save-note";
}>;

export type ProblemMutationIntent = SetProblemFavoriteIntent | SaveProblemNoteIntent;

export const newSetProblemFavoriteIntent = (
  problem: Pick<ProblemSummary, "favorite" | "id">,
  favorite: boolean,
): SetProblemFavoriteIntent => ({
  expectedStateId: problem.favorite.stateId,
  expectedVersion: problem.favorite.version,
  favorite,
  idempotencyKey: createIdempotencyKey(),
  kind: "set-favorite",
  problemId: problemIdSchema.parse(problem.id),
});

export const newSaveProblemNoteIntent = (
  problemId: string,
  body: string,
  expectedVersion: number | null,
): SaveProblemNoteIntent => {
  const parsed = saveProblemNoteInputSchema.parse({ body, expectedVersion });
  return {
    body: parsed.body,
    expectedVersion: parsed.expectedVersion ?? null,
    idempotencyKey: createIdempotencyKey(),
    kind: "save-note",
    problemId: problemIdSchema.parse(problemId),
  };
};

export const setProblemFavorite = async (
  intent: SetProblemFavoriteIntent,
  csrfProof: string | null,
  signal?: AbortSignal,
): Promise<FavoriteState> => {
  const problemId = problemIdSchema.parse(intent.problemId);
  const validated = setProblemFavoriteInputSchema.parse({
    ...(intent.expectedStateId === null ? {} : { expectedStateId: intent.expectedStateId }),
    ...(intent.expectedVersion === null ? {} : { expectedVersion: intent.expectedVersion }),
    favorite: intent.favorite,
  });
  const body: SetProblemFavoriteInput = {
    ...(validated.expectedStateId === undefined || validated.expectedStateId === null
      ? {}
      : { expectedStateId: validated.expectedStateId }),
    ...(validated.expectedVersion === undefined || validated.expectedVersion === null
      ? {}
      : { expectedVersion: validated.expectedVersion }),
    favorite: validated.favorite,
  };
  const response = await apiRequest<unknown>(
    `/problems/${encodeURIComponent(problemId)}/favorite`,
    {
      body,
      csrfProof,
      method: "PUT",
      ...(signal === undefined ? {} : { signal }),
    },
  );
  return favoriteStateSchema.parse(response);
};

export const saveProblemNote = async (
  intent: SaveProblemNoteIntent,
  csrfProof: string | null,
  signal?: AbortSignal,
): Promise<ProblemNote> => {
  const problemId = problemIdSchema.parse(intent.problemId);
  const validated = saveProblemNoteInputSchema.parse({
    body: intent.body,
    ...(intent.expectedVersion === null ? {} : { expectedVersion: intent.expectedVersion }),
  });
  const body: SaveProblemNoteInput = {
    body: validated.body,
    ...(validated.expectedVersion === undefined || validated.expectedVersion === null
      ? {}
      : { expectedVersion: validated.expectedVersion }),
  };
  const response = await apiRequest<unknown>(
    `/problems/${encodeURIComponent(problemId)}/note`,
    {
      body,
      csrfProof,
      method: "PUT",
      ...(signal === undefined ? {} : { signal }),
    },
  );
  return problemNoteSchema.parse(response);
};

export const mutateProblem = async (
  intent: ProblemMutationIntent,
  csrfProof: string | null,
  signal?: AbortSignal,
): Promise<FavoriteState | ProblemNote> => {
  switch (intent.kind) {
    case "set-favorite":
      return setProblemFavorite(intent, csrfProof, signal);
    case "save-note":
      return saveProblemNote(intent, csrfProof, signal);
  }
};

const favoriteStateEquals = (left: FavoriteState, right: FavoriteState) => (
  left.favorite === right.favorite
  && left.stateId === right.stateId
  && left.version === right.version
);

const favoriteGenerationMatches = (
  current: FavoriteState,
  intent: SetProblemFavoriteIntent,
) => (
  current.stateId === intent.expectedStateId
  && current.version === intent.expectedVersion
);

const applyFavoriteAcknowledgement = <Problem extends ProblemSummary>(
  problem: Problem,
  intent: SetProblemFavoriteIntent,
  acknowledged: FavoriteState,
): Problem => {
  if (problem.id !== intent.problemId) return problem;
  // The unfavorited state has no server generation. A delayed "add" response
  // therefore cannot distinguish the original state from a later add/remove
  // cycle that returned to the same null generation. Keep the cache as-is and
  // let the invalidated server read model reconcile this ambiguous ABA case.
  if (
    intent.expectedStateId === null
    && intent.expectedVersion === null
    && !favoriteStateEquals(problem.favorite, acknowledged)
  ) {
    return problem;
  }
  if (
    !favoriteGenerationMatches(problem.favorite, intent)
    && !favoriteStateEquals(problem.favorite, acknowledged)
  ) {
    return problem;
  }
  return { ...problem, favorite: acknowledged };
};

export const acknowledgeProblemFavorite = async (
  queryClient: QueryClient,
  ownerScope: string,
  intent: SetProblemFavoriteIntent,
  acknowledged: FavoriteState,
): Promise<void> => {
  queryClient.setQueriesData<ProblemListResponse>(
    { queryKey: problemQueryKeys.lists(ownerScope) },
    (current) => current === undefined
      ? current
      : {
          ...current,
          items: current.items.map((problem) => (
            applyFavoriteAcknowledgement(problem, intent, acknowledged)
          )),
        },
  );
  queryClient.setQueryData<ProblemDetail>(
    problemQueryKeys.detail(ownerScope, intent.problemId),
    (current) => current === undefined
      ? current
      : applyFavoriteAcknowledgement(current, intent, acknowledged),
  );

  // A favorite-filtered page may need to add or remove this row. The local
  // patch keeps unambiguous visible data current while invalidation reconciles
  // membership and null-generation acknowledgements from the server.
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: problemQueryKeys.lists(ownerScope),
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: problemQueryKeys.detail(ownerScope, intent.problemId),
      refetchType: "active",
    }),
  ]);
};

export const invalidateProblemMutationReadModels = async (
  queryClient: QueryClient,
  ownerScope: string,
  problemId: string,
): Promise<void> => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: problemQueryKeys.lists(ownerScope),
      refetchType: "active",
    }),
    queryClient.invalidateQueries({
      queryKey: problemQueryKeys.detail(ownerScope, problemId),
      refetchType: "active",
    }),
  ]);
};

const shouldApplyNoteAcknowledgement = (
  currentVersion: number | null,
  acknowledgedVersion: number,
) => currentVersion === null || currentVersion <= acknowledgedVersion;

export const acknowledgeProblemNote = (
  queryClient: QueryClient,
  ownerScope: string,
  intent: SaveProblemNoteIntent,
  acknowledged: ProblemNote,
): void => {
  queryClient.setQueriesData<ProblemListResponse>(
    { queryKey: problemQueryKeys.lists(ownerScope) },
    (current) => current === undefined
      ? current
      : {
          ...current,
          items: current.items.map((problem) => (
            problem.id !== intent.problemId
            || !shouldApplyNoteAcknowledgement(problem.noteVersion, acknowledged.version)
              ? problem
              : {
                  ...problem,
                  noteExists: true,
                  noteVersion: acknowledged.version,
                }
          )),
        },
  );
  queryClient.setQueryData<ProblemDetail>(
    problemQueryKeys.detail(ownerScope, intent.problemId),
    (current) => current === undefined
      || !shouldApplyNoteAcknowledgement(current.noteVersion, acknowledged.version)
      ? current
      : {
          ...current,
          note: acknowledged,
          noteExists: true,
          noteVersion: acknowledged.version,
        },
  );
};

export type ProblemMutationOptions = Readonly<{
  csrfProof: string | null;
  ownerScope: string;
  verifyOwner?: () => Promise<void>;
}>;

export const useSetProblemFavoriteMutation = ({
  csrfProof,
  ownerScope,
  verifyOwner = () => verifyCurrentSessionOwner(ownerScope),
}: ProblemMutationOptions) => {
  const queryClient = useQueryClient();
  return useMutation<FavoriteState, unknown, SetProblemFavoriteIntent>({
    mutationFn: async (intent) => {
      return runOwnerVerifiedOperation(
        verifyOwner,
        () => setProblemFavorite(intent, csrfProof),
      );
    },
    networkMode: "always",
    mutationKey: ["problems", ownerScope, "favorite"],
    onSuccess: (acknowledged, intent) => (
      acknowledgeProblemFavorite(queryClient, ownerScope, intent, acknowledged)
    ),
    retry: false,
  });
};

export const useSaveProblemNoteMutation = ({
  csrfProof,
  ownerScope,
  verifyOwner = () => verifyCurrentSessionOwner(ownerScope),
}: ProblemMutationOptions) => {
  const queryClient = useQueryClient();
  return useMutation<ProblemNote, unknown, SaveProblemNoteIntent>({
    mutationFn: async (intent) => {
      return runOwnerVerifiedOperation(
        verifyOwner,
        () => saveProblemNote(intent, csrfProof),
      );
    },
    networkMode: "always",
    mutationKey: ["problems", ownerScope, "note"],
    onSuccess: async (acknowledged, intent) => {
      acknowledgeProblemNote(queryClient, ownerScope, intent, acknowledged);
      await invalidateProblemMutationReadModels(
        queryClient,
        ownerScope,
        intent.problemId,
      );
    },
    retry: false,
  });
};
