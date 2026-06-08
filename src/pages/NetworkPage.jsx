import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { NetworkPageContent } from "../features/network/NetworkPageContent.jsx";

export function NetworkPage() {
  useSyncModuleRoute("network");
  return <NetworkPageContent />;
}
