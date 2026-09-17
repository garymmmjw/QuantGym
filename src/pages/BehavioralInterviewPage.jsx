import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { BehavioralInterviewPageContent } from "../features/behavioral-interview/BehavioralInterviewPageContent.jsx";

export function BehavioralInterviewPage() {
  useSyncModuleRoute("behavioral-interview");
  return <BehavioralInterviewPageContent />;
}
