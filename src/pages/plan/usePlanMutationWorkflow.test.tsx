import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import {
  newCreatePlanIntent,
  type CompletePlanTaskIntent,
} from "../../domains/plan/plan.mutations";
import type * as PlanMutationsModule from "../../domains/plan/plan.mutations";
import type * as PlanQueriesModule from "../../domains/plan/plan.queries";
import {
  PLAN_DRAFT_CHANGED_EVENT,
  publishPlanDraftChanged,
} from "../../domains/plan/plan.events";
import {
  createPlanMutationDraft,
} from "../../domains/plan/plan.recovery";
import type {
  OfficialPlan,
  OfficialPlanTask,
} from "../../domains/plan/plan.schema";
import { ApiError } from "../../shared/api/errors";
import type * as OwnerQueriesModule from "../../shared/api/ownerScopedQueries";
import {
  createInMemoryDraftRepository,
  createRecoverableDraft,
  type RecoverableDraft,
} from "../../shared/storage/drafts";
import {
  createIntentMatchesPlan,
  usePlanMutationWorkflow,
} from "./usePlanMutationWorkflow";

const workflowMocks = vi.hoisted(() => ({
  getCurrentPlan: vi.fn(),
  invalidate: vi.fn(async () => undefined),
  mutatePlan: vi.fn(),
  verifyOwner: vi.fn(async () => undefined),
}));

vi.mock("../../domains/plan/plan.mutations", async (importOriginal) => {
  const actual = await importOriginal<typeof PlanMutationsModule>();
  return {
    ...actual,
    invalidatePlanReadModels: workflowMocks.invalidate,
    mutatePlan: workflowMocks.mutatePlan,
  };
});

vi.mock("../../domains/plan/plan.queries", async (importOriginal) => {
  const actual = await importOriginal<typeof PlanQueriesModule>();
  return { ...actual, getCurrentPlan: workflowMocks.getCurrentPlan };
});

vi.mock("../../shared/api/ownerScopedQueries", async (importOriginal) => {
  const actual = await importOriginal<typeof OwnerQueriesModule>();
  return {
    ...actual,
    runOwnerVerifiedOperation: async <Result,>(
      verifyOwner: (signal?: AbortSignal) => Promise<void>,
      request: (signal?: AbortSignal) => Promise<Result>,
      signal?: AbortSignal,
    ) => {
      await verifyOwner(signal);
      const result = await request(signal);
      await verifyOwner(signal);
      return result;
    },
  };
});

const ownerScope = "acct-1234567890abcdef";
const planId = "10000000-0000-4000-8000-000000000001";
const taskId = "20000000-0000-4000-8000-000000000002";
const problemId = "30000000-0000-4000-8000-000000000003";

const taskFixture = (
  overrides: Partial<OfficialPlanTask> = {},
): OfficialPlanTask => ({
  actionTarget: "problems",
  completedAt: null,
  createdAt: "2026-07-27T08:00:00Z",
  detail: "Complete the linked training problem.",
  estimatedMinutes: 30,
  id: taskId,
  planId,
  recommendationId: null,
  scheduledFor: "2026-07-28",
  skillKey: "probability",
  sortOrder: 0,
  status: "open",
  targetProblemId: problemId,
  title: "Probability training",
  updatedAt: "2026-07-27T08:00:00Z",
  version: 2,
  ...overrides,
});

const planFixture = (overrides: Partial<OfficialPlan> = {}): OfficialPlan => ({
  createdAt: "2026-07-27T08:00:00Z",
  diagnosticScore: 0,
  diagnosticScores: {},
  diagnosticStatus: "pending",
  id: planId,
  progress: { completed: 0, total: 0 },
  recommendations: [],
  role: "quantResearch",
  season: "2027-summer",
  status: "active",
  tasks: [],
  track: "internship",
  updatedAt: "2026-07-27T08:00:00Z",
  version: 1,
  weeklyHours: 8,
  ...overrides,
});

