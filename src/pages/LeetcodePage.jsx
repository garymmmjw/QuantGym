import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { LeetcodePageContent } from "../features/leetcode/LeetcodePageContent.jsx";

export function LeetcodePage() {
  useSyncModuleRoute("leetcode");
  return <LeetcodePageContent />;
}
