import { z } from "zod";

import {
  classifyMutationFailure,
  createIdempotencyKey,
  type MutationFailure,
} from "../api/mutationRecovery";

export const RECOVERABLE_DRAFT_DATABASE_NAME = "qg-v2-phase2-draft-recovery";
export const RECOVERABLE_DRAFT_DATABASE_VERSION = 1;
export const RECOVERABLE_DRAFT_SCHEMA_VERSION = 1 as const;
export const RECOVERABLE_DRAFT_ATTEMPT_LEASE_MS = 120_000;
export const RECOVERABLE_DRAFT_REPLAY_DEADLINE_MS = 90_000;

const DRAFT_STORE_NAME = "drafts";
const QUARANTINE_STORE_NAME = "draft-quarantine";
const METADATA_STORE_NAME = "draft-metadata";
const ACTIVE_OWNER_KEY = "active-owner";
const MAX_PAYLOAD_BYTES = 128 * 1024;

const ownerScopeSchema = z.string().regex(/^acct-[a-f0-9]{16}$/u);
const draftKindSchema = z.string().regex(/^(?:problems|plan|training)\.[a-z][a-z0-9.-]{0,79}$/u);
const resourceIdSchema = z.string().trim().min(1).max(256);
const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9_-]{16,128}$/u);
const generationIdSchema = z.string().regex(/^gen-[A-Za-z0-9_-]{16,256}$/u);
const timestampSchema = z.string().datetime({ offset: true });

const persistedDraftSchema = z.object({
  attemptCount: z.number().int().nonnegative(),
  draftId: z.string().regex(/^draft-[A-Za-z0-9_-]{16,180}$/u),
  generationId: generationIdSchema.optional(),
  idempotencyKey: idempotencyKeySchema,
  kind: draftKindSchema,
  lastAttemptAt: timestampSchema.nullable(),
  ownerScope: ownerScopeSchema,
  payload: z.unknown(),
  resourceId: resourceIdSchema,
  schemaVersion: z.literal(RECOVERABLE_DRAFT_SCHEMA_VERSION),
  serverVersion: z.number().int().nonnegative().nullable(),
  updatedAt: timestampSchema,
}).strict();

const forbiddenPayloadKeys = new Set([
  "accesstoken",
  "apikey",
  "apitoken",
  "authorization",
  "bearertoken",
  "clientsecret",
  "cookie",
  "cookies",
  "csrfproof",
  "csrftoken",
  "password",
  "passwordhash",
  "refreshtoken",
  "sessioncookie",
  "sessionsecret",
  "sessiontoken",
  "setcookie",
  "xquantgymedgetoken",
]);

const normalizePayloadKey = (key: string) => key
  .normalize("NFKC")
  .toLocaleLowerCase()
  .replace(/[^a-z0-9]/gu, "");

export interface DraftJsonArray {
  readonly [index: number]: DraftJsonValue;
  readonly length: number;
}

export interface DraftJsonObject {
  readonly [key: string]: DraftJsonValue;
}

export type DraftJsonValue =
  | boolean
  | number
  | string
  | null
  | DraftJsonArray
  | DraftJsonObject;

export type RecoverableDraftKind = `${"problems" | "plan" | "training"}.${string}`;

export type RecoverableDraft<Payload extends DraftJsonValue = DraftJsonValue> = Readonly<{
  attemptCount: number;
  draftId: string;
  generationId: string;
  idempotencyKey: string;
  kind: RecoverableDraftKind;
  lastAttemptAt: string | null;
  ownerScope: string;
  payload: Payload;
  resourceId: string;
  schemaVersion: typeof RECOVERABLE_DRAFT_SCHEMA_VERSION;
  serverVersion: number | null;
  updatedAt: string;
}>;

export const isRecoverableDraftAttemptActive = (
  draft: RecoverableDraft,
  now = Date.now(),
): boolean => {
  if (draft.lastAttemptAt === null) return false;
  const attemptedAt = Date.parse(draft.lastAttemptAt);
  return Number.isFinite(attemptedAt)
    && now < attemptedAt + RECOVERABLE_DRAFT_ATTEMPT_LEASE_MS;
};

export type DraftQuarantineRecord = Readonly<{
  quarantineId: string;
  quarantinedAt: string;
  reason: "auth-material" | "invalid-record";
  schemaVersion: typeof RECOVERABLE_DRAFT_SCHEMA_VERSION;
}>;

