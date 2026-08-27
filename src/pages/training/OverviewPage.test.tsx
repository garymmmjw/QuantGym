import "@testing-library/jest-dom/vitest";

import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import type { DashboardOverview } from "../../domains/dashboard/dashboard.schema";
import type { StartTrainingIntent } from "../../domains/training/training.mutations";
import type { TrainingRecoveryReceipt } from "../../domains/training/training.recovery";
import { ApiError } from "../../shared/api/errors";
import type { RecoverableDraft } from "../../shared/storage/drafts";
import {
  OverviewPage,
  TrainingStartRecovery,
  type OverviewPageSession,
} from "./OverviewPage";

const pageMocks = vi.hoisted(() => ({
  acknowledge: vi.fn(),
  consumeReceipt: vi.fn(),
  dashboard: {
    data: undefined,
    dataUpdatedAt: 0,
    error: null,
    isError: false,
    isFetching: false,
    isPending: true,
    refetch: vi.fn(),
  } as {
    data: DashboardOverview | undefined;
    dataUpdatedAt: number;
    error: unknown;
    isError: boolean;
    isFetching: boolean;
    isPending: boolean;
    refetch: ReturnType<typeof vi.fn>;
  },
  discard: vi.fn(),
  isAttemptActive: vi.fn(),
  listDrafts: vi.fn(),
  listReceipts: vi.fn(),
  mutateAsync: vi.fn(),
  newIntent: vi.fn(),
  persist: vi.fn(),
  receiptMatchesAttempt: vi.fn(),
  recoverIntent: vi.fn(),
}));

vi.mock("../../domains/account/auth/auth.queries", () => ({
  useCurrentUserQuery: () => ({
    data: null,
    isPending: true,
  }),
}));

vi.mock("../../domains/dashboard/dashboard.queries", () => ({
  useDashboardOverviewQuery: () => pageMocks.dashboard,
}));

vi.mock("../../domains/training/training.mutations", () => ({
  newStartTrainingIntent: (request: StartTrainingIntent["request"]) => (
    pageMocks.newIntent(request)
  ),
  useStartTrainingMutation: () => ({
    mutateAsync: pageMocks.mutateAsync,
  }),
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
  ) => pageMocks.persist(ownerScope, intent),
  recoverTrainingMutationIntent: (candidate: RecoverableDraft) => (
    pageMocks.recoverIntent(candidate)
  ),
  trainingRecoveryReceiptMatchesSourceAttempt: (
    receipt: TrainingRecoveryReceipt,
    source: RecoverableDraft,
  ) => pageMocks.receiptMatchesAttempt(receipt, source),
}));

vi.mock("../../shared/storage/drafts", () => ({
  isRecoverableDraftAttemptActive: (candidate: RecoverableDraft) => (
    pageMocks.isAttemptActive(candidate)
  ),
  recoverableDraftRepository: {
    acknowledge: (draft: RecoverableDraft) => pageMocks.acknowledge(draft),
    discard: (draft: RecoverableDraft) => pageMocks.discard(draft),
    list: (ownerScope: string) => pageMocks.listDrafts(ownerScope),
  },
}));

const ownerScope = "acct-1234567890abcdef";
const problemId = "30000000-0000-4000-8000-000000000003";
const sessionId = "60000000-0000-4000-8000-000000000006";
const taskId = "40000000-0000-4000-8000-000000000004";
const session: OverviewPageSession = {
  csrfProof: "csrf-proof-1234567890abcdef",
  ownerScope,
  verifyOwner: async () => undefined,
};
const intent: StartTrainingIntent = {
  idempotencyKey: "overview-start-request-12345",
  kind: "start",
  request: {
    planTaskId: taskId,
    problemId,
  },
};
const draft: RecoverableDraft = {
  attemptCount: 0,
  draftId: "draft-overviewStartRequest12345",
  generationId: "gen-overviewStartRequest12345",
  idempotencyKey: intent.idempotencyKey,
  kind: "training.start",
  lastAttemptAt: null,
  ownerScope,
  payload: intent.request,
  resourceId: problemId,
  schemaVersion: 1,
  serverVersion: null,
  updatedAt: "2026-07-27T08:00:00Z",
};
const recoveryReceipt: TrainingRecoveryReceipt = {
  draft: {
    ...draft,
    draftId: "draft-overviewStartReceipt12345",
    generationId: "gen-overviewStartReceipt12345",
    idempotencyKey: "receipt_overviewStartRequest12345",
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
      sourceDraftId: draft.draftId,
      sourceGenerationId: draft.generationId,
    },
    resourceId: sessionId,
    serverVersion: 2,
    updatedAt: "2026-07-27T08:01:00Z",
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
    sourceDraftId: draft.draftId,
    sourceGenerationId: draft.generationId,
  },
};

