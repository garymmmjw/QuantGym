import { z } from "zod";

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
  mutateProblem,
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
  repository?: RecoverableDraftRepository;
  verifyOwner?: () => Promise<void>;
}>;

const problemReplayOptions = (options: ReplayProblemDraftsOptions) => ({
  kinds: PROBLEM_DRAFT_KINDS,
  ownerScope: options.ownerScope,
  replay: async (draft: RecoverableDraft) => {
    await options.verifyOwner?.();
    await mutateProblem(recoverProblemMutationIntent(draft), options.csrfProof);
    return { acknowledged: true };
  },
  ...(options.repository === undefined ? {} : { repository: options.repository }),
});

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