export type RecoverableDraftRepository = Readonly<{
  acknowledge: (draft: RecoverableDraft) => Promise<boolean>;
  clear: (ownerScope?: string) => Promise<void>;
  discard: (draft: RecoverableDraft) => Promise<boolean>;
  list: (ownerScope: string) => Promise<readonly RecoverableDraft[]>;
  listQuarantine: () => Promise<readonly DraftQuarantineRecord[]>;
  markAttempt: (
    draft: RecoverableDraft,
    attemptedAt?: string,
  ) => Promise<RecoverableDraft | null>;
  put: (draft: RecoverableDraft) => Promise<void>;
  putIfCurrent: (
    source: RecoverableDraft,
    draft: RecoverableDraft,
  ) => Promise<boolean>;
  readActiveOwner: () => Promise<string | null>;
  releaseAttempt: (draft: RecoverableDraft) => Promise<RecoverableDraft | null>;
  writeActiveOwner: (ownerScope: string | null) => Promise<void>;
}>;

type DraftIdentity = Pick<
  RecoverableDraft,
  | "attemptCount"
  | "draftId"
  | "generationId"
  | "idempotencyKey"
  | "kind"
  | "lastAttemptAt"
  | "ownerScope"
  | "payload"
  | "resourceId"
  | "schemaVersion"
  | "serverVersion"
  | "updatedAt"
>;

const invalidRecord = (): never => {
  throw new Error("RECOVERABLE_DRAFT_RECORD_INVALID");
};

const authMaterialForbidden = (): never => {
  throw new Error("RECOVERABLE_DRAFT_AUTH_MATERIAL_FORBIDDEN");
};

const ownerMismatch = (): never => {
  throw new Error("RECOVERABLE_DRAFT_OWNER_MISMATCH");
};

const randomSuffix = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return createIdempotencyKey();
};

const normalizePayload = (
  input: unknown,
  ancestors = new WeakSet<object>(),
): DraftJsonValue => {
  if (input === null || typeof input === "boolean" || typeof input === "string") {
    if (typeof input === "string" && /^Bearer\s+\S+/iu.test(input)) {
      return authMaterialForbidden();
    }
    return input;
  }
  if (typeof input === "number") {
    if (!Number.isFinite(input)) return invalidRecord();
    return input;
  }
  if (typeof input !== "object") return invalidRecord();
  if (ancestors.has(input)) return invalidRecord();

  ancestors.add(input);
  try {
    if (Array.isArray(input)) {
      return input.map((value) => normalizePayload(value, ancestors));
    }
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null) return invalidRecord();

    const normalized: Record<string, DraftJsonValue> = Object.create(null) as Record<
      string,
      DraftJsonValue
    >;
    for (const [key, value] of Object.entries(input)) {
      const normalizedKey = normalizePayloadKey(key);
      if (
        forbiddenPayloadKeys.has(normalizedKey)
        || normalizedKey === "prototype"
        || normalizedKey === "constructor"
        || normalizedKey === "proto"
      ) {
        return authMaterialForbidden();
      }
      normalized[key] = normalizePayload(value, ancestors);
    }
    return normalized;
  } finally {
    ancestors.delete(input);
  }
};

const parsePayload = (input: unknown): DraftJsonValue => {
  const payload = normalizePayload(input);
  if (new TextEncoder().encode(JSON.stringify(payload)).byteLength > MAX_PAYLOAD_BYTES) {
    return invalidRecord();
  }
  return payload;
};

export const parseDraftOwnerScope = (value: string): string => ownerScopeSchema.parse(value);

export const decodePersistedDraft = (value: unknown): RecoverableDraft => {
  const parsed = persistedDraftSchema.safeParse(value);
  if (!parsed.success) return invalidRecord();
  return {
    ...parsed.data,
    generationId: parsed.data.generationId ?? generationIdSchema.parse(
      `gen-legacy-${parsed.data.idempotencyKey}-${parsed.data.updatedAt.replace(/\D/gu, "")}`,
    ),
    kind: parsed.data.kind as RecoverableDraftKind,
    payload: parsePayload(parsed.data.payload),
  };
};

export type CreateRecoverableDraftInput<Payload extends DraftJsonValue> = Readonly<{
  idempotencyKey?: string;
  kind: RecoverableDraftKind;
  ownerScope: string;
  payload: Payload;
  resourceId: string;
  serverVersion: number | null;
  updatedAt?: string;
}>;

