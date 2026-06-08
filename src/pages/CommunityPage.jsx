import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { CommunityPageContent } from "../features/community/CommunityPageContent.jsx";

export function CommunityPage() {
  useSyncModuleRoute("community");
  return <CommunityPageContent />;
}
