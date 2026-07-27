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
  type DraftJsonObject,
  type DraftReplayReport,
  type RecoverableDraft,
  type RecoverableDraftRepository,
} from "../../shared/storage/drafts";
import {
  invalidateTrainingCompletionReadModels,
  invalidateTrainingProgressReadModels,
  mutateTraining,
  type TrainingMutationIntent,
  type TrainingMutationResponse,
} from "./training.mutations";
import {
  attemptSubmissionResponseSchema,
  completeTrainingRequestSchema,
  completionResponseSchema,
  hintUseResponseSchema,
  solutionRevealResponseSchema,
  startTrainingRequestSchema,
  startTrainingResponseSchema,
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

export const TRAINING_RECOVERY_RECEIPT_KINDS = [
  "training.recovery-start",
  "training.recovery-hint",
  "training.recovery-attempt",
  "training.recovery-solution",
  "training.recovery-complete",
] as const;

const receiptSourceShape = {
  expiresAt: z.string().datetime({ offset: true }),
  sourceAttemptCount: z.number().int().positive().optional(),
  sourceDraftId: z.string().min(1).max(220),
  sourceGenerationId: z.string().min(1).max(300),
  sourceLastAttemptAt: z.string().datetime({ offset: true }).optional(),
} as const;

const trainingEventReceiptResponseSchema = z.object({
  eventId: z.string().uuid(),
  eventSequence: z.number().int().positive(),
  sessionId: z.string().uuid(),
  sessionVersion: z.number().int().positive(),
}).strict();

const trainingRecoveryReceiptPayloadSchema = z.discriminatedUnion("intentKind", [
  z.object({
    ...receiptSourceShape,
    intentKind: z.literal("start"),
    response: startTrainingResponseSchema,
  }).strict(),
  z.object({
    ...receiptSourceShape,
    intentKind: z.literal("hint"),
    response: trainingEventReceiptResponseSchema,
  }).strict(),
  z.object({
    ...receiptSourceShape,
    intentKind: z.literal("attempt"),
    response: attemptSubmissionResponseSchema,
  }).strict(),
  z.object({
    ...receiptSourceShape,
    intentKind: z.literal("solution"),
    response: trainingEventReceiptResponseSchema,
  }).strict(),
  z.object({
    ...receiptSourceShape,
    intentKind: z.literal("complete"),
    response: completionResponseSchema,
  }).strict(),
]).superRefine((payload, context) => {
  const hasAttemptCount = payload.sourceAttemptCount !== undefined;
  const hasLastAttemptAt = payload.sourceLastAttemptAt !== undefined;
  if (hasAttemptCount === hasLastAttemptAt) return;
  context.addIssue({
    code: "custom",
    message: "TRAINING_RECOVERY_RECEIPT_SOURCE_ATTEMPT_INCOMPLETE",
    path: [hasAttemptCount ? "sourceLastAttemptAt" : "sourceAttemptCount"],
  });
}).transform((payload) => payload as typeof payload & DraftJsonObject);

export type TrainingRecoveryReceiptPayload = z.output<
  typeof trainingRecoveryReceiptPayloadSchema
>;

export type TrainingRecoveryReceipt = Readonly<{
  draft: RecoverableDraft;
  payload: TrainingRecoveryReceiptPayload;
}>;

export const trainingRecoveryReceiptMatchesSourceAttempt = (
  receipt: TrainingRecoveryReceipt,
  source: RecoverableDraft,
): boolean => (
  receipt.payload.sourceDraftId === source.draftId
  && receipt.payload.sourceGenerationId === source.generationId
  && receipt.payload.sourceAttemptCount !== undefined
  && receipt.payload.sourceLastAttemptAt !== undefined
  && receipt.payload.sourceAttemptCount === source.attemptCount
  && receipt.payload.sourceLastAttemptAt === source.lastAttemptAt
);

const receiptExpiry = (createdAt: string): string => {
  const expiry = new Date(createdAt);
  expiry.setUTCDate(expiry.getUTCDate() + 7);
  return expiry.toISOString();
};

const stableReceiptKey = (source: RecoverableDraft): string => {
  const value = `${source.draftId}:${source.generationId}`;
  const seeds = [0x811c9dc5, 0x9e3779b9, 0x85ebca6b, 0xc2b2ae35];
  const segments = seeds.map((seed) => {
    let hash = seed;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 0x01000193);
    }
    return (hash >>> 0).toString(16).padStart(8, "0");
  });
  return `receipt_${segments.join("")}`;
};