export const createRecoverableDraft = <Payload extends DraftJsonValue>(
  input: CreateRecoverableDraftInput<Payload>,
): RecoverableDraft<Payload> => {
  const idempotencyKey = idempotencyKeySchema.parse(
    input.idempotencyKey ?? createIdempotencyKey(),
  );
  const ownerScope = parseDraftOwnerScope(input.ownerScope);
  return decodePersistedDraft({
    attemptCount: 0,
    draftId: `draft-${ownerScope.slice(5)}-${idempotencyKey}`,
    generationId: `gen-${randomSuffix()}`,
    idempotencyKey,
    kind: input.kind,
    lastAttemptAt: null,
    ownerScope,
    payload: input.payload,
    resourceId: input.resourceId,
    schemaVersion: RECOVERABLE_DRAFT_SCHEMA_VERSION,
    serverVersion: input.serverVersion,
    updatedAt: input.updatedAt ?? new Date().toISOString(),
  }) as RecoverableDraft<Payload>;
};

export const reviseRecoverableDraft = <Payload extends DraftJsonValue>(
  draft: RecoverableDraft,
  revision: Readonly<{
    payload: Payload;
    serverVersion: number | null;
    updatedAt?: string;
  }>,
): RecoverableDraft<Payload> => decodePersistedDraft({
  ...draft,
  attemptCount: 0,
  generationId: `gen-${randomSuffix()}`,
  lastAttemptAt: null,
  payload: revision.payload,
  serverVersion: revision.serverVersion,
  updatedAt: revision.updatedAt ?? new Date().toISOString(),
}) as RecoverableDraft<Payload>;

const sameExactDraftState = (left: DraftIdentity, right: DraftIdentity) => (
  left.attemptCount === right.attemptCount
  && left.draftId === right.draftId
  && left.generationId === right.generationId
  && left.idempotencyKey === right.idempotencyKey
  && left.kind === right.kind
  && left.lastAttemptAt === right.lastAttemptAt
  && left.ownerScope === right.ownerScope
  && JSON.stringify(left.payload) === JSON.stringify(right.payload)
  && left.resourceId === right.resourceId
  && left.schemaVersion === right.schemaVersion
  && left.serverVersion === right.serverVersion
  && left.updatedAt === right.updatedAt
);

const quarantineReason = (
  error: unknown,
): DraftQuarantineRecord["reason"] => (
  error instanceof Error
  && error.message === "RECOVERABLE_DRAFT_AUTH_MATERIAL_FORBIDDEN"
    ? "auth-material"
    : "invalid-record"
);

const createQuarantineRecord = (
  error: unknown,
  quarantinedAt = new Date().toISOString(),
): DraftQuarantineRecord => ({
  quarantineId: `quarantine-${randomSuffix()}`,
  quarantinedAt: timestampSchema.parse(quarantinedAt),
  reason: quarantineReason(error),
  schemaVersion: RECOVERABLE_DRAFT_SCHEMA_VERSION,
});

