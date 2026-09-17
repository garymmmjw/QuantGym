import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { TrackerPageContent } from "../features/tracker/TrackerPageContent.jsx";

export function TrackerPage() {
  useSyncModuleRoute("tracker");
  return <TrackerPageContent />;
}
