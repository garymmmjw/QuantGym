import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { LibraryPageContent } from "../features/library/LibraryPageContent.jsx";

export function LibraryPage() {
  useSyncModuleRoute("library");
  return <LibraryPageContent />;
}