export const createInMemoryDraftRepository = (
  initialRecords: readonly unknown[] = [],
): RecoverableDraftRepository => {
  const entries = new Map<string, unknown>();
  const quarantine = new Map<string, DraftQuarantineRecord>();
  let activeOwner: string | null = null;

  initialRecords.forEach((record, index) => {
    const candidateId = typeof record === "object"
      && record !== null
      && "draftId" in record
      && typeof record.draftId === "string"
      ? record.draftId
      : `corrupt-${index}`;
    entries.set(candidateId, record);
  });

  const quarantineEntry = (key: string, error: unknown) => {
    entries.delete(key);
    const record = createQuarantineRecord(error);
    quarantine.set(record.quarantineId, record);
  };

  const decodeEntry = (key: string, value: unknown): RecoverableDraft | null => {
    try {
      return decodePersistedDraft(value);
    } catch (error) {
      quarantineEntry(key, error);
      return null;
    }
  };

  return {
    acknowledge: async (draft) => {
      const raw = entries.get(draft.draftId);
      if (raw === undefined) return false;
      const persisted = decodeEntry(draft.draftId, raw);
      if (persisted === null) return false;
      if (persisted.ownerScope !== draft.ownerScope) return ownerMismatch();
      if (!sameExactDraftState(persisted, draft)) return false;
      entries.delete(draft.draftId);
      return true;
    },
    clear: async (ownerScope) => {
      const parsedOwner = ownerScope === undefined
        ? undefined
        : parseDraftOwnerScope(ownerScope);
      if (parsedOwner === undefined) {
        entries.clear();
        return;
      }
      for (const [key, raw] of [...entries]) {
        const draft = decodeEntry(key, raw);
        if (draft?.ownerScope === parsedOwner) entries.delete(key);
      }
    },
    discard: async (draft) => {
      const raw = entries.get(draft.draftId);
      if (raw === undefined) return false;
      const persisted = decodeEntry(draft.draftId, raw);
      if (persisted === null) return false;
      if (persisted.ownerScope !== draft.ownerScope) return ownerMismatch();
      if (!sameExactDraftState(persisted, draft)) return false;
      entries.delete(draft.draftId);
      return true;
    },
    list: async (ownerScope) => {
      const parsedOwner = parseDraftOwnerScope(ownerScope);
      const drafts: RecoverableDraft[] = [];
      for (const [key, raw] of [...entries]) {
        const draft = decodeEntry(key, raw);
        if (draft?.ownerScope === parsedOwner) drafts.push(draft);
      }
      return drafts.sort((left, right) => (
        left.updatedAt.localeCompare(right.updatedAt)
        || left.draftId.localeCompare(right.draftId)
      ));
    },
    listQuarantine: async () => [...quarantine.values()]
      .sort((left, right) => left.quarantinedAt.localeCompare(right.quarantinedAt)),
    markAttempt: async (draft, attemptedAt = new Date().toISOString()) => {
      const raw = entries.get(draft.draftId);
      if (raw === undefined) return null;
      const persisted = decodeEntry(draft.draftId, raw);
      if (persisted === null) return null;
      if (persisted.ownerScope !== draft.ownerScope) return ownerMismatch();
      if (!sameExactDraftState(persisted, draft)) return null;
      const parsedAttemptedAt = timestampSchema.parse(attemptedAt);
      if (isRecoverableDraftAttemptActive(persisted, Date.parse(parsedAttemptedAt))) {
        return null;
      }
      const attempted = decodePersistedDraft({
        ...persisted,
        attemptCount: persisted.attemptCount + 1,
        lastAttemptAt: parsedAttemptedAt,
      });
      entries.set(attempted.draftId, attempted);
      return attempted;
    },
    put: async (draft) => {
      const parsed = decodePersistedDraft(draft);
      entries.set(parsed.draftId, parsed);
    },
    putIfCurrent: async (source, draft) => {
      const parsedDraft = decodePersistedDraft(draft);
      if (source.ownerScope !== parsedDraft.ownerScope) return ownerMismatch();
      if (source.draftId === parsedDraft.draftId) return false;
      const raw = entries.get(source.draftId);
      if (raw === undefined) return false;
      const persisted = decodeEntry(source.draftId, raw);
      if (persisted === null) return false;
      if (persisted.ownerScope !== source.ownerScope) return ownerMismatch();
      if (!sameExactDraftState(persisted, source)) return false;
      entries.set(parsedDraft.draftId, parsedDraft);
      return true;
    },
    readActiveOwner: async () => activeOwner,
    releaseAttempt: async (draft) => {
      const raw = entries.get(draft.draftId);
      if (raw === undefined) return null;
      const persisted = decodeEntry(draft.draftId, raw);
      if (persisted === null) return null;
      if (persisted.ownerScope !== draft.ownerScope) return ownerMismatch();
      if (persisted.lastAttemptAt === null || !sameExactDraftState(persisted, draft)) {
        return null;
      }
      const released = decodePersistedDraft({
        ...persisted,
        lastAttemptAt: null,
      });
      entries.set(released.draftId, released);
      return released;
    },
    writeActiveOwner: async (ownerScope) => {
      activeOwner = ownerScope === null ? null : parseDraftOwnerScope(ownerScope);
    },
  };
};

const requestResult = <Result>(request: IDBRequest<Result>): Promise<Result> => (
  new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error("RECOVERABLE_DRAFT_REQUEST_FAILED"));
    request.onsuccess = () => resolve(request.result);
  })
);

const transactionComplete = (transaction: IDBTransaction): Promise<void> => (
  new Promise((resolve, reject) => {
    transaction.onabort = () => reject(
      transaction.error ?? new Error("RECOVERABLE_DRAFT_TRANSACTION_ABORTED"),
    );
    transaction.onerror = () => reject(
      transaction.error ?? new Error("RECOVERABLE_DRAFT_TRANSACTION_FAILED"),
    );
    transaction.oncomplete = () => resolve();
  })
);

const openDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  const request = indexedDB.open(
    RECOVERABLE_DRAFT_DATABASE_NAME,
    RECOVERABLE_DRAFT_DATABASE_VERSION,
  );
  request.onerror = () => reject(
    request.error ?? new Error("RECOVERABLE_DRAFT_DATABASE_UNAVAILABLE"),
  );
  request.onblocked = () => reject(new Error("RECOVERABLE_DRAFT_DATABASE_BLOCKED"));
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(DRAFT_STORE_NAME)) {
      const store = database.createObjectStore(DRAFT_STORE_NAME, { keyPath: "draftId" });
      store.createIndex("by-owner", "ownerScope", { unique: false });
    }
    if (!database.objectStoreNames.contains(QUARANTINE_STORE_NAME)) {
      database.createObjectStore(QUARANTINE_STORE_NAME, { keyPath: "quarantineId" });
    }
    if (!database.objectStoreNames.contains(METADATA_STORE_NAME)) {
      database.createObjectStore(METADATA_STORE_NAME, { keyPath: "key" });
    }
  };
  request.onsuccess = () => resolve(request.result);
});

