import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { ApiError } from "../../shared/api/errors";
import {
  runOwnerVerifiedOperation,
  verifyCurrentSessionOwner,
} from "../../shared/api/ownerScopedQueries";

import {
  createRecoverableDraft,
  recoverableDraftRepository,
  registerDraftReconnectReplay,
  replayRecoverableDrafts,
  type DraftReplayReport,
  type RecoverableDraft,
  type RecoverableDraftRepository,
} from "../../shared/storage/drafts";
import { publishProblemDraftChanged } from "./problems.events";
import {
  acknowledgeProblemFavorite,
  acknowledgeProblemNote,
  invalidateProblemMutationReadModels,
  saveProblemNote,
  setProblemFavorite,
  type ProblemMutationIntent,
} from "./problems.mutations";
import { getProblem, problemQueryKeys } from "./problems.queries";
import {
  problemIdSchema,
  type ProblemDetail,
} from "./problems.schema";

export const PROBLEM_DRAFT_KINDS = [
  "problems.favorite",
  "problems.note",
] as const;

const favoritePayloadSchema = z.object({
  expectedStateId: z.string().uuid().nullable(),
  expectedVersion: z.number().int().positive().nullable(),
  favorite: z.boolean(),
}).strict().superRefine((payload, context) => {
  if ((payload.expectedStateId === null) !== (payload.expectedVersion === null)) {
    context.addIssue({
      code: "custom",
      message: "Favorite draft generation must be supplied together.",
    });
  }
});

const notePayloadSchema = z.object({
  body: z.string()
    .min(1)
    .max(20_000)
    .refine((body) => body.trim().length > 0 && !body.includes("\0"), {
      message: "Note draft must contain visible supported text.",
    }),
  expectedVersion: z.number().int().positive().nullable(),
}).strict();

const assertDraftVersion = (
  draft: RecoverableDraft,
  expectedVersion: number | null,
) => {
  z.object({
    serverVersion: expectedVersion === null
      ? z.null()
      : z.literal(expectedVersion),
  }).parse({ serverVersion: draft.serverVersion });
};

export const createProblemMutationDraft = (
  ownerScope: string,
  intent: ProblemMutationIntent,
  updatedAt?: string,
): RecoverableDraft => {
  switch (intent.kind) {
    case "set-favorite":
      return createRecoverableDraft({
        idempotencyKey: intent.idempotencyKey,
        kind: "problems.favorite",
        ownerScope,
        payload: {
          expectedStateId: intent.expectedStateId,
          expectedVersion: intent.expectedVersion,
          favorite: intent.favorite,
        },
        resourceId: intent.problemId,
        serverVersion: intent.expectedVersion,
        ...(updatedAt === undefined ? {} : { updatedAt }),
      });
    case "save-note":
      return createRecoverableDraft({
        idempotencyKey: intent.idempotencyKey,
        kind: "problems.note",
        ownerScope,
        payload: {
          body: intent.body,
          expectedVersion: intent.expectedVersion,
        },
        resourceId: intent.problemId,
        serverVersion: intent.expectedVersion,
        ...(updatedAt === undefined ? {} : { updatedAt }),
      });
  }
};

export const recoverProblemMutationIntent = (
  draft: RecoverableDraft,
): ProblemMutationIntent => {
  const problemId = problemIdSchema.parse(draft.resourceId);
  if (draft.kind === "problems.favorite") {
    const payload = favoritePayloadSchema.parse(draft.payload);
    assertDraftVersion(draft, payload.expectedVersion);
    return {
      ...payload,
      idempotencyKey: draft.idempotencyKey,
      kind: "set-favorite",
      problemId,
    };
  }
  if (draft.kind === "problems.note") {
    const payload = notePayloadSchema.parse(draft.payload);
    assertDraftVersion(draft, payload.expectedVersion);
    return {
      ...payload,
      idempotencyKey: draft.idempotencyKey,
      kind: "save-note",
      problemId,
    };
  }
  throw new Error("PROBLEM_DRAFT_KIND_INVALID");
};

export const persistProblemMutationDraft = async (
  ownerScope: string,
  intent: ProblemMutationIntent,
  repository: RecoverableDraftRepository = recoverableDraftRepository,
): Promise<RecoverableDraft> => {
  const draft = createProblemMutationDraft(ownerScope, intent);
  await repository.put(draft);
  return draft;
};

export const problemMutationIntentIsSatisfied = (
  current: ProblemDetail,
  intent: ProblemMutationIntent,
): boolean => {
  if (current.id !== intent.problemId) return false;
  return intent.kind === "set-favorite"
    ? current.favorite.favorite === intent.favorite
    : current.note?.body === intent.body;
};

