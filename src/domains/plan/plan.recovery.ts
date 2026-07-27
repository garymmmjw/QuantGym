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
  mutatePlan,
  type PlanMutationIntent,
} from "./plan.mutations";
import {
  completePlanTaskRequestSchema,
  createPlanRequestSchema,
  runPlanDiagnosticRequestSchema,
  updatePlanTaskRequestSchema,
} from "./plan.schema";

export const PLAN_DRAFT_KINDS = [
  "plan.create",
  "plan.diagnostic",
  "plan.task-update",
  "plan.task-complete",
] as const;

export const createPlanMutationDraft = (
  ownerScope: string,
  intent: PlanMutationIntent,
  updatedAt?: string,
): RecoverableDraft => {
  const common = {
    kind: `plan.${intent.kind}`,
    ownerScope,
    payload: intent.request,
    resourceId: "taskId" in intent ? intent.taskId : "current",
    serverVersion: "planVersion" in intent.request
      ? intent.request.planVersion
      : null,
    ...(updatedAt === undefined ? {} : { updatedAt }),
  } as const;
  switch (intent.kind) {
    case "create":
      return createRecoverableDraft({
        ...common,
        idempotencyKey: intent.idempotencyKey,
        kind: "plan.create",
      });
    case "diagnostic":
      return createRecoverableDraft({
        ...common,
        idempotencyKey: intent.idempotencyKey,
        kind: "plan.diagnostic",
      });
    case "update-task":
      return createRecoverableDraft({
        ...common,
        idempotencyKey: intent.idempotencyKey,
        kind: "plan.task-update",
      });
    case "complete-task":
      return createRecoverableDraft({
        ...common,
        idempotencyKey: intent.idempotencyKey,
        kind: "plan.task-complete",
      });
  }
};

export const recoverPlanMutationIntent = (
  draft: RecoverableDraft,
): PlanMutationIntent => {
  switch (draft.kind) {
    case "plan.create":
      return {
        idempotencyKey: draft.idempotencyKey,
        kind: "create",
        request: createPlanRequestSchema.parse(draft.payload),
      };
    case "plan.diagnostic":
      return {
        idempotencyKey: draft.idempotencyKey,
        kind: "diagnostic",
        request: runPlanDiagnosticRequestSchema.parse(draft.payload),
      };
    case "plan.task-update":
      {
        const request = updatePlanTaskRequestSchema.parse(draft.payload);
        return {
          idempotencyKey: draft.idempotencyKey,
          kind: "update-task",
          request: {
            ...(request.detail === undefined ? {} : { detail: request.detail }),
            ...(request.estimatedMinutes === undefined
              ? {}
              : { estimatedMinutes: request.estimatedMinutes }),
            planVersion: request.planVersion,
            ...(request.scheduledFor === undefined
              ? {}
              : { scheduledFor: request.scheduledFor }),
            ...(request.sortOrder === undefined ? {} : { sortOrder: request.sortOrder }),
            taskVersion: request.taskVersion,
            ...(request.title === undefined ? {} : { title: request.title }),
          },
          taskId: draft.resourceId,
        };
      }
    case "plan.task-complete":
      return {
        idempotencyKey: draft.idempotencyKey,
        kind: "complete-task",
        request: completePlanTaskRequestSchema.parse(draft.payload),
        taskId: draft.resourceId,
      };
    default:
      throw new Error("PLAN_DRAFT_KIND_INVALID");
  }
};

export const persistPlanMutationDraft = async (
  ownerScope: string,
  intent: PlanMutationIntent,
  repository: RecoverableDraftRepository = recoverableDraftRepository,
): Promise<RecoverableDraft> => {
  const draft = createPlanMutationDraft(ownerScope, intent);
  await repository.put(draft);
  return draft;
};

export type ReplayPlanDraftsOptions = Readonly<{
  csrfProof: string | null;
  ownerScope: string;
  repository?: RecoverableDraftRepository;
  verifyOwner?: () => Promise<void>;
}>;

const planReplayOptions = (options: ReplayPlanDraftsOptions) => ({
  kinds: PLAN_DRAFT_KINDS,
  ownerScope: options.ownerScope,
  replay: async (draft: RecoverableDraft) => {
    await options.verifyOwner?.();
    await mutatePlan(recoverPlanMutationIntent(draft), options.csrfProof);
    return { acknowledged: true };
  },
  ...(options.repository === undefined ? {} : { repository: options.repository }),
});

export const replayPlanMutationDrafts = (
  options: ReplayPlanDraftsOptions,
): Promise<DraftReplayReport> => replayRecoverableDrafts(planReplayOptions(options));

export const registerPlanDraftReconnectReplay = (
  options: ReplayPlanDraftsOptions & Readonly<{
    onError?: (error: unknown) => void;
    onReport?: (report: DraftReplayReport) => void;
    target?: Pick<EventTarget, "addEventListener" | "removeEventListener">;
  }>,
) => registerDraftReconnectReplay({
  ...planReplayOptions(options),
  ...(options.onError === undefined ? {} : { onError: options.onError }),
  ...(options.onReport === undefined ? {} : { onReport: options.onReport }),
  ...(options.target === undefined ? {} : { target: options.target }),
});
