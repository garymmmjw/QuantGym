import { useAuthStore, useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { Link } from "react-router-dom";
import { StagePanel } from "./StagePanel.jsx";
import { useCareerStages } from "./useCareerStages.js";
import { useStagePractice } from "./useStagePractice.js";

function AccountCareerStage({ ownerId, namespace, legacyState }) {
  const { store } = useCareerStages({ ownerId, namespace });
  const practice = useStagePractice({ ownerId, namespace, legacyState });
  return <StagePanel stageStore={store} practice={practice} variant="overview" headerActions={<Link className="career-button" to="/tracker">我的投递 ↗</Link>} />;
}

export function OverviewCareerStage() {
  const ownerId = useAuthStore((state) => state.currentUser?.id);
  const legacyState = useUserStateStore((state) => state.value);
  if (!ownerId) return null;

  const namespace = new URLSearchParams(globalThis.location?.search || "").has("qa") ? "qa" : "";
  return <AccountCareerStage key={`${ownerId}:${namespace}`} ownerId={ownerId} namespace={namespace} legacyState={legacyState} />;
}
