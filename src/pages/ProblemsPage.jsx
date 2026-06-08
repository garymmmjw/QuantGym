import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { ProblemsPageContent } from "../features/problems/ProblemsPageContent.jsx";

export function ProblemsPage() {
  useSyncModuleRoute("problems");
  return <ProblemsPageContent />;
}
