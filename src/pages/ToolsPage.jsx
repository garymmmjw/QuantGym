import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { ToolsPageContent } from "../features/tools/ToolsPageContent.jsx";

export function ToolsPage() {
  useSyncModuleRoute("tools");
  return <ToolsPageContent />;
}