const withDatabase = async <Result>(
  run: (database: IDBDatabase) => Promise<Result>,
): Promise<Result> => {
  const database = await openDatabase();
  try {
    return await run(database);
  } finally {
    database.close();
  }
};

const quarantinePersistedRecord = (
  draftStore: IDBObjectStore,
  quarantineStore: IDBObjectStore,
  key: IDBValidKey,
  error: unknown,
) => {
  const quarantineRecord = createQuarantineRecord(error);
  quarantineStore.put(quarantineRecord);
  draftStore.delete(key);
};

export const createIndexedDbDraftRepository = (): RecoverableDraftRepository => ({
  acknowledge: async (draft) => withDatabase(async (database) => {
    const transaction = database.transaction(
      [DRAFT_STORE_NAME, QUARANTINE_STORE_NAME],
      "readwrite",
    );
    const completion = transactionComplete(transaction);
    const store = transaction.objectStore(DRAFT_STORE_NAME);
    const raw = await requestResult(store.get(draft.draftId));
    if (raw === undefined) {
      await completion;
      return false;
    }
    let persisted: RecoverableDraft;
    try {
      persisted = decodePersistedDraft(raw);
    } catch (error) {
      quarantinePersistedRecord(
        store,
        transaction.objectStore(QUARANTINE_STORE_NAME),
        draft.draftId,
        error,
      );
      await completion;
      return false;
    }
    if (persisted.ownerScope !== draft.ownerScope) return ownerMismatch();
    if (!sameExactDraftState(persisted, draft)) {
      await completion;
      return false;
    }
    store.delete(draft.draftId);
    await completion;
    return true;
  }),
  clear: async (ownerScope) => withDatabase(async (database) => {
    const transaction = database.transaction(
      [DRAFT_STORE_NAME, QUARANTINE_STORE_NAME],
      "readwrite",
    );
    const completion = transactionComplete(transaction);
    const store = transaction.objectStore(DRAFT_STORE_NAME);
    if (ownerScope === undefined) {
      store.clear();
      await completion;
      return;
    }
    const parsedOwner = parseDraftOwnerScope(ownerScope);
    const valuesRequest = store.getAll();
    const keysRequest = store.getAllKeys();
    const [values, keys] = await Promise.all([
      requestResult(valuesRequest),
      requestResult(keysRequest),
    ]);
    values.forEach((raw, index) => {
      const key = keys[index];
      if (key === undefined) return;
      try {
        const draft = decodePersistedDraft(raw);
        if (draft.ownerScope === parsedOwner) store.delete(key);
      } catch (error) {
        quarantinePersistedRecord(
          store,
          transaction.objectStore(QUARANTINE_STORE_NAME),
          key,
          error,
        );
      }
    });
    await completion;
  }),
  discard: async (draft) => withDatabase(async (database) => {
    const transaction = database.transaction(
      [DRAFT_STORE_NAME, QUARANTINE_STORE_NAME],
      "readwrite",
    );
    const completion = transactionComplete(transaction);
    const store = transaction.objectStore(DRAFT_STORE_NAME);
    const raw = await requestResult(store.get(draft.draftId));
    if (raw === undefined) {
      await completion;
      return false;
    }
    let persisted: RecoverableDraft;
    try {
      persisted = decodePersistedDraft(raw);
    } catch (error) {
      quarantinePersistedRecord(
        store,
        transaction.objectStore(QUARANTINE_STORE_NAME),
        draft.draftId,
        error,
      );
      await completion;
      return false;
    }
    if (persisted.ownerScope !== draft.ownerScope) return ownerMismatch();
    if (!sameExactDraftState(persisted, draft)) {
      await completion;
      return false;
    }
    store.delete(draft.draftId);
    await completion;
    return true;
  }),
  list: async (ownerScope) => withDatabase(async (database) => {
    const parsedOwner = parseDraftOwnerScope(ownerScope);
    const transaction = database.transaction(
      [DRAFT_STORE_NAME, QUARANTINE_STORE_NAME],
      "readwrite",
    );
    const completion = transactionComplete(transaction);
    const store = transaction.objectStore(DRAFT_STORE_NAME);
    const valuesRequest = store.getAll();
    const keysRequest = store.getAllKeys();
    const [values, keys] = await Promise.all([
      requestResult(valuesRequest),
      requestResult(keysRequest),
    ]);
    const drafts: RecoverableDraft[] = [];
    values.forEach((raw, index) => {
      const key = keys[index];
      if (key === undefined) return;
      try {
        const draft = decodePersistedDraft(raw);
        if (draft.ownerScope === parsedOwner) drafts.push(draft);
      } catch (error) {
        quarantinePersistedRecord(
          store,
          transaction.objectStore(QUARANTINE_STORE_NAME),
          key,
          error,
        );
      }
    });
    await completion;
    return drafts.sort((left, right) => (
      left.updatedAt.localeCompare(right.updatedAt)
      || left.draftId.localeCompare(right.draftId)
    ));
  }),
  listQuarantine: async () => withDatabase(async (database) => {
    const transaction = database.transaction(QUARANTINE_STORE_NAME, "readonly");
    const completion = transactionComplete(transaction);
    const raw = await requestResult(
      transaction.objectStore(QUARANTINE_STORE_NAME).getAll(),
    );
    await completion;
    return z.array(z.object({
      quarantineId: z.string().min(1),
      quarantinedAt: timestampSchema,
      reason: z.enum(["auth-material", "invalid-record"]),
      schemaVersion: z.literal(RECOVERABLE_DRAFT_SCHEMA_VERSION),
    }).strict()).parse(raw) as readonly DraftQuarantineRecord[];
  }),
  markAttempt: async (draft, attemptedAt = new Date().toISOString()) => (
    withDatabase(async (database) => {
      const transaction = database.transaction(
        [DRAFT_STORE_NAME, QUARANTINE_STORE_NAME],
        "readwrite",
      );
      const completion = transactionComplete(transaction);
      const store = transaction.objectStore(DRAFT_STORE_NAME);
      const raw = await requestResult(store.get(draft.draftId));
      if (raw === undefined) {
        await completion;
        return null;
      }
      let persisted: RecoverableDraft;
      try {
        persisted = decodePersistedDraft(raw);
      } catch (error) {
        quarantinePersistedRecord(
          store,
          transaction.objectStore(QUARANTINE_STORE_NAME),
          draft.draftId,
          error,
        );
        await completion;
        return null;
      }
      if (persisted.ownerScope !== draft.ownerScope) return ownerMismatch();
      if (!sameExactDraftState(persisted, draft)) {
        await completion;
        return null;
      }
      const parsedAttemptedAt = timestampSchema.parse(attemptedAt);
      if (isRecoverableDraftAttemptActive(persisted, Date.parse(parsedAttemptedAt))) {
        await completion;
        return null;
      }
      const attempted = decodePersistedDraft({
        ...persisted,
        attemptCount: persisted.attemptCount + 1,
        lastAttemptAt: parsedAttemptedAt,
      });
      store.put(attempted);
      await completion;
      return attempted;
    })
  ),
  put: async (draft) => withDatabase(async (database) => {
    const parsed = decodePersistedDraft(draft);
    const transaction = database.transaction(DRAFT_STORE_NAME, "readwrite");
    const completion = transactionComplete(transaction);
    transaction.objectStore(DRAFT_STORE_NAME).put(parsed);
    await completion;
  }),
  putIfCurrent: async (source, draft) => {
    const parsedDraft = decodePersistedDraft(draft);
    if (source.ownerScope !== parsedDraft.ownerScope) return ownerMismatch();
    if (source.draftId === parsedDraft.draftId) return false;
    return withDatabase(async (database) => {
      const transaction = database.transaction(
        [DRAFT_STORE_NAME, QUARANTINE_STORE_NAME],
        "readwrite",
      );
      const completion = transactionComplete(transaction);
      const store = transaction.objectStore(DRAFT_STORE_NAME);
      const raw = await requestResult(store.get(source.draftId));
      if (raw === undefined) {
        await completion;
        return false;
      }
      let persisted: RecoverableDraft;
      try {
        persisted = decodePersistedDraft(raw);
      } catch (error) {
        quarantinePersistedRecord(
          store,
          transaction.objectStore(QUARANTINE_STORE_NAME),
          source.draftId,
          error,
        );
        await completion;
        return false;
      }
      if (persisted.ownerScope !== source.ownerScope) return ownerMismatch();
      if (!sameExactDraftState(persisted, source)) {
        await completion;
        return false;
      }
      store.put(parsedDraft);
      await completion;
      return true;
    });
  },
  readActiveOwner: async () => withDatabase(async (database) => {
    const transaction = database.transaction(METADATA_STORE_NAME, "readonly");
    const completion = transactionComplete(transaction);
    const raw: unknown = await requestResult(
      transaction.objectStore(METADATA_STORE_NAME).get(ACTIVE_OWNER_KEY),
    );
    await completion;
    if (raw === undefined) return null;
    const parsed = z.object({
      key: z.literal(ACTIVE_OWNER_KEY),
      value: ownerScopeSchema,
    }).strict().safeParse(raw);
    if (!parsed.success) return invalidRecord();
    return parsed.data.value;
  }),
  releaseAttempt: async (draft) => withDatabase(async (database) => {
    const transaction = database.transaction(
      [DRAFT_STORE_NAME, QUARANTINE_STORE_NAME],
      "readwrite",
    );
    const completion = transactionComplete(transaction);
    const store = transaction.objectStore(DRAFT_STORE_NAME);
    const raw = await requestResult(store.get(draft.draftId));
    if (raw === undefined) {
      await completion;
      return null;
    }
    let persisted: RecoverableDraft;
    try {
      persisted = decodePersistedDraft(raw);
    } catch (error) {
      quarantinePersistedRecord(
        store,
        transaction.objectStore(QUARANTINE_STORE_NAME),
        draft.draftId,
        error,
      );
      await completion;
      return null;
    }
    if (persisted.ownerScope !== draft.ownerScope) return ownerMismatch();
    if (persisted.lastAttemptAt === null || !sameExactDraftState(persisted, draft)) {
      await completion;
      return null;
    }
    const released = decodePersistedDraft({
      ...persisted,
      lastAttemptAt: null,
    });
    store.put(released);
    await completion;
    return released;
  }),
  writeActiveOwner: async (ownerScope) => withDatabase(async (database) => {
    const transaction = database.transaction(METADATA_STORE_NAME, "readwrite");
    const completion = transactionComplete(transaction);
    const store = transaction.objectStore(METADATA_STORE_NAME);
    if (ownerScope === null) store.delete(ACTIVE_OWNER_KEY);
    else store.put({ key: ACTIVE_OWNER_KEY, value: parseDraftOwnerScope(ownerScope) });
    await completion;
  }),
});