const overview: DashboardOverview = {
  planProgress: {
    completedTasks: 2,
    planId: "10000000-0000-4000-8000-000000000001",
    totalTasks: 5,
    version: 4,
  },
  profile: {
    displayName: "Gary",
    level: 3,
    streakDays: 7,
    weeklyXp: 90,
  },
  recentXp: [{
    amount: 20,
    id: "20000000-0000-4000-8000-000000000002",
    occurredAt: "2026-07-27T02:00:00Z",
    reason: "problem_completion",
    skillKey: "arrays",
  }],
  resourceVersions: {
    notifications: 4,
    plan: 4,
    xpLedger: 6,
  },
  todayTask: {
    actionResourceId: problemId,
    actionTarget: "problems",
    id: taskId,
    rewardXp: 20,
    status: "open",
    title: "完成两数之和训练",
    unlockReason: "巩固数组与哈希表",
    version: 2,
  },
  unreadNotificationCount: 1,
  weakness: {
    label: "哈希表边界",
    recommendedProblemId: problemId,
    score: 62,
    skillKey: "arrays",
  },
};

const renderPage = (onNavigate = vi.fn()) => render(
  <MemoryRouter>
    <OverviewPage
      onNavigate={onNavigate}
      session={session}
    />
  </MemoryRouter>,
);

beforeEach(() => {
  pageMocks.dashboard.data = overview;
  pageMocks.dashboard.dataUpdatedAt = 1;
  pageMocks.dashboard.error = null;
  pageMocks.dashboard.isError = false;
  pageMocks.dashboard.isFetching = false;
  pageMocks.dashboard.isPending = false;
  pageMocks.dashboard.refetch.mockResolvedValue({
    error: null,
    isError: false,
  });
  pageMocks.listDrafts.mockResolvedValue([]);
  pageMocks.listReceipts.mockResolvedValue([]);
  pageMocks.consumeReceipt.mockResolvedValue(true);
  pageMocks.newIntent.mockReturnValue(intent);
  pageMocks.recoverIntent.mockReturnValue(intent);
  pageMocks.persist.mockResolvedValue(draft);
  pageMocks.receiptMatchesAttempt.mockReturnValue(false);
  pageMocks.mutateAsync.mockResolvedValue({
    problemId,
    resumed: false,
    sessionId,
    sessionVersion: 1,
  });
  pageMocks.acknowledge.mockResolvedValue(true);
  pageMocks.discard.mockResolvedValue(true);
  pageMocks.isAttemptActive.mockImplementation(
    (candidate: RecoverableDraft) => candidate.lastAttemptAt !== null,
  );
});

