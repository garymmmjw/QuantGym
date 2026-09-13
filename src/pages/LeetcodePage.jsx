import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { LeetcodePageContent } from "../features/leetcode/LeetcodePageContent.jsx";
import { usePersonalData } from "../features/personal/usePersonalData.js";

export function LeetcodePage() {
  useSyncModuleRoute("leetcode");
  const { snapshot } = usePersonalData();
  return <LeetcodePageContent practiceSessions={snapshot.data.practiceSessions || []} />;
}
