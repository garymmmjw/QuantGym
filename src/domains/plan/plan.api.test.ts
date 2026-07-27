import { QueryClient } from "@tanstack/react-query";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import {
  acknowledgePlanTaskMutation,
  completePlanTask,
  createPlan,
  invalidatePlanReadModels,
  newCompletePlanTaskIntent,
  newCreatePlanIntent,
  newRunPlanDiagnosticIntent,
  newUpdatePlanTaskIntent,
  runPlanDiagnostic,
  updatePlanTask,
} from "./plan.mutations";
import {
  getCurrentPlan,
  planQueryKeys,
} from "./plan.queries";
import {
  diagnosticQuestionIds,
  type CurrentPlanResponse,
  type DiagnosticAnswerRequest,
  type OfficialPlan,
  type OfficialPlanTask,
} from "./plan.schema";

const ownerScope = "acct-1234567890abcdef";
const otherOwnerScope = "acct-fedcba0987654321";
const csrfProof = "session-proof-0123456789abcdef";
const planId = "10000000-0000-4000-8000-000000000001";
const taskId = "20000000-0000-4000-8000-000000000002";

const task: OfficialPlanTask = {
  actionTarget: "problems",
  completedAt: null,
  createdAt: "2026-07-27T02:00:00Z",
  detail: "完成一道概率题",
  estimatedMinutes: 30,
  id: taskId,
  planId,
  recommendationId: null,
  scheduledFor: "2026-07-27",
  skillKey: "probability",
  sortOrder: 0,
  status: "open",
  targetProblemId: "30000000-0000-4000-8000-000000000003",
  title: "今日概率训练",
  updatedAt: "2026-07-27T02:00:00Z",
  version: 3,
};

const plan: OfficialPlan = {
  createdAt: "2026-07-27T02:00:00Z",
  diagnosticScore: 0,
  diagnosticScores: {},
  diagnosticStatus: "pending",
  id: planId,
  progress: { completed: 0, total: 1 },
  recommendations: [],
  role: "quant-research",
  season: "2027-summer",
  status: "active",
  tasks: [task],
  track: "internship",
  updatedAt: "2026-07-27T02:00:00Z",
  version: 5,
  weeklyHours: 8,
};

