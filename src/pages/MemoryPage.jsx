import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { MemoryPageContent } from "../features/memory/MemoryPageContent.jsx";

export function MemoryPage() {
  useSyncModuleRoute("memory");
  return <MemoryPageContent />;
}
