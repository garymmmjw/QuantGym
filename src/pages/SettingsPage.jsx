import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { SettingsPageContent } from "../features/settings/SettingsPageContent.jsx";

export function SettingsPage() {
  useSyncModuleRoute("settings");
  return <SettingsPageContent />;
}