describe("OverviewPage", () => {
  it("renders a layout-matched loading state before exposing actions", () => {
    pageMocks.dashboard.data = undefined;
    pageMocks.dashboard.isPending = true;

    renderPage();

    expect(screen.getByRole("status", { name: "正在载入训练总览" })).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders a focused query error without stale or fabricated content", () => {
    pageMocks.dashboard.data = undefined;
    pageMocks.dashboard.error = new ApiError({
      code: "DASHBOARD_UNAVAILABLE",
      message: "Unavailable",
      requestId: "req-overview-1",
      retryable: true,
      status: 503,
    });
    pageMocks.dashboard.isError = true;

    renderPage();

    expect(screen.getByRole("alert")).toHaveAttribute(
      "data-recovery-state",
      "recoverable-error",
    );
    expect(screen.getByText("req-overview-1")).toBeVisible();
    expect(screen.queryByText(/排行榜|leaderboard/iu)).not.toBeInTheDocument();
    expect(screen.queryByText(/新闻|news/iu)).not.toBeInTheDocument();
  });

  it("shows an honest empty recommendation while preserving real metrics", () => {
    pageMocks.dashboard.data = {
      ...overview,
      todayTask: null,
      weakness: null,
    };

    renderPage();

    expect(screen.getByRole("heading", { name: "今天还没有可开始的推荐" }))
      .toBeVisible();
    expect(screen.getByText("90")).toBeVisible();
    expect(screen.queryByRole("button", { name: "开始 / 继续训练" }))
      .not.toBeInTheDocument();
  });

  it("uses one dominant CTA for the real server recommendation", async () => {
    renderPage();

    const recommendationTitle = screen.getByRole("heading", {
      name: "完成两数之和训练",
    });
    const recommendation = recommendationTitle.closest("article");
    if (recommendation === null) throw new Error("RECOMMENDATION_CARD_EXPECTED");
    expect(recommendationTitle).toBeVisible();
    expect(screen.getByText("巩固数组与哈希表")).toBeVisible();
    expect(within(recommendation).getByText("+20 XP")).toBeVisible();
    expect(screen.getAllByRole("button")).toHaveLength(1);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "开始 / 继续训练" })).toBeEnabled();
    });
  });

  it("surfaces the latest owner-scoped start draft after reload and retries its exact intent", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    pageMocks.listDrafts.mockResolvedValue([draft]);
    renderPage(onNavigate);

    expect(await screen.findByRole("alert")).toHaveAttribute(
      "data-recovery-state",
      "recoverable-error",
    );
    expect(pageMocks.recoverIntent).toHaveBeenCalledWith(draft);
    expect(pageMocks.newIntent).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "重试启动" }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ));
    expect(pageMocks.mutateAsync).toHaveBeenCalledWith(intent);
    expect(pageMocks.persist).not.toHaveBeenCalled();
  });

  it("keeps a first-load draft with an active replay lease locked from manual retry", async () => {
    const attemptedDraft: RecoverableDraft = {
      ...draft,
      attemptCount: 1,
      lastAttemptAt: new Date().toISOString(),
    };
    pageMocks.listDrafts.mockResolvedValue([attemptedDraft]);
    const view = renderPage();

    expect(await screen.findByRole("status", {
      name: "正在恢复训练会话",
    })).toHaveAttribute("data-recovery-state", "retry");
    expect(screen.queryByRole("button", { name: "重试启动" }))
      .not.toBeInTheDocument();
    expect(pageMocks.mutateAsync).not.toHaveBeenCalled();

    view.unmount();
  });

  it("polls durable recovery until a cross-tab receipt is available", async () => {
    const onNavigate = vi.fn();
    const attemptedDraft: RecoverableDraft = {
      ...draft,
      attemptCount: 1,
      lastAttemptAt: new Date().toISOString(),
    };
    pageMocks.listReceipts
      .mockResolvedValueOnce([])
      .mockImplementationOnce(async () => {
        await new Promise((resolve) => window.setTimeout(resolve, 900));
        return [];
      })
      .mockResolvedValue([recoveryReceipt]);
    pageMocks.listDrafts
      .mockResolvedValueOnce([attemptedDraft])
      .mockResolvedValueOnce([attemptedDraft])
      .mockResolvedValue([]);
    const view = renderPage(onNavigate);

    expect(await screen.findByRole("status", {
      name: "正在恢复训练会话",
    })).toBeVisible();
    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ), { timeout: 4_000 });
    expect(pageMocks.listReceipts.mock.calls.length).toBeGreaterThan(1);
    expect(pageMocks.consumeReceipt).toHaveBeenCalledWith(
      ownerScope,
      recoveryReceipt,
    );
    expect(pageMocks.mutateAsync).not.toHaveBeenCalled();

    view.unmount();
  });

  it("rechecks receipts before unlocking when a cross-tab replay removes the source", async () => {
    const onNavigate = vi.fn();
    pageMocks.listReceipts
      .mockResolvedValueOnce([])
      .mockResolvedValue([recoveryReceipt]);
    pageMocks.listDrafts.mockResolvedValue([]);

    renderPage(onNavigate);

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ));
    expect(pageMocks.listReceipts.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(pageMocks.consumeReceipt).toHaveBeenCalledWith(
      ownerScope,
      recoveryReceipt,
    );
    expect(pageMocks.newIntent).not.toHaveBeenCalled();
    expect(pageMocks.mutateAsync).not.toHaveBeenCalled();
  });

  it("keeps an old receipt locked while a newer source attempt is active", async () => {
    const onNavigate = vi.fn();
    const attemptedDraft: RecoverableDraft = {
      ...draft,
      attemptCount: 2,
      lastAttemptAt: new Date().toISOString(),
    };
    const replacementReceipt: TrainingRecoveryReceipt = {
      ...recoveryReceipt,
      draft: {
        ...recoveryReceipt.draft,
        generationId: "gen-overviewStartReceiptReplacement98765",
        updatedAt: "2026-07-27T08:02:00Z",
      },
    };
    let durableDrafts: readonly RecoverableDraft[] = [attemptedDraft];
    let durableReceipts: readonly TrainingRecoveryReceipt[] = [recoveryReceipt];
    pageMocks.listDrafts.mockImplementation(async () => durableDrafts);
    pageMocks.listReceipts.mockImplementation(async () => durableReceipts);
    const view = renderPage(onNavigate);

    expect(await screen.findByRole("status", {
      name: "正在恢复训练会话",
    })).toBeVisible();
    expect(pageMocks.acknowledge).not.toHaveBeenCalled();
    expect(pageMocks.consumeReceipt).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();

    durableDrafts = [];
    durableReceipts = [replacementReceipt];

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ), { timeout: 3_000 });
    expect(pageMocks.consumeReceipt).toHaveBeenCalledOnce();
    expect(pageMocks.consumeReceipt).toHaveBeenCalledWith(
      ownerScope,
      replacementReceipt,
    );

    view.unmount();
  });

  it("consumes a receipt that proves the exact active source attempt succeeded", async () => {
    const onNavigate = vi.fn();
    const attemptedDraft: RecoverableDraft = {
      ...draft,
      attemptCount: 2,
      lastAttemptAt: new Date().toISOString(),
    };
    pageMocks.listDrafts.mockResolvedValue([attemptedDraft]);
    pageMocks.listReceipts.mockResolvedValue([recoveryReceipt]);
    pageMocks.receiptMatchesAttempt.mockReturnValue(true);

    renderPage(onNavigate);

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ));
    expect(pageMocks.receiptMatchesAttempt).toHaveBeenCalledWith(
      recoveryReceipt,
      attemptedDraft,
    );
    expect(pageMocks.acknowledge).toHaveBeenCalledWith(attemptedDraft);
    expect(pageMocks.consumeReceipt).toHaveBeenCalledWith(
      ownerScope,
      recoveryReceipt,
    );
  });

  it("cleans an expired source before consuming its legacy receipt", async () => {
    const onNavigate = vi.fn();
    const expiredAttempt: RecoverableDraft = {
      ...draft,
      attemptCount: 1,
      lastAttemptAt: "2026-07-26T08:00:00Z",
    };
    pageMocks.isAttemptActive.mockReturnValue(false);
    pageMocks.listDrafts.mockResolvedValue([expiredAttempt]);
    pageMocks.listReceipts.mockResolvedValue([recoveryReceipt]);

    renderPage(onNavigate);

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ));
    expect(pageMocks.acknowledge).toHaveBeenCalledWith(expiredAttempt);
    expect(pageMocks.consumeReceipt).toHaveBeenCalledWith(
      ownerScope,
      recoveryReceipt,
    );
  });

  it("takes over an expired crashed attempt before consuming an older receipt", async () => {
    const onNavigate = vi.fn();
    const oldAttemptAt = "2026-07-26T07:00:00Z";
    const crashedAttempt: RecoverableDraft = {
      ...draft,
      attemptCount: 2,
      lastAttemptAt: "2026-07-26T08:00:00Z",
    };
    if (recoveryReceipt.payload.intentKind !== "start") {
      throw new Error("START_RECEIPT_EXPECTED");
    }
    const oldReceiptPayload: Extract<
      TrainingRecoveryReceipt["payload"],
      Readonly<{ intentKind: "start" }>
    > = {
      ...recoveryReceipt.payload,
      sourceAttemptCount: 1,
      sourceLastAttemptAt: oldAttemptAt,
    };
    const oldReceipt: TrainingRecoveryReceipt = {
      draft: {
        ...recoveryReceipt.draft,
        payload: oldReceiptPayload,
      },
      payload: oldReceiptPayload,
    };
    pageMocks.isAttemptActive.mockReturnValue(false);
    pageMocks.listDrafts.mockResolvedValue([crashedAttempt]);
    pageMocks.listReceipts.mockResolvedValue([oldReceipt]);
    pageMocks.acknowledge
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    renderPage(onNavigate);

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ));
    expect(oldReceipt.payload.sourceAttemptCount).not.toBe(
      crashedAttempt.attemptCount,
    );
    expect(pageMocks.acknowledge).toHaveBeenCalledTimes(2);
    expect(pageMocks.consumeReceipt).toHaveBeenCalledWith(
      ownerScope,
      oldReceipt,
    );
  });

  it("unlocks manual retry after polling observes a released replay lease", async () => {
    const attemptedDraft: RecoverableDraft = {
      ...draft,
      attemptCount: 1,
      lastAttemptAt: new Date().toISOString(),
    };
    const releasedDraft: RecoverableDraft = {
      ...attemptedDraft,
      lastAttemptAt: null,
    };
    pageMocks.listDrafts
      .mockResolvedValueOnce([attemptedDraft])
      .mockResolvedValue([releasedDraft]);
    const view = renderPage();

    expect(await screen.findByRole("status", {
      name: "正在恢复训练会话",
    })).toBeVisible();
    expect(await screen.findByRole("button", {
      name: "重试启动",
    }, { timeout: 3_000 })).toBeEnabled();
    expect(pageMocks.mutateAsync).not.toHaveBeenCalled();

    view.unmount();
  });

  it("does not keep an expired replay lease locked", async () => {
    const expiredAttempt: RecoverableDraft = {
      ...draft,
      attemptCount: 1,
      lastAttemptAt: "2026-07-26T08:00:00Z",
    };
    pageMocks.isAttemptActive.mockReturnValue(false);
    pageMocks.listDrafts.mockResolvedValue([expiredAttempt]);

    renderPage();

    expect(await screen.findByRole("button", {
      name: "重试启动",
    })).toBeEnabled();
    expect(pageMocks.isAttemptActive).toHaveBeenCalledWith(expiredAttempt);
    expect(pageMocks.mutateAsync).not.toHaveBeenCalled();
  });

  it("consumes a durable start receipt once before continuing to its exact session", async () => {
    const onNavigate = vi.fn();
    pageMocks.listReceipts.mockResolvedValue([recoveryReceipt]);
    pageMocks.listDrafts.mockResolvedValue([draft]);
    renderPage(onNavigate);

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ));
    expect(pageMocks.consumeReceipt).toHaveBeenCalledOnce();
    expect(pageMocks.consumeReceipt).toHaveBeenCalledWith(
      ownerScope,
      recoveryReceipt,
    );
    expect(pageMocks.acknowledge).toHaveBeenCalledWith(draft);
    expect(pageMocks.acknowledge.mock.invocationCallOrder[0]).toBeLessThan(
      pageMocks.consumeReceipt.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(pageMocks.mutateAsync).not.toHaveBeenCalled();
  });

  it("consumes older start receipts before navigating to the newest recovered session", async () => {
    const olderProblemId = "70000000-0000-4000-8000-000000000007";
    const olderSessionId = "80000000-0000-4000-8000-000000000008";
    if (recoveryReceipt.payload.intentKind !== "start") {
      throw new Error("START_RECEIPT_EXPECTED");
    }
    const {
      sourceAttemptCount,
      sourceLastAttemptAt,
      ...receiptPayloadWithoutAttempt
    } = recoveryReceipt.payload;
    const olderPayload: Extract<
      TrainingRecoveryReceipt["payload"],
      Readonly<{ intentKind: "start" }>
    > = {
      ...receiptPayloadWithoutAttempt,
      ...(sourceAttemptCount === undefined ? {} : { sourceAttemptCount }),
      ...(sourceLastAttemptAt === undefined ? {} : { sourceLastAttemptAt }),
      response: {
        ...recoveryReceipt.payload.response,
        problemId: olderProblemId,
        sessionId: olderSessionId,
      },
      sourceDraftId: "draft-olderStartRequest123456",
      sourceGenerationId: "gen-olderStartRequest123456",
    };
    const olderReceipt: TrainingRecoveryReceipt = {
      draft: {
        ...recoveryReceipt.draft,
        draftId: "draft-olderStartReceipt123456",
        generationId: "gen-olderStartReceipt123456",
        idempotencyKey: "receipt_olderStartRequest123456",
        payload: olderPayload,
        resourceId: olderSessionId,
        updatedAt: "2026-07-27T07:59:00Z",
      },
      payload: olderPayload,
    };
    const onNavigate = vi.fn();
    pageMocks.listReceipts.mockResolvedValue([
      recoveryReceipt,
      olderReceipt,
    ]);

    renderPage(onNavigate);

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ));
    expect(pageMocks.consumeReceipt).toHaveBeenNthCalledWith(
      1,
      ownerScope,
      olderReceipt,
    );
    expect(pageMocks.consumeReceipt).toHaveBeenNthCalledWith(
      2,
      ownerScope,
      recoveryReceipt,
    );
  });

  it("keeps recovery locked when the exact receipt cannot be consumed", async () => {
    const onNavigate = vi.fn();
    pageMocks.listReceipts.mockResolvedValue([recoveryReceipt]);
    pageMocks.consumeReceipt.mockResolvedValue(false);

    renderPage(onNavigate);

    expect(await screen.findByRole("alert")).toHaveAttribute(
      "data-recovery-state",
      "recoverable-error",
    );
    expect(onNavigate).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "开始 / 继续训练" }))
      .not.toBeInTheDocument();
  });

  it("does not unlock when a newer generation replaces an unconsumed receipt", async () => {
    const replacementReceipt: TrainingRecoveryReceipt = {
      ...recoveryReceipt,
      draft: {
        ...recoveryReceipt.draft,
        generationId: "gen-overviewStartReceiptReplacement12345",
        updatedAt: "2026-07-27T08:02:00Z",
      },
    };
    const onNavigate = vi.fn();
    pageMocks.listReceipts
      .mockResolvedValueOnce([recoveryReceipt])
      .mockResolvedValue([replacementReceipt]);
    pageMocks.consumeReceipt.mockResolvedValue(false);

    renderPage(onNavigate);

    expect(await screen.findByRole("alert")).toHaveAttribute(
      "data-recovery-state",
      "recoverable-error",
    );
    expect(onNavigate).not.toHaveBeenCalled();
    expect(pageMocks.consumeReceipt).toHaveBeenCalledOnce();
  });

  it("preserves a receipt when its exact source generation remains", async () => {
    const onNavigate = vi.fn();
    pageMocks.listReceipts.mockResolvedValue([recoveryReceipt]);
    pageMocks.listDrafts.mockResolvedValue([draft]);
    pageMocks.acknowledge.mockResolvedValue(false);

    renderPage(onNavigate);

    expect(await screen.findByRole("alert")).toHaveAttribute(
      "data-recovery-state",
      "recoverable-error",
    );
    expect(pageMocks.consumeReceipt).not.toHaveBeenCalled();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("surfaces durable-inspection failures and retries before unlocking start", async () => {
    const user = userEvent.setup();
    pageMocks.listReceipts
      .mockRejectedValueOnce(new Error("INDEXED_DB_UNAVAILABLE"))
      .mockResolvedValueOnce([]);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveAttribute(
      "data-recovery-state",
      "recoverable-error",
    );
    expect(screen.queryByRole("button", { name: "开始 / 继续训练" }))
      .not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "重试启动" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "开始 / 继续训练" })).toBeEnabled();
    });
    expect(pageMocks.listReceipts).toHaveBeenCalledTimes(3);
  });

  it("consumes a reconnect receipt that raced manual success before navigating", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    pageMocks.listReceipts
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValue([recoveryReceipt]);
    pageMocks.acknowledge.mockResolvedValueOnce(false);
    renderPage(onNavigate);

    await user.click(await screen.findByRole("button", {
      name: "开始 / 继续训练",
    }));

    await waitFor(() => expect(pageMocks.consumeReceipt).toHaveBeenCalledWith(
      ownerScope,
      recoveryReceipt,
    ));
    expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    );
  });

  it("polls for a replay receipt when an in-flight reconnect advanced the source", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const attemptedDraft: RecoverableDraft = {
      ...draft,
      attemptCount: 1,
      lastAttemptAt: "2026-07-27T08:00:30Z",
    };
    pageMocks.listReceipts
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValue([recoveryReceipt]);
    pageMocks.listDrafts
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([attemptedDraft])
      .mockResolvedValue([]);
    pageMocks.acknowledge
      .mockResolvedValueOnce(false)
      .mockResolvedValue(true);
    renderPage(onNavigate);

    await user.click(await screen.findByRole("button", {
      name: "开始 / 继续训练",
    }));

    expect(await screen.findByRole("status", {
      name: "正在恢复训练会话",
    })).toHaveAttribute(
      "data-recovery-state",
      "retry",
    );
    expect(onNavigate).not.toHaveBeenCalled();

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ), { timeout: 3_000 });
    expect(pageMocks.consumeReceipt).toHaveBeenCalledWith(
      ownerScope,
      recoveryReceipt,
    );
  });

  it("persists the exact start intent and navigates only after server acknowledgement", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    renderPage(onNavigate);

    await user.click(screen.getByRole("button", { name: "开始 / 继续训练" }));

    await waitFor(() => {
      expect(pageMocks.persist).toHaveBeenCalledWith(ownerScope, intent);
      expect(pageMocks.mutateAsync).toHaveBeenCalledWith(intent);
      expect(pageMocks.acknowledge).toHaveBeenCalledWith(draft);
      expect(onNavigate).toHaveBeenCalledWith(
        `/problems?problem=${problemId}&session=${sessionId}`,
      );
    });
  });

  it("hands an existing server session to the exact selected problem route", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    pageMocks.mutateAsync.mockResolvedValueOnce({
      problemId,
      resumed: true,
      sessionId,
      sessionVersion: 4,
    });
    renderPage(onNavigate);

    await user.click(screen.getByRole("button", { name: "开始 / 继续训练" }));

    await waitFor(() => {
      expect(onNavigate).toHaveBeenCalledWith(
        `/problems?problem=${problemId}&session=${sessionId}`,
      );
    });
    expect(pageMocks.acknowledge).toHaveBeenCalledWith(draft);
  });

  it("retries a durable request with the same intent instead of creating a duplicate", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    pageMocks.mutateAsync
      .mockRejectedValueOnce(new ApiError({
        code: "TRAINING_TEMPORARY",
        message: "Temporary",
        requestId: "req-start-1",
        retryable: true,
        status: 503,
      }))
      .mockResolvedValueOnce({
        problemId,
        resumed: true,
        sessionId,
        sessionVersion: 2,
      });
    pageMocks.listDrafts
      .mockResolvedValueOnce([])
      .mockResolvedValue([draft]);
    renderPage(onNavigate);

    await user.click(screen.getByRole("button", { name: "开始 / 继续训练" }));
    const recovery = await screen.findByRole("alert");
    expect(recovery).toHaveAttribute("data-recovery-state", "recoverable-error");
    expect(pageMocks.persist).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "重试启动" }));
    await waitFor(() => expect(onNavigate).toHaveBeenCalledOnce());

    expect(pageMocks.persist).toHaveBeenCalledTimes(1);
    expect(pageMocks.mutateAsync).toHaveBeenNthCalledWith(1, intent);
    expect(pageMocks.mutateAsync).toHaveBeenNthCalledWith(2, intent);
    expect(pageMocks.discard).not.toHaveBeenCalled();
  });

  it("keeps a non-recoverable draft until the user explicitly discards it", async () => {
    const user = userEvent.setup();
    pageMocks.mutateAsync.mockRejectedValueOnce(new ApiError({
      code: "TRAINING_REQUEST_INVALID",
      message: "Invalid request",
      requestId: "req-start-invalid",
      status: 422,
    }));
    renderPage();

    await user.click(screen.getByRole("button", { name: "开始 / 继续训练" }));
    const recovery = await screen.findByRole("alert");
    expect(recovery).toHaveAttribute(
      "data-recovery-state",
      "non-recoverable-error",
    );
    expect(pageMocks.discard).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "放弃本次请求" }));
    await waitFor(() => expect(pageMocks.discard).toHaveBeenCalledWith(draft));
    expect(await screen.findByRole("button", { name: "开始 / 继续训练" }))
      .toBeEnabled();
  });

  it("refreshes a stale overview successfully before discarding the exact draft", async () => {
    const user = userEvent.setup();
    pageMocks.mutateAsync.mockRejectedValueOnce(new ApiError({
      code: "TRAINING_VERSION_CONFLICT",
      message: "Stale request",
      requestId: "req-start-stale",
      status: 409,
    }));
    renderPage();

    await user.click(await screen.findByRole("button", {
      name: "开始 / 继续训练",
    }));
    await user.click(await screen.findByRole("button", {
      name: "载入最新推荐",
    }));

    await waitFor(() => expect(pageMocks.discard).toHaveBeenCalledWith(draft));
    expect(pageMocks.dashboard.refetch).toHaveBeenCalledOnce();
    expect(pageMocks.dashboard.refetch.mock.invocationCallOrder[0]).toBeLessThan(
      pageMocks.discard.mock.invocationCallOrder[0] ?? Number.POSITIVE_INFINITY,
    );
    expect(await screen.findByRole("button", { name: "开始 / 继续训练" }))
      .toBeEnabled();
  });

  it("preserves a stale draft when refetch resolves with an error result", async () => {
    const user = userEvent.setup();
    pageMocks.mutateAsync.mockRejectedValueOnce(new ApiError({
      code: "TRAINING_VERSION_CONFLICT",
      message: "Stale request",
      requestId: "req-start-stale",
      status: 409,
    }));
    pageMocks.dashboard.refetch.mockResolvedValueOnce({
      error: new ApiError({
        code: "DASHBOARD_UNAVAILABLE",
        message: "Refresh failed",
        requestId: "req-refresh-failed",
        retryable: true,
        status: 503,
      }),
      isError: true,
    });
    renderPage();

    await user.click(await screen.findByRole("button", {
      name: "开始 / 继续训练",
    }));
    await user.click(await screen.findByRole("button", {
      name: "载入最新推荐",
    }));

    expect(await screen.findByText("req-refresh-failed")).toBeVisible();
    expect(pageMocks.discard).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toBeVisible();
  });

  it("reconciles a false exact discard to a newer draft instead of hiding it", async () => {
    const user = userEvent.setup();
    const replacementDraft: RecoverableDraft = {
      ...draft,
      generationId: "gen-overviewStartReplacement12345",
      idempotencyKey: "overview-start-replacement-12345",
      updatedAt: "2026-07-27T08:05:00Z",
    };
    const replacementIntent: StartTrainingIntent = {
      ...intent,
      idempotencyKey: replacementDraft.idempotencyKey,
    };
    pageMocks.listDrafts
      .mockResolvedValueOnce([])
      .mockResolvedValue([replacementDraft]);
    pageMocks.recoverIntent.mockImplementation((candidate: RecoverableDraft) => (
      candidate === replacementDraft ? replacementIntent : intent
    ));
    pageMocks.discard.mockResolvedValueOnce(false);
    pageMocks.mutateAsync
      .mockRejectedValueOnce(new ApiError({
        code: "TRAINING_REQUEST_INVALID",
        message: "Invalid request",
        requestId: "req-start-invalid",
        status: 422,
      }))
      .mockResolvedValueOnce({
        problemId,
        resumed: true,
        sessionId,
        sessionVersion: 3,
      });
    renderPage();

    await user.click(await screen.findByRole("button", {
      name: "开始 / 继续训练",
    }));
    await user.click(await screen.findByRole("button", {
      name: "放弃本次请求",
    }));

    expect(await screen.findByRole("button", { name: "重试启动" })).toBeVisible();
    expect(screen.queryByRole("button", { name: "开始 / 继续训练" }))
      .not.toBeInTheDocument();
    expect(pageMocks.recoverIntent).toHaveBeenCalledWith(replacementDraft);

    await user.click(screen.getByRole("button", { name: "重试启动" }));
    await waitFor(() => {
      expect(pageMocks.mutateAsync).toHaveBeenLastCalledWith(replacementIntent);
    });
  });

  it("reconciles a false discard to a matching successful receipt", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    pageMocks.listReceipts
      .mockResolvedValueOnce([])
      .mockResolvedValue([recoveryReceipt]);
    pageMocks.discard.mockResolvedValueOnce(false);
    pageMocks.mutateAsync.mockRejectedValueOnce(new ApiError({
      code: "TRAINING_REQUEST_INVALID",
      message: "Invalid request",
      requestId: "req-start-invalid",
      status: 422,
    }));
    renderPage(onNavigate);

    await user.click(await screen.findByRole("button", {
      name: "开始 / 继续训练",
    }));
    await user.click(await screen.findByRole("button", {
      name: "放弃本次请求",
    }));

    await waitFor(() => expect(onNavigate).toHaveBeenCalledWith(
      `/problems?problem=${problemId}&session=${sessionId}`,
    ));
    expect(pageMocks.consumeReceipt).toHaveBeenCalledWith(
      ownerScope,
      recoveryReceipt,
    );
  });

  it("keeps recovery visible when exact discard throws", async () => {
    const user = userEvent.setup();
    pageMocks.discard.mockRejectedValueOnce(new Error("INDEXED_DB_UNAVAILABLE"));
    pageMocks.mutateAsync.mockRejectedValueOnce(new ApiError({
      code: "TRAINING_REQUEST_INVALID",
      message: "Invalid request",
      requestId: "req-start-invalid",
      status: 422,
    }));
    renderPage();

    await user.click(await screen.findByRole("button", {
      name: "开始 / 继续训练",
    }));
    await user.click(await screen.findByRole("button", {
      name: "放弃本次请求",
    }));

    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.queryByRole("button", { name: "开始 / 继续训练" }))
      .not.toBeInTheDocument();
  });
});