const createIntent = () => newCreatePlanIntent({
  role: "quantResearch",
  season: "2027-summer",
  track: "internship",
  weeklyHours: 8,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("usePlanMutationWorkflow", () => {
  it("persists before submission, serializes the shared plan version, and exact-acknowledges success", async () => {
    const repository = createInMemoryDraftRepository();
    workflowMocks.mutatePlan.mockResolvedValue({
      planId,
      planVersion: 1,
      taskIds: [],
    });
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    const intent = createIntent();
    let firstResult = false;
    let secondResult = true;
    await act(async () => {
      const first = result.current.submit(intent);
      const second = result.current.submit(intent);
      [firstResult, secondResult] = await Promise.all([first, second]);
    });

    expect(firstResult).toBe(true);
    expect(secondResult).toBe(false);
    expect(workflowMocks.mutatePlan).toHaveBeenCalledOnce();
    expect(workflowMocks.mutatePlan).toHaveBeenCalledWith(
      intent,
      "csrf-proof",
      expect.any(AbortSignal),
    );
    expect(await repository.list(ownerScope)).toEqual([]);
    expect(result.current.workflow).toBeNull();
  });

  it("treats PLAN_ALREADY_ACTIVE as acknowledged only when all four creation fields match", async () => {
    const repository = createInMemoryDraftRepository();
    workflowMocks.mutatePlan.mockRejectedValue(new ApiError({
      code: "PLAN_ALREADY_ACTIVE",
      message: "A plan already exists.",
      requestId: "request-plan-existing",
      status: 409,
    }));
    workflowMocks.getCurrentPlan.mockResolvedValue({ plan: planFixture() });
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    await act(async () => {
      expect(await result.current.submit(createIntent())).toBe(true);
    });

    expect(workflowMocks.getCurrentPlan).toHaveBeenCalledOnce();
    expect(await repository.list(ownerScope)).toEqual([]);
    expect(result.current.workflow).toBeNull();
  });

  it("freezes on a different active plan instead of rewriting the stale intent", async () => {
    const repository = createInMemoryDraftRepository();
    workflowMocks.mutatePlan.mockRejectedValue(new ApiError({
      code: "PLAN_ALREADY_ACTIVE",
      message: "A different plan already exists.",
      requestId: "request-plan-conflict",
      status: 409,
    }));
    workflowMocks.getCurrentPlan.mockResolvedValue({
      plan: planFixture({ role: "quantTrading" }),
    });
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    await act(async () => {
      expect(await result.current.submit(createIntent())).toBe(false);
    });

    expect(result.current.workflow).toMatchObject({
      failure: {
        code: "PLAN_ALREADY_ACTIVE",
        state: "stale-version-conflict",
      },
      phase: "failed",
    });
    expect(await repository.list(ownerScope)).toHaveLength(1);
  });

  it("keeps the stale intent when loading the latest plan fails", async () => {
    const repository = createInMemoryDraftRepository();
    workflowMocks.mutatePlan.mockRejectedValue(new ApiError({
      code: "PLAN_ALREADY_ACTIVE",
      message: "A different plan already exists.",
      requestId: "request-plan-conflict-reload",
      status: 409,
    }));
    workflowMocks.getCurrentPlan.mockResolvedValueOnce({
      plan: planFixture({ role: "quantTrading" }),
    });
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    await act(async () => {
      await result.current.submit(createIntent());
    });
    workflowMocks.getCurrentPlan.mockRejectedValueOnce(new ApiError({
      code: "PLAN_READ_TEMPORARILY_UNAVAILABLE",
      message: "Please retry.",
      requestId: "request-plan-reload-failed",
      retryable: true,
      status: 503,
    }));
    await act(async () => {
      await result.current.loadLatest();
    });

    expect(await repository.list(ownerScope)).toHaveLength(1);
    expect(result.current.workflow).toMatchObject({
      draft: expect.objectContaining({ kind: "plan.create" }),
      failure: { state: "recoverable-error" },
      phase: "failed",
    });
  });

  it("routes PLAN_TASK_REQUIRES_TRAINING to training and removes the impossible completion draft", async () => {
    const repository = createInMemoryDraftRepository();
    const onTaskRequiresTraining = vi.fn();
    workflowMocks.mutatePlan.mockRejectedValue(new ApiError({
      code: "PLAN_TASK_REQUIRES_TRAINING",
      message: "Start the linked training session.",
      requestId: "request-training-required",
      status: 409,
    }));
    const refreshedTask = taskFixture();
    workflowMocks.getCurrentPlan.mockResolvedValue({
      plan: planFixture({
        progress: { completed: 0, total: 1 },
        tasks: [refreshedTask],
        version: 2,
      }),
    });
    const intent: CompletePlanTaskIntent = {
      idempotencyKey: "complete-plan-task-request-12345",
      kind: "complete-task",
      request: { planVersion: 1, taskVersion: 1 },
      taskId,
    };
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      onTaskRequiresTraining,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    await act(async () => {
      expect(await result.current.submit(intent)).toBe(false);
    });

    expect(onTaskRequiresTraining).toHaveBeenCalledWith(intent, refreshedTask);
    expect(await repository.list(ownerScope)).toEqual([]);
    expect(result.current.workflow).toBeNull();
  });

  it("does not route away when the impossible completion draft cannot be removed exactly", async () => {
    const baseRepository = createInMemoryDraftRepository();
    const repository = {
      ...baseRepository,
      discard: vi.fn(async () => false),
    };
    const onTaskRequiresTraining = vi.fn();
    workflowMocks.mutatePlan.mockRejectedValue(new ApiError({
      code: "PLAN_TASK_REQUIRES_TRAINING",
      message: "Start the linked training session.",
      requestId: "request-training-draft-retained",
      status: 409,
    }));
    workflowMocks.getCurrentPlan.mockResolvedValue({
      plan: planFixture({
        progress: { completed: 0, total: 1 },
        tasks: [taskFixture()],
        version: 2,
      }),
    });
    const intent: CompletePlanTaskIntent = {
      idempotencyKey: "complete-plan-task-request-67890",
      kind: "complete-task",
      request: { planVersion: 1, taskVersion: 1 },
      taskId,
    };
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      onTaskRequiresTraining,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    await act(async () => {
      await result.current.submit(intent);
    });

    expect(onTaskRequiresTraining).not.toHaveBeenCalled();
    expect(await baseRepository.list(ownerScope)).toHaveLength(1);
    expect(result.current.workflow).toMatchObject({
      failure: { code: "PLAN_DRAFT_RECONCILIATION_FAILED" },
      phase: "failed",
    });
  });

  it("keeps the completion draft when the refreshed task still has no training target", async () => {
    const repository = createInMemoryDraftRepository();
    const onTaskRequiresTraining = vi.fn();
    workflowMocks.mutatePlan.mockRejectedValue(new ApiError({
      code: "PLAN_TASK_REQUIRES_TRAINING",
      message: "Start the linked training session.",
      requestId: "request-training-target-missing",
      status: 409,
    }));
    workflowMocks.getCurrentPlan.mockResolvedValue({
      plan: planFixture({
        progress: { completed: 0, total: 1 },
        tasks: [taskFixture({ targetProblemId: null })],
        version: 2,
      }),
    });
    const intent: CompletePlanTaskIntent = {
      idempotencyKey: "complete-plan-task-target-missing-12345",
      kind: "complete-task",
      request: { planVersion: 1, taskVersion: 1 },
      taskId,
    };
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      onTaskRequiresTraining,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    await act(async () => {
      await result.current.submit(intent);
    });

    expect(onTaskRequiresTraining).not.toHaveBeenCalled();
    expect(await repository.list(ownerScope)).toHaveLength(1);
    expect(result.current.workflow).toMatchObject({
      failure: {
        code: "PLAN_TASK_REQUIRES_TRAINING",
        state: "stale-version-conflict",
      },
      phase: "failed",
    });
  });

  it("keeps inspecting failed drafts so another tab can release the exact source", async () => {
    const repository = createInMemoryDraftRepository();
    const draft = createPlanMutationDraft(
      ownerScope,
      createIntent(),
      "2026-07-27T08:00:00Z",
    );
    await repository.put(draft);
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.workflow).toMatchObject({
      draft: expect.objectContaining({ draftId: draft.draftId }),
      phase: "failed",
    }));
    await repository.acknowledge(draft);

    await waitFor(() => expect(result.current.workflow).toBeNull(), {
      timeout: 2_500,
    });
  });

  it("keeps the next durable plan draft locked after acknowledging the newest one", async () => {
    const repository = createInMemoryDraftRepository();
    const olderIntent = createIntent();
    const newerIntent = {
      ...createIntent(),
      idempotencyKey: "plan-create-newer-draft-12345",
    };
    const olderDraft = createPlanMutationDraft(
      ownerScope,
      olderIntent,
      "2026-07-27T08:00:00Z",
    );
    const newerDraft = createPlanMutationDraft(
      ownerScope,
      newerIntent,
      "2026-07-27T09:00:00Z",
    );
    await repository.put(olderDraft);
    await repository.put(newerDraft);
    workflowMocks.mutatePlan.mockResolvedValue({
      planId,
      planVersion: 2,
      taskIds: [],
    });
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.workflow?.draft?.draftId)
      .toBe(newerDraft.draftId));
    await act(async () => {
      expect(await result.current.retry()).toBe(true);
    });

    expect(result.current.workflow).toMatchObject({
      draft: expect.objectContaining({ draftId: olderDraft.draftId }),
      phase: "failed",
    });
    expect((await repository.list(ownerScope)).map(({ draftId }) => draftId))
      .toEqual([olderDraft.draftId]);
    await act(async () => {
      expect(await result.current.submit(createIntent())).toBe(false);
    });
    expect(workflowMocks.mutatePlan).toHaveBeenCalledOnce();
  });

  it("reveals the next durable plan draft after explicitly discarding the newest one", async () => {
    const repository = createInMemoryDraftRepository();
    const olderDraft = createPlanMutationDraft(
      ownerScope,
      createIntent(),
      "2026-07-27T08:00:00Z",
    );
    const newerDraft = createPlanMutationDraft(
      ownerScope,
      { ...createIntent(), idempotencyKey: "plan-discard-newer-draft-12345" },
      "2026-07-27T09:00:00Z",
    );
    await repository.put(olderDraft);
    await repository.put(newerDraft);
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.workflow?.draft?.draftId)
      .toBe(newerDraft.draftId));
    await act(async () => result.current.discard());

    expect(result.current.workflow).toMatchObject({
      draft: expect.objectContaining({ draftId: olderDraft.draftId }),
      phase: "failed",
    });
    expect((await repository.list(ownerScope)).map(({ draftId }) => draftId))
      .toEqual([olderDraft.draftId]);
  });

  it("reveals the next durable plan draft after loading latest and discarding a conflict", async () => {
    const repository = createInMemoryDraftRepository();
    const olderDraft = createPlanMutationDraft(
      ownerScope,
      createIntent(),
      "2026-07-27T08:00:00Z",
    );
    const newerDraft = createPlanMutationDraft(
      ownerScope,
      { ...createIntent(), idempotencyKey: "plan-load-newer-draft-1234567" },
      "2026-07-27T09:00:00Z",
    );
    await repository.put(olderDraft);
    await repository.put(newerDraft);
    workflowMocks.getCurrentPlan.mockResolvedValue({ plan: planFixture() });
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.workflow?.draft?.draftId)
      .toBe(newerDraft.draftId));
    await act(async () => result.current.loadLatest());

    expect(result.current.workflow).toMatchObject({
      draft: expect.objectContaining({ draftId: olderDraft.draftId }),
      phase: "failed",
    });
    expect((await repository.list(ownerScope)).map(({ draftId }) => draftId))
      .toEqual([olderDraft.draftId]);
  });

  it("locks writes and exposes recovery when the durable draft inspection fails", async () => {
    const baseRepository = createInMemoryDraftRepository();
    const repository = {
      ...baseRepository,
      list: vi.fn(async () => {
        throw new Error("IndexedDB unavailable");
      }),
    };
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    expect(result.current.inspectionFailure).toMatchObject({
      code: "PLAN_DRAFT_RECONCILIATION_FAILED",
      state: "recoverable-error",
    });
    await act(async () => {
      expect(await result.current.submit(createIntent())).toBe(false);
    });
    expect(workflowMocks.mutatePlan).not.toHaveBeenCalled();
  });

  it("lets only the foreground attempt-lease winner submit across two tabs", async () => {
    const repository = createInMemoryDraftRepository();
    const draft = createPlanMutationDraft(ownerScope, createIntent());
    await repository.put(draft);
    const markAttempt = vi.spyOn(repository, "markAttempt");
    const acknowledge = vi.spyOn(repository, "acknowledge");
    const discard = vi.spyOn(repository, "discard");
    let resolveMutation: (response: {
      planId: string;
      planVersion: number;
      taskIds: string[];
    }) => void = () => undefined;
    workflowMocks.mutatePlan.mockImplementation(() => new Promise((resolve) => {
      resolveMutation = resolve;
    }));
    const first = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });
    const second = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });
    await waitFor(() => {
      expect(first.result.current.workflow?.phase).toBe("failed");
      expect(second.result.current.workflow?.phase).toBe("failed");
    });

    let firstRetry: Promise<boolean> = Promise.resolve(false);
    let secondRetry: Promise<boolean> = Promise.resolve(false);
    act(() => {
      firstRetry = first.result.current.retry();
      secondRetry = second.result.current.retry();
    });

    await waitFor(() => expect(workflowMocks.mutatePlan).toHaveBeenCalledOnce());
    await waitFor(() => expect([
      first.result.current.workflow?.phase,
      second.result.current.workflow?.phase,
    ].sort()).toEqual(["reconciling", "retrying"]));
    expect(markAttempt).toHaveBeenCalledTimes(2);
    expect(discard).not.toHaveBeenCalled();

    resolveMutation({ planId, planVersion: 2, taskIds: [] });
    await act(async () => {
      await Promise.all([firstRetry, secondRetry]);
    });

    expect(workflowMocks.mutatePlan).toHaveBeenCalledOnce();
    expect(acknowledge).toHaveBeenCalledOnce();
    expect(acknowledge).toHaveBeenCalledWith(expect.objectContaining({
      attemptCount: 1,
      draftId: draft.draftId,
      lastAttemptAt: expect.any(String),
    }));
    expect(discard).not.toHaveBeenCalled();
  });

  it("publishes the foreground draft only after its attempt lease is durable", async () => {
    const baseRepository = createInMemoryDraftRepository();
    const sequence: string[] = [];
    const repository = {
      ...baseRepository,
      markAttempt: vi.fn(async (source: RecoverableDraft) => {
        const attempted = await baseRepository.markAttempt(source);
        sequence.push(attempted?.lastAttemptAt === null || attempted === null
          ? "lease-missing"
          : "lease-durable");
        return attempted;
      }),
    };
    const recordPublish = () => sequence.push("published");
    window.addEventListener(PLAN_DRAFT_CHANGED_EVENT, recordPublish);
    workflowMocks.mutatePlan.mockResolvedValue({
      planId,
      planVersion: 1,
      taskIds: [],
    });
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));

    await act(async () => {
      expect(await result.current.submit(createIntent())).toBe(true);
    });

    window.removeEventListener(PLAN_DRAFT_CHANGED_EVENT, recordPublish);
    expect(sequence).toEqual(["lease-durable", "published"]);
  });

  it("does not acquire a lease or send after unmount during durable persistence", async () => {
    const baseRepository = createInMemoryDraftRepository();
    let releasePut: () => void = () => undefined;
    let notifyPutStarted: () => void = () => undefined;
    const putStarted = new Promise<void>((resolve) => {
      notifyPutStarted = resolve;
    });
    const putBlocked = new Promise<void>((resolve) => {
      releasePut = resolve;
    });
    const repository = {
      ...baseRepository,
      markAttempt: vi.fn(baseRepository.markAttempt),
      put: vi.fn(async (draft: RecoverableDraft) => {
        notifyPutStarted();
        await putBlocked;
        await baseRepository.put(draft);
      }),
    };
    let published = 0;
    const recordPublish = () => {
      published += 1;
    };
    window.addEventListener(PLAN_DRAFT_CHANGED_EVENT, recordPublish);
    const { result, unmount } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));

    let submission: Promise<boolean> = Promise.resolve(true);
    act(() => {
      submission = result.current.submit(createIntent());
    });
    await putStarted;
    unmount();
    releasePut();
    await expect(submission).resolves.toBe(false);
    window.removeEventListener(PLAN_DRAFT_CHANGED_EVENT, recordPublish);

    expect(await baseRepository.list(ownerScope)).toHaveLength(1);
    expect((await baseRepository.list(ownerScope))[0]?.lastAttemptAt).toBeNull();
    expect(published).toBe(1);
    expect(repository.markAttempt).not.toHaveBeenCalled();
    expect(workflowMocks.verifyOwner).not.toHaveBeenCalled();
    expect(workflowMocks.mutatePlan).not.toHaveBeenCalled();
  });

  it("does not acquire a lease or send after unmount during retry inspection", async () => {
    const baseRepository = createInMemoryDraftRepository();
    const draft = createPlanMutationDraft(ownerScope, createIntent());
    await baseRepository.put(draft);
    let listCount = 0;
    let releaseRetryList: () => void = () => undefined;
    let notifyRetryListStarted: () => void = () => undefined;
    const retryListStarted = new Promise<void>((resolve) => {
      notifyRetryListStarted = resolve;
    });
    const retryListBlocked = new Promise<void>((resolve) => {
      releaseRetryList = resolve;
    });
    const repository = {
      ...baseRepository,
      list: vi.fn(async (scope: string) => {
        listCount += 1;
        if (listCount === 1) return baseRepository.list(scope);
        notifyRetryListStarted();
        await retryListBlocked;
        return baseRepository.list(scope);
      }),
      markAttempt: vi.fn(baseRepository.markAttempt),
    };
    const { result, unmount } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.workflow?.phase).toBe("failed"));

    let retry: Promise<boolean> = Promise.resolve(true);
    act(() => {
      retry = result.current.retry();
    });
    await retryListStarted;
    unmount();
    releaseRetryList();
    await expect(retry).resolves.toBe(false);

    expect(repository.markAttempt).not.toHaveBeenCalled();
    expect(workflowMocks.verifyOwner).not.toHaveBeenCalled();
    expect(workflowMocks.mutatePlan).not.toHaveBeenCalled();
  });

  it("does not send a persisted draft after the operation epoch is superseded", async () => {
    const baseRepository = createInMemoryDraftRepository();
    let releasePut: () => void = () => undefined;
    let notifyPutStarted: () => void = () => undefined;
    const putStarted = new Promise<void>((resolve) => {
      notifyPutStarted = resolve;
    });
    const putBlocked = new Promise<void>((resolve) => {
      releasePut = resolve;
    });
    const repository = {
      ...baseRepository,
      markAttempt: vi.fn(baseRepository.markAttempt),
      put: vi.fn(async (draft: RecoverableDraft) => {
        notifyPutStarted();
        await putBlocked;
        await baseRepository.put(draft);
      }),
    };
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));

    let submission: Promise<boolean> = Promise.resolve(true);
    act(() => {
      submission = result.current.submit(createIntent());
    });
    await putStarted;
    await act(async () => result.current.discard());
    let submitted = true;
    await act(async () => {
      releasePut();
      submitted = await submission;
    });
    expect(submitted).toBe(false);

    expect(repository.markAttempt).not.toHaveBeenCalled();
    expect(workflowMocks.mutatePlan).not.toHaveBeenCalled();
    expect(await baseRepository.list(ownerScope)).toHaveLength(1);
  });

  it("does not resurrect a workflow when an older load-latest fails after discard", async () => {
    const repository = createInMemoryDraftRepository();
    const draft = createPlanMutationDraft(ownerScope, createIntent());
    await repository.put(draft);
    let rejectLoad: (reason?: unknown) => void = () => undefined;
    workflowMocks.getCurrentPlan.mockImplementation(() => new Promise((_resolve, reject) => {
      rejectLoad = reject;
    }));
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.workflow?.phase).toBe("failed"));

    let loading: Promise<void> = Promise.resolve();
    act(() => {
      loading = result.current.loadLatest();
    });
    await waitFor(() => expect(workflowMocks.getCurrentPlan).toHaveBeenCalledOnce());
    await act(async () => result.current.discard());
    expect(result.current.workflow).toBeNull();

    await act(async () => {
      rejectLoad(new ApiError({
        code: "PLAN_LOAD_FAILED",
        message: "Late load failure",
        requestId: "request-late-load-failure",
        retryable: true,
        status: 503,
      }));
      await loading;
    });

    expect(result.current.workflow).toBeNull();
    expect(await repository.list(ownerScope)).toEqual([]);
  });

  it("does not resurrect a workflow when an older discard fails after load-latest", async () => {
    const baseRepository = createInMemoryDraftRepository();
    const draft = createPlanMutationDraft(ownerScope, createIntent());
    await baseRepository.put(draft);
    let discardCalls = 0;
    let rejectOldDiscard: (reason?: unknown) => void = () => undefined;
    let notifyOldDiscardStarted: () => void = () => undefined;
    const oldDiscardStarted = new Promise<void>((resolve) => {
      notifyOldDiscardStarted = resolve;
    });
    const repository = {
      ...baseRepository,
      discard: vi.fn(async (source: RecoverableDraft) => {
        discardCalls += 1;
        if (discardCalls === 1) {
          notifyOldDiscardStarted();
          return new Promise<boolean>((_resolve, reject) => {
            rejectOldDiscard = reject;
          });
        }
        return baseRepository.discard(source);
      }),
    };
    workflowMocks.getCurrentPlan.mockResolvedValue({ plan: planFixture() });
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.workflow?.phase).toBe("failed"));

    let discarding: Promise<void> = Promise.resolve();
    act(() => {
      discarding = result.current.discard();
    });
    await oldDiscardStarted;
    await act(async () => result.current.loadLatest());
    expect(result.current.workflow).toBeNull();

    await act(async () => {
      rejectOldDiscard(new Error("Late discard failure"));
      await discarding;
    });

    expect(result.current.workflow).toBeNull();
    expect(await baseRepository.list(ownerScope)).toEqual([]);
  });

  it("exact-discards an invalid plan payload and keeps writes usable", async () => {
    const repository = createInMemoryDraftRepository();
    const invalidDraft = createRecoverableDraft({
      idempotencyKey: "plan-invalid-payload-draft-12345",
      kind: "plan.create",
      ownerScope,
      payload: {
        role: 42,
        season: "2027-summer",
        track: "internship",
        weeklyHours: 8,
      },
      resourceId: "current",
      serverVersion: null,
    });
    await repository.put(invalidDraft);
    workflowMocks.mutatePlan.mockResolvedValue({
      planId,
      planVersion: 1,
      taskIds: [],
    });
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    expect(result.current.inspectionFailure).toBeNull();
    expect(result.current.workflow).toBeNull();
    expect(await repository.list(ownerScope)).toEqual([]);

    await act(async () => {
      expect(await result.current.submit(createIntent())).toBe(true);
    });
    expect(workflowMocks.mutatePlan).toHaveBeenCalledOnce();
  });

  it("exact-discards domain-invalid task metadata instead of locking recovery", async () => {
    const repository = createInMemoryDraftRepository();
    const intent: CompletePlanTaskIntent = {
      idempotencyKey: "plan-invalid-task-metadata-12345",
      kind: "complete-task",
      request: { planVersion: 4, taskVersion: 2 },
      taskId,
    };
    const invalidDraft = {
      ...createPlanMutationDraft(ownerScope, intent),
      resourceId: "not-a-task-uuid",
    };
    await repository.put(invalidDraft);
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    expect(result.current.inspectionFailure).toBeNull();
    expect(result.current.workflow).toBeNull();
    expect(await repository.list(ownerScope)).toEqual([]);
    expect(workflowMocks.mutatePlan).not.toHaveBeenCalled();
  });

  it("continues from an invalid newest plan draft to the next valid draft", async () => {
    const repository = createInMemoryDraftRepository();
    const validDraft = createPlanMutationDraft(
      ownerScope,
      createIntent(),
      "2026-07-27T08:00:00Z",
    );
    const invalidDraft = createRecoverableDraft({
      idempotencyKey: "plan-invalid-newest-draft-12345",
      kind: "plan.create",
      ownerScope,
      payload: { role: "quantResearch" },
      resourceId: "current",
      serverVersion: null,
      updatedAt: "2026-07-27T09:00:00Z",
    });
    await repository.put(validDraft);
    await repository.put(invalidDraft);
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.workflow?.draft?.draftId)
      .toBe(validDraft.draftId));
    expect(result.current.inspectionFailure).toBeNull();
    expect((await repository.list(ownerScope)).map(({ draftId }) => draftId))
      .toEqual([validDraft.draftId]);
  });

  it("keeps writes locked when an invalid plan draft cannot be exact-discarded", async () => {
    const baseRepository = createInMemoryDraftRepository();
    const invalidDraft = createRecoverableDraft({
      idempotencyKey: "plan-invalid-retained-draft-12345",
      kind: "plan.create",
      ownerScope,
      payload: { weeklyHours: "eight" },
      resourceId: "current",
      serverVersion: null,
    });
    await baseRepository.put(invalidDraft);
    const repository = {
      ...baseRepository,
      discard: vi.fn(async () => false),
    };
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.inspectionFailure).toMatchObject({
      code: "PLAN_DRAFT_RECONCILIATION_FAILED",
    }));
    expect(await baseRepository.list(ownerScope)).toEqual([invalidDraft]);
    await act(async () => {
      expect(await result.current.submit(createIntent())).toBe(false);
    });
    expect(workflowMocks.mutatePlan).not.toHaveBeenCalled();
  });

  it("discovers a new durable plan draft while the tab is otherwise idle", async () => {
    const repository = createInMemoryDraftRepository();
    const draft = createPlanMutationDraft(ownerScope, createIntent());
    const { result } = renderHook(() => usePlanMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    expect(result.current.workflow).toBeNull();

    await repository.put(draft);
    act(() => publishPlanDraftChanged("acct-aaaaaaaaaaaaaaaa"));
    expect(result.current.workflow).toBeNull();
    act(() => publishPlanDraftChanged(ownerScope));

    await waitFor(() => expect(result.current.workflow).toMatchObject({
      draft: expect.objectContaining({ draftId: draft.draftId }),
      phase: "failed",
    }));
  });
});

describe("createIntentMatchesPlan", () => {
  it("compares the complete server creation identity", () => {
    const intent = createIntent();
    expect(createIntentMatchesPlan(intent, planFixture())).toBe(true);
    expect(createIntentMatchesPlan(
      intent,
      planFixture({ weeklyHours: 12 }),
    )).toBe(false);
    expect(createIntentMatchesPlan(intent, null)).toBe(false);
  });
});
