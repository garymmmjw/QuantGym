import "@testing-library/jest-dom/vitest";

import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import type { PlanMutationIntent } from "../../domains/plan/plan.mutations";
import type {
  CurrentPlanResponse,
  OfficialPlan,
  OfficialPlanTask,
} from "../../domains/plan/plan.schema";
import type {
  StartTrainingIntent,
} from "../../domains/training/training.mutations";
import {
  TRAINING_DRAFT_CHANGED_EVENT,
  TRAINING_RECONNECT_REPLAYED_EVENT,
} from "../../domains/training/training.events";
import type { TrainingRecoveryReceipt } from "../../domains/training/training.recovery";
import { ApiError } from "../../shared/api/errors";
import type { MutationFailure } from "../../shared/api/mutationRecovery";
import { I18nProvider, type AppLanguage } from "../../shared/i18n";
import type { RecoverableDraft } from "../../shared/storage/drafts";
import { planDiagnosticCatalog } from "../training/planDiagnosticCatalog";
import { PlanPage, type PlanPageSession } from "./PlanPage";
import type { PlanMutationWorkflow } from "./usePlanMutationWorkflow";

const pageMocks = vi.hoisted(() => ({
  acknowledge: vi.fn(),
  consumeReceipt: vi.fn(),
  discard: vi.fn(),
  getOperationSignal: null as (() => AbortSignal | undefined) | null,
  isAttemptActive: vi.fn(),
  listDrafts: vi.fn(),
  listReceipts: vi.fn(),
  markAttempt: vi.fn(),
  mutateTraining: vi.fn(),
  newCompleteIntent: vi.fn(),
  newCreateIntent: vi.fn(),
  newDiagnosticIntent: vi.fn(),
  newTrainingIntent: vi.fn(),
  newUpdateIntent: vi.fn(),
  persistTraining: vi.fn(),
  persistReceipt: vi.fn(),
  planQuery: {
    data: undefined,
    error: null,
    isError: false,
    isFetching: false,
    isPending: true,
    refetch: vi.fn(),
  } as {
    data: CurrentPlanResponse | undefined;
    error: unknown;
    isError: boolean;
    isFetching: boolean;
    isPending: boolean;
    refetch: ReturnType<typeof vi.fn>;
  },
  planWorkflow: {
    busy: false,
    discard: vi.fn(),
    inspectionFailure: null,
    inspectRecovery: vi.fn(),
    loadLatest: vi.fn(),
    recoveryReady: true,
    retry: vi.fn(),
    submit: vi.fn(),
    workflow: null,
  } as {
    busy: boolean;
    discard: ReturnType<typeof vi.fn>;
    inspectionFailure: MutationFailure | null;
    inspectRecovery: ReturnType<typeof vi.fn>;
    loadLatest: ReturnType<typeof vi.fn>;
    recoveryReady: boolean;
    retry: ReturnType<typeof vi.fn>;
    submit: ReturnType<typeof vi.fn>;
    workflow: PlanMutationWorkflow | null;
  },
  receiptMatchesAttempt: vi.fn(),
  receiptPlanTaskId: vi.fn(),
  releaseAttempt: vi.fn(),
  recoverTrainingIntent: vi.fn(),
  taskRequiresTraining: null as ((
    intent: PlanMutationIntent,
    task: OfficialPlanTask,
  ) => void) | null,
}));

vi.mock("../../domains/account/auth/auth.queries", () => ({
  useCurrentUserQuery: () => ({ data: null, isPending: true }),
}));

vi.mock("../../domains/plan/plan.queries", () => ({
  useCurrentPlanQuery: () => pageMocks.planQuery,
}));

vi.mock("../../domains/plan/plan.mutations", () => ({
  newCompletePlanTaskIntent: (plan: OfficialPlan, task: OfficialPlanTask) => (
    pageMocks.newCompleteIntent(plan, task)
  ),
  newCreatePlanIntent: (request: unknown) => pageMocks.newCreateIntent(request),
  newRunPlanDiagnosticIntent: (plan: OfficialPlan, answers: unknown) => (
    pageMocks.newDiagnosticIntent(plan, answers)
  ),
  newUpdatePlanTaskIntent: (
    plan: OfficialPlan,
    task: OfficialPlanTask,
    changes: unknown,
  ) => pageMocks.newUpdateIntent(plan, task, changes),
}));

vi.mock("../../domains/training/training.mutations", () => ({
  newStartTrainingIntent: (request: StartTrainingIntent["request"]) => (
    pageMocks.newTrainingIntent(request)
  ),
  useStartTrainingMutation: (options: {
    getOperationSignal?: () => AbortSignal | undefined;
  }) => {
    pageMocks.getOperationSignal = options.getOperationSignal ?? null;
    return { mutateAsync: pageMocks.mutateTraining };
  },
}));

