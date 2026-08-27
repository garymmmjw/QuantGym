import { z } from "zod";

import type { TodoMutationIntent } from "./todo.mutations";

const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/);
const taskIdSchema = z.string().uuid();
const versionSchema = z.number().int().positive();

const intentSchema = z.discriminatedUnion("kind", [
  z.object({
    idempotencyKey: idempotencyKeySchema,
    kind: z.literal("create"),
    sortOrder: z.number().int().nonnegative().optional(),
    title: z.string().trim().min(1).max(240),
  }).strict(),
  z.object({
    idempotencyKey: idempotencyKeySchema,
    kind: z.literal("update"),
    sortOrder: z.number().int().nonnegative().optional(),
    taskId: taskIdSchema,
    title: z.string().trim().min(1).max(240).optional(),
    version: versionSchema,
  }).strict(),
  z.object({
    idempotencyKey: idempotencyKeySchema,
    kind: z.literal("complete"),
    taskId: taskIdSchema,
    version: versionSchema,
  }).strict(),
  z.object({
    idempotencyKey: idempotencyKeySchema,
    kind: z.literal("delete"),
    taskId: taskIdSchema,
    version: versionSchema,
  }).strict(),
]);

const todoDraftSchema = z.object({
  createdAt: z.string().datetime({ offset: true }),
  draftId: z.string().min(1).max(160),
  intent: intentSchema,
  ownerScope: z.string().regex(/^acct-[a-f0-9]{16}$/),
}).strict();

const invalidPersistedRecord = () => (
  new Error("TODO_DRAFT_PERSISTED_RECORD_INVALID")
);

const persistedRecordOwnerMismatch = () => (
  new Error("TODO_DRAFT_PERSISTED_RECORD_OWNER_MISMATCH")
);

export type TodoDraft = Readonly<{
  createdAt: string;
  draftId: string;
  intent: TodoMutationIntent;
  ownerScope: string;
}>;

export type TodoDraftRepository = Readonly<{
  clear: (ownerScope?: string) => Promise<void>;
  list: (ownerScope: string) => Promise<readonly TodoDraft[]>;
  put: (draft: TodoDraft) => Promise<void>;
  remove: (ownerScope: string, draftId: string) => Promise<void>;
}>;

/**
 * Persisted drafts are fail-closed: a record that cannot be attributed to one
 * validated account must block recovery instead of being silently discarded.
 */
export const decodePersistedTodoDraft = (value: unknown): TodoDraft => {
  const parsed = todoDraftSchema.safeParse(value);
  if (!parsed.success) throw invalidPersistedRecord();
  return parsed.data as TodoDraft;
};

export const decodePersistedTodoDrafts = (
  values: readonly unknown[],
): readonly TodoDraft[] => values.map(decodePersistedTodoDraft);

export const selectPersistedTodoDraftsForOwner = (
  values: readonly unknown[],
  ownerScope: string,
): readonly TodoDraft[] => decodePersistedTodoDrafts(values)
  .filter((draft) => draft.ownerScope === ownerScope);

export const resolvePersistedTodoDraftRemoval = (
  value: unknown,
  ownerScope: string,
  draftId: string,
): TodoDraft | null => {
  if (value === undefined) return null;
  const draft = decodePersistedTodoDraft(value);
  if (draft.draftId !== draftId || draft.ownerScope !== ownerScope) {
    throw persistedRecordOwnerMismatch();
  }
  return draft;
};

export const createTodoDraft = (
  intent: TodoMutationIntent,
  ownerScope: string,
  createdAt = new Date().toISOString(),
): TodoDraft => todoDraftSchema.parse({
  createdAt,
  draftId: `todo-${ownerScope}-${intent.idempotencyKey}`,
  intent,
  ownerScope,
}) as TodoDraft;

