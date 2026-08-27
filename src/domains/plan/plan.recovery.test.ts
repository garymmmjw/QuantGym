import { QueryClient } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import type {
  CompletePlanTaskIntent,
  CreatePlanIntent,
  PlanMutationIntent,
  UpdatePlanTaskIntent,
} from "./plan.mutations";
import {
  diagnosticQuestionIds,
  type CurrentPlanResponse,
  type OfficialPlan,
  type OfficialPlanTask,
} from "./plan.schema";
import {
  cacheCurrentPlanMonotonically,
  createPlanMutationDraft,
  planTaskIntentIsSatisfied,
  persistPlanMutationDraft,
  recoverPlanMutationIntent,
  replayPlanMutationDrafts,
} from "./plan.recovery";
import { createInMemoryDraftRepository } from "../../shared/storage/drafts";

const ownerScope = "acct-1234567890abcdef";
const taskId = "29584c83-7297-44ef-b985-f38e6c95de76";
const planId = "30ba30c0-781d-45be-9fb2-a667340a2f56";
const replacementPlanId = "c57d0956-38c0-40c9-a1c6-bd65d26e0f69";
const csrfProof = "session-proof-0123456789abcdef";
const verifyOwner = async (): Promise<void> => undefined;

const createIntent: CreatePlanIntent = {
  idempotencyKey: "plan-create-intent-12345678",
  kind: "create",
  request: {
    role: "Quant Researcher",
    season: "2027 Spring",
    track: "internship",
    weeklyHours: 8,
  },
};

const updateIntent: UpdatePlanTaskIntent = {
  idempotencyKey: "plan-update-intent-12345678",
  kind: "update-task",
  request: {
    planVersion: 4,
    taskVersion: 2,
    title: "复习概率论",
  },
  taskId,
};

const completeIntent: CompletePlanTaskIntent = {
  idempotencyKey: "plan-complete-intent-123456",
  kind: "complete-task",
  request: { planVersion: 4, taskVersion: 2 },
  taskId,
};

const taskResponse = (
  overrides: Partial<OfficialPlanTask> = {},
): OfficialPlanTask => ({
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
  title: "原始任务",
  updatedAt: "2026-07-27T02:00:00Z",
  version: 2,
  ...overrides,
});

const currentPlanResponse = (
  task: OfficialPlanTask,
  overrides: Partial<OfficialPlan> = {},
): CurrentPlanResponse => ({
  plan: {
    createdAt: "2026-07-27T02:00:00Z",
    diagnosticScore: 0,
    diagnosticScores: {},
    diagnosticStatus: "pending",
    id: planId,
    progress: { completed: task.status === "completed" ? 1 : 0, total: 1 },
    recommendations: [],
    role: "Quant Researcher",
    season: "2027 Spring",
    status: "active",
    tasks: [task],
    track: "internship",
    updatedAt: "2026-07-27T03:00:00Z",
    version: 5,
    weeklyHours: 8,
    ...overrides,
  },
});

const conflictResponse = () => HttpResponse.json({
  code: "PLAN_TASK_VERSION_CONFLICT",
  fieldErrors: {},
  message: "任务已在其他位置更新。",
  requestId: "req_plan_recovery_conflict",
  retryable: false,
}, { status: 409 });

