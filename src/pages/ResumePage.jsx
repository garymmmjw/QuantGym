import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { ResumePageContent } from "../features/resume/ResumePageContent.jsx";

export function ResumePage() {
  useSyncModuleRoute("resume");
  return <ResumePageContent />;
}
