import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { InterviewPageContent } from "../features/interview/InterviewPageContent.jsx";

export function InterviewPage() {
  useSyncModuleRoute("interview");
  return <InterviewPageContent />;
}
