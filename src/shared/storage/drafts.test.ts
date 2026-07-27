import { indexedDB as fakeIndexedDb } from "fake-indexeddb";

import { API_REQUEST_TIMEOUT_MS } from "../api/client";
import {
  RECOVERABLE_DRAFT_ATTEMPT_LEASE_MS,
  RECOVERABLE_DRAFT_DATABASE_NAME,
  RECOVERABLE_DRAFT_DATABASE_VERSION,
  RECOVERABLE_DRAFT_REPLAY_DEADLINE_MS,
  RECOVERABLE_DRAFT_SCHEMA_VERSION,
  createIndexedDbDraftRepository,
  createInMemoryDraftRepository,
  createRecoverableDraft,
  decodePersistedDraft,
  isRecoverableDraftAttemptActive,
  registerDraftReconnectReplay,
  replayRecoverableDrafts,
  reviseRecoverableDraft,
  type RecoverableDraftRepository,
} from "./drafts";

const ownerScope = "acct-1234567890abcdef";
const otherOwnerScope = "acct-fedcba0987654321";

afterEach(() => {
  vi.useRealTimers();
});

const waitForReplayPhase = (
  durationMs: number,
  signal: AbortSignal | undefined,
): Promise<void> => new Promise((resolve, reject) => {
  if (signal === undefined) {
    reject(new Error("TEST_REPLAY_SIGNAL_REQUIRED"));
    return;
  }
  const handleAbort = () => {
    clearTimeout(timeoutId);
    reject(signal.reason);
  };
  const timeoutId = setTimeout(() => {
    signal.removeEventListener("abort", handleAbort);
    resolve();
  }, durationMs);
  if (signal.aborted) handleAbort();
  else signal.addEventListener("abort", handleAbort, { once: true });
});

const deleteFakeIndexedDbDatabase = (): Promise<void> => new Promise((resolve, reject) => {
  const request = fakeIndexedDb.deleteDatabase(RECOVERABLE_DRAFT_DATABASE_NAME);
  request.onerror = () => reject(request.error ?? new Error("TEST_DATABASE_DELETE_FAILED"));
  request.onblocked = () => reject(new Error("TEST_DATABASE_DELETE_BLOCKED"));
  request.onsuccess = () => resolve();
});

const createProblemDraft = (
  title: string,
  owner = ownerScope,
  idempotencyKey?: string,
) => createRecoverableDraft({
  ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
  kind: "problems.note",
  ownerScope: owner,
  payload: { body: title },
  resourceId: "problem-two-sum",
  serverVersion: 3,
  updatedAt: "2026-07-27T02:00:00.000Z",
});

