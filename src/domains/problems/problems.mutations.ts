import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import { apiRequest } from "../../shared/api/client";
import { createIdempotencyKey } from "../../shared/api/mutationRecovery";
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
    },
  );
  return favoriteStateSchema.parse(response);
};

export const saveProblemNote = async (
  intent: SaveProblemNoteIntent,
  csrfProof: string | null,
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
    },
  );
  return problemNoteSchema.parse(response);
};

export const mutateProblem = async (
  intent: ProblemMutationIntent,
  csrfProof: string | null,
): Promise<FavoriteState | ProblemNote> => {
  switch (intent.kind) {
    case "set-favorite":
      return setProblemFavorite(intent, csrfProof);
    case "save-note":
      return saveProblemNote(intent, csrfProof);
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
  // patch keeps visible data current while invalidation reconciles membership.
  await queryClient.invalidateQueries({
    queryKey: problemQueryKeys.lists(ownerScope),
    refetchType: "active",
  });
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

const noOpOwnerVerification = async (): Promise<void> => undefined;

export type ProblemMutationOptions = Readonly<{
  csrfProof: string | null;
  ownerScope: string;
  verifyOwner?: () => Promise<void>;
}>;

export const useSetProblemFavoriteMutation = ({
  csrfProof,
  ownerScope,
  verifyOwner = noOpOwnerVerification,
}: ProblemMutationOptions) => {
  const queryClient = useQueryClient();
  return useMutation<FavoriteState, unknown, SetProblemFavoriteIntent>({
    mutationFn: async (intent) => {
      await verifyOwner();
      return setProblemFavorite(intent, csrfProof);
    },
    networkMode: "always",
    onSuccess: (acknowledged, intent) => (
      acknowledgeProblemFavorite(queryClient, ownerScope, intent, acknowledged)
    ),
    retry: false,
  });
};

export const useSaveProblemNoteMutation = ({
  csrfProof,
  ownerScope,
  verifyOwner = noOpOwnerVerification,
}: ProblemMutationOptions) => {
  const queryClient = useQueryClient();
  return useMutation<ProblemNote, unknown, SaveProblemNoteIntent>({
    mutationFn: async (intent) => {
      await verifyOwner();
      return saveProblemNote(intent, csrfProof);
    },
    networkMode: "always",
    onSuccess: (acknowledged, intent) => {
      acknowledgeProblemNote(queryClient, ownerScope, intent, acknowledged);
    },
    retry: false,
  });
};
