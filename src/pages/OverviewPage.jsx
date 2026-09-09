import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { OverviewPageContent } from "../features/overview/OverviewPageContent.jsx";

export function OverviewPage() {
  useSyncModuleRoute("overview");
  return <OverviewPageContent />;
}
