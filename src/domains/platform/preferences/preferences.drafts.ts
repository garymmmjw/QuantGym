import {
  isPreferenceLanguage,
  isPreferenceTheme,
  type PreferenceLanguage,
  type PreferenceTheme,
} from "./preferences.types";

export const PREFERENCE_SYNC_DRAFT_KEY = "qg-v2-preference-sync-drafts";

export type PreferenceSyncDraft =
  | Readonly<{
    createdAt: string;
    draftId: string;
    field: "theme";
    ownerScope: string;
    value: PreferenceTheme;
  }>
  | Readonly<{
    createdAt: string;
    draftId: string;
    field: "language";
    ownerScope: string;
    value: PreferenceLanguage;
  }>;

type PreferenceDraftStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

const storage = (): PreferenceDraftStorage | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const validDraftId = (value: unknown): value is string => (
  typeof value === "string" && /^[A-Za-z0-9_-]{16,160}$/u.test(value)
);

const legacyDraftId = (
  ownerScope: string,
  field: PreferenceSyncDraft["field"],
) => `legacy-${ownerScope}-${field}`;

const createDraftId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `preference-${crypto.randomUUID()}`;
  }
  const bytes = new Uint8Array(16);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return `preference-${[...bytes]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
};

const parseDraft = (value: unknown): PreferenceSyncDraft | null => {
  if (!isRecord(value)) return null;
  if (
    typeof value.ownerScope !== "string"
    || !/^acct-[a-f0-9]{16}$/u.test(value.ownerScope)
    || typeof value.createdAt !== "string"
  ) {
    return null;
  }
  if (value.field === "theme" && isPreferenceTheme(value.value)) {
    return {
      createdAt: value.createdAt,
      draftId: validDraftId(value.draftId)
        ? value.draftId
        : legacyDraftId(value.ownerScope, "theme"),
      field: "theme",
      ownerScope: value.ownerScope,
      value: value.value,
    };
  }
  if (value.field === "language" && isPreferenceLanguage(value.value)) {
    return {
      createdAt: value.createdAt,
      draftId: validDraftId(value.draftId)
        ? value.draftId
        : legacyDraftId(value.ownerScope, "language"),
      field: "language",
      ownerScope: value.ownerScope,
      value: value.value,
    };
  }
  return null;
};

const readAll = (): readonly PreferenceSyncDraft[] => {
  const target = storage();
  if (target === null) return [];
  try {
    const raw = target.getItem(PREFERENCE_SYNC_DRAFT_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((candidate) => {
      const draft = parseDraft(candidate);
      return draft === null ? [] : [draft];
    });
  } catch {
    return [];
  }
};

const writeAll = (drafts: readonly PreferenceSyncDraft[]): void => {
  const target = storage();
  if (target === null) return;
  try {
    if (drafts.length === 0) target.removeItem(PREFERENCE_SYNC_DRAFT_KEY);
    else target.setItem(PREFERENCE_SYNC_DRAFT_KEY, JSON.stringify(drafts));
  } catch {
    // Theme/language remain applied in memory if storage is unavailable.
  }
};

export const listPreferenceSyncDrafts = (
  ownerScope: string,
): readonly PreferenceSyncDraft[] => readAll()
  .filter((draft) => draft.ownerScope === ownerScope)
  .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

export const upsertPreferenceSyncDraft = (
  ownerScope: string,
  input:
    | Readonly<{ field: "theme"; value: PreferenceTheme }>
    | Readonly<{ field: "language"; value: PreferenceLanguage }>,
): PreferenceSyncDraft => {
  const draft = {
    createdAt: new Date().toISOString(),
    draftId: createDraftId(),
    field: input.field,
    ownerScope,
    value: input.value,
  } as PreferenceSyncDraft;
  writeAll([
    ...readAll().filter((candidate) => (
      candidate.ownerScope !== ownerScope || candidate.field !== input.field
    )),
    draft,
  ]);
  return draft;
};

export const removePreferenceSyncDraft = (
  ownerScope: string,
  field: PreferenceSyncDraft["field"],
  expectedValue?: PreferenceSyncDraft["value"],
  expectedDraftId?: string,
): void => {
  writeAll(readAll().filter((draft) => (
    draft.ownerScope !== ownerScope
    || draft.field !== field
    || (expectedValue !== undefined && draft.value !== expectedValue)
    || (expectedDraftId !== undefined && draft.draftId !== expectedDraftId)
  )));
};

export const clearPreferenceSyncDrafts = (ownerScope?: string): void => {
  if (ownerScope === undefined) {
    writeAll([]);
    return;
  }
  writeAll(readAll().filter((draft) => draft.ownerScope !== ownerScope));
};