const recoveryReceiptKind = (intent: TrainingMutationIntent) => (
  `training.recovery-${intent.kind}` as const
);

const contentFreeEventReceipt = (response: {
  eventId: string;
  eventSequence: number;
  sessionId: string;
  sessionVersion: number;
}) => trainingEventReceiptResponseSchema.parse({
  eventId: response.eventId,
  eventSequence: response.eventSequence,
  sessionId: response.sessionId,
  sessionVersion: response.sessionVersion,
});

const receiptResponse = (
  intent: TrainingMutationIntent,
  response: TrainingMutationResponse,
): TrainingRecoveryReceiptPayload["response"] => {
  switch (intent.kind) {
    case "start":
      return startTrainingResponseSchema.parse(response);
    case "hint": {
      return contentFreeEventReceipt(hintUseResponseSchema.parse(response));
    }
    case "attempt":
      return attemptSubmissionResponseSchema.parse(response);
    case "solution": {
      return contentFreeEventReceipt(solutionRevealResponseSchema.parse(response));
    }
    case "complete":
      return completionResponseSchema.parse(response);
  }
};

const createTrainingRecoveryReceipt = (
  ownerScope: string,
  source: RecoverableDraft,
  intent: TrainingMutationIntent,
  response: TrainingMutationResponse,
  createdAt = new Date().toISOString(),
): TrainingRecoveryReceipt => {
  if (source.attemptCount < 1 || source.lastAttemptAt === null) {
    throw new Error("TRAINING_RECOVERY_RECEIPT_SOURCE_ATTEMPT_INVALID");
  }
  const parsedResponse = receiptResponse(intent, response);
  const payload = trainingRecoveryReceiptPayloadSchema.parse({
    expiresAt: receiptExpiry(createdAt),
    intentKind: intent.kind,
    response: parsedResponse,
    sourceAttemptCount: source.attemptCount,
    sourceDraftId: source.draftId,
    sourceGenerationId: source.generationId,
    sourceLastAttemptAt: source.lastAttemptAt,
  });
  const draft = createRecoverableDraft({
    idempotencyKey: stableReceiptKey(source),
    kind: recoveryReceiptKind(intent),
    ownerScope,
    payload,
    resourceId: parsedResponse.sessionId,
    serverVersion: parsedResponse.sessionVersion,
    updatedAt: createdAt,
  });
  return { draft, payload };
};

const recoverTrainingRecoveryReceipt = (
  draft: RecoverableDraft,
): TrainingRecoveryReceipt => {
  if (!TRAINING_RECOVERY_RECEIPT_KINDS.includes(
    draft.kind as (typeof TRAINING_RECOVERY_RECEIPT_KINDS)[number],
  )) {
    throw new Error("TRAINING_RECOVERY_RECEIPT_KIND_INVALID");
  }
  const payload = trainingRecoveryReceiptPayloadSchema.parse(draft.payload);
  if (
    draft.kind !== `training.recovery-${payload.intentKind}`
    || draft.resourceId !== payload.response.sessionId
    || draft.serverVersion !== payload.response.sessionVersion
  ) {
    throw new Error("TRAINING_RECOVERY_RECEIPT_INVALID");
  }
  return { draft, payload };
};

export const listTrainingRecoveryReceipts = async (
  ownerScope: string,
  repository: RecoverableDraftRepository = recoverableDraftRepository,
  now = new Date(),
): Promise<readonly TrainingRecoveryReceipt[]> => {
  const receipts: TrainingRecoveryReceipt[] = [];
  for (const draft of await repository.list(ownerScope)) {
    if (!TRAINING_RECOVERY_RECEIPT_KINDS.includes(
      draft.kind as (typeof TRAINING_RECOVERY_RECEIPT_KINDS)[number],
    )) continue;
    let receipt: TrainingRecoveryReceipt;
    try {
      receipt = recoverTrainingRecoveryReceipt(draft);
    } catch {
      // A generic draft can be structurally valid while its domain receipt is
      // unusable. Remove only that exact invalid generation so one bad record
      // cannot block every other training continuation.
      await repository.acknowledge(draft);
      continue;
    }
    if (Date.parse(receipt.payload.expiresAt) <= now.getTime()) {
      await repository.acknowledge(receipt.draft);
      continue;
    }
    receipts.push(receipt);
  }
  return receipts;
};

