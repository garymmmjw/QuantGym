import "@testing-library/jest-dom/vitest";

import { act, renderHook } from "@testing-library/react";

import {
  PREFERENCE_STORAGE_KEY,
  createPreferenceController,
  normalizePreferencePayload,
  preferenceController,
  serializePreferencePayload,
  usePreferences,
  type PreferenceStorage,
} from "./preferences.store";
import {
  defaultPreferences,
  type MePreferenceSource,
} from "./preferences.types";

class MemoryPreferenceStorage implements PreferenceStorage {
  public value: string | null;

  public readonly writes: string[] = [];

  public removals = 0;

  public constructor(value: string | null = null) {
    this.value = value;
  }

  public getItem(): string | null {
    return this.value;
  }

  public setItem(_key: string, value: string): void {
    this.value = value;
    this.writes.push(value);
  }

  public removeItem(): void {
    this.value = null;
    this.removals += 1;
  }
}

describe("preference payload safety", () => {
  it("accepts only the two supported preference values", () => {
    expect(normalizePreferencePayload({ theme: "dark", language: "en" })).toEqual({
      theme: "dark",
      language: "en",
    });
    expect(normalizePreferencePayload({ theme: "neon", language: "xx" })).toEqual(
      defaultPreferences,
    );
    expect(normalizePreferencePayload(null)).toEqual(defaultPreferences);
    expect(normalizePreferencePayload(["dark", "en"])).toEqual(defaultPreferences);
  });

  it("uses own properties and ignores prototype pollution", () => {
    const polluted = Object.create({ theme: "dark", language: "en" }) as Record<string, unknown>;
    polluted.token = "must-not-survive";

    expect(normalizePreferencePayload(polluted)).toEqual(defaultPreferences);
  });

  it("serializes an exact two-field payload", () => {
    const serialized = serializePreferencePayload({ theme: "dark", language: "en" });
    expect(JSON.parse(serialized)).toEqual({ theme: "dark", language: "en" });
    expect(Object.keys(JSON.parse(serialized) as object)).toEqual(["theme", "language"]);
    expect(serialized).not.toMatch(/user|token|session|csrf/i);
  });
});

