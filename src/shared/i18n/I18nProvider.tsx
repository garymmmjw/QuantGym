import {
  useMemo,
  type ReactNode,
} from "react";

import type { AppLanguage } from "./language";
import { I18nContext, type I18nContextValue } from "./i18n-context";
import { createTranslator } from "./messages";

type I18nProviderProps = Readonly<{
  language: AppLanguage;
  children: ReactNode;
}>;

export const I18nProvider = ({ language, children }: I18nProviderProps) => {
  const value = useMemo<I18nContextValue>(() => ({
    language,
    t: createTranslator(language),
  }), [language]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
