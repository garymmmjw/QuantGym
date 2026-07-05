import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { LeaguePageContent } from "../features/league/LeaguePageContent.jsx";

export function LeaguePage() {
  useSyncModuleRoute("league");
  return <LeaguePageContent />;
}
