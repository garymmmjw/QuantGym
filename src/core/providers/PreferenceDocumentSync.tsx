import { useEffect } from "react";

import {
  updateSystemThemePreference,
  usePreferences,
} from "../../domains/platform/preferences";

export function PreferenceDocumentSync() {
  const theme = usePreferences((state) => state.theme);
  const language = usePreferences((state) => state.language);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-qg-theme", theme);
    root.setAttribute("lang", language);
  }, [language, theme]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystemTheme = () => {
      updateSystemThemePreference(media.matches ? "dark" : "light");
    };
    syncSystemTheme();
    media.addEventListener("change", syncSystemTheme);
    return () => media.removeEventListener("change", syncSystemTheme);
  }, []);

  return null;
}
