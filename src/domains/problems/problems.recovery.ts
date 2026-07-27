import type { QueryClient } from "@tanstack/react-query";
import { z } from "zod";

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
import {
  acknowledgeProblemFavorite,
  acknowledgeProblemNote,
  invalidateProblemMutationReadModels,
  saveProblemNote,
  setProblemFavorite,
  type ProblemMutationIntent,
} from "./problems.mutations";

export const PROBLEM_DRAFT_KINDS = [
  "problems.favorite",
  "problems.note",
] as const;

const favoritePayloadSchema = z.object({
  expectedStateId: z.string().nullable(),
  expectedVersion: z.number().int().nonnegative().nullable(),
  favorite: z.boolean(),
}).strict();

const notePayloadSchema = z.object({
  body: z.string(),
  expectedVersion: z.number().int().nonnegative().nullable(),
}).strict();

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
  if (draft.kind === "problems.favorite") {
    const payload = favoritePayloadSchema.parse(draft.payload);
    return {
      ...payload,
      idempotencyKey: draft.idempotencyKey,
      kind: "set-favorite",
      problemId: draft.resourceId,
    };
  }
  if (draft.kind === "problems.note") {
    const payload = notePayloadSchema.parse(draft.payload);
    return {
      ...payload,
      idempotencyKey: draft.idempotencyKey,
      kind: "save-note",
      problemId: draft.resourceId,
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

export type ReplayProblemDraftsOptions = Readonly<{
  csrfProof: string | null;
  ownerScope: string;
  queryClient: QueryClient;
  repository?: RecoverableDraftRepository;
  verifyOwner?: () => Promise<void>;
}>;

const problemReplayOptions = (options: ReplayProblemDraftsOptions) => {
  const verifyOwner = options.verifyOwner
    ?? (() => verifyCurrentSessionOwner(options.ownerScope));
  return {
    kinds: PROBLEM_DRAFT_KINDS,
    ownerScope: options.ownerScope,
    replay: async (draft: RecoverableDraft) => {
      const intent = recoverProblemMutationIntent(draft);
      if (intent.kind === "set-favorite") {
        const acknowledged = await runOwnerVerifiedOperation(
          verifyOwner,
          () => setProblemFavorite(intent, options.csrfProof),
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
          () => saveProblemNote(intent, options.csrfProof),
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
    },
    ...(options.repository === undefined ? {} : { repository: options.repository }),
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
  ...(options.onError === undefined ? {} : { onError: options.onError }),
  ...(options.onReport === undefined ? {} : { onReport: options.onReport }),
  ...(options.target === undefined ? {} : { target: options.target }),
});
