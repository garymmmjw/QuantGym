import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { CoursesPageContent } from "../features/courses/CoursesPageContent.jsx";

export function CoursesPage() {
  useSyncModuleRoute("courses");
  return <CoursesPageContent />;
}
