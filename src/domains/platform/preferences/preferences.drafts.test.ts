import {
  PREFERENCE_SYNC_DRAFT_KEY,
  clearPreferenceSyncDrafts,
  listPreferenceSyncDrafts,
  removePreferenceSyncDraft,
  upsertPreferenceSyncDraft,
} from "./preferences.drafts";

const ownerScope = "acct-1234567890abcdef";
const otherOwnerScope = "acct-fedcba0987654321";

beforeEach(() => {
  window.localStorage.removeItem(PREFERENCE_SYNC_DRAFT_KEY);
});

describe("preference sync drafts", () => {
  it("keeps the latest pending value for each field until acknowledgement", () => {
    upsertPreferenceSyncDraft(ownerScope, { field: "theme", value: "dark" });
    upsertPreferenceSyncDraft(ownerScope, { field: "theme", value: "light" });
    upsertPreferenceSyncDraft(ownerScope, { field: "language", value: "en" });

    expect(listPreferenceSyncDrafts(ownerScope)).toEqual([
      expect.objectContaining({ field: "theme", value: "light" }),
      expect.objectContaining({ field: "language", value: "en" }),
    ]);

    removePreferenceSyncDraft(ownerScope, "theme", "dark");
    expect(listPreferenceSyncDrafts(ownerScope)).toEqual([
      expect.objectContaining({ field: "theme", value: "light" }),
      expect.objectContaining({ field: "language", value: "en" }),
    ]);

    removePreferenceSyncDraft(ownerScope, "theme", "light");
    expect(listPreferenceSyncDrafts(ownerScope)).toEqual([
      expect.objectContaining({ field: "language", value: "en" }),
    ]);
  });

  it("isolates account drafts and supports an explicit account clear", () => {
    upsertPreferenceSyncDraft(ownerScope, { field: "language", value: "en" });
    upsertPreferenceSyncDraft(otherOwnerScope, { field: "theme", value: "dark" });

    expect(listPreferenceSyncDrafts(ownerScope)).toHaveLength(1);
    expect(listPreferenceSyncDrafts(otherOwnerScope)).toHaveLength(1);

    clearPreferenceSyncDrafts(ownerScope);
    expect(listPreferenceSyncDrafts(ownerScope)).toEqual([]);
    expect(listPreferenceSyncDrafts(otherOwnerScope)).toHaveLength(1);
  });

  it("only acknowledges the exact draft generation that initiated a request", () => {
    const first = upsertPreferenceSyncDraft(
      ownerScope,
      { field: "theme", value: "dark" },
    );
    const second = upsertPreferenceSyncDraft(
      ownerScope,
      { field: "theme", value: "dark" },
    );

    removePreferenceSyncDraft(ownerScope, "theme", "dark", first.draftId);
    expect(listPreferenceSyncDrafts(ownerScope)).toEqual([second]);

    removePreferenceSyncDraft(ownerScope, "theme", "dark", second.draftId);
    expect(listPreferenceSyncDrafts(ownerScope)).toEqual([]);
  });

  it("ignores corrupt or unscoped storage records", () => {
    window.localStorage.setItem(PREFERENCE_SYNC_DRAFT_KEY, JSON.stringify([
      { field: "theme", ownerScope: "gary@example.com", value: "dark" },
      { createdAt: "not-a-secret", field: "other", ownerScope, value: "dark" },
    ]));

    expect(listPreferenceSyncDrafts(ownerScope)).toEqual([]);
  });
});
