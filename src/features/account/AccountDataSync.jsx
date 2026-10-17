import { useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/AppServicesContext.jsx";
import { useCareerStages } from "../careerStages/useCareerStages.js";
import { ProblemNotesMigration } from '../problems/ProblemAccountSync.jsx';

function AccountWorkspace({ ownerId }) {
  useCareerStages({ ownerId });
  return <ProblemNotesMigration ownerId={ownerId} />;
}

// Keep the same account writer active across routes, including legacy Tracker
// migration. Preview fixtures never read or upload the real account workspace.
export function AccountDataSync() {
  const user = useAuthStore(state => state.currentUser);
  const location = useLocation();
  if (!user?.id || user.id === "guest" || new URLSearchParams(location.search).has("qa")) return null;
  return <AccountWorkspace key={user.id} ownerId={user.id} />;
}
