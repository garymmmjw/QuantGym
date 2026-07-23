import type { ReactNode } from "react";

import { ToastProvider } from "../../design-system/patterns/ToastRegion";
import { usePreferences } from "../../domains/platform/preferences";
import { createTranslator, I18nProvider } from "../../shared/i18n";
import { PreferenceDocumentSync } from "./PreferenceDocumentSync";

type RuntimeProvidersProps = Readonly<{
  children: ReactNode;
}>;

export function RuntimeProviders({ children }: RuntimeProvidersProps) {
  const language = usePreferences((state) => state.language);
  const t = createTranslator(language);

  return (
    <I18nProvider language={language}>
      <PreferenceDocumentSync />
      <ToastProvider dismissLabel={t("toast.dismiss")} regionLabel={t("toast.region")}>
        {children}
      </ToastProvider>
    </I18nProvider>
  );
}