vi.mock("../../domains/training/training.recovery", () => ({
  consumeTrainingRecoveryReceipt: (
    ownerScope: string,
    receipt: TrainingRecoveryReceipt,
  ) => pageMocks.consumeReceipt(ownerScope, receipt),
  listTrainingRecoveryReceipts: (ownerScope: string) => (
    pageMocks.listReceipts(ownerScope)
  ),
  persistTrainingMutationDraft: (
    ownerScope: string,
    intent: StartTrainingIntent,
  ) => pageMocks.persistTraining(ownerScope, intent),
  persistTrainingRecoveryReceipt: (
    ownerScope: string,
    source: RecoverableDraft,
    intent: StartTrainingIntent,
    response: unknown,
  ) => pageMocks.persistReceipt(ownerScope, source, intent, response),
  recoverTrainingMutationIntent: (candidate: RecoverableDraft) => (
    pageMocks.recoverTrainingIntent(candidate)
  ),
  trainingRecoveryReceiptMatchesSourceAttempt: (
    receipt: TrainingRecoveryReceipt,
    source: RecoverableDraft,
  ) => pageMocks.receiptMatchesAttempt(receipt, source),
  trainingRecoveryReceiptPlanTaskId: (receipt: TrainingRecoveryReceipt) => (
    pageMocks.receiptPlanTaskId(receipt)
  ),
}));

vi.mock("../../shared/lib/useOnlineStatus", () => ({
  useOnlineStatus: () => true,
}));

vi.mock("../../shared/storage/drafts", () => ({
  isRecoverableDraftAttemptActive: (candidate: RecoverableDraft) => (
    pageMocks.isAttemptActive(candidate)
  ),
  recoverableDraftRepository: {
    acknowledge: (candidate: RecoverableDraft) => pageMocks.acknowledge(candidate),
    discard: (candidate: RecoverableDraft) => pageMocks.discard(candidate),
    list: (ownerScope: string) => pageMocks.listDrafts(ownerScope),
    markAttempt: (candidate: RecoverableDraft) => pageMocks.markAttempt(candidate),
    releaseAttempt: (candidate: RecoverableDraft) => pageMocks.releaseAttempt(candidate),
  },
}));

vi.mock("./usePlanMutationWorkflow", () => ({
  usePlanMutationWorkflow: (options: {
    onTaskRequiresTraining?: (
      intent: PlanMutationIntent,
      task: OfficialPlanTask,
    ) => void;
  }) => {
    pageMocks.taskRequiresTraining = options.onTaskRequiresTraining ?? null;
    return pageMocks.planWorkflow;
  },
}));

const ownerScope = "acct-1234567890abcdef";
const planId = "10000000-0000-4000-8000-000000000001";
const taskId = "20000000-0000-4000-8000-000000000002";
const problemId = "30000000-0000-4000-8000-000000000003";
const sessionId = "40000000-0000-4000-8000-000000000004";
const session: PlanPageSession = {
  csrfProof: "csrf-proof-1234567890abcdef",
  ownerScope,
  verifyOwner: async () => undefined,
};

const taskFixture = (
  overrides: Partial<OfficialPlanTask> = {},
): OfficialPlanTask => ({
  actionTarget: null,
  completedAt: null,
  createdAt: "2026-07-27T02:00:00Z",
  detail: "完成后再显式确认。",
  estimatedMinutes: 30,
  id: taskId,
  planId,
  recommendationId: null,
  scheduledFor: "2026-07-28",
  skillKey: "statistics",
  sortOrder: 0,
  status: "open",
  targetProblemId: null,
  title: "完成统计复盘",
  updatedAt: "2026-07-27T02:00:00Z",
  version: 2,
  ...overrides,
});

const planFixture = (overrides: Partial<OfficialPlan> = {}): OfficialPlan => ({
  createdAt: "2026-07-27T01:00:00Z",
  diagnosticScore: 76,
  diagnosticScores: { statistics: 75 },
  diagnosticStatus: "completed",
  id: planId,
  progress: { completed: 0, total: 1 },
  recommendations: [{
    createdAt: "2026-07-27T01:00:00Z",
    id: "50000000-0000-4000-8000-000000000005",
    kind: "skill",
    problemId: null,
    provenanceResourceId: null,
    provenanceType: "diagnostic",
    rank: 0,
    rationale: "加强统计推断与置信区间。",
    skillKey: "statistics",
    status: "active",
    updatedAt: "2026-07-27T01:00:00Z",
    version: 1,
  }],
  role: "quantResearch",
  season: "2027-summer",
  status: "active",
  tasks: [taskFixture()],
  track: "internship",
  updatedAt: "2026-07-27T02:00:00Z",
  version: 4,
  weeklyHours: 8,
  ...overrides,
});

const trainingIntent: StartTrainingIntent = {
  idempotencyKey: "plan-training-request-12345",
  kind: "start",
  request: { planTaskId: taskId, problemId },
};

const trainingDraft: RecoverableDraft = {
  attemptCount: 0,
  draftId: "draft-planTrainingRequest12345",
  generationId: "gen-planTrainingRequest12345",
  idempotencyKey: trainingIntent.idempotencyKey,
  kind: "training.start",
  lastAttemptAt: null,
  ownerScope,
  payload: trainingIntent.request,
  resourceId: problemId,
  schemaVersion: 1,
  serverVersion: null,
  updatedAt: "2026-07-27T08:00:00Z",
};

const trainingAttemptDraft: RecoverableDraft = {
  ...trainingDraft,
  attemptCount: 1,
  lastAttemptAt: "2026-07-27T08:01:00Z",
};