describe("native recoverable draft storage", () => {
  it("persists an explicit record schema and database version", () => {
    const draft = createProblemDraft("保留这个思路");

    expect(RECOVERABLE_DRAFT_DATABASE_NAME).toBe("qg-v2-phase2-draft-recovery");
    expect(RECOVERABLE_DRAFT_DATABASE_VERSION).toBe(1);
    expect(draft.schemaVersion).toBe(RECOVERABLE_DRAFT_SCHEMA_VERSION);
    expect(draft).toEqual(expect.objectContaining({
      attemptCount: 0,
      generationId: expect.stringMatching(/^gen-/u),
      lastAttemptAt: null,
      ownerScope,
      resourceId: "problem-two-sum",
      serverVersion: 3,
    }));
  });

  it("treats a replay attempt as active only for the fixed lease window", () => {
    const attemptedAt = "2026-07-27T03:00:00.000Z";
    const attempted = {
      ...createProblemDraft("租约判定"),
      attemptCount: 1,
      lastAttemptAt: attemptedAt,
    };
    const attemptedAtMs = Date.parse(attemptedAt);

    expect(RECOVERABLE_DRAFT_ATTEMPT_LEASE_MS).toBe(120_000);
    expect(RECOVERABLE_DRAFT_REPLAY_DEADLINE_MS).toBeGreaterThan(
      API_REQUEST_TIMEOUT_MS,
    );
    expect(RECOVERABLE_DRAFT_REPLAY_DEADLINE_MS).toBeLessThan(
      RECOVERABLE_DRAFT_ATTEMPT_LEASE_MS,
    );
    expect(API_REQUEST_TIMEOUT_MS).toBeLessThan(RECOVERABLE_DRAFT_ATTEMPT_LEASE_MS);
    expect(isRecoverableDraftAttemptActive(
      attempted,
      attemptedAtMs + RECOVERABLE_DRAFT_ATTEMPT_LEASE_MS - 1,
    )).toBe(true);
    expect(isRecoverableDraftAttemptActive(
      attempted,
      attemptedAtMs + RECOVERABLE_DRAFT_ATTEMPT_LEASE_MS,
    )).toBe(false);
    expect(isRecoverableDraftAttemptActive({
      ...attempted,
      lastAttemptAt: null,
    }, attemptedAtMs)).toBe(false);
  });

  it("keeps one durable record and one key for one user intent", async () => {
    const repository = createInMemoryDraftRepository();
    const intentKey = "intent_1234567890abcdef";
    const first = createProblemDraft("同一意图", ownerScope, intentKey);
    const retry = createProblemDraft("同一意图", ownerScope, intentKey);

    await repository.put(first);
    await repository.put(retry);

    expect(retry.draftId).toBe(first.draftId);
    expect(retry.idempotencyKey).toBe(first.idempotencyKey);
    expect(await repository.list(ownerScope)).toEqual([retry]);
  });

  it("gives a new user intent a new idempotency key and draft identity", () => {
    const first = createProblemDraft("第一次");
    const second = createProblemDraft("第二次");

    expect(second.idempotencyKey).not.toBe(first.idempotencyKey);
    expect(second.draftId).not.toBe(first.draftId);
    expect(second.generationId).not.toBe(first.generationId);
  });

  it("rejects auth material recursively instead of persisting it", () => {
    expect(() => createRecoverableDraft({
      kind: "training.complete",
      ownerScope,
      payload: { nested: { csrf_token: "csrf-secret-value" } },
      resourceId: "training-session",
      serverVersion: 1,
    })).toThrow("RECOVERABLE_DRAFT_AUTH_MATERIAL_FORBIDDEN");
    expect(() => createRecoverableDraft({
      kind: "training.complete",
      ownerScope,
      payload: { answer: "Bearer secret-token" },
      resourceId: "training-session",
      serverVersion: 1,
    })).toThrow("RECOVERABLE_DRAFT_AUTH_MATERIAL_FORBIDDEN");
  });

  it("isolates owners and refuses cross-owner acknowledgement", async () => {
    const repository = createInMemoryDraftRepository();
    const current = createProblemDraft("Gary", ownerScope);
    const other = createProblemDraft("Other", otherOwnerScope);
    await repository.put(current);
    await repository.put(other);

    expect(await repository.list(ownerScope)).toEqual([current]);
    expect(await repository.list(otherOwnerScope)).toEqual([other]);
    await expect(repository.acknowledge({
      ...current,
      ownerScope: otherOwnerScope,
    })).rejects.toThrow("RECOVERABLE_DRAFT_OWNER_MISMATCH");
    expect(await repository.list(ownerScope)).toEqual([current]);
  });

  it("quarantines corrupt records without copying their payload or secret", async () => {
    const secret = "never-copy-this-cookie";
    const valid = createProblemDraft("有效");
    const repository = createInMemoryDraftRepository([
      valid,
      {
        ...valid,
        draftId: "draft-corrupt-record-1234",
        payload: { cookie: secret },
      },
      {
        ...valid,
        draftId: "draft-future-record-1234",
        schemaVersion: 99,
      },
    ]);

    expect(await repository.list(ownerScope)).toEqual([valid]);
    const quarantine = await repository.listQuarantine();
    expect(quarantine).toHaveLength(2);
    expect(quarantine.map(({ reason }) => reason).sort()).toEqual([
      "auth-material",
      "invalid-record",
    ]);
    expect(JSON.stringify(quarantine)).not.toContain(secret);
    expect(Object.keys(quarantine[0] ?? {}).sort()).toEqual([
      "quarantineId",
      "quarantinedAt",
      "reason",
      "schemaVersion",
    ]);
  });

  it("deletes only the exact acknowledged generation", async () => {
    const repository = createInMemoryDraftRepository();
    const original = createProblemDraft("原始内容");
    const revision = reviseRecoverableDraft(original, {
      payload: { body: "修订内容" },
      serverVersion: 4,
      updatedAt: "2026-07-27T03:00:00.000Z",
    });
    await repository.put(original);
    await repository.put(revision);

    expect(revision.generationId).not.toBe(original.generationId);
    expect(await repository.acknowledge(original)).toBe(false);
    expect(await repository.list(ownerScope)).toEqual([revision]);
    expect(await repository.acknowledge(revision)).toBe(true);
    expect(await repository.list(ownerScope)).toEqual([]);
  });

  it("does not acknowledge or discard a source snapshot after replay advances it", async () => {
    const repository = createInMemoryDraftRepository();
    const original = createProblemDraft("等待重放");
    await repository.put(original);
    const attempted = await repository.markAttempt(
      original,
      "2026-07-27T03:01:00.000Z",
    );
    if (attempted === null) throw new Error("ATTEMPTED_DRAFT_EXPECTED");

    expect(await repository.acknowledge(original)).toBe(false);
    expect(await repository.discard(original)).toBe(false);
    expect(await repository.list(ownerScope)).toEqual([attempted]);
    expect(await repository.acknowledge(attempted)).toBe(true);
  });

  it("releases only the exact in-memory attempt lease and preserves its attempt count", async () => {
    const repository = createInMemoryDraftRepository();
    const original = createProblemDraft("等待重放释放");
    await repository.put(original);
    const attempted = await repository.markAttempt(
      original,
      "2026-07-27T03:01:00.000Z",
    );
    if (attempted === null) throw new Error("ATTEMPTED_DRAFT_EXPECTED");

    expect(await repository.markAttempt(
      attempted,
      "2026-07-27T03:02:59.999Z",
    )).toBeNull();

    const released = await repository.releaseAttempt(attempted);
    expect(released).toEqual({
      ...attempted,
      lastAttemptAt: null,
    });
    expect(released?.attemptCount).toBe(1);
    expect(await repository.releaseAttempt(attempted)).toBeNull();

    const resumed = await repository.markAttempt(
      released ?? attempted,
      "2026-07-27T03:03:00.000Z",
    );
    expect(resumed).toEqual(expect.objectContaining({
      attemptCount: 2,
      lastAttemptAt: "2026-07-27T03:03:00.000Z",
    }));

    const replacement = reviseRecoverableDraft(resumed ?? attempted, {
      payload: { body: "租约期间的新修订" },
      serverVersion: 4,
      updatedAt: original.updatedAt,
    });
    await repository.put(replacement);
    expect(await repository.releaseAttempt(resumed ?? attempted)).toBeNull();
    expect(await repository.list(ownerScope)).toEqual([replacement]);
  });

  it("prevents an active replay lease from double-submitting and permits expired takeover", async () => {
    const repository = createInMemoryDraftRepository();
    const draft = createProblemDraft("跨页面租约");
    const attemptedAt = new Date().toISOString();
    await repository.put(draft);
    const attempted = await repository.markAttempt(
      draft,
      attemptedAt,
    );
    if (attempted === null) throw new Error("ATTEMPTED_DRAFT_EXPECTED");

    const replay = vi.fn(async () => ({ acknowledged: true }));
    const activeReport = await replayRecoverableDrafts({
      kinds: ["problems.note"],
      ownerScope,
      replay,
      repository,
    });
    expect(replay).not.toHaveBeenCalled();
    expect(activeReport.retained).toEqual([{
      draftId: draft.draftId,
      reason: "superseded",
    }]);

    const takeover = await repository.markAttempt(
      attempted,
      new Date(
        Date.parse(attemptedAt) + RECOVERABLE_DRAFT_ATTEMPT_LEASE_MS,
      ).toISOString(),
    );
    expect(takeover).toEqual(expect.objectContaining({
      attemptCount: 2,
    }));
    expect(await repository.releaseAttempt(attempted)).toBeNull();
  });

  it("atomically puts a dependent draft only while its in-memory source is exact", async () => {
    const repository = createInMemoryDraftRepository();
    const source = createProblemDraft(
      "条件写入来源",
      ownerScope,
      "conditional-source-intent-1234",
    );
    const dependent = createProblemDraft(
      "条件写入结果",
      ownerScope,
      "conditional-result-intent-1234",
    );
    await repository.put(source);

    expect(await repository.putIfCurrent(source, dependent)).toBe(true);
    expect(await repository.list(ownerScope)).toEqual(expect.arrayContaining([
      source,
      dependent,
    ]));

    const replacement = reviseRecoverableDraft(source, {
      payload: { body: "来源已被替代" },
      serverVersion: 4,
      updatedAt: source.updatedAt,
    });
    const lateDependent = createProblemDraft(
      "不得写入的晚到结果",
      ownerScope,
      "conditional-late-result-1234",
    );
    await repository.put(replacement);
    expect(await repository.putIfCurrent(source, lateDependent)).toBe(false);
    expect(await repository.list(ownerScope)).not.toContainEqual(lateDependent);
    expect(await repository.list(ownerScope)).toContainEqual(replacement);
  });

  it("uses the same exact-CAS release semantics in IndexedDB", async () => {
    vi.stubGlobal("indexedDB", fakeIndexedDb);
    await deleteFakeIndexedDbDatabase();
    try {
      const repository = createIndexedDbDraftRepository();
      const exact = createProblemDraft(
        "IndexedDB 精确释放",
        ownerScope,
        "indexed-release-exact-1234",
      );
      await repository.put(exact);
      const exactAttempt = await repository.markAttempt(
        exact,
        "2026-07-27T03:01:00.000Z",
      );
      if (exactAttempt === null) throw new Error("ATTEMPTED_DRAFT_EXPECTED");

      const released = await repository.releaseAttempt(exactAttempt);
      expect(released).toEqual({
        ...exactAttempt,
        lastAttemptAt: null,
      });
      expect(released?.attemptCount).toBe(1);

      const stale = createProblemDraft(
        "IndexedDB 旧租约",
        ownerScope,
        "indexed-release-stale-1234",
      );
      await repository.put(stale);
      const staleAttempt = await repository.markAttempt(
        stale,
        "2026-07-27T03:01:00.000Z",
      );
      if (staleAttempt === null) throw new Error("ATTEMPTED_DRAFT_EXPECTED");
      const replacement = reviseRecoverableDraft(staleAttempt, {
        payload: { body: "IndexedDB 新修订" },
        serverVersion: 4,
        updatedAt: stale.updatedAt,
      });
      await repository.put(replacement);

      expect(await repository.releaseAttempt(staleAttempt)).toBeNull();
      expect(await repository.list(ownerScope)).toEqual(expect.arrayContaining([
        released,
        replacement,
      ]));
    } finally {
      await deleteFakeIndexedDbDatabase();
      vi.unstubAllGlobals();
    }
  });

  it("persists and clears the logout cleanup boundary in IndexedDB", async () => {
    vi.stubGlobal("indexedDB", fakeIndexedDb);
    await deleteFakeIndexedDbDatabase();
    try {
      const firstRepository = createIndexedDbDraftRepository();
      expect(await firstRepository.readLogoutCleanupPending()).toBe(false);
      await firstRepository.writeLogoutCleanupPending(true);

      const reloadedRepository = createIndexedDbDraftRepository();
      expect(await reloadedRepository.readLogoutCleanupPending()).toBe(true);

      await reloadedRepository.writeLogoutCleanupPending(false);
      expect(await firstRepository.readLogoutCleanupPending()).toBe(false);
    } finally {
      await deleteFakeIndexedDbDatabase();
      vi.unstubAllGlobals();
    }
  });

  it("atomically rejects a late dependent IndexedDB write after source replacement", async () => {
    vi.stubGlobal("indexedDB", fakeIndexedDb);
    await deleteFakeIndexedDbDatabase();
    try {
      const repository = createIndexedDbDraftRepository();
      const source = createProblemDraft(
        "IndexedDB 条件来源",
        ownerScope,
        "indexed-conditional-source-1234",
      );
      const dependent = createProblemDraft(
        "IndexedDB 条件结果",
        ownerScope,
        "indexed-conditional-result-1234",
      );
      await repository.put(source);
      expect(await repository.putIfCurrent(source, dependent)).toBe(true);
      expect(await repository.list(ownerScope)).toContainEqual(dependent);

      const replacement = reviseRecoverableDraft(source, {
        payload: { body: "IndexedDB 来源已替代" },
        serverVersion: 4,
        updatedAt: source.updatedAt,
      });
      const lateDependent = createProblemDraft(
        "IndexedDB 晚到结果",
        ownerScope,
        "indexed-conditional-late-1234",
      );
      await repository.put(replacement);
      expect(await repository.putIfCurrent(source, lateDependent)).toBe(false);
      expect(await repository.list(ownerScope)).not.toContainEqual(lateDependent);
      expect(await repository.list(ownerScope)).toContainEqual(replacement);
    } finally {
      await deleteFakeIndexedDbDatabase();
      vi.unstubAllGlobals();
    }
  });

  it("keeps a same-millisecond revision when an older generation is acknowledged", async () => {
    const repository = createInMemoryDraftRepository();
    const original = createProblemDraft("原始内容");
    const revision = reviseRecoverableDraft(original, {
      payload: { body: "同毫秒修订内容" },
      serverVersion: 4,
      updatedAt: original.updatedAt,
    });
    await repository.put(original);
    await repository.put(revision);

    expect(await repository.acknowledge(original)).toBe(false);
    expect(await repository.list(ownerScope)).toEqual([revision]);
  });

  it("discards only the exact user-selected generation", async () => {
    const repository = createInMemoryDraftRepository();
    const original = createProblemDraft("准备丢弃的旧内容");
    const revision = reviseRecoverableDraft(original, {
      payload: { body: "需要保留的新内容" },
      serverVersion: 4,
      updatedAt: original.updatedAt,
    });
    await repository.put(original);
    await repository.put(revision);

    expect(await repository.discard(original)).toBe(false);
    expect(await repository.list(ownerScope)).toEqual([revision]);
    expect(await repository.discard(revision)).toBe(true);
    expect(await repository.list(ownerScope)).toEqual([]);
  });

  it("refuses a cross-owner explicit discard", async () => {
    const repository = createInMemoryDraftRepository();
    const draft = createProblemDraft("只属于当前账号");
    await repository.put(draft);

    await expect(repository.discard({
      ...draft,
      ownerScope: otherOwnerScope,
    })).rejects.toThrow("RECOVERABLE_DRAFT_OWNER_MISMATCH");
    expect(await repository.list(ownerScope)).toEqual([draft]);
  });

  it("reuses the persisted key across failed reconnects and deletes after acknowledgement", async () => {
    const repository = createInMemoryDraftRepository();
    const draft = createProblemDraft("联网重试");
    const seenKeys: string[] = [];
    await repository.put(draft);

    const failed = await replayRecoverableDrafts({
      kinds: ["problems.note"],
      ownerScope,
      replay: async (persisted) => {
        seenKeys.push(persisted.idempotencyKey);
        throw new TypeError("Failed to fetch");
      },
      repository,
    });
    expect(failed.retained).toEqual([{
      code: "NETWORK_OFFLINE",
      draftId: draft.draftId,
      reason: "failed",
      requestId: null,
      retryable: true,
      state: "offline-draft",
    }]);
    expect(await repository.list(ownerScope)).toEqual([
      expect.objectContaining({
        attemptCount: 1,
        lastAttemptAt: null,
      }),
    ]);

    const acknowledged = await replayRecoverableDrafts({
      kinds: ["problems.note"],
      ownerScope,
      replay: async (persisted) => {
        seenKeys.push(persisted.idempotencyKey);
        return { acknowledged: true };
      },
      repository,
    });

    expect(seenKeys).toEqual([draft.idempotencyKey, draft.idempotencyKey]);
    expect(acknowledged.acknowledged).toEqual([draft.draftId]);
    expect(await repository.list(ownerScope)).toEqual([]);
  });

  it("does not remove a draft when the server defers acknowledgement", async () => {
    const repository = createInMemoryDraftRepository();
    const draft = createProblemDraft("等待确认");
    await repository.put(draft);

    const report = await replayRecoverableDrafts({
      kinds: ["problems.note"],
      ownerScope,
      replay: async () => ({ acknowledged: false }),
      repository,
    });

    expect(report.retained).toEqual([{ draftId: draft.draftId, reason: "deferred" }]);
    expect((await repository.list(ownerScope))[0]).toEqual(expect.objectContaining({
      attemptCount: 1,
      idempotencyKey: draft.idempotencyKey,
      lastAttemptAt: null,
    }));
  });

  it("bounds the whole multi-phase replay and releases its attempt at the deadline", async () => {
    vi.useFakeTimers();
    const repository = createInMemoryDraftRepository();
    const draft = createProblemDraft("多阶段重放截止时间");
    const completedPhases: string[] = [];
    await repository.put(draft);

    const operation = replayRecoverableDrafts({
      kinds: ["problems.note"],
      ownerScope,
      replay: async (_persisted, signal) => {
        await waitForReplayPhase(50_000, signal);
        completedPhases.push("first");
        await waitForReplayPhase(50_000, signal);
        completedPhases.push("second");
        return { acknowledged: true };
      },
      repository,
    });

    await vi.advanceTimersByTimeAsync(RECOVERABLE_DRAFT_REPLAY_DEADLINE_MS);
    await expect(operation).resolves.toEqual({
      acknowledged: [],
      attempted: [draft.draftId],
      retained: [{
        code: "API_REQUEST_TIMEOUT",
        draftId: draft.draftId,
        reason: "failed",
        requestId: null,
        retryable: true,
        state: "recoverable-error",
      }],
    });
    expect(completedPhases).toEqual(["first"]);
    expect(await repository.list(ownerScope)).toEqual([
      expect.objectContaining({
        attemptCount: 1,
        lastAttemptAt: null,
      }),
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("includes post-callback acknowledgement in the deadline without late report mutation", async () => {
    vi.useFakeTimers();
    const baseRepository = createInMemoryDraftRepository();
    let acknowledgementStarted: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      acknowledgementStarted = resolve;
    });
    let finishAcknowledgement: () => void = () => undefined;
    const acknowledgementBlocker = new Promise<void>((resolve) => {
      finishAcknowledgement = resolve;
    });
    const repository: RecoverableDraftRepository = {
      ...baseRepository,
      acknowledge: async (draft) => {
        acknowledgementStarted();
        await acknowledgementBlocker;
        return baseRepository.acknowledge(draft);
      },
    };
    const draft = createProblemDraft("回调后确认也受截止时间保护");
    await repository.put(draft);

    const operation = replayRecoverableDrafts({
      kinds: ["problems.note"],
      ownerScope,
      replay: async () => ({ acknowledged: true }),
      repository,
    });
    await started;
    await vi.advanceTimersByTimeAsync(RECOVERABLE_DRAFT_REPLAY_DEADLINE_MS);
    const report = await operation;
    expect(report).toEqual({
      acknowledged: [],
      attempted: [draft.draftId],
      retained: [{
        code: "API_REQUEST_TIMEOUT",
        draftId: draft.draftId,
        reason: "failed",
        requestId: null,
        retryable: true,
        state: "recoverable-error",
      }],
    });
    const stableReport = JSON.stringify(report);
    expect(await repository.list(ownerScope)).toEqual([
      expect.objectContaining({
        attemptCount: 1,
        lastAttemptAt: null,
      }),
    ]);

    finishAcknowledgement();
    await vi.advanceTimersByTimeAsync(0);
    expect(JSON.stringify(report)).toBe(stableReport);
    expect(await repository.list(ownerScope)).toEqual([
      expect.objectContaining({
        attemptCount: 1,
        lastAttemptAt: null,
      }),
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the replay deadline timer after immediate acknowledgement", async () => {
    vi.useFakeTimers();
    const repository = createInMemoryDraftRepository();
    const draft = createProblemDraft("重放完成清理计时器");
    await repository.put(draft);

    await expect(replayRecoverableDrafts({
      kinds: ["problems.note"],
      ownerScope,
      replay: async () => ({ acknowledged: true }),
      repository,
    })).resolves.toMatchObject({ acknowledged: [draft.draftId] });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("forwards an external abort reason and releases the exact replay attempt", async () => {
    vi.useFakeTimers();
    const repository = createInMemoryDraftRepository();
    const draft = createProblemDraft("外部中止重放");
    const controller = new AbortController();
    const abortReason = new DOMException("Caller stopped replay.", "AbortError");
    let replayStarted: () => void = () => undefined;
    const started = new Promise<void>((resolve) => {
      replayStarted = resolve;
    });
    await repository.put(draft);

    const operation = replayRecoverableDrafts({
      kinds: ["problems.note"],
      ownerScope,
      replay: async (_persisted, signal) => {
        replayStarted();
        await waitForReplayPhase(200_000, signal);
        return { acknowledged: true };
      },
      repository,
      signal: controller.signal,
    });
    await started;
    const assertion = expect(operation).rejects.toBe(abortReason);
    controller.abort(abortReason);
    await assertion;

    expect(await repository.list(ownerScope)).toEqual([
      expect.objectContaining({
        attemptCount: 1,
        lastAttemptAt: null,
      }),
    ]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("releases its exact attempt lease when replay is aborted", async () => {
    const repository = createInMemoryDraftRepository();
    const draft = createProblemDraft("中止重放");
    const controller = new AbortController();
    const abortReason = new Error("TEST_REPLAY_ABORTED");
    await repository.put(draft);

    const operation = replayRecoverableDrafts({
      kinds: ["problems.note"],
      ownerScope,
      replay: async () => {
        controller.abort(abortReason);
        throw abortReason;
      },
      repository,
      signal: controller.signal,
    });

    await expect(operation).rejects.toBe(abortReason);
    expect(await repository.list(ownerScope)).toEqual([
      expect.objectContaining({
        attemptCount: 1,
        lastAttemptAt: null,
      }),
    ]);
  });

  it("deduplicates overlapping reconnect replay runs", async () => {
    const repository = createInMemoryDraftRepository();
    const draft = createProblemDraft("只提交一次");
    await repository.put(draft);
    let release: (() => void) | undefined;
    const blocker = new Promise<void>((resolve) => {
      release = resolve;
    });
    const replay = vi.fn(async () => {
      await blocker;
      return { acknowledged: true };
    });

    const first = replayRecoverableDrafts({
      kinds: ["problems.note"],
      ownerScope,
      replay,
      repository,
    });
    const second = replayRecoverableDrafts({
      kinds: ["problems.note"],
      ownerScope,
      replay,
      repository,
    });
    release?.();

    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(replay).toHaveBeenCalledTimes(1);
  });

  it("replays when the browser reconnects and unregisters cleanly", async () => {
    const repository = createInMemoryDraftRepository();
    const draft = createProblemDraft("online event");
    await repository.put(draft);
    const target = new EventTarget();
    const onReport = vi.fn();
    const stop = registerDraftReconnectReplay({
      kinds: ["problems.note"],
      onReport,
      ownerScope,
      replay: async () => ({ acknowledged: true }),
      repository,
      target,
    });

    target.dispatchEvent(new Event("online"));
    await vi.waitFor(() => expect(onReport).toHaveBeenCalledTimes(1));
    expect(await repository.list(ownerScope)).toEqual([]);

    stop();
    target.dispatchEvent(new Event("online"));
    await Promise.resolve();
    expect(onReport).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed owner scopes and unsupported persisted schemas", () => {
    const valid = createProblemDraft("schema");
    expect(() => decodePersistedDraft({ ...valid, ownerScope: "gary@example.com" }))
      .toThrow("RECOVERABLE_DRAFT_RECORD_INVALID");
    expect(() => decodePersistedDraft({ ...valid, schemaVersion: 2 }))
      .toThrow("RECOVERABLE_DRAFT_RECORD_INVALID");
  });
});