export const consumeTrainingRecoveryReceipt = async (
  ownerScope: string,
  receipt: TrainingRecoveryReceipt,
  repository: RecoverableDraftRepository = recoverableDraftRepository,
): Promise<boolean> => {
  if (receipt.draft.ownerScope !== ownerScope) {
    throw new Error("TRAINING_RECOVERY_RECEIPT_OWNER_MISMATCH");
  }
  return repository.acknowledge(receipt.draft);
};

const invalidateTrainingRecoveryReceipt = (
  queryClient: QueryClient,
  ownerScope: string,
  receipt: TrainingRecoveryReceipt,
) => receipt.payload.intentKind === "complete"
  ? invalidateTrainingCompletionReadModels(
      queryClient,
      ownerScope,
      receipt.payload.response.sessionId,
    )
  : invalidateTrainingProgressReadModels(queryClient, ownerScope);

export const reconcileTrainingRecoveryReceipts = async (
  ownerScope: string,
  queryClient: QueryClient,
  repository: RecoverableDraftRepository = recoverableDraftRepository,
): Promise<readonly TrainingRecoveryReceipt[]> => {
  const receipts = await listTrainingRecoveryReceipts(ownerScope, repository);
  await Promise.all(receipts.map((receipt) => (
    invalidateTrainingRecoveryReceipt(queryClient, ownerScope, receipt)
  )));
  return receipts;
};

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
      return createRecoverableDraft({
        ...common,
        idempotencyKey: intent.idempotencyKey,
        kind: "training.hint",
      });
    case "attempt":
      return createRecoverableDraft({
        ...common,
        idempotencyKey: intent.idempotencyKey,
        kind: "training.attempt",
      });
    case "solution":
      return createRecoverableDraft({
        ...common,
        idempotencyKey: intent.idempotencyKey,
        kind: "training.solution",
      });
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
        idempotencyKey: draft.idempotencyKey,
        kind: "hint",
        request: versionedTrainingRequestSchema.parse(draft.payload),
        sessionId: draft.resourceId,
      };
    case "training.attempt":
      return {
        idempotencyKey: draft.idempotencyKey,
        kind: "attempt",
        request: submitAttemptRequestSchema.parse(draft.payload),
        sessionId: draft.resourceId,
      };
    case "training.solution":
      return {
        idempotencyKey: draft.idempotencyKey,
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
  queryClient: QueryClient;
  repository?: RecoverableDraftRepository;
  signal?: AbortSignal;
  verifyOwner?: (signal?: AbortSignal) => Promise<void>;
}>;

const abortIfRequested = (signal: AbortSignal | undefined): void => {
  if (signal?.aborted !== true) return;
  throw signal.reason ?? new DOMException("Training replay aborted", "AbortError");
};

const trainingReplayOptions = (options: ReplayTrainingDraftsOptions) => {
  const repository = options.repository ?? recoverableDraftRepository;
  const verifyOwner = options.verifyOwner
    ?? ((signal?: AbortSignal) => (
      verifyCurrentSessionOwner(options.ownerScope, signal)
    ));
  return {
    kinds: TRAINING_DRAFT_KINDS,
    ownerScope: options.ownerScope,
    replay: async (draft: RecoverableDraft, signal?: AbortSignal) => {
      abortIfRequested(signal);
      await verifyOwner(signal);
      abortIfRequested(signal);
      const existing = (await listTrainingRecoveryReceipts(
        options.ownerScope,
        repository,
      )).find(({ payload }) => (
        payload.sourceDraftId === draft.draftId
        && payload.sourceGenerationId === draft.generationId
      ));
      abortIfRequested(signal);
      if (existing !== undefined) {
        abortIfRequested(signal);
        await invalidateTrainingRecoveryReceipt(
          options.queryClient,
          options.ownerScope,
          existing,
        );
        abortIfRequested(signal);
        return { acknowledged: true };
      }

      const intent = recoverTrainingMutationIntent(draft);
      const response = await runOwnerVerifiedOperation(
        verifyOwner,
        (operationSignal) => mutateTraining(
          intent,
          options.csrfProof,
          operationSignal,
        ),
        signal,
      );
      abortIfRequested(signal);
      const receipt = createTrainingRecoveryReceipt(
        options.ownerScope,
        draft,
        intent,
        response,
      );
      abortIfRequested(signal);
      const receiptCommitted = await repository.putIfCurrent(draft, receipt.draft);
      abortIfRequested(signal);
      if (!receiptCommitted) {
        return { acknowledged: true };
      }
      await invalidateTrainingRecoveryReceipt(
        options.queryClient,
        options.ownerScope,
        receipt,
      );
      abortIfRequested(signal);
      return { acknowledged: true };
    },
    repository,
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  };
};

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
