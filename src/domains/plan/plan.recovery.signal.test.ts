const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("../../shared/api/client", () => ({ apiRequest: apiRequestMock }));

import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "../../shared/api/errors";
import { createInMemoryDraftRepository } from "../../shared/storage/drafts";
import type { UpdatePlanTaskIntent } from "./plan.mutations";
import {
  persistPlanMutationDraft,
  replayPlanMutationDrafts,
} from "./plan.recovery";
import type {
  CurrentPlanResponse,
  OfficialPlanTask,
} from "./plan.schema";

const ownerScope = "acct-1234567890abcdef";
const csrfProof = "session-proof-0123456789abcdef";
const planId = "30ba30c0-781d-45be-9fb2-a667340a2f56";
const taskId = "29584c83-7297-44ef-b985-f38e6c95de76";

const updateIntent: UpdatePlanTaskIntent = {
  idempotencyKey: "plan-update-signal-12345678",
  kind: "update-task",
  request: {
    planVersion: 4,
    taskVersion: 2,
    title: "复习概率论",
  },
  taskId,
};

const updatedTask: OfficialPlanTask = {
  actionTarget: "custom",
  completedAt: null,
  createdAt: "2026-07-27T02:00:00Z",
  detail: null,
  estimatedMinutes: 20,
  id: taskId,
  planId,
  recommendationId: null,
  scheduledFor: null,
  skillKey: null,
  sortOrder: 0,
  status: "open",
  targetProblemId: null,
  title: "复习概率论",
  updatedAt: "2026-07-27T03:00:00Z",
  version: 3,
};

const currentPlan: CurrentPlanResponse = {
  plan: {
    createdAt: "2026-07-27T02:00:00Z",
    diagnosticScore: 0,
    diagnosticScores: {},
    diagnosticStatus: "pending",
    id: planId,
    progress: { completed: 0, total: 1 },
    recommendations: [],
    role: "Quant Researcher",
    season: "2027 Spring",
    status: "active",
    tasks: [updatedTask],
    track: "internship",
    updatedAt: "2026-07-27T03:00:00Z",
    version: 5,
    weeklyHours: 8,
  },
};

const signalFromApiCall = (callIndex: number): AbortSignal | undefined => {
  const options = apiRequestMock.mock.calls[callIndex]?.[1] as
    | { signal?: AbortSignal }
    | undefined;
  return options?.signal;
};

describe("Plan replay cancellation boundary", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    vi.spyOn(document, "cookie", "get").mockReturnValue(
      `__Host-qg_csrf=${csrfProof}`,
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shares one replay signal with owner verification and the API mutation", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const draft = await persistPlanMutationDraft(
      ownerScope,
      updateIntent,
      repository,
    );
    const ownerSignals: Array<AbortSignal | undefined> = [];
    const verifyOwner = vi.fn(async (signal?: AbortSignal) => {
      ownerSignals.push(signal);
    });
    apiRequestMock.mockResolvedValueOnce({
      planVersion: 5,
      task: updatedTask,
    });

    const report = await replayPlanMutationDrafts({
      csrfProof,
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });

    const requestSignal = signalFromApiCall(0);
    expect(requestSignal).toBeDefined();
    expect(ownerSignals).toEqual([requestSignal, requestSignal]);
    expect(report.acknowledged).toEqual([draft.draftId]);
    queryClient.clear();
  });

  it("uses the same signal for the 409 reconciliation refetch", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const draft = await persistPlanMutationDraft(
      ownerScope,
      updateIntent,
      repository,
    );
    const ownerSignals: Array<AbortSignal | undefined> = [];
    const verifyOwner = vi.fn(async (signal?: AbortSignal) => {
      ownerSignals.push(signal);
    });
    apiRequestMock
      .mockRejectedValueOnce(new ApiError({
        code: "PLAN_TASK_VERSION_CONFLICT",
        message: "任务版本已变化。",
        requestId: "req_plan_signal_conflict",
        retryable: false,
        status: 409,
      }))
      .mockResolvedValueOnce(currentPlan);

    const report = await replayPlanMutationDrafts({
      csrfProof,
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });

    const mutationSignal = signalFromApiCall(0);
    const refetchSignal = signalFromApiCall(1);
    expect(mutationSignal).toBeDefined();
    expect(refetchSignal).toBe(mutationSignal);
    expect(ownerSignals).toEqual([
      mutationSignal,
      mutationSignal,
      mutationSignal,
    ]);
    expect(report.acknowledged).toEqual([draft.draftId]);
    queryClient.clear();
  });

  it("stops before the API mutation when replay is aborted during owner verification", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const controller = new AbortController();
    const abortReason = new DOMException("Plan replay cancelled", "AbortError");
    await persistPlanMutationDraft(ownerScope, updateIntent, repository);
    queryClient.setQueryData(["dashboard", ownerScope, "overview"], {
      marker: "must-remain-current",
    });
    const abortingVerifier = vi.fn(async () => {
      controller.abort(abortReason);
    });

    await expect(replayPlanMutationDrafts({
      csrfProof,
      ownerScope,
      queryClient,
      repository,
      signal: controller.signal,
      verifyOwner: abortingVerifier,
    })).rejects.toBe(abortReason);

    expect(abortingVerifier).toHaveBeenCalledTimes(1);
    expect(apiRequestMock).not.toHaveBeenCalled();
    expect(queryClient.getQueryState(
      ["dashboard", ownerScope, "overview"],
    )?.isInvalidated).toBe(false);
    expect(await repository.list(ownerScope)).toHaveLength(1);
    queryClient.clear();
  });
});