export const recoverableDraftRepository: RecoverableDraftRepository = (
  typeof indexedDB === "undefined"
    ? createInMemoryDraftRepository()
    : createIndexedDbDraftRepository()
);

export type DraftReplayFailure = Pick<
  MutationFailure,
  "code" | "requestId" | "retryable" | "state"
>;

export type DraftReplayAcknowledgement = Readonly<{
  acknowledged: boolean;
  failure?: DraftReplayFailure;
}>;

export type DraftReplayRetention = Readonly<{
  draftId: string;
  reason: "deferred" | "failed" | "superseded";
  code?: string;
  requestId?: string | null;
  retryable?: boolean;
  state?: MutationFailure["state"];
}>;

export type DraftReplayReport = Readonly<{
  acknowledged: readonly string[];
  attempted: readonly string[];
  retained: readonly DraftReplayRetention[];
}>;

type DraftReplayAttemptOutcome =
  | Readonly<{ status: "acknowledged" }>
  | Readonly<{ retention: DraftReplayRetention; status: "retained" }>;

export type ReplayRecoverableDraftsOptions = Readonly<{
  kinds: readonly RecoverableDraftKind[];
  ownerScope: string;
  replay: (
    draft: RecoverableDraft,
    signal?: AbortSignal,
  ) => Promise<DraftReplayAcknowledgement>;
  repository?: RecoverableDraftRepository;
  signal?: AbortSignal;
}>;

