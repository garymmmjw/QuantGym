import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { PlanPageContent } from "../features/plan/PlanPageContent.jsx";

export function PlanPage() {
  useSyncModuleRoute("plan");
  return <PlanPageContent />;
}