export type ReconcileProblemMutationOptions = Readonly<{
  intent: ProblemMutationIntent;
  ownerScope: string;
  queryClient: QueryClient;
  signal?: AbortSignal;
  verifyOwner?: (signal?: AbortSignal) => Promise<void>;
}>;

export const reconcileProblemMutation = async ({
  intent,
  ownerScope,
  queryClient,
  signal,
  verifyOwner = (operationSignal?: AbortSignal) => (
    verifyCurrentSessionOwner(ownerScope, operationSignal)
  ),
}: ReconcileProblemMutationOptions): Promise<boolean> => {
  const current = await runOwnerVerifiedOperation(
    verifyOwner,
    (operationSignal) => getProblem(intent.problemId, operationSignal),
    signal,
  );
  if (signal?.aborted === true) {
    throw signal.reason ?? new DOMException("Problem reconciliation aborted", "AbortError");
  }
  queryClient.setQueryData(
    problemQueryKeys.detail(ownerScope, intent.problemId),
    current,
  );
  await invalidateProblemMutationReadModels(
    queryClient,
    ownerScope,
    intent.problemId,
  );
  return problemMutationIntentIsSatisfied(current, intent);
};

export type ReplayProblemDraftsOptions = Readonly<{
  csrfProof: string | null;
  ownerScope: string;
  queryClient: QueryClient;
  repository?: RecoverableDraftRepository;
  signal?: AbortSignal;
  verifyOwner?: (signal?: AbortSignal) => Promise<void>;
}>;

const problemReplayOptions = (options: ReplayProblemDraftsOptions) => {
  const verifyOwner = options.verifyOwner
    ?? ((signal?: AbortSignal) => (
      verifyCurrentSessionOwner(options.ownerScope, signal)
    ));
  return {
    kinds: PROBLEM_DRAFT_KINDS,
    ownerScope: options.ownerScope,
    replay: async (draft: RecoverableDraft, signal?: AbortSignal) => {
      const intent = recoverProblemMutationIntent(draft);
      try {
        if (intent.kind === "set-favorite") {
          const acknowledged = await runOwnerVerifiedOperation(
            verifyOwner,
            (operationSignal) => setProblemFavorite(
              intent,
              options.csrfProof,
              operationSignal,
            ),
            signal,
          );
          await acknowledgeProblemFavorite(
            options.queryClient,
            options.ownerScope,
            intent,
            acknowledged,
          );
        } else {
          const acknowledged = await runOwnerVerifiedOperation(
            verifyOwner,
            (operationSignal) => saveProblemNote(
              intent,
              options.csrfProof,
              operationSignal,
            ),
            signal,
          );
          acknowledgeProblemNote(
            options.queryClient,
            options.ownerScope,
            intent,
            acknowledged,
          );
          await invalidateProblemMutationReadModels(
            options.queryClient,
            options.ownerScope,
            intent.problemId,
          );
        }
        return { acknowledged: true };
      } catch (error) {
        if (
          !(error instanceof ApiError)
          || error.status !== 409
          || error.retryable
        ) throw error;
        const acknowledged = await reconcileProblemMutation({
          intent,
          ownerScope: options.ownerScope,
          queryClient: options.queryClient,
          verifyOwner,
          ...(signal === undefined ? {} : { signal }),
        });
        return {
          acknowledged,
          ...(acknowledged ? {} : {
            failure: {
              code: error.code,
              requestId: error.requestId,
              retryable: false,
              state: "stale-version-conflict" as const,
            },
          }),
        };
      }
    },
    ...(options.repository === undefined ? {} : { repository: options.repository }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  };
};

export const replayProblemMutationDrafts = (
  options: ReplayProblemDraftsOptions,
): Promise<DraftReplayReport> => replayRecoverableDrafts(problemReplayOptions(options));

export const registerProblemDraftReconnectReplay = (
  options: ReplayProblemDraftsOptions & Readonly<{
    onError?: (error: unknown) => void;
    onReport?: (report: DraftReplayReport) => void;
    target?: Pick<EventTarget, "addEventListener" | "removeEventListener">;
  }>,
) => registerDraftReconnectReplay({
  ...problemReplayOptions(options),
  onError: (error) => {
    publishProblemDraftChanged(options.ownerScope);
    options.onError?.(error);
  },
  onReport: (report) => {
    publishProblemDraftChanged(options.ownerScope);
    options.onReport?.(report);
  },
  ...(options.target === undefined ? {} : { target: options.target }),
});