export const createInMemoryTodoDraftRepository = (): TodoDraftRepository => {
  const entries = new Map<string, TodoDraft>();
  return {
    clear: async (ownerScope) => {
      if (ownerScope === undefined) {
        entries.clear();
        return;
      }
      for (const [draftId, draft] of entries) {
        if (draft.ownerScope === ownerScope) entries.delete(draftId);
      }
    },
    list: async (ownerScope) => [...entries.values()]
      .filter((draft) => draft.ownerScope === ownerScope)
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    put: async (draft) => {
      entries.set(draft.draftId, todoDraftSchema.parse(draft) as TodoDraft);
    },
    remove: async (ownerScope, draftId) => {
      const draft = entries.get(draftId);
      if (draft?.ownerScope === ownerScope) entries.delete(draftId);
    },
  };
};

const DATABASE_NAME = "qg-v2-recoverable-drafts";
const DATABASE_VERSION = 1;
const STORE_NAME = "todo-operations";

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
  request.onerror = () => reject(request.error ?? new Error("TODO_DRAFT_DATABASE_UNAVAILABLE"));
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) {
      database.createObjectStore(STORE_NAME, { keyPath: "draftId" });
    }
  };
  request.onsuccess = () => resolve(request.result);
});

const requestResult = <Result>(request: IDBRequest<Result>): Promise<Result> => (
  new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("TODO_DRAFT_REQUEST_FAILED"));
    request.onsuccess = () => resolve(request.result);
  })
);

const transactionComplete = (transaction: IDBTransaction): Promise<void> => (
  new Promise((resolve, reject) => {
    transaction.onabort = () => reject(transaction.error ?? new Error("TODO_DRAFT_TRANSACTION_ABORTED"));
    transaction.onerror = () => reject(transaction.error ?? new Error("TODO_DRAFT_TRANSACTION_FAILED"));
    transaction.oncomplete = () => resolve();
  })
);

const createIndexedDbTodoDraftRepository = (): TodoDraftRepository => ({
  clear: async (ownerScope) => {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      if (ownerScope === undefined) {
        store.clear();
      } else {
        const raw = await requestResult(store.getAll());
        const drafts = selectPersistedTodoDraftsForOwner(raw, ownerScope);
        for (const draft of drafts) store.delete(draft.draftId);
      }
      await transactionComplete(transaction);
    } finally {
      database.close();
    }
  },
  list: async (ownerScope) => {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const raw = await requestResult(transaction.objectStore(STORE_NAME).getAll());
      await transactionComplete(transaction);
      return [...selectPersistedTodoDraftsForOwner(raw, ownerScope)]
        .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    } finally {
      database.close();
    }
  },
  put: async (draft) => {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(todoDraftSchema.parse(draft));
      await transactionComplete(transaction);
    } finally {
      database.close();
    }
  },
  remove: async (ownerScope, draftId) => {
    const database = await openDatabase();
    try {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const raw = await requestResult(store.get(draftId));
      const draft = resolvePersistedTodoDraftRemoval(raw, ownerScope, draftId);
      if (draft !== null) store.delete(draft.draftId);
      await transactionComplete(transaction);
    } finally {
      database.close();
    }
  },
});

const fallbackRepository = createInMemoryTodoDraftRepository();
const indexedDbRepository = typeof indexedDB === "undefined"
  ? null
  : createIndexedDbTodoDraftRepository();

const storageUnavailable = (): never => {
  throw new Error("TODO_DRAFT_DURABLE_STORAGE_UNAVAILABLE");
};

const unavailableRepository: TodoDraftRepository = {
  clear: async () => {
    // No durable store exists, so there is nothing persisted to clear.
  },
  list: async () => storageUnavailable(),
  put: async () => storageUnavailable(),
  remove: async () => storageUnavailable(),
};

export const todoDraftRepository: TodoDraftRepository = indexedDbRepository
  ?? (
    typeof window === "undefined" || import.meta.env.MODE === "test"
      ? fallbackRepository
      : unavailableRepository
  );

export const clearTodoDrafts = () => todoDraftRepository.clear();
