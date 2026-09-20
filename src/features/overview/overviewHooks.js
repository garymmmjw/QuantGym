import { useEffect, useMemo } from "react";
import { useAuthStore, useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { skillDefs } from "../../skills.js";

const PROGRESS_LABELS_ZH = {
  all: "全部题库",
  "leetcode-hot": "LeetCode Hot 100",
  probabilityExpectation: "概率 / 期望",
  option: "期权 / 衍生品"
};

export function useOverviewPageModel() {
  const services = useAppServices();
  const pageApi = usePageApi();
  const api = usePageApi("overview");
  const user = useAuthStore(state => state.currentUser);
  const userState = useUserStateStore(state => state.value || {});
  const language = api?.getLanguage?.() || services.getLanguage?.() || "zh";
  const problemProgress = useMemo(() => {
    const items = api?.getProblemProgress?.() || [];
    if (language === "en") return items;
    return items.map(item => ({
      ...item,
      label: PROGRESS_LABELS_ZH[item.key] || skillDefs[item.key]?.subtitle || item.label
    }));
  }, [api, language, userState.problemStates, userState.problems]);

  useEffect(() => {
    // Keep Quanty's interaction, but the personal greeting is owned by React.
    api?.initHeroInteractions?.();
    pageApi?.refreshIcons?.({ root: document.querySelector(".overview-route-page") || document });
  }, [api, pageApi]);

  return {
    displayName: String(user?.name || user?.displayName || user?.username || "Quant").trim() || "Quant",
    problemProgress
  };
}
