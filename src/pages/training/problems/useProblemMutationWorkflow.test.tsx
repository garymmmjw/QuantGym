import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { publishProblemDraftChanged } from "../../../domains/problems/problems.events";
import type * as ProblemMutationsModule from "../../../domains/problems/problems.mutations";
import type { ProblemMutationIntent } from "../../../domains/problems/problems.mutations";
import {
  createProblemMutationDraft,
} from "../../../domains/problems/problems.recovery";
import type * as ProblemRecoveryModule from "../../../domains/problems/problems.recovery";
import { ApiError } from "../../../shared/api/errors";
import {
  createInMemoryDraftRepository,
  reviseRecoverableDraft,
  type RecoverableDraftRepository,
} from "../../../shared/storage/drafts";
import { useProblemMutationWorkflow } from "./useProblemMutationWorkflow";

const workflowMocks = vi.hoisted(() => ({
  mutateProblem: vi.fn(),
  reconcileProblemMutation: vi.fn(async () => false),
  verifyOwner: vi.fn(async () => undefined),
}));

vi.mock("../../../domains/problems/problems.mutations", async (importOriginal) => {
  const actual = await importOriginal<typeof ProblemMutationsModule>();
  return { ...actual, mutateProblem: workflowMocks.mutateProblem };
});

vi.mock("../../../domains/problems/problems.recovery", async (importOriginal) => {
  const actual = await importOriginal<typeof ProblemRecoveryModule>();
  return {
    ...actual,
    reconcileProblemMutation: workflowMocks.reconcileProblemMutation,
  };
});

const ownerScope = "acct-1234567890abcdef";
const otherOwnerScope = "acct-fedcba0987654321";
const problemId = "29584c83-7297-44ef-b985-f38e6c95de76";

const noteIntent = (
  overrides: Partial<Extract<ProblemMutationIntent, { kind: "save-note" }>> = {},
): Extract<ProblemMutationIntent, { kind: "save-note" }> => ({
  body: "保留双指针思路",
  expectedVersion: 2,
  idempotencyKey: "problem-note-workflow-intent",
  kind: "save-note",
  problemId,
  ...overrides,
});

const noteAcknowledgement = (body: string) => ({
  body,
  updatedAt: "2026-07-27T05:00:00Z",
  version: 3,
});

const favoriteIntent = (): Extract<ProblemMutationIntent, { kind: "set-favorite" }> => ({
  expectedStateId: null,
  expectedVersion: null,
  favorite: true,
  idempotencyKey: "problem-favorite-workflow-intent",
  kind: "set-favorite",
  problemId,
});

const createHarness = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

beforeEach(() => {
  vi.clearAllMocks();
  workflowMocks.reconcileProblemMutation.mockResolvedValue(false);
  vi.spyOn(document, "cookie", "get").mockReturnValue(
    "__Host-qg_csrf=session-proof-problems-workflow-1234",
  );
});

