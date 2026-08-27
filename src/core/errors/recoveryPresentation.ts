import type { RecoveryState } from "../../design-system/patterns/RecoveryPanel";
import type { Translator } from "../../shared/i18n";

export type RecoveryPresentation = Readonly<{
  actionLabel: string;
  message: string;
  title: string;
}>;

export const recoveryPresentationFor = (
  state: RecoveryState,
  t: Translator,
): RecoveryPresentation => {
  switch (state) {
    case "offline-draft":
      return {
        actionLabel: t("network.retry"),
        message: t("network.offlineBody"),
        title: t("network.offlineTitle"),
      };
    case "permission-denied":
      return {
        actionLabel: t("network.signInAgain"),
        message: t("network.permissionBody"),
        title: t("network.permissionTitle"),
      };
    case "stale-version-conflict":
      return {
        actionLabel: t("network.reload"),
        message: t("network.staleBody"),
        title: t("network.staleTitle"),
      };
    case "non-recoverable-error":
      return {
        actionLabel: t("network.back"),
        message: t("network.nonRecoverableBody"),
        title: t("network.nonRecoverableTitle"),
      };
    case "recoverable-error":
    case "retry":
      return {
        actionLabel: t("network.retry"),
        message: t("network.recoverableBody"),
        title: t("network.recoverableTitle"),
      };
  }
};