const replayOperations = new WeakMap<
  RecoverableDraftRepository,
  Map<string, Promise<DraftReplayReport>>
>();

const abortIfRequested = (signal: AbortSignal | undefined) => {
  if (signal?.aborted !== true) return;
  throw signal.reason ?? new DOMException("Draft replay aborted", "AbortError");
};

const createReplayAttemptAbortScope = (externalSignal: AbortSignal | undefined) => {
  const controller = new AbortController();
  const forwardExternalAbort = () => {
    if (!controller.signal.aborted && externalSignal !== undefined) {
      controller.abort(externalSignal.reason);
    }
  };
  if (externalSignal?.aborted === true) forwardExternalAbort();
  else externalSignal?.addEventListener("abort", forwardExternalAbort, { once: true });

  const timeoutId = setTimeout(() => {
    if (!controller.signal.aborted) {
      controller.abort(new DOMException(
        "Recoverable draft replay timed out.",
        "TimeoutError",
      ));
    }
  }, RECOVERABLE_DRAFT_REPLAY_DEADLINE_MS);

  return {
    dispose: () => {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", forwardExternalAbort);
    },
    signal: controller.signal,
  };
};

const runAbortableReplay = async <Result>(
  signal: AbortSignal,
  replay: () => Promise<Result>,
): Promise<Result> => {
  abortIfRequested(signal);
  let rejectAborted: ((reason?: unknown) => void) | null = null;
  const aborted = new Promise<never>((_resolve, reject) => {
    rejectAborted = reject;
  });
  const handleAbort = () => rejectAborted?.(
    signal.reason ?? new DOMException("Draft replay aborted", "AbortError"),
  );
  signal.addEventListener("abort", handleAbort, { once: true });
  const operation = Promise.resolve().then(() => {
    abortIfRequested(signal);
    return replay();
  });
  try {
    return await Promise.race([operation, aborted]);
  } finally {
    signal.removeEventListener("abort", handleAbort);
  }
};

