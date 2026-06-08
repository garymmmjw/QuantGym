import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { NewsPageContent } from "../features/news/NewsPageContent.jsx";

export function NewsPage() {
  useSyncModuleRoute("news");
  return <NewsPageContent />;
}
