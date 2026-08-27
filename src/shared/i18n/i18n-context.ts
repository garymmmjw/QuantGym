import { createContext, useContext } from "react";

import type { AppLanguage } from "./language";
import { createTranslator, type Translator } from "./messages";

export type I18nContextValue = Readonly<{
  language: AppLanguage;
  t: Translator;
}>;

const defaultLanguage: AppLanguage = "zh-CN";

export const I18nContext = createContext<I18nContextValue>({
  language: defaultLanguage,
  t: createTranslator(defaultLanguage),
});

export const useI18n = (): I18nContextValue => useContext(I18nContext);