const executeDraftReplay = async (
  options: ReplayRecoverableDraftsOptions,
  repository: RecoverableDraftRepository,
): Promise<DraftReplayReport> => {
  const kinds = new Set(options.kinds.map((kind) => draftKindSchema.parse(kind)));
  const drafts = (await repository.list(options.ownerScope))
    .filter((draft) => kinds.has(draft.kind));
  const acknowledged: string[] = [];
  const attempted: string[] = [];
  const retained: DraftReplayRetention[] = [];

  for (const draft of drafts) {
    abortIfRequested(options.signal);
    const attempt = await repository.markAttempt(draft);
    if (attempt === null) {
      retained.push({ draftId: draft.draftId, reason: "superseded" });
      continue;
    }
    attempted.push(attempt.draftId);
    const abortScope = createReplayAttemptAbortScope(options.signal);
    try {
      const outcome = await runAbortableReplay<DraftReplayAttemptOutcome>(
        abortScope.signal,
        async () => {
          const acknowledgement = await options.replay(attempt, abortScope.signal);
          abortIfRequested(abortScope.signal);
          if (!acknowledgement.acknowledged) {
            await repository.releaseAttempt(attempt);
            abortIfRequested(abortScope.signal);
            return {
              retention: {
                draftId: attempt.draftId,
                reason: "deferred",
                ...acknowledgement.failure,
              },
              status: "retained",
            };
          }
          if (await repository.acknowledge(attempt)) {
            abortIfRequested(abortScope.signal);
            return { status: "acknowledged" };
          }
          await repository.releaseAttempt(attempt);
          abortIfRequested(abortScope.signal);
          return {
            retention: { draftId: attempt.draftId, reason: "superseded" },
            status: "retained",
          };
        },
      );
      abortIfRequested(abortScope.signal);
      if (outcome.status === "acknowledged") acknowledged.push(attempt.draftId);
      else retained.push(outcome.retention);
    } catch (error) {
      await repository.releaseAttempt(attempt);
      if (options.signal?.aborted === true) {
        throw options.signal.reason ?? error;
      }
      const failure = classifyMutationFailure(error);
      retained.push({
        code: failure.code,
        draftId: attempt.draftId,
        reason: "failed",
        requestId: failure.requestId,
        retryable: failure.retryable,
        state: failure.state,
      });
    } finally {
      abortScope.dispose();
    }
  }

  return { acknowledged, attempted, retained };
};

export const replayRecoverableDrafts = (
  options: ReplayRecoverableDraftsOptions,
): Promise<DraftReplayReport> => {
  const repository = options.repository ?? recoverableDraftRepository;
  const ownerScope = parseDraftOwnerScope(options.ownerScope);
  const operationKey = `${ownerScope}:${[...options.kinds].sort().join(",")}`;
  let operations = replayOperations.get(repository);
  if (operations === undefined) {
    operations = new Map();
    replayOperations.set(repository, operations);
  }
  const existing = operations.get(operationKey);
  if (existing !== undefined) return existing;

  const operation = executeDraftReplay({ ...options, ownerScope }, repository)
    .finally(() => {
      operations?.delete(operationKey);
    });
  operations.set(operationKey, operation);
  return operation;
};

export type RegisterDraftReconnectReplayOptions = ReplayRecoverableDraftsOptions & Readonly<{
  onError?: (error: unknown) => void;
  onReport?: (report: DraftReplayReport) => void;
  target?: Pick<EventTarget, "addEventListener" | "removeEventListener">;
}>;

export const registerDraftReconnectReplay = (
  options: RegisterDraftReconnectReplayOptions,
): (() => void) => {
  const target = options.target ?? (typeof window === "undefined" ? null : window);
  if (target === null) return () => undefined;
  const handleOnline = () => {
    void replayRecoverableDrafts(options)
      .then((report) => options.onReport?.(report))
      .catch((error: unknown) => options.onError?.(error));
  };
  target.addEventListener("online", handleOnline);
  return () => target.removeEventListener("online", handleOnline);
};
