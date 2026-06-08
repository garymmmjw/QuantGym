import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { SkillsPageContent } from "../features/skills/SkillsPageContent.jsx";

export function SkillsPage() {
  useSyncModuleRoute("skills");
  return <SkillsPageContent />;
}
