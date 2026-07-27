const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("../../shared/api/client", () => ({ apiRequest: apiRequestMock }));

import { QueryClient } from "@tanstack/react-query";

import { ApiError } from "../../shared/api/errors";
import type { ProblemMutationIntent } from "./problems.mutations";
import { subscribeProblemDraftChanges } from "./problems.events";
import {
  createProblemMutationDraft,
  persistProblemMutationDraft,
  recoverProblemMutationIntent,
  registerProblemDraftReconnectReplay,
  replayProblemMutationDrafts,
} from "./problems.recovery";
import type { ProblemDetail } from "./problems.schema";
import {
  createInMemoryDraftRepository,
  reviseRecoverableDraft,
} from "../../shared/storage/drafts";

const ownerScope = "acct-1234567890abcdef";
const problemId = "29584c83-7297-44ef-b985-f38e6c95de76";
const stateId = "19584c83-7297-44ef-b985-f38e6c95de76";
const verifyOwner = async (): Promise<void> => undefined;

const problemDetail = (overrides: Partial<ProblemDetail> = {}): ProblemDetail => ({
  category: "Array",
  companies: ["QuantGym"],
  difficulty: "Medium",
  favorite: {
    favorite: false,
    stateId: null,
    updatedAt: null,
    version: null,
  },
  hot100: true,
  id: problemId,
  note: null,
  noteExists: false,
  noteVersion: null,
  progress: {
    attemptCount: 0,
    bestScore: null,
    completedAt: null,
    hintCount: 0,
    lastPracticedAt: null,
    lastScore: null,
    solutionRevealedAt: null,
    status: "unstarted",
    version: null,
  },
  promptEn: "Return the two indices.",
  promptZh: "返回两个下标。",
  source: {
    contentVersion: "preview-v1",
    name: "QuantGym Preview",
    slug: "quantgym-preview",
  },
  tags: ["array"],
  titleEn: "Two Sum",
  titleZh: "两数之和",
  version: 1,
  ...overrides,
});