const recoveryReceipt: TrainingRecoveryReceipt = {
  draft: {
    ...trainingDraft,
    draftId: "draft-planTrainingReceipt12345",
    generationId: "gen-planTrainingReceipt12345",
    idempotencyKey: "receipt_planTrainingRequest12345",
    kind: "training.recovery-start",
    payload: {
      expiresAt: "2026-08-03T08:00:00Z",
      intentKind: "start",
      response: {
        problemId,
        resumed: true,
        sessionId,
        sessionVersion: 2,
      },
      sourcePlanTaskId: taskId,
      sourceDraftId: trainingDraft.draftId,
      sourceGenerationId: trainingDraft.generationId,
    },
    resourceId: sessionId,
    serverVersion: 2,
  },
  payload: {
    expiresAt: "2026-08-03T08:00:00Z",
    intentKind: "start",
    response: {
      problemId,
      resumed: true,
      sessionId,
      sessionVersion: 2,
    },
    sourcePlanTaskId: taskId,
    sourceDraftId: trainingDraft.draftId,
    sourceGenerationId: trainingDraft.generationId,
  },
};

const renderPage = ({
  language = "zh-CN",
  onNavigate = vi.fn<(href: string) => void>(),
}: Readonly<{
  language?: AppLanguage;
  onNavigate?: (href: string) => void;
}> = {}) => ({
  onNavigate,
  ...render(
    <I18nProvider language={language}>
      <MemoryRouter>
        <PlanPage onNavigate={onNavigate} session={session} />
      </MemoryRouter>
    </I18nProvider>,
  ),
});

beforeEach(() => {
  vi.resetAllMocks();
  pageMocks.planQuery.data = { plan: planFixture() };
  pageMocks.planQuery.error = null;
  pageMocks.planQuery.isError = false;
  pageMocks.planQuery.isFetching = false;
  pageMocks.planQuery.isPending = false;
  pageMocks.planQuery.refetch.mockResolvedValue({ error: null, isError: false });
  pageMocks.planWorkflow.busy = false;
  pageMocks.planWorkflow.inspectionFailure = null;
  pageMocks.planWorkflow.recoveryReady = true;
  pageMocks.planWorkflow.workflow = null;
  pageMocks.planWorkflow.submit.mockResolvedValue(true);
  pageMocks.planWorkflow.retry.mockResolvedValue(true);
  pageMocks.planWorkflow.discard.mockResolvedValue(undefined);
  pageMocks.planWorkflow.loadLatest.mockResolvedValue(undefined);
  pageMocks.listDrafts.mockResolvedValue([]);
  pageMocks.listReceipts.mockResolvedValue([]);
  pageMocks.markAttempt.mockResolvedValue(trainingAttemptDraft);
  pageMocks.consumeReceipt.mockResolvedValue(true);
  pageMocks.getOperationSignal = null;
  pageMocks.acknowledge.mockResolvedValue(true);
  pageMocks.discard.mockResolvedValue(true);
  pageMocks.isAttemptActive.mockReturnValue(false);
  pageMocks.receiptMatchesAttempt.mockReturnValue(false);
  pageMocks.newTrainingIntent.mockReturnValue(trainingIntent);
  pageMocks.recoverTrainingIntent.mockReturnValue(trainingIntent);
  pageMocks.persistTraining.mockResolvedValue(trainingDraft);
  pageMocks.persistReceipt.mockResolvedValue(recoveryReceipt);
  pageMocks.receiptPlanTaskId.mockImplementation((receipt: TrainingRecoveryReceipt) => (
    (receipt.payload as unknown as { sourcePlanTaskId?: string }).sourcePlanTaskId ?? null
  ));
  pageMocks.releaseAttempt.mockResolvedValue(trainingDraft);
  pageMocks.mutateTraining.mockResolvedValue({
    problemId,
    resumed: false,
    sessionId,
    sessionVersion: 1,
  });
  pageMocks.newCreateIntent.mockImplementation((request) => ({
    idempotencyKey: "plan-create-request-12345",
    kind: "create",
    request,
  }));
  pageMocks.newCompleteIntent.mockImplementation((plan, task) => ({
    idempotencyKey: "plan-complete-request-12345",
    kind: "complete-task",
    request: { planVersion: plan.version, taskVersion: task.version },
    taskId: task.id,
  }));
  pageMocks.newDiagnosticIntent.mockImplementation((plan, answers) => ({
    idempotencyKey: "plan-diagnostic-request-12345",
    kind: "diagnostic",
    request: {
      answers,
      definitionVersion: "baseline-v1",
      planVersion: plan.version,
    },
  }));
  pageMocks.newUpdateIntent.mockImplementation((plan, task, changes) => ({
    idempotencyKey: "plan-update-request-12345",
    kind: "update-task",
    request: {
      ...changes,
      planVersion: plan.version,
      taskVersion: task.version,
    },
    taskId: task.id,
  }));
});