describe("preference controller", () => {
  it("uses the live system theme on a first visit without persisting an artificial choice", () => {
    const storage = new MemoryPreferenceStorage();
    const controller = createPreferenceController({
      resolveSystemTheme: () => "dark",
      storage,
    });

    expect(controller.store.getState()).toEqual({ theme: "dark", language: "zh-CN" });
    expect(controller.isFollowingSystemTheme()).toBe(true);
    expect(storage.value).toBeNull();
    controller.destroy();
  });

  it("hydrates known values, removes polluted fields, and stores only state", () => {
    const storage = new MemoryPreferenceStorage(JSON.stringify({
      theme: "dark",
      language: "en",
      user: { email: "private@example.com" },
      bearerToken: "secret",
      __proto__: { admin: true },
    }));
    const controller = createPreferenceController({ storage });

    expect(controller.store.getState()).toEqual({ theme: "dark", language: "en" });
    expect(Object.keys(controller.store.getState())).toEqual(["theme", "language"]);
    expect(JSON.parse(storage.value ?? "null")).toEqual({ theme: "dark", language: "en" });
    expect(storage.writes).toHaveLength(1);

    controller.destroy();
  });

  it("safely falls back when storage is invalid or unavailable", () => {
    const invalidStorage = new MemoryPreferenceStorage("{not-json");
    const invalid = createPreferenceController({
      storage: invalidStorage,
    });
    expect(invalid.store.getState()).toEqual(defaultPreferences);
    expect(invalidStorage.value).toBeNull();
    expect(invalidStorage.removals).toBe(1);
    invalid.destroy();

    const throwingStorage: PreferenceStorage = {
      getItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
      setItem: () => {
        throw new DOMException("blocked", "QuotaExceededError");
      },
      removeItem: () => {
        throw new DOMException("blocked", "SecurityError");
      },
    };
    const unavailable = createPreferenceController({
      storage: throwingStorage,
    });
    expect(unavailable.store.getState()).toEqual(defaultPreferences);
    expect(() => unavailable.toggleTheme()).not.toThrow();
    expect(unavailable.store.getState().theme).toBe("dark");
    unavailable.destroy();
  });

  it("removes invalid persisted fields instead of retaining private payloads", () => {
    const storage = new MemoryPreferenceStorage(JSON.stringify({
      theme: "neon",
      language: "xx",
      bearerToken: "secret",
    }));
    const controller = createPreferenceController({
      resolveSystemTheme: () => "dark",
      storage,
    });

    expect(controller.store.getState()).toEqual({ theme: "dark", language: "zh-CN" });
    expect(controller.isFollowingSystemTheme()).toBe(true);
    expect(storage.value).toBeNull();
    expect(storage.removals).toBe(1);
    expect(storage.writes).toHaveLength(0);
    controller.destroy();
  });

  it("rejects invalid action values even when an untyped caller bypasses TypeScript", () => {
    const controller = createPreferenceController({ storage: null });

    controller.setTheme("neon" as "dark");
    controller.setLanguage("xx" as "en");

    expect(controller.store.getState()).toEqual(defaultPreferences);
    controller.destroy();
  });

  it("stores changed values as the exact public preference payload", () => {
    const storage = new MemoryPreferenceStorage(JSON.stringify({
      theme: "dark",
      language: "en",
    }));
    const controller = createPreferenceController({ storage });

    controller.toggleTheme();
    controller.setLanguage("zh-CN");
    expect(controller.store.getState()).toEqual({ theme: "light", language: "zh-CN" });
    expect(JSON.parse(storage.value ?? "null")).toEqual({
      theme: "light",
      language: "zh-CN",
    });

    controller.destroy();
  });

  it("reconciles valid /me preferences as the official source", () => {
    const storage = new MemoryPreferenceStorage(JSON.stringify({
      theme: "light",
      language: "zh-CN",
    }));
    const controller = createPreferenceController({ storage });
    const meWithUnstoredPrivateFields = {
      id: "user-id",
      email: "private@example.com",
      session: "must-not-survive",
      preferences: { theme: "dark", language: "en", version: 7 },
    } as unknown as MePreferenceSource;

    controller.reconcileFromMe(meWithUnstoredPrivateFields);

    expect(controller.store.getState()).toEqual({ theme: "dark", language: "en" });
    expect(Object.keys(controller.store.getState())).toEqual(["theme", "language"]);
    expect(JSON.parse(storage.value ?? "null")).toEqual({ theme: "dark", language: "en" });
    expect(storage.value).not.toMatch(/private|session|version|user-id/i);

    controller.destroy();
  });

  it("resolves the server system theme and degrades invalid server values", () => {
    const controller = createPreferenceController({
      storage: null,
      resolveSystemTheme: () => "dark",
    });

    controller.reconcileFromMe({
      preferences: { theme: "system", language: "en" },
    });
    expect(controller.store.getState()).toEqual({ theme: "dark", language: "en" });
    expect(controller.isFollowingSystemTheme()).toBe(true);

    controller.updateSystemTheme("light");
    expect(controller.store.getState()).toEqual({ theme: "light", language: "en" });

    controller.toggleTheme();
    expect(controller.isFollowingSystemTheme()).toBe(false);
    controller.updateSystemTheme("dark");
    expect(controller.store.getState()).toEqual({ theme: "dark", language: "en" });

    controller.reconcileFromMe({
      preferences: { theme: "javascript:alert(1)", language: { polluted: true } },
    });
    expect(controller.store.getState()).toEqual(defaultPreferences);
    expect(controller.isFollowingSystemTheme()).toBe(false);

    controller.reconcileFromMe(null);
    expect(controller.store.getState()).toEqual(defaultPreferences);
    controller.destroy();
  });
});

describe("usePreferences", () => {
  afterEach(() => {
    preferenceController.reset();
    window.localStorage.removeItem(PREFERENCE_STORAGE_KEY);
  });

  it("selects reactive Zustand state without exposing actions or private records", () => {
    preferenceController.reset();
    const { result } = renderHook(() => usePreferences((state) => state.theme));
    expect(result.current).toBe("light");

    act(() => preferenceController.setTheme("dark"));
    expect(result.current).toBe("dark");
    expect(Object.keys(preferenceController.store.getState())).toEqual(["theme", "language"]);
  });
});