describe("Problems draft recovery", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    vi.spyOn(document, "cookie", "get").mockReturnValue(
      "__Host-qg_csrf=session-proof-problems-123456",
    );
  });

  it.each<ProblemMutationIntent>([
    {
      expectedStateId: stateId,
      expectedVersion: 2,
      favorite: true,
      idempotencyKey: "problem-favorite-intent-1234",
      kind: "set-favorite",
      problemId,
    },
    {
      body: "保留双指针思路",
      expectedVersion: 3,
      idempotencyKey: "problem-note-intent-12345678",
      kind: "save-note",
      problemId,
    },
  ])("round-trips the $kind intent without auth material", (intent) => {
    const draft = createProblemMutationDraft(ownerScope, intent);

    expect(recoverProblemMutationIntent(draft)).toEqual(intent);
    expect(JSON.stringify(draft.payload)).not.toContain("csrf");
    expect(draft.idempotencyKey).toBe(intent.idempotencyKey);
  });

  it("keeps a failed reconnect draft, reuses its key, then removes it on acknowledgement", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const intent: ProblemMutationIntent = {
      body: "联网后同步",
      expectedVersion: null,
      idempotencyKey: "problem-note-reconnect-123456",
      kind: "save-note",
      problemId,
    };
    const draft = await persistProblemMutationDraft(ownerScope, intent, repository);
    apiRequestMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        body: intent.body,
        updatedAt: "2026-07-27T04:00:00Z",
        version: 1,
      });

    const first = await replayProblemMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });
    const second = await replayProblemMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });

    expect(first.retained).toEqual([{
      code: "NETWORK_OFFLINE",
      draftId: draft.draftId,
      reason: "failed",
      requestId: null,
      retryable: true,
      state: "offline-draft",
    }]);
    expect(second.acknowledged).toEqual([draft.draftId]);
    expect(await repository.list(ownerScope)).toEqual([]);
    expect(recoverProblemMutationIntent(draft).idempotencyKey).toBe(intent.idempotencyKey);
    queryClient.clear();
  });

  it("shares one replay signal with owner verification and the API mutation", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const intent: ProblemMutationIntent = {
      body: "使用同一取消边界",
      expectedVersion: null,
      idempotencyKey: "problem-note-signal-12345678",
      kind: "save-note",
      problemId,
    };
    const draft = await persistProblemMutationDraft(ownerScope, intent, repository);
    const ownerSignals: Array<AbortSignal | undefined> = [];
    const verifyOwnerWithSignal = vi.fn(async (signal?: AbortSignal) => {
      ownerSignals.push(signal);
    });
    apiRequestMock.mockResolvedValueOnce({
      body: intent.body,
      updatedAt: "2026-07-27T04:00:00Z",
      version: 1,
    });

    const report = await replayProblemMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner: verifyOwnerWithSignal,
    });

    const requestOptions = apiRequestMock.mock.calls[0]?.[1] as
      | { signal?: AbortSignal }
      | undefined;
    expect(requestOptions?.signal).toBeDefined();
    expect(ownerSignals).toEqual([
      requestOptions?.signal,
      requestOptions?.signal,
    ]);
    expect(report.acknowledged).toEqual([draft.draftId]);
    queryClient.clear();
  });

  it("stops before the API mutation when replay is aborted during owner verification", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const controller = new AbortController();
    const abortReason = new DOMException("Problems replay cancelled", "AbortError");
    const intent: ProblemMutationIntent = {
      body: "不应发送",
      expectedVersion: null,
      idempotencyKey: "problem-note-abort-12345678",
      kind: "save-note",
      problemId,
    };
    await persistProblemMutationDraft(ownerScope, intent, repository);
    const abortingVerifier = vi.fn(async () => {
      controller.abort(abortReason);
    });

    await expect(replayProblemMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      signal: controller.signal,
      verifyOwner: abortingVerifier,
    })).rejects.toBe(abortReason);

    expect(abortingVerifier).toHaveBeenCalledTimes(1);
    expect(apiRequestMock).not.toHaveBeenCalled();
    expect(await repository.list(ownerScope)).toHaveLength(1);
    queryClient.clear();
  });

  it("rejects a draft whose resource or server generation disagrees with its payload", () => {
    const intent: ProblemMutationIntent = {
      body: "版本必须一致",
      expectedVersion: 3,
      idempotencyKey: "problem-note-generation-1234",
      kind: "save-note",
      problemId,
    };
    const draft = createProblemMutationDraft(ownerScope, intent);

    expect(() => recoverProblemMutationIntent({
      ...draft,
      resourceId: "not-a-problem-id",
    })).toThrow();
    expect(() => recoverProblemMutationIntent({
      ...draft,
      serverVersion: 4,
    })).toThrow();
  });

  it("acknowledges a lost conflict response only when the latest note satisfies the exact intent", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const intent: ProblemMutationIntent = {
      body: "服务端已经保存",
      expectedVersion: 2,
      idempotencyKey: "problem-note-conflict-ack-1234",
      kind: "save-note",
      problemId,
    };
    const draft = await persistProblemMutationDraft(ownerScope, intent, repository);
    apiRequestMock
      .mockRejectedValueOnce(new ApiError({
        code: "PROBLEM_NOTE_VERSION_CONFLICT",
        message: "Note changed.",
        requestId: "request-note-conflict-ack",
        status: 409,
      }))
      .mockResolvedValueOnce(problemDetail({
        note: {
          body: intent.body,
          updatedAt: "2026-07-27T04:30:00Z",
          version: 3,
        },
        noteExists: true,
        noteVersion: 3,
      }));

    const report = await replayProblemMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });

    expect(report.acknowledged).toEqual([draft.draftId]);
    expect(await repository.list(ownerScope)).toEqual([]);
    queryClient.clear();
  });

  it("retains an unsatisfied conflict with stale-version classification", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const intent: ProblemMutationIntent = {
      body: "我的待同步笔记",
      expectedVersion: 2,
      idempotencyKey: "problem-note-conflict-keep-12",
      kind: "save-note",
      problemId,
    };
    const draft = await persistProblemMutationDraft(ownerScope, intent, repository);
    apiRequestMock
      .mockRejectedValueOnce(new ApiError({
        code: "PROBLEM_NOTE_VERSION_CONFLICT",
        message: "Note changed.",
        requestId: "request-note-conflict-keep",
        status: 409,
      }))
      .mockResolvedValueOnce(problemDetail({
        note: {
          body: "另一个标签页的笔记",
          updatedAt: "2026-07-27T04:31:00Z",
          version: 3,
        },
        noteExists: true,
        noteVersion: 3,
      }));

    const report = await replayProblemMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });

    expect(report.retained).toEqual([{
      code: "PROBLEM_NOTE_VERSION_CONFLICT",
      draftId: draft.draftId,
      reason: "deferred",
      requestId: "request-note-conflict-keep",
      retryable: false,
      state: "stale-version-conflict",
    }]);
    expect(await repository.list(ownerScope)).toHaveLength(1);
    queryClient.clear();
  });

  it("never deletes a newer draft generation when an older acknowledgement arrives", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const intent: ProblemMutationIntent = {
      body: "旧笔记",
      expectedVersion: null,
      idempotencyKey: "problem-note-exact-generation",
      kind: "save-note",
      problemId,
    };
    const draft = await persistProblemMutationDraft(ownerScope, intent, repository);
    let resolveRequest!: (value: unknown) => void;
    apiRequestMock.mockImplementationOnce(() => new Promise((resolve) => {
      resolveRequest = resolve;
    }));

    const replay = replayProblemMutationDrafts({
      csrfProof: "csrf-proof-1234567890abcdef",
      ownerScope,
      queryClient,
      repository,
      verifyOwner,
    });
    await vi.waitFor(() => expect(apiRequestMock).toHaveBeenCalledOnce());
    const revised = reviseRecoverableDraft(draft, {
      payload: { body: "更新后的笔记", expectedVersion: null },
      serverVersion: null,
    });
    await repository.put(revised);
    resolveRequest({
      body: intent.body,
      updatedAt: "2026-07-27T04:40:00Z",
      version: 1,
    });

    const report = await replay;

    expect(report.acknowledged).toEqual([]);
    expect(report.retained).toEqual([{
      draftId: draft.draftId,
      reason: "superseded",
    }]);
    expect(await repository.list(ownerScope)).toEqual([revised]);
    queryClient.clear();
  });

  it("publishes an owner-scoped change after reconnect replay", async () => {
    const repository = createInMemoryDraftRepository();
    const queryClient = new QueryClient();
    const target = new EventTarget();
    const listener = vi.fn();
    const reportReceived = vi.fn();
    const intent: ProblemMutationIntent = {
      body: "重连同步",
      expectedVersion: null,
      idempotencyKey: "problem-note-online-event-123",
      kind: "save-note",
      problemId,
    };
    await persistProblemMutationDraft(ownerScope, intent, repository);
    apiRequestMock.mockResolvedValueOnce({
      body: intent.body,
      updatedAt: "2026-07-27T04:50:00Z",
      version: 1,
    });
    const stopListening = subscribeProblemDraftChanges(ownerScope, listener);
    const stopReplay = registerProblemDraftReconnectReplay({
      csrfProof: "csrf-proof-1234567890abcdef",
      onReport: reportReceived,
      ownerScope,
      queryClient,
      repository,
      target,
      verifyOwner,
    });

    target.dispatchEvent(new Event("online"));
    await vi.waitFor(() => expect(reportReceived).toHaveBeenCalledOnce());

    expect(listener).toHaveBeenCalled();
    expect(await repository.list(ownerScope)).toEqual([]);
    stopReplay();
    stopListening();
    queryClient.clear();
  });
});
