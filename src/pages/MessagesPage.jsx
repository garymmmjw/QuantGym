import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { MessagesPageContent } from "../features/messages/MessagesPageContent.jsx";

export function MessagesPage() {
  useSyncModuleRoute("messages");
  return <MessagesPageContent />;
}