describe("PlanPage", () => {
  it("renders a layout-matched loading state without exposing stale actions", () => {
    pageMocks.planQuery.data = undefined;
    pageMocks.planQuery.isPending = true;

    renderPage();

    expect(screen.getByRole("status", { name: "正在载入训练计划" })).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("creates a plan from exact service slugs after durable recovery inspection", async () => {
    const user = userEvent.setup();
    pageMocks.planQuery.data = { plan: null };
    renderPage();

    const create = screen.getByRole("button", { name: "创建训练计划" });
    await waitFor(() => expect(create).toBeEnabled());
    await user.click(create);

    expect(pageMocks.newCreateIntent).toHaveBeenCalledWith({
      role: "quantResearch",
      season: "2027-summer",
      track: "internship",
      weeklyHours: 8,
    });
    expect(pageMocks.planWorkflow.submit).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: "plan-create-request-12345",
      kind: "create",
    }));
  });

  it("shows real plan metrics, localized workflow columns, and the pending baseline as next action", async () => {
    const user = userEvent.setup();
    pageMocks.planQuery.data = {
      plan: planFixture({
        diagnosticScore: 0,
        diagnosticScores: {},
        diagnosticStatus: "pending",
      }),
    };
    renderPage();

    const baseline = await screen.findByRole("button", { name: "完成 Baseline" });
    expect(screen.getByRole("progressbar", { name: "计划进度" })).toHaveValue(0);
    expect(screen.getByRole("group", { name: "待完成与已完成计划任务分栏" }))
      .toBeVisible();
    expect(screen.getByText("能力")).toBeVisible();
    await user.click(baseline);
    expect(screen.getByRole("button", { name: "提交诊断" })).toBeVisible();
  }, 15_000);

  it("shows recommendation provenance without exposing its internal resource id", async () => {
    const provenanceResourceId = "70000000-0000-4000-8000-000000000007";
    const sourcePlan = planFixture();
    pageMocks.planQuery.data = {
      plan: {
        ...sourcePlan,
        recommendations: sourcePlan.recommendations.map((recommendation) => ({
          ...recommendation,
          provenanceResourceId,
          provenanceType: "training" as const,
          rationale: "Review the confirmed training evidence.",
        })),
      },
    };
    const { container } = renderPage({ language: "en" });

    expect(await screen.findByText("Source: confirmed training")).toBeVisible();
    expect(screen.queryByText(provenanceResourceId)).not.toBeInTheDocument();
    expect(container.querySelector('[data-recommendation-provenance="training"]'))
      .toHaveAttribute("data-provenance-resource", provenanceResourceId);
  });

  it("submits all eight diagnostic answers in canonical catalog order", async () => {
    const user = userEvent.setup();
    pageMocks.planQuery.data = {
      plan: planFixture({
        diagnosticScore: 0,
        diagnosticScores: {},
        diagnosticStatus: "pending",
      }),
    };
    renderPage();

    await user.click(await screen.findByRole("button", { name: "完成 Baseline" }));
    for (const question of planDiagnosticCatalog) {
      await user.click(screen.getByRole("radio", {
        name: question.options[0].label.zh,
      }));
    }
    await user.click(screen.getByRole("button", { name: "提交诊断" }));

    expect(pageMocks.newDiagnosticIntent).toHaveBeenCalledOnce();
    expect(pageMocks.newDiagnosticIntent.mock.calls[0]?.[1]).toEqual(
      planDiagnosticCatalog.map((question) => ({
        optionId: question.options[0].optionId,
        questionId: question.questionId,
      })),
    );
    expect(pageMocks.planWorkflow.submit).toHaveBeenCalledWith(expect.objectContaining({
      kind: "diagnostic",
      request: expect.objectContaining({
        definitionVersion: "baseline-v1",
        planVersion: 4,
      }),
    }));
  }, 15_000);

  it("collapses the diagnostic after a retry advances the confirmed plan version", async () => {
    const user = userEvent.setup();
    const pendingPlan = planFixture({
      diagnosticScore: 0,
      diagnosticScores: {},
      diagnosticStatus: "pending",
    });
    pageMocks.planQuery.data = { plan: pendingPlan };
    pageMocks.planWorkflow.submit.mockResolvedValue(false);
    const rendered = renderPage();
    const rerenderPage = () => rendered.rerender(
      <I18nProvider language="zh-CN">
        <MemoryRouter>
          <PlanPage onNavigate={rendered.onNavigate} session={session} />
        </MemoryRouter>
      </I18nProvider>,
    );

    await user.click(await screen.findByRole("button", { name: "完成 Baseline" }));
    for (const question of planDiagnosticCatalog) {
      await user.click(screen.getByRole("radio", {
        name: question.options[0].label.zh,
      }));
    }
    await user.click(screen.getByRole("button", { name: "提交诊断" }));
    await waitFor(() => expect(pageMocks.planWorkflow.submit).toHaveBeenCalledOnce());

    const diagnosticIntent = pageMocks.planWorkflow.submit.mock.calls[0]?.[0];
    expect(diagnosticIntent).toBeDefined();
    pageMocks.planWorkflow.workflow = {
      draft: trainingDraft,
      failure: {
        code: "PLAN_RETRYABLE",
        message: "暂时无法确认诊断结果。",
        preserveDraft: true,
        requestId: "req-plan-diagnostic-retry",
        retryable: true,
        state: "recoverable-error",
      },
      intent: diagnosticIntent!,
      phase: "failed",
    };
    rerenderPage();

    expect(screen.getByRole("button", { name: "提交诊断" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "重试" }));
    expect(pageMocks.planWorkflow.retry).toHaveBeenCalledOnce();

    pageMocks.planWorkflow.workflow = null;
    pageMocks.planQuery.data = {
      plan: planFixture({
        diagnosticScore: 76,
        diagnosticScores: { statistics: 75 },
        diagnosticStatus: "completed",
        version: pendingPlan.version + 1,
      }),
    };
    rerenderPage();

    expect(screen.queryByRole("button", { name: "提交诊断" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "能力诊断已完成" })).toBeVisible();
    expect(screen.getByRole("button", { name: "重新测评" })).toBeVisible();
  }, 15_000);

  it("completes a normal task with the current plan and task versions", async () => {
    const user = userEvent.setup();
    renderPage();

    const complete = await screen.findByRole("button", { name: "完成下一项任务" });
    await user.click(complete);

    expect(pageMocks.newCompleteIntent).toHaveBeenCalledWith(
      expect.objectContaining({ id: planId, version: 4 }),
      expect.objectContaining({ id: taskId, version: 2 }),
    );
    expect(pageMocks.planWorkflow.submit).toHaveBeenCalledWith(expect.objectContaining({
      kind: "complete-task",
      taskId,
    }));
  });

  it("opens, cancels, and saves the versioned task editor through the shared workflow", async () => {
    const user = userEvent.setup();
    const sourcePlan = planFixture();
    const sourceTask = sourcePlan.tasks[0]!;
    pageMocks.planQuery.data = { plan: sourcePlan };
    renderPage();

    const editButton = await screen.findByRole("button", { name: "编辑任务" });
    await user.click(editButton);
    const editor = screen.getByRole("form", { name: "编辑任务" });
    expect(editor).toBeVisible();
    expect(editor).toHaveAttribute("id", `plan-task-editor-${taskId}`);
    expect(editButton).toHaveAttribute("aria-controls", `plan-task-editor-${taskId}`);
    expect(editButton).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("textbox", { name: "任务标题" })).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("form", { name: "编辑任务" })).not.toBeInTheDocument();
    await waitFor(() => expect(editButton).toHaveFocus());
    expect(editButton).toHaveAttribute("aria-expanded", "false");

    await user.click(editButton);
    const title = screen.getByRole("textbox", { name: "任务标题" });
    await user.clear(title);
    await user.type(title, "复盘统计推断与置信区间");
    await user.click(screen.getByRole("button", { name: "保存更改" }));

    expect(pageMocks.newUpdateIntent).toHaveBeenCalledWith(
      sourcePlan,
      sourceTask,
      { title: "复盘统计推断与置信区间" },
    );
    expect(pageMocks.planWorkflow.submit).toHaveBeenCalledWith(expect.objectContaining({
      kind: "update-task",
      request: expect.objectContaining({ planVersion: 4, taskVersion: 2 }),
      taskId,
    }));
    await waitFor(() => expect(
      screen.queryByRole("form", { name: "编辑任务" }),
    ).not.toBeInTheDocument());
    await waitFor(() => expect(editButton).toHaveFocus());
  });

  it("navigates to an external task target without completing it", async () => {
    const user = userEvent.setup();
    pageMocks.planQuery.data = {
      plan: planFixture({ tasks: [taskFixture({ actionTarget: "tools" })] }),
    };
    const { onNavigate } = renderPage();

    await user.click(await screen.findByRole("button", { name: "打开下一步" }));

    expect(onNavigate).toHaveBeenCalledWith("/tools");
    expect(pageMocks.planWorkflow.submit).not.toHaveBeenCalled();
  });

  it("freezes every task while one shared plan-version mutation is submitting", async () => {
    const firstTask = taskFixture();
    const secondTask = taskFixture({
      id: "60000000-0000-4000-8000-000000000006",
      sortOrder: 1,
      title: "完成概率复盘",
    });
    pageMocks.planQuery.data = {
      plan: planFixture({
        progress: { completed: 0, total: 2 },
        tasks: [firstTask, secondTask],
      }),
    };
    pageMocks.planWorkflow.workflow = {
      draft: trainingDraft,
      failure: null,
      intent: {
        idempotencyKey: "plan-complete-inflight-12345",
        kind: "complete-task",
        request: { planVersion: 4, taskVersion: 2 },
        taskId: firstTask.id,
      },
      phase: "submitting",
    };
    renderPage();

    expect(screen.getByRole("button", { name: "正在确认完成" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "标记完成" })).toBeDisabled();
    expect(screen.getByRole("region", { name: "计划任务" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("persists a problem-backed task before starting its exact training session", async () => {
    const user = userEvent.setup();
    pageMocks.planQuery.data = {
      plan: planFixture({
        tasks: [taskFixture({ actionTarget: "problems", targetProblemId: problemId })],
      }),
    };
    const { onNavigate } = renderPage();

    await user.click(await screen.findByRole("button", { name: "开始下一项训练" }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ));

    expect(pageMocks.persistTraining).toHaveBeenCalledWith(ownerScope, trainingIntent);
    expect(pageMocks.mutateTraining).toHaveBeenCalledWith(trainingIntent);
    expect(pageMocks.acknowledge).toHaveBeenCalledWith(trainingAttemptDraft);
    expect(pageMocks.markAttempt.mock.invocationCallOrder[0])
      .toBeLessThan(pageMocks.mutateTraining.mock.invocationCallOrder[0]!);
    expect(pageMocks.mutateTraining.mock.invocationCallOrder[0])
      .toBeLessThan(pageMocks.persistReceipt.mock.invocationCallOrder[0]!);
    expect(pageMocks.persistReceipt.mock.invocationCallOrder[0])
      .toBeLessThan(pageMocks.acknowledge.mock.invocationCallOrder[0]!);
    expect(pageMocks.acknowledge.mock.invocationCallOrder[0])
      .toBeLessThan(pageMocks.consumeReceipt.mock.invocationCallOrder[0]!);
    expect(pageMocks.planWorkflow.submit).not.toHaveBeenCalled();
  });

  it("lets only the foreground lease winner submit the training start", async () => {
    const user = userEvent.setup();
    pageMocks.planQuery.data = {
      plan: planFixture({
        tasks: [taskFixture({ actionTarget: "problems", targetProblemId: problemId })],
      }),
    };
    pageMocks.markAttempt.mockResolvedValueOnce(null);
    renderPage();

    await user.click(await screen.findByRole("button", { name: "开始下一项训练" }));
    await waitFor(() => expect(pageMocks.markAttempt).toHaveBeenCalledWith(trainingDraft));

    expect(pageMocks.mutateTraining).not.toHaveBeenCalled();
    expect(pageMocks.persistReceipt).not.toHaveBeenCalled();
  });

  it("starts training from the refreshed server task when the visible cache was stale", async () => {
    pageMocks.planQuery.data = {
      plan: planFixture({ tasks: [taskFixture({ targetProblemId: null })] }),
    };
    renderPage();
    await screen.findByRole("button", { name: "完成下一项任务" });
    const refreshedTask = taskFixture({
      actionTarget: "problems",
      targetProblemId: problemId,
      version: 3,
    });

    act(() => pageMocks.taskRequiresTraining?.({
      idempotencyKey: "plan-complete-stale-task-12345",
      kind: "complete-task",
      request: { planVersion: 4, taskVersion: 2 },
      taskId,
    }, refreshedTask));

    await waitFor(() => expect(pageMocks.persistTraining).toHaveBeenCalledWith(
      ownerScope,
      trainingIntent,
    ));
    expect(pageMocks.newTrainingIntent).toHaveBeenCalledWith({
      planTaskId: taskId,
      problemId,
    });
  });

  it("retries a failed training start with the same durable intent and idempotency key", async () => {
    const user = userEvent.setup();
    pageMocks.planQuery.data = {
      plan: planFixture({
        tasks: [taskFixture({ actionTarget: "problems", targetProblemId: problemId })],
      }),
    };
    pageMocks.mutateTraining
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValue({ problemId, resumed: true, sessionId, sessionVersion: 2 });
    const { onNavigate } = renderPage();

    await user.click(await screen.findByRole("button", { name: "开始下一项训练" }));
    const retry = await screen.findByRole("button", { name: "重试启动训练" });
    expect(pageMocks.persistTraining).toHaveBeenCalledTimes(1);
    pageMocks.listDrafts.mockResolvedValue([trainingDraft]);
    await user.click(retry);
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ));

    expect(pageMocks.mutateTraining).toHaveBeenCalledTimes(2);
    expect(pageMocks.mutateTraining.mock.calls[0]?.[0]).toBe(trainingIntent);
    expect(pageMocks.mutateTraining.mock.calls[1]?.[0]).toBe(trainingIntent);
    expect(pageMocks.persistTraining).toHaveBeenCalledTimes(1);
  });

  it("reinspects instead of resubmitting when the exact retry source disappeared", async () => {
    const user = userEvent.setup();
    pageMocks.planQuery.data = {
      plan: planFixture({
        tasks: [taskFixture({ actionTarget: "problems", targetProblemId: problemId })],
      }),
    };
    pageMocks.mutateTraining.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "开始下一项训练" }));
    const retry = await screen.findByRole("button", { name: "重试启动训练" });
    pageMocks.listDrafts.mockResolvedValue([]);
    await user.click(retry);
    await waitFor(() => expect(pageMocks.listDrafts).toHaveBeenCalled());

    expect(pageMocks.mutateTraining).toHaveBeenCalledTimes(1);
    expect(pageMocks.markAttempt).toHaveBeenCalledTimes(1);
  });

  it("aborts an in-flight training start and never redirects after leaving the plan page", async () => {
    const user = userEvent.setup();
    pageMocks.planQuery.data = {
      plan: planFixture({
        tasks: [taskFixture({ actionTarget: "problems", targetProblemId: problemId })],
      }),
    };
    let resolveStart: ((response: {
      problemId: string;
      resumed: boolean;
      sessionId: string;
      sessionVersion: number;
    }) => void) | null = null;
    pageMocks.mutateTraining.mockImplementation(() => new Promise((resolve) => {
      resolveStart = resolve;
    }));
    const { onNavigate, unmount } = renderPage();

    await user.click(await screen.findByRole("button", { name: "开始下一项训练" }));
    await waitFor(() => expect(pageMocks.mutateTraining).toHaveBeenCalledOnce());
    const signal = pageMocks.getOperationSignal?.();
    expect(signal).toBeDefined();
    expect(signal?.aborted).toBe(false);

    unmount();
    expect(signal?.aborted).toBe(true);
    await act(async () => resolveStart?.({
      problemId,
      resumed: false,
      sessionId,
      sessionVersion: 1,
    }));

    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("does not let a concurrent recovery inspection consume receipts over an active submit", async () => {
    const user = userEvent.setup();
    pageMocks.planQuery.data = {
      plan: planFixture({
        tasks: [taskFixture({ actionTarget: "problems", targetProblemId: problemId })],
      }),
    };
    let resolveStart: ((response: {
      problemId: string;
      resumed: boolean;
      sessionId: string;
      sessionVersion: number;
    }) => void) | null = null;
    pageMocks.mutateTraining.mockImplementation(() => new Promise((resolve) => {
      resolveStart = resolve;
    }));
    const { onNavigate } = renderPage();

    await user.click(await screen.findByRole("button", { name: "开始下一项训练" }));
    await waitFor(() => expect(pageMocks.mutateTraining).toHaveBeenCalledOnce());
    const receiptInspections = pageMocks.listReceipts.mock.calls.length;
    pageMocks.listDrafts.mockResolvedValue([]);
    pageMocks.listReceipts.mockResolvedValue([recoveryReceipt]);
    act(() => window.dispatchEvent(new Event(TRAINING_RECONNECT_REPLAYED_EVENT)));
    await waitFor(() => expect(pageMocks.listReceipts.mock.calls.length)
      .toBeGreaterThan(receiptInspections));

    expect(pageMocks.consumeReceipt).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
    await act(async () => resolveStart?.({
      problemId,
      resumed: false,
      sessionId,
      sessionVersion: 1,
    }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ));
  });

  it("does not create a lease, controller, or request after persistence resolves post-unmount", async () => {
    const user = userEvent.setup();
    pageMocks.planQuery.data = {
      plan: planFixture({
        tasks: [taskFixture({ actionTarget: "problems", targetProblemId: problemId })],
      }),
    };
    let resolvePersist: (draft: RecoverableDraft) => void = () => undefined;
    pageMocks.persistTraining.mockImplementation(() => new Promise((resolve) => {
      resolvePersist = resolve;
    }));
    const { unmount } = renderPage();

    await user.click(await screen.findByRole("button", { name: "开始下一项训练" }));
    await waitFor(() => expect(pageMocks.persistTraining).toHaveBeenCalledOnce());
    unmount();
    await act(async () => resolvePersist(trainingDraft));

    expect(pageMocks.markAttempt).not.toHaveBeenCalled();
    expect(pageMocks.mutateTraining).not.toHaveBeenCalled();
    expect(pageMocks.persistReceipt).not.toHaveBeenCalled();
  });

  it("consumes an orphan replay receipt after a fresh mount and resumes its exact session", async () => {
    pageMocks.listDrafts.mockResolvedValue([]);
    pageMocks.listReceipts.mockResolvedValue([recoveryReceipt]);
    const { onNavigate } = renderPage();

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ));
    expect(pageMocks.consumeReceipt).toHaveBeenCalledWith(ownerScope, recoveryReceipt);
  });

  it("leaves an ordinary non-plan orphan receipt for its owning training surface", async () => {
    const ordinaryReceipt = {
      ...recoveryReceipt,
      draft: {
        ...recoveryReceipt.draft,
        payload: {
          ...recoveryReceipt.draft.payload as Record<string, unknown>,
          sourcePlanTaskId: undefined,
        },
      },
      payload: {
        ...recoveryReceipt.payload,
        sourcePlanTaskId: undefined,
      },
    } as unknown as TrainingRecoveryReceipt;
    pageMocks.listDrafts.mockResolvedValue([]);
    pageMocks.listReceipts.mockResolvedValue([ordinaryReceipt]);
    const { onNavigate } = renderPage();

    await waitFor(() => expect(
      screen.getByRole("button", { name: "标记完成" }),
    ).toBeEnabled());
    expect(pageMocks.consumeReceipt).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("locks an idle tab as soon as another tab announces a durable training draft", async () => {
    pageMocks.listDrafts.mockResolvedValue([]);
    renderPage();
    await waitFor(() => expect(
      screen.getByRole("button", { name: "标记完成" }),
    ).toBeEnabled());

    pageMocks.listDrafts.mockResolvedValue([trainingDraft]);
    act(() => window.dispatchEvent(new CustomEvent(TRAINING_DRAFT_CHANGED_EVENT, {
      detail: { ownerScope: "acct-fedcba0987654321", type: "training-draft-changed" },
    })));
    expect(screen.getByRole("button", { name: "标记完成" })).toBeEnabled();
    act(() => window.dispatchEvent(new CustomEvent(TRAINING_DRAFT_CHANGED_EVENT, {
      detail: { ownerScope, type: "training-draft-changed" },
    })));

    expect(await screen.findByText(
      "本机仍有一项未得到服务器确认的训练启动请求。",
    )).toBeVisible();
    expect(screen.getByRole("button", { name: "标记完成" })).toBeDisabled();
    expect(screen.getByRole("region", { name: "计划任务" }))
      .toHaveAttribute("aria-disabled", "true");
  });

  it("rescans and surfaces the next durable plan training draft after discard", async () => {
    const user = userEvent.setup();
    const nextDraft: RecoverableDraft = {
      ...trainingDraft,
      draftId: "draft-planTrainingRequest67890",
      generationId: "gen-planTrainingRequest67890",
      idempotencyKey: "plan-training-request-67890",
      updatedAt: "2026-07-27T08:05:00Z",
    };
    pageMocks.listDrafts.mockResolvedValue([trainingDraft]);
    renderPage();
    const discard = await screen.findByRole("button", { name: "放弃训练请求" });

    pageMocks.listDrafts.mockResolvedValue([nextDraft]);
    await user.click(discard);

    await waitFor(() => expect(pageMocks.recoverTrainingIntent).toHaveBeenCalledWith(
      nextDraft,
    ));
    expect(pageMocks.discard).toHaveBeenCalledWith(trainingDraft);
    expect(screen.getByText("本机仍有一项未得到服务器确认的训练启动请求。"))
      .toBeVisible();
  });

  it("reinspects a failed source without a same-tab event and consumes its replay receipt", async () => {
    pageMocks.listDrafts.mockResolvedValue([trainingDraft]);
    pageMocks.listReceipts.mockResolvedValue([]);
    const { onNavigate } = renderPage();
    expect(await screen.findByText(
      "本机仍有一项未得到服务器确认的训练启动请求。",
    )).toBeVisible();

    pageMocks.listDrafts.mockResolvedValue([]);
    pageMocks.listReceipts.mockResolvedValue([recoveryReceipt]);

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ), { timeout: 2_500 });
    expect(pageMocks.consumeReceipt).toHaveBeenCalledWith(ownerScope, recoveryReceipt);
  });

  it("queues a reconnect event that arrives while an empty recovery inspection is in flight", async () => {
    let resolveInitialReceipts: (
      receipts: readonly TrainingRecoveryReceipt[],
    ) => void = () => undefined;
    pageMocks.listDrafts.mockResolvedValue([]);
    pageMocks.listReceipts
      .mockImplementationOnce(() => new Promise((resolve) => {
        resolveInitialReceipts = resolve;
      }))
      .mockResolvedValue([recoveryReceipt]);
    const { onNavigate } = renderPage();
    await waitFor(() => expect(pageMocks.listReceipts).toHaveBeenCalledOnce());

    window.dispatchEvent(new Event(TRAINING_RECONNECT_REPLAYED_EVENT));
    await waitFor(() => expect(
      screen.getByRole("button", { name: "标记完成" }),
    ).toBeDisabled());
    resolveInitialReceipts([]);

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ));
    expect(pageMocks.listReceipts).toHaveBeenCalledTimes(2);
  });

  it("keeps recovery visible when a replay receipt cannot be atomically consumed", async () => {
    pageMocks.planQuery.data = {
      plan: planFixture({
        tasks: [taskFixture({ actionTarget: "problems", targetProblemId: problemId })],
      }),
    };
    pageMocks.listDrafts.mockResolvedValue([trainingDraft]);
    pageMocks.listReceipts.mockResolvedValue([recoveryReceipt]);
    pageMocks.consumeReceipt.mockRejectedValue(new Error("IndexedDB unavailable"));
    const { onNavigate } = renderPage();

    expect(await screen.findByText(
      "暂时无法确认训练启动请求是否已同步，请重试。",
    )).toBeVisible();
    expect(screen.getByRole("button", { name: "重试启动训练" })).toBeEnabled();
    expect(pageMocks.acknowledge).toHaveBeenCalledWith(trainingDraft);
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("freezes the board on a stale plan version and offers load-latest plus explicit discard", async () => {
    const user = userEvent.setup();
    const intent: PlanMutationIntent = {
      idempotencyKey: "plan-complete-conflict-12345",
      kind: "complete-task",
      request: { planVersion: 3, taskVersion: 1 },
      taskId,
    };
    pageMocks.planWorkflow.workflow = {
      draft: trainingDraft,
      failure: {
        code: "PLAN_VERSION_CONFLICT",
        message: "计划已在其他位置更新。",
        preserveDraft: true,
        requestId: "req-plan-conflict",
        retryable: false,
        state: "stale-version-conflict",
      },
      intent,
      phase: "failed",
    };
    renderPage();

    expect(screen.getByText("任务看板已暂时锁定。", { exact: false })).toBeVisible();
    expect(screen.getByRole("button", { name: "正在确认完成" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "载入最新版本" }));
    expect(pageMocks.planWorkflow.loadLatest).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: "放弃本地更改" })).toBeVisible();
  });

  it("keeps stale data read-only while a background plan refresh is failing", async () => {
    pageMocks.planQuery.isError = true;
    pageMocks.planQuery.error = new ApiError({
      code: "PLAN_UNAVAILABLE",
      message: "Unavailable",
      requestId: "req-plan-refresh",
      retryable: true,
      status: 503,
    });
    renderPage();

    expect(screen.getByRole("button", { name: "标记完成" })).toBeDisabled();
    expect(screen.getByText("当前计划暂时无法验证，因此不会展示缓存或示例任务。"))
      .toBeVisible();
  });

  it("keeps recovery-only copy localized on the English plan page", async () => {
    pageMocks.listDrafts.mockResolvedValue([trainingDraft]);
    pageMocks.recoverTrainingIntent.mockReturnValue(trainingIntent);
    renderPage({ language: "en" });

    const alert = await screen.findByRole("alert");
    expect(within(alert).getByText(
      "A saved training request is still waiting for server confirmation.",
    )).toBeVisible();
    expect(within(alert).queryByText(/本机|请求|重试/u)).not.toBeInTheDocument();
  });

  it("localizes a classified Chinese mutation failure before showing it in English", async () => {
    const user = userEvent.setup();
    pageMocks.planQuery.data = {
      plan: planFixture({
        tasks: [taskFixture({ actionTarget: "problems", targetProblemId: problemId })],
      }),
    };
    pageMocks.mutateTraining.mockRejectedValue(new TypeError("Failed to fetch"));
    renderPage({ language: "en" });
    const start = await screen.findByRole("button", { name: "Start next training" });
    pageMocks.listDrafts.mockResolvedValue([trainingDraft]);
    await user.click(start);

    await waitFor(() => expect(pageMocks.persistTraining).toHaveBeenCalledOnce());
    expect(pageMocks.mutateTraining).toHaveBeenCalledOnce();

    const status = await screen.findByRole("status", {
      name: "Training could not be started",
    });
    expect(within(status).getByText(
      "The network connection was interrupted. Your change remains safely saved on this device.",
    )).toBeVisible();
    expect(within(status).queryByText(/网络|当前更改/u)).not.toBeInTheDocument();
  });
});
