import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";

import {
  defaultPreferences,
  isPreferenceLanguage,
  isPreferenceTheme,
  type MePreferenceSource,
  type PreferenceLanguage,
  type PreferenceState,
  type PreferenceTheme,
} from "./preferences.types";

export const PREFERENCE_STORAGE_KEY = "qg-v2-preferences";

export type PreferenceStorage = Pick<Storage, "getItem" | "removeItem" | "setItem">;

export type PreferenceControllerOptions = Readonly<{
  storage?: PreferenceStorage | null;
  resolveSystemTheme?: () => PreferenceTheme;
}>;

export type PreferenceController = Readonly<{
  store: StoreApi<PreferenceState>;
  isFollowingSystemTheme: () => boolean;
  setTheme: (theme: PreferenceTheme) => void;
  toggleTheme: () => void;
  updateSystemTheme: (theme: PreferenceTheme) => void;
  setLanguage: (language: PreferenceLanguage) => void;
  reconcileFromMe: (source: MePreferenceSource | null | undefined) => void;
  reset: () => void;
  destroy: () => void;
}>;

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === "object" && value !== null && !Array.isArray(value)
);

const ownValue = (record: Record<string, unknown>, key: string): unknown => (
  Object.prototype.hasOwnProperty.call(record, key) ? record[key] : undefined
);

const browserStorage = (): PreferenceStorage | null => {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

export const resolvePreferredSystemTheme = (): PreferenceTheme => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return defaultPreferences.theme;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const normalizePreferencePayload = (
  value: unknown,
  fallback: PreferenceState = defaultPreferences,
): PreferenceState => {
  if (!isRecord(value)) return { ...fallback };
  const theme = ownValue(value, "theme");
  const language = ownValue(value, "language");
  return {
    theme: isPreferenceTheme(theme) ? theme : fallback.theme,
    language: isPreferenceLanguage(language) ? language : fallback.language,
  };
};

export const serializePreferencePayload = (state: PreferenceState): string => JSON.stringify({
  theme: state.theme,
  language: state.language,
});

type StoredPreferenceResult =
  | Readonly<{ kind: "missing" }>
  | Readonly<{ kind: "invalid" }>
  | Readonly<{ kind: "valid"; value: PreferenceState }>;

const readStoredPreferences = (storage: PreferenceStorage | null): StoredPreferenceResult => {
  if (storage === null) return { kind: "missing" };
  try {
    const raw = storage.getItem(PREFERENCE_STORAGE_KEY);
    if (raw === null) return { kind: "missing" };
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return { kind: "invalid" };
    const theme = ownValue(parsed, "theme");
    const language = ownValue(parsed, "language");
    if (!isPreferenceTheme(theme) || !isPreferenceLanguage(language)) {
      return { kind: "invalid" };
    }
    return { kind: "valid", value: { theme, language } };
  } catch {
    return { kind: "invalid" };
  }
};

const writeStoredPreferences = (
  storage: PreferenceStorage | null,
  state: PreferenceState,
): void => {
  if (storage === null) return;
  try {
    storage.setItem(PREFERENCE_STORAGE_KEY, serializePreferencePayload(state));
  } catch {
    // Storage can be unavailable in private browsing or constrained webviews.
  }
};

const clearStoredPreferences = (storage: PreferenceStorage | null): void => {
  if (storage === null) return;
  try {
    storage.removeItem(PREFERENCE_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in private browsing or constrained webviews.
  }
};

const normalizeMePreferences = (
  source: MePreferenceSource,
  resolveSystemTheme: () => PreferenceTheme,
): PreferenceState => {
  const raw = source.preferences;
  if (!isRecord(raw)) return { ...defaultPreferences };
  const rawTheme = ownValue(raw, "theme");
  const theme = rawTheme === "system"
    ? resolveSystemTheme()
    : (isPreferenceTheme(rawTheme) ? rawTheme : defaultPreferences.theme);
  const rawLanguage = ownValue(raw, "language");
  return {
    theme,
    language: isPreferenceLanguage(rawLanguage)
      ? rawLanguage
      : defaultPreferences.language,
  };
};

export const createPreferenceController = (
  options: PreferenceControllerOptions = {},
): PreferenceController => {
  const storage = options.storage === undefined ? browserStorage() : options.storage;
  const systemTheme = options.resolveSystemTheme ?? resolvePreferredSystemTheme;
  const storedResult = readStoredPreferences(storage);
  if (storedResult.kind === "invalid") clearStoredPreferences(storage);
  const storedPreferences = storedResult.kind === "valid" ? storedResult.value : null;
  let followsSystemTheme = storedPreferences === null;
  const initialPreferences = storedPreferences ?? {
    ...defaultPreferences,
    theme: systemTheme(),
  };
  const store = createStore<PreferenceState>()(() => initialPreferences);

  const sync = (state: PreferenceState) => {
    if (followsSystemTheme) return;
    writeStoredPreferences(storage, state);
  };
  const unsubscribe = store.subscribe(sync);
  if (storedPreferences !== null) writeStoredPreferences(storage, storedPreferences);

  const replace = (state: PreferenceState) => {
    store.setState(state, true);
  };

  return {
    store,
    isFollowingSystemTheme: () => followsSystemTheme,
    setTheme: (theme) => {
      followsSystemTheme = false;
      replace({
        ...store.getState(),
        theme: isPreferenceTheme(theme) ? theme : defaultPreferences.theme,
      });
    },
    toggleTheme: () => {
      followsSystemTheme = false;
      replace({
        ...store.getState(),
        theme: store.getState().theme === "dark" ? "light" : "dark",
      });
    },
    updateSystemTheme: (theme) => {
      if (!followsSystemTheme || !isPreferenceTheme(theme)) return;
      replace({ ...store.getState(), theme });
    },
    setLanguage: (language) => {
      const nextState = {
        ...store.getState(),
        language: isPreferenceLanguage(language) ? language : defaultPreferences.language,
      };
      replace(nextState);
      if (followsSystemTheme) writeStoredPreferences(storage, nextState);
    },
    reconcileFromMe: (source) => {
      if (source === null || source === undefined) return;
      followsSystemTheme = isRecord(source.preferences)
        && ownValue(source.preferences, "theme") === "system";
      if (followsSystemTheme) clearStoredPreferences(storage);
      replace(normalizeMePreferences(source, systemTheme));
    },
    reset: () => {
      followsSystemTheme = false;
      replace({ ...defaultPreferences });
    },
    destroy: unsubscribe,
  };
};

export const preferenceController = createPreferenceController();
export const preferenceStore = preferenceController.store;

export const usePreferences = <Selected>(
  selector: (state: PreferenceState) => Selected,
): Selected => useStore(preferenceStore, selector);

export const setThemePreference = (theme: PreferenceTheme): void => {
  preferenceController.setTheme(theme);
};

export const toggleThemePreference = (): void => {
  preferenceController.toggleTheme();
};

export const updateSystemThemePreference = (theme: PreferenceTheme): void => {
  preferenceController.updateSystemTheme(theme);
};

export const setLanguagePreference = (language: PreferenceLanguage): void => {
  preferenceController.setLanguage(language);
};

export const reconcilePreferencesFromMe = (
  source: MePreferenceSource | null | undefined,
): void => {
  preferenceController.reconcileFromMe(source);
};