describe("useProblemMutationWorkflow", () => {
  it("persists before the network write, obtains one CAS lease, and exact-acknowledges success", async () => {
    const base = createInMemoryDraftRepository();
    let persisted = false;
    const repository: RecoverableDraftRepository = {
      ...base,
      put: async (draft) => {
        await base.put(draft);
        persisted = true;
      },
    };
    workflowMocks.mutateProblem.mockImplementation(async () => {
      expect(persisted).toBe(true);
      const drafts = await repository.list(ownerScope);
      expect(drafts[0]?.attemptCount).toBe(1);
      expect(drafts[0]?.lastAttemptAt).not.toBeNull();
      return noteAcknowledgement(noteIntent().body);
    });
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useProblemMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper });

    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    const intent = noteIntent();
    let acknowledged = false;
    await act(async () => {
      acknowledged = await result.current.submit(intent);
    });

    expect(acknowledged).toBe(true);
    expect(workflowMocks.mutateProblem).toHaveBeenCalledOnce();
    expect(workflowMocks.mutateProblem).toHaveBeenCalledWith(
      intent,
      "csrf-proof",
      expect.any(AbortSignal),
    );
    expect(await repository.list(ownerScope)).toEqual([]);
    expect(result.current.workflow).toBeNull();
  });

  it("does not send when durable storage fails", async () => {
    const base = createInMemoryDraftRepository();
    const repository: RecoverableDraftRepository = {
      ...base,
      put: async () => {
        throw new Error("IndexedDB unavailable");
      },
    };
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useProblemMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper });
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));

    await act(async () => {
      expect(await result.current.submit(noteIntent())).toBe(false);
    });

    expect(workflowMocks.mutateProblem).not.toHaveBeenCalled();
    expect(result.current.workflow?.failure?.code).toBe("DRAFT_STORAGE_UNAVAILABLE");
  });

  it("retains an offline draft and retries the exact original intent and key", async () => {
    const repository = createInMemoryDraftRepository();
    const intent = noteIntent();
    workflowMocks.mutateProblem.mockResolvedValueOnce(
      noteAcknowledgement(intent.body),
    );
    const { wrapper } = createHarness();
    const hook = renderHook(
      ({ online }: Readonly<{ online: boolean }>) => (
        useProblemMutationWorkflow({
          csrfProof: "csrf-proof",
          online,
          ownerScope,
          repository,
          verifyOwner: workflowMocks.verifyOwner,
        })
      ),
      {
        initialProps: { online: false },
        wrapper,
      },
    );
    const { result } = hook;
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));

    await act(async () => {
      expect(await result.current.submit(intent)).toBe(false);
    });
    expect(result.current.workflow?.failure?.state).toBe("offline-draft");
    expect(workflowMocks.verifyOwner).not.toHaveBeenCalled();
    expect(workflowMocks.mutateProblem).not.toHaveBeenCalled();
    const retained = (await repository.list(ownerScope))[0];
    expect(retained?.idempotencyKey).toBe(intent.idempotencyKey);
    expect(retained?.attemptCount).toBe(0);
    expect(retained?.lastAttemptAt).toBeNull();

    await act(async () => {
      expect(await result.current.retry()).toBe(false);
    });
    expect(workflowMocks.mutateProblem).not.toHaveBeenCalled();

    hook.rerender({ online: true });

    await act(async () => {
      expect(await result.current.retry()).toBe(true);
    });

    expect(workflowMocks.mutateProblem).toHaveBeenCalledOnce();
    expect(workflowMocks.mutateProblem.mock.calls[0]?.[0]).toEqual(intent);
    expect(await repository.list(ownerScope)).toEqual([]);
  });

  it.each([
    {
      error: new ApiError({
        code: "PROBLEM_TEMPORARY",
        message: "Temporary.",
        requestId: "request-recoverable",
        retryable: true,
        status: 503,
      }),
      expectedDrafts: 1,
      state: "recoverable-error",
    },
    {
      error: new ApiError({
        code: "PROBLEM_FORBIDDEN",
        message: "Forbidden.",
        requestId: "request-permission",
        status: 403,
      }),
      expectedDrafts: 1,
      state: "permission-denied",
    },
    {
      error: new ApiError({
        code: "PROBLEM_INVALID_NOTE",
        message: "Invalid note.",
        requestId: "request-invalid",
        status: 422,
      }),
      expectedDrafts: 0,
      state: "non-recoverable-error",
    },
    {
      error: new ApiError({
        code: "PROBLEM_NOTE_VERSION_CONFLICT",
        message: "Conflict.",
        requestId: "request-stale",
        status: 409,
      }),
      expectedDrafts: 1,
      state: "stale-version-conflict",
    },
  ] as const)("classifies $state without losing the wrong draft", async ({
    error,
    expectedDrafts,
    state,
  }) => {
    const repository = createInMemoryDraftRepository();
    workflowMocks.mutateProblem.mockRejectedValueOnce(error);
    const { wrapper } = createHarness();
    const { result, unmount } = renderHook(() => useProblemMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper });
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));

    await act(async () => {
      expect(await result.current.submit(noteIntent())).toBe(false);
    });

    expect(result.current.workflow?.failure?.state).toBe(state);
    expect(await repository.list(ownerScope)).toHaveLength(expectedDrafts);
    if (state === "stale-version-conflict") {
      expect(workflowMocks.reconcileProblemMutation).toHaveBeenCalledOnce();
    }
    unmount();
  });

  it("respects an active CAS attempt lease and never duplicates its network write", async () => {
    const repository = createInMemoryDraftRepository();
    const intent = favoriteIntent();
    const draft = createProblemMutationDraft(ownerScope, intent);
    await repository.put(draft);
    const attempted = await repository.markAttempt(draft);
    expect(attempted).not.toBeNull();
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useProblemMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper });

    await waitFor(() => expect(result.current.workflow?.phase).toBe("reconciling"));
    expect(result.current.workflow?.draft?.generationId).toBe(draft.generationId);
    expect(workflowMocks.mutateProblem).not.toHaveBeenCalled();
    expect(await result.current.submit(intent)).toBe(false);
    expect(workflowMocks.mutateProblem).not.toHaveBeenCalled();
  });

  it("keeps a newer generation when an older success arrives", async () => {
    const repository = createInMemoryDraftRepository();
    const intent = noteIntent();
    let resolveMutation!: (value: unknown) => void;
    workflowMocks.mutateProblem.mockImplementationOnce(() => new Promise((resolve) => {
      resolveMutation = resolve;
    }));
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useProblemMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper });
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));

    let submission!: Promise<boolean>;
    act(() => {
      submission = result.current.submit(intent);
    });
    await waitFor(() => expect(workflowMocks.mutateProblem).toHaveBeenCalledOnce());
    const attempted = (await repository.list(ownerScope))[0];
    expect(attempted).toBeDefined();
    const revised = reviseRecoverableDraft(attempted!, {
      payload: { body: "较新的本机笔记", expectedVersion: 2 },
      serverVersion: 2,
    });
    await repository.put(revised);

    await act(async () => {
      resolveMutation(noteAcknowledgement(intent.body));
      expect(await submission).toBe(true);
    });

    expect(await repository.list(ownerScope)).toEqual([revised]);
    await waitFor(() => expect(result.current.workflow?.draft?.generationId)
      .toBe(revised.generationId));
  });

  it("supports explicit discard and load-latest without rewriting the stored intent", async () => {
    const repository = createInMemoryDraftRepository();
    workflowMocks.mutateProblem.mockRejectedValue(new ApiError({
      code: "PROBLEM_NOTE_VERSION_CONFLICT",
      message: "Conflict.",
      requestId: "request-load-latest",
      status: 409,
    }));
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useProblemMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper });
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    const intent = noteIntent();

    await act(async () => {
      expect(await result.current.submit(intent)).toBe(false);
    });
    const stored = (await repository.list(ownerScope))[0];
    expect(stored?.idempotencyKey).toBe(intent.idempotencyKey);

    await act(async () => {
      await result.current.loadLatest();
    });
    expect(workflowMocks.reconcileProblemMutation).toHaveBeenLastCalledWith(
      expect.objectContaining({ intent, ownerScope }),
    );
    expect(await repository.list(ownerScope)).toEqual([]);
    expect(result.current.workflow).toBeNull();

    workflowMocks.mutateProblem.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await act(async () => {
      expect(await result.current.submit(intent)).toBe(false);
      await result.current.discard();
    });
    expect(await repository.list(ownerScope)).toEqual([]);
    expect(result.current.workflow).toBeNull();
  });

  it("adopts and clears an owner-scoped draft changed by another tab", async () => {
    const repository = createInMemoryDraftRepository();
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useProblemMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper });
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    const draft = createProblemMutationDraft(ownerScope, favoriteIntent());
    await repository.put(draft);

    act(() => publishProblemDraftChanged(ownerScope));
    await waitFor(() => expect(result.current.workflow?.draft?.generationId)
      .toBe(draft.generationId));

    await repository.discard(draft);
    act(() => publishProblemDraftChanged(ownerScope));
    await waitFor(() => expect(result.current.workflow).toBeNull());
  });

  it("aborts an old owner operation and prevents its delayed response from deleting the draft", async () => {
    const repository = createInMemoryDraftRepository();
    let resolveMutation!: (value: unknown) => void;
    workflowMocks.mutateProblem.mockImplementationOnce(() => new Promise((resolve) => {
      resolveMutation = resolve;
    }));
    const { wrapper } = createHarness();
    const { result, rerender } = renderHook(
      ({ activeOwner }) => useProblemMutationWorkflow({
        csrfProof: "csrf-proof",
        online: true,
        ownerScope: activeOwner,
        repository,
        verifyOwner: workflowMocks.verifyOwner,
      }),
      { initialProps: { activeOwner: ownerScope }, wrapper },
    );
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    let submission!: Promise<boolean>;
    await act(async () => {
      submission = result.current.submit(noteIntent());
      await waitFor(() => expect(workflowMocks.mutateProblem).toHaveBeenCalledOnce());
    });

    rerender({ activeOwner: otherOwnerScope });
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    await act(async () => {
      resolveMutation(noteAcknowledgement(noteIntent().body));
      expect(await submission).toBe(false);
    });

    expect(await repository.list(ownerScope)).toHaveLength(1);
    expect(await repository.list(otherOwnerScope)).toEqual([]);
    expect(result.current.workflow).toBeNull();
  });

  it("releases the attempt without stale state writes after unmount", async () => {
    const repository = createInMemoryDraftRepository();
    let resolveMutation!: (value: unknown) => void;
    workflowMocks.mutateProblem.mockImplementationOnce(() => new Promise((resolve) => {
      resolveMutation = resolve;
    }));
    const { wrapper } = createHarness();
    const { result, unmount } = renderHook(() => useProblemMutationWorkflow({
      csrfProof: "csrf-proof",
      online: true,
      ownerScope,
      repository,
      verifyOwner: workflowMocks.verifyOwner,
    }), { wrapper });
    await waitFor(() => expect(result.current.recoveryReady).toBe(true));
    let submission!: Promise<boolean>;
    await act(async () => {
      submission = result.current.submit(noteIntent());
      await waitFor(() => expect(workflowMocks.mutateProblem).toHaveBeenCalledOnce());
    });

    unmount();
    resolveMutation(noteAcknowledgement(noteIntent().body));
    expect(await submission).toBe(false);

    const drafts = await repository.list(ownerScope);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]?.lastAttemptAt).toBeNull();
  });
});