type RecoveryCase = Readonly<{
  callback: "onReload" | "onRetry" | "onReturn" | "onSignIn";
  label: string;
  state:
    | "recoverable-error"
    | "non-recoverable-error"
    | "offline-draft"
    | "permission-denied"
    | "stale-version-conflict"
    | "retry";
}>;

const recoveryCases: readonly RecoveryCase[] = [
  { callback: "onRetry", label: "重试启动", state: "recoverable-error" },
  { callback: "onReturn", label: "放弃本次请求", state: "non-recoverable-error" },
  { callback: "onRetry", label: "联网后重试", state: "offline-draft" },
  { callback: "onSignIn", label: "重新登录", state: "permission-denied" },
  { callback: "onReload", label: "载入最新推荐", state: "stale-version-conflict" },
  { callback: "onRetry", label: "正在重试", state: "retry" },
];

describe("TrainingStartRecovery", () => {
  it.each(recoveryCases)(
    "maps $state to its safe recovery action",
    async ({ callback, label, state }) => {
      const user = userEvent.setup();
      const handler = vi.fn();

      render(
        <TrainingStartRecovery
          language="zh-CN"
          state={state}
          {...{ [callback]: handler }}
        />,
      );

      const role = ["offline-draft", "retry"].includes(state) ? "status" : "alert";
      expect(screen.getByRole(role)).toHaveAttribute("data-recovery-state", state);
      await user.click(screen.getByRole("button", { name: label }));
      expect(handler).toHaveBeenCalledOnce();
    },
  );
});
