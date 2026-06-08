import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { PokerPageContent } from "../features/poker/PokerPageContent.jsx";

export function PokerPage() {
  useSyncModuleRoute("poker");
  return <PokerPageContent />;
}
