import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { JobsPageContent } from "../features/jobs/JobsPageContent.jsx";

export function JobsPage() {
  useSyncModuleRoute("jobs");
  return <JobsPageContent />;
}
