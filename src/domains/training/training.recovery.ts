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
  mutateTraining,
  type TrainingMutationIntent,
} from "./training.mutations";
import {
  completeTrainingRequestSchema,
  startTrainingRequestSchema,
  submitAttemptRequestSchema,
  versionedTrainingRequestSchema,
} from "./training.schema";

export const TRAINING_DRAFT_KINDS = [
  "training.start",
  "training.hint",
  "training.attempt",
  "training.solution",
  "training.complete",
] as const;

export const createTrainingMutationDraft = (
  ownerScope: string,
  intent: TrainingMutationIntent,
  updatedAt?: string,
): RecoverableDraft => {
  const resourceId = "sessionId" in intent
    ? intent.sessionId
    : intent.request.problemId;
  const serverVersion = "version" in intent.request ? intent.request.version : null;
  const common = {
    kind: `training.${intent.kind}`,
    ownerScope,
    payload: intent.request,
    resourceId,
    serverVersion,
    ...(updatedAt === undefined ? {} : { updatedAt }),
  } as const;
  switch (intent.kind) {
    case "start":
      return createRecoverableDraft({
        ...common,
        idempotencyKey: intent.idempotencyKey,
        kind: "training.start",
      });
    case "hint":
      return createRecoverableDraft({ ...common, kind: "training.hint" });
    case "attempt":
      return createRecoverableDraft({ ...common, kind: "training.attempt" });
    case "solution":
      return createRecoverableDraft({ ...common, kind: "training.solution" });
    case "complete":
      return createRecoverableDraft({
        ...common,
        idempotencyKey: intent.idempotencyKey,
        kind: "training.complete",
      });
  }
};

export const recoverTrainingMutationIntent = (
  draft: RecoverableDraft,
): TrainingMutationIntent => {
  switch (draft.kind) {
    case "training.start":
      {
        const request = startTrainingRequestSchema.parse(draft.payload);
        return {
          idempotencyKey: draft.idempotencyKey,
          kind: "start",
          request: {
            ...(request.planTaskId === undefined
              ? {}
              : { planTaskId: request.planTaskId }),
            problemId: request.problemId,
          },
        };
      }
    case "training.hint":
      return {
        kind: "hint",
        request: versionedTrainingRequestSchema.parse(draft.payload),
        sessionId: draft.resourceId,
      };
    case "training.attempt":
      return {
        kind: "attempt",
        request: submitAttemptRequestSchema.parse(draft.payload),
        sessionId: draft.resourceId,
      };
    case "training.solution":
      return {
        kind: "solution",
        request: versionedTrainingRequestSchema.parse(draft.payload),
        sessionId: draft.resourceId,
      };
    case "training.complete":
      return {
        idempotencyKey: draft.idempotencyKey,
        kind: "complete",
        request: completeTrainingRequestSchema.parse(draft.payload),
        sessionId: draft.resourceId,
      };
    default:
      throw new Error("TRAINING_DRAFT_KIND_INVALID");
  }
};

export const persistTrainingMutationDraft = async (
  ownerScope: string,
  intent: TrainingMutationIntent,
  repository: RecoverableDraftRepository = recoverableDraftRepository,
): Promise<RecoverableDraft> => {
  const draft = createTrainingMutationDraft(ownerScope, intent);
  await repository.put(draft);
  return draft;
};

export type ReplayTrainingDraftsOptions = Readonly<{
  csrfProof: string | null;
  ownerScope: string;
  repository?: RecoverableDraftRepository;
  verifyOwner?: () => Promise<void>;
}>;

const trainingReplayOptions = (options: ReplayTrainingDraftsOptions) => ({
  kinds: TRAINING_DRAFT_KINDS,
  ownerScope: options.ownerScope,
  replay: async (draft: RecoverableDraft) => {
    await options.verifyOwner?.();
    await mutateTraining(recoverTrainingMutationIntent(draft), options.csrfProof);
    return { acknowledged: true };
  },
  ...(options.repository === undefined ? {} : { repository: options.repository }),
});

export const replayTrainingMutationDrafts = (
  options: ReplayTrainingDraftsOptions,
): Promise<DraftReplayReport> => replayRecoverableDrafts(trainingReplayOptions(options));

export const registerTrainingDraftReconnectReplay = (
  options: ReplayTrainingDraftsOptions & Readonly<{
    onError?: (error: unknown) => void;
    onReport?: (report: DraftReplayReport) => void;
    target?: Pick<EventTarget, "addEventListener" | "removeEventListener">;
  }>,
) => registerDraftReconnectReplay({
  ...trainingReplayOptions(options),
  ...(options.onError === undefined ? {} : { onError: options.onError }),
  ...(options.onReport === undefined ? {} : { onReport: options.onReport }),
  ...(options.target === undefined ? {} : { target: options.target }),
});
