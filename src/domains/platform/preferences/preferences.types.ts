import {
  appLanguages,
  isAppLanguage,
  type AppLanguage,
} from "../../../shared/i18n/language";

export const preferenceThemes = ["light", "dark"] as const;
export const preferenceLanguages = appLanguages;

export type PreferenceTheme = (typeof preferenceThemes)[number];
export type PreferenceLanguage = AppLanguage;

export type PreferenceState = Readonly<{
  theme: PreferenceTheme;
  language: PreferenceLanguage;
}>;

export type MePreferenceSource = Readonly<{
  preferences?: Readonly<{
    theme?: unknown;
    language?: unknown;
  }> | null;
}>;

export const defaultPreferences: PreferenceState = Object.freeze({
  theme: "light",
  language: "zh-CN",
});

export const isPreferenceTheme = (value: unknown): value is PreferenceTheme => (
  typeof value === "string"
  && preferenceThemes.some((theme) => theme === value)
);

export const isPreferenceLanguage = isAppLanguage;
