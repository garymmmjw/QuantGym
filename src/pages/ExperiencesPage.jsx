import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { ExperiencesPageContent } from "../features/experiences/ExperiencesPageContent.jsx";

export function ExperiencesPage() {
  useSyncModuleRoute("experiences");
  return <ExperiencesPageContent />;
}