const alreadyActiveResponse = () => HttpResponse.json({
  code: "PLAN_ALREADY_ACTIVE",
  fieldErrors: {},
  message: "A plan already exists.",
  requestId: "req_plan_recovery_already_active",
  retryable: false,
}, { status: 409 });

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  vi.spyOn(document, "cookie", "get").mockReturnValue(
    `__Host-qg_csrf=${csrfProof}`,
  );
});
afterEach(() => {
  server.resetHandlers();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const roundTripIntents: readonly PlanMutationIntent[] = [
  createIntent,
  {
    idempotencyKey: "plan-diagnostic-intent-1234",
    kind: "diagnostic",
    request: {
      answers: diagnosticQuestionIds.map((questionId) => ({
        optionId: "recovery-test-option",
        questionId,
      })),
      definitionVersion: "baseline-v1",
      planVersion: 4,
    },
  },
  updateIntent,
  completeIntent,
];

describe("Plan draft recovery", () => {
  it.each(roundTripIntents)(
    "round-trips the $kind intent through a versioned draft",
    (intent) => {
      const draft = createPlanMutationDraft(ownerScope, intent);

      expect(recoverPlanMutationIntent(draft)).toEqual(intent);
      expect(draft.serverVersion).toBe(
        "planVersion" in intent.request ? intent.request.planVersion : null,
      );
    },
  );

  it.each([
    {
      draft: { ...createPlanMutationDraft(ownerScope, createIntent), resourceId: "other" },
      label: "create resource identity",
    },
    {
      draft: { ...createPlanMutationDraft(ownerScope, createIntent), serverVersion: 1 },
      label: "create version metadata",
    },
    {
      draft: { ...createPlanMutationDraft(ownerScope, updateIntent), resourceId: "not-a-uuid" },
      label: "task resource identity",
    },
    {
      draft: { ...createPlanMutationDraft(ownerScope, completeIntent), serverVersion: 99 },
      label: "task plan version metadata",
    },
  ])("rejects domain-invalid $label before replay", ({ draft }) => {
    expect(() => recoverPlanMutationIntent(draft)).toThrow();
  });

  it("persists one stable local retry identity for every plan intent", async () => {
    const repository = createInMemoryDraftRepository();
    for (const intent of roundTripIntents) {
      const draft = await persistPlanMutationDraft(ownerScope, intent, repository);
      expect(draft.idempotencyKey).toBe(intent.idempotencyKey);
      expect(recoverPlanMutationIntent(draft)).toEqual(intent);
    }

    expect((await repository.list(ownerScope))
      .map(({ idempotencyKey }) => idempotencyKey)
      .sort())
      .toEqual(roundTripIntents
        .map(({ idempotencyKey }) => idempotencyKey)
        .sort());
  });

  it("acknowledges a lost update response only after refetch proves the intent", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const draft = await persistPlanMutationDraft(ownerScope, updateIntent, repository);
    server.use(
      http.patch("*/api/v2/plans/current/tasks/:taskId", conflictResponse),
      http.get("*/api/v2/plans/current", () => HttpResponse.json(
        currentPlanResponse(taskResponse({ title: "复习概率论", version: 3 })),
      )),
    );

    const report = await replayPlanMutationDrafts({
      csrfProof,
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });

    expect(report.acknowledged).toEqual([draft.draftId]);
    expect(await repository.list(ownerScope)).toEqual([]);
    expect(queryClient.getQueryData<CurrentPlanResponse>(
      ["plans", ownerScope, "current"],
    )?.plan?.tasks[0]?.title).toBe("复习概率论");
    queryClient.clear();
  });

  it("acknowledges an already-created plan only after refetch proves all four fields", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const draft = await persistPlanMutationDraft(ownerScope, createIntent, repository);
    server.use(
      http.post("*/api/v2/plans", alreadyActiveResponse),
      http.get("*/api/v2/plans/current", () => HttpResponse.json(
        currentPlanResponse(taskResponse()),
      )),
    );

    const report = await replayPlanMutationDrafts({
      csrfProof,
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });

    expect(report.acknowledged).toEqual([draft.draftId]);
    expect(await repository.list(ownerScope)).toEqual([]);
    expect(queryClient.getQueryData<CurrentPlanResponse>(
      ["plans", ownerScope, "current"],
    )?.plan).toEqual(expect.objectContaining(createIntent.request));
    queryClient.clear();
  });

  it.each([
    ["role", { role: "Quant Developer" }],
    ["season", { season: "2028 Spring" }],
    ["track", { track: "fulltime" as const }],
    ["weeklyHours", { weeklyHours: 12 as const }],
  ] as const)(
    "retains an already-active create draft when %s differs",
    async (_field, overrides) => {
      const repository = createInMemoryDraftRepository();
      const queryClient = new QueryClient();
      const draft = await persistPlanMutationDraft(ownerScope, createIntent, repository);
      server.use(
        http.post("*/api/v2/plans", alreadyActiveResponse),
        http.get("*/api/v2/plans/current", () => HttpResponse.json(
          currentPlanResponse(taskResponse(), overrides),
        )),
      );

      const report = await replayPlanMutationDrafts({
        csrfProof,
        ownerScope,
        queryClient,
        repository,
        verifyOwner,
      });

      expect(report.retained).toEqual([{
        code: "PLAN_ALREADY_ACTIVE",
        draftId: draft.draftId,
        reason: "deferred",
        requestId: "req_plan_recovery_already_active",
        retryable: false,
        state: "stale-version-conflict",
      }]);
      expect(await repository.list(ownerScope)).toHaveLength(1);
      queryClient.clear();
    },
  );

  it("keeps a CAS-conflicted draft when refetch does not prove its target state", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    queryClient.setQueryData(["dashboard", ownerScope, "overview"], { stale: true });
    const draft = await persistPlanMutationDraft(ownerScope, updateIntent, repository);
    server.use(
      http.patch("*/api/v2/plans/current/tasks/:taskId", conflictResponse),
      http.get("*/api/v2/plans/current", () => HttpResponse.json(
        currentPlanResponse(taskResponse({ title: "其他位置的修改", version: 3 })),
      )),
    );

    const report = await replayPlanMutationDrafts({
      csrfProof,
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });

    expect(report.retained).toEqual([{
      code: "PLAN_TASK_VERSION_CONFLICT",
      draftId: draft.draftId,
      reason: "deferred",
      requestId: "req_plan_recovery_conflict",
      retryable: false,
      state: "stale-version-conflict",
    }]);
    expect(await repository.list(ownerScope)).toHaveLength(1);
    expect(queryClient.getQueryData<CurrentPlanResponse>(
      ["plans", ownerScope, "current"],
    )?.plan?.tasks[0]?.title).toBe("其他位置的修改");
    expect(queryClient.getQueryState(
      ["dashboard", ownerScope, "overview"],
    )?.isInvalidated).toBe(true);
    queryClient.clear();
  });

  it("never lets a late reconciliation read roll the cached plan version backward", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const draft = await persistPlanMutationDraft(ownerScope, updateIntent, repository);
    const newer = currentPlanResponse(
      taskResponse({ title: "更新后的版本", version: 7 }),
      { version: 9 },
    );
    queryClient.setQueryData(["plans", ownerScope, "current"], newer);
    server.use(
      http.patch("*/api/v2/plans/current/tasks/:taskId", conflictResponse),
      http.get("*/api/v2/plans/current", () => HttpResponse.json(
        currentPlanResponse(taskResponse({ title: "复习概率论", version: 3 })),
      )),
    );

    const report = await replayPlanMutationDrafts({
      csrfProof,
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });

    expect(report.retained).toEqual([expect.objectContaining({
      draftId: draft.draftId,
      state: "stale-version-conflict",
    })]);
    expect(cacheCurrentPlanMonotonically(
      queryClient,
      ownerScope,
      currentPlanResponse(taskResponse(), { version: 5 }),
    )).toBe(newer);
    expect(queryClient.getQueryData(["plans", ownerScope, "current"])).toBe(newer);
    expect(await repository.list(ownerScope)).toHaveLength(1);
    queryClient.clear();
  });

  it("accepts an owner-verified plan identity change or absence instead of comparing versions", () => {
    const queryClient = new QueryClient();
    const cached = currentPlanResponse(taskResponse({ version: 7 }), { version: 9 });
    const replacement = currentPlanResponse(
      taskResponse({ planId: replacementPlanId, version: 1 }),
      { id: replacementPlanId, version: 1 },
    );
    queryClient.setQueryData(["plans", ownerScope, "current"], cached);

    expect(cacheCurrentPlanMonotonically(
      queryClient,
      ownerScope,
      replacement,
    )).toBe(replacement);
    expect(queryClient.getQueryData(["plans", ownerScope, "current"])).toEqual(
      replacement,
    );

    queryClient.setQueryData(["plans", ownerScope, "current"], cached);
    const noCurrentPlan: CurrentPlanResponse = { plan: null };
    expect(cacheCurrentPlanMonotonically(
      queryClient,
      ownerScope,
      noCurrentPlan,
    )).toBe(noCurrentPlan);
    expect(queryClient.getQueryData(["plans", ownerScope, "current"])).toEqual(
      noCurrentPlan,
    );
    queryClient.clear();
  });

  it("only treats the matching current task as a completed intent", () => {
    expect(planTaskIntentIsSatisfied(
      currentPlanResponse(taskResponse({
        completedAt: "2026-07-27T03:00:00Z",
        status: "completed",
        version: 3,
      })),
      completeIntent,
    )).toBe(true);
    expect(planTaskIntentIsSatisfied({ plan: null }, completeIntent)).toBe(false);
    expect(planTaskIntentIsSatisfied(
      currentPlanResponse(taskResponse({ id: "f4914d1f-7c84-4d38-8581-13cc028894cf" })),
      completeIntent,
    )).toBe(false);
  });
});