const currentPlan: CurrentPlanResponse = { plan };
const diagnosticAnswers: DiagnosticAnswerRequest[] = diagnosticQuestionIds.map(
  (questionId) => ({ optionId: "option-a", questionId }),
);

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("official plan API client", () => {
  it("loads a validated owner-scoped current plan and forwards cancellation", async () => {
    server.use(
      http.get("*/api/v2/plans/current", async () => {
        await delay("infinite");
        return HttpResponse.json(currentPlan);
      }),
    );
    const controller = new AbortController();
    const pending = getCurrentPlan(controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });

    expect(planQueryKeys.current(ownerScope)).not.toEqual(
      planQueryKeys.current(otherOwnerScope),
    );
  });

  it("rejects a malformed current-plan response at the network boundary", async () => {
    server.use(
      http.get("*/api/v2/plans/current", () => HttpResponse.json({
        plan: { ...plan, version: 0 },
      })),
    );

    await expect(getCurrentPlan()).rejects.toThrow();
  });

  it("reuses one idempotency key for one create intent and creates a new key for a new intent", async () => {
    const observedKeys: string[] = [];
    server.use(
      http.post("*/api/v2/plans", async ({ request }) => {
        observedKeys.push(request.headers.get("x-idempotency-key") ?? "");
        expect(request.headers.get("x-csrf-token")).toBe(csrfProof);
        await expect(request.json()).resolves.toEqual({
          role: "quant-research",
          season: "2027-summer",
          track: "internship",
          weeklyHours: 8,
        });
        return HttpResponse.json({
          planId,
          planVersion: 1,
          taskIds: [taskId],
        }, { status: 201 });
      }),
    );

    const intent = newCreatePlanIntent({
      role: "  quant-research  ",
      season: "  2027-summer  ",
      track: "internship",
      weeklyHours: 8,
    });
    await createPlan(intent, csrfProof);
    await createPlan(intent, csrfProof);
    const nextIntent = newCreatePlanIntent(intent.request);
    await createPlan(nextIntent, csrfProof);

    expect(observedKeys).toEqual([
      intent.idempotencyKey,
      intent.idempotencyKey,
      nextIntent.idempotencyKey,
    ]);
    expect(nextIntent.idempotencyKey).not.toBe(intent.idempotencyKey);
  });

  it("sends the diagnostic definition and stable version with its own intent key", async () => {
    server.use(
      http.post("*/api/v2/plans/current/diagnostic", async ({ request }) => {
        const payload = await request.json();
        expect(request.headers.get("x-idempotency-key")).toHaveLength(36);
        expect(payload).toEqual({
          answers: diagnosticAnswers,
          definitionVersion: "baseline-v1",
          planVersion: 5,
        });
        return HttpResponse.json({
          planId,
          planVersion: 6,
          recommendationIds: ["40000000-0000-4000-8000-000000000004"],
        });
      }),
    );

    const intent = newRunPlanDiagnosticIntent(plan, diagnosticAnswers);
    await expect(runPlanDiagnostic(intent, csrfProof)).resolves.toEqual({
      planId,
      planVersion: 6,
      recommendationIds: ["40000000-0000-4000-8000-000000000004"],
    });
  });

  it("binds task edits and completion to both acknowledged resource versions", async () => {
    const updatedTask = { ...task, title: "调整后的训练", version: 4 };
    const completedTask: OfficialPlanTask = {
      ...updatedTask,
      completedAt: "2026-07-27T03:00:00Z",
      status: "completed",
      version: 5,
    };
    server.use(
      http.patch(
        "*/api/v2/plans/current/tasks/:taskId",
        async ({ params, request }) => {
          expect(params.taskId).toBe(taskId);
          expect(request.headers.get("x-idempotency-key")).toBeNull();
          await expect(request.json()).resolves.toEqual({
            planVersion: 5,
            taskVersion: 3,
            title: "调整后的训练",
          });
          return HttpResponse.json({ planVersion: 6, task: updatedTask });
        },
      ),
      http.post(
        "*/api/v2/plans/current/tasks/:taskId/complete",
        async ({ request }) => {
          expect(request.headers.get("x-idempotency-key")).toBeNull();
          await expect(request.json()).resolves.toEqual({
            planVersion: 5,
            taskVersion: 3,
          });
          return HttpResponse.json({ planVersion: 6, task: completedTask });
        },
      ),
    );

    await expect(updatePlanTask(
      newUpdatePlanTaskIntent(plan, task, { title: "调整后的训练" }),
      csrfProof,
    )).resolves.toEqual({ planVersion: 6, task: updatedTask });
    await expect(completePlanTask(
      newCompletePlanTaskIntent(plan, task),
      csrfProof,
    )).resolves.toEqual({ planVersion: 6, task: completedTask });
  });

  it("keeps local retry identity without sending an unsupported server header", async () => {
    const updateIntent = newUpdatePlanTaskIntent(plan, task, {
      title: "调整后的训练",
    });
    const completeIntent = newCompletePlanTaskIntent(plan, task);
    const observedHeaders: Array<string | null> = [];
    server.use(
      http.patch("*/api/v2/plans/current/tasks/:taskId", ({ request }) => {
        observedHeaders.push(request.headers.get("x-idempotency-key"));
        return HttpResponse.json({ planVersion: 6, task });
      }),
      http.post("*/api/v2/plans/current/tasks/:taskId/complete", ({ request }) => {
        observedHeaders.push(request.headers.get("x-idempotency-key"));
        return HttpResponse.json({ planVersion: 6, task });
      }),
    );

    await updatePlanTask(updateIntent, csrfProof);
    await completePlanTask(completeIntent, csrfProof);

    expect(observedHeaders).toEqual([null, null]);
    expect(updateIntent.idempotencyKey).toHaveLength(36);
    expect(completeIntent.idempotencyKey).toHaveLength(36);
    expect(newUpdatePlanTaskIntent(plan, task, { title: "调整后的训练" }).idempotencyKey)
      .not.toBe(updateIntent.idempotencyKey);
    expect(newCompletePlanTaskIntent(plan, task).idempotencyKey)
      .not.toBe(completeIntent.idempotencyKey);
  });

  it("patches only the matching owner's acknowledged task and invalidates owner read models", async () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(planQueryKeys.current(ownerScope), currentPlan);
    queryClient.setQueryData(planQueryKeys.current(otherOwnerScope), currentPlan);
    queryClient.setQueryData(["dashboard", ownerScope, "overview"], { marker: 1 });
    queryClient.setQueryData(["dashboard", otherOwnerScope, "overview"], { marker: 2 });
    const acknowledged = {
      planVersion: 6,
      task: {
        ...task,
        completedAt: "2026-07-27T03:00:00Z",
        status: "completed" as const,
        version: 4,
      },
    };
    const intent = newCompletePlanTaskIntent(plan, task);

    acknowledgePlanTaskMutation(queryClient, ownerScope, intent, acknowledged);
    expect(queryClient.getQueryData<CurrentPlanResponse>(
      planQueryKeys.current(ownerScope),
    )?.plan).toEqual(expect.objectContaining({
      progress: { completed: 1, total: 1 },
      version: 6,
    }));
    expect(queryClient.getQueryData(
      planQueryKeys.current(otherOwnerScope),
    )).toEqual(currentPlan);

    await invalidatePlanReadModels(queryClient, ownerScope);
    expect(queryClient.getQueryState(
      planQueryKeys.current(ownerScope),
    )?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(
      ["dashboard", ownerScope, "overview"],
    )?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(
      ["dashboard", otherOwnerScope, "overview"],
    )?.isInvalidated).toBe(false);
    queryClient.clear();
  });

  it("never lets a late task acknowledgement roll cached versions backward", () => {
    const queryClient = new QueryClient();
    const currentTask = { ...task, title: "较新的任务", version: 5 };
    const newer: CurrentPlanResponse = {
      plan: { ...plan, tasks: [currentTask], version: 7 },
    };
    queryClient.setQueryData(planQueryKeys.current(ownerScope), newer);
    const staleAcknowledgement = {
      planVersion: 6,
      task: { ...task, title: "迟到的响应", version: 4 },
    };

    acknowledgePlanTaskMutation(
      queryClient,
      ownerScope,
      newUpdatePlanTaskIntent(plan, task, { title: "迟到的响应" }),
      staleAcknowledgement,
    );

    expect(queryClient.getQueryData(planQueryKeys.current(ownerScope))).toEqual(newer);
    queryClient.clear();
  });

  it("rejects a task from another plan before making a request", () => {
    expect(() => newUpdatePlanTaskIntent(
      plan,
      { ...task, planId: "50000000-0000-4000-8000-000000000005" },
      { title: "不应发送" },
    )).toThrow("PLAN_TASK_MISMATCH");
  });
});
