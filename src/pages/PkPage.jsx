import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { PkPageContent } from "../features/pk/PkPageContent.jsx";

export function PkPage() {
  useSyncModuleRoute("pk");
  return <PkPageContent />;
}
