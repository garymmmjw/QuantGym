import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { usePageApi } from "../../stores/usePageApi.js";
import { qgToast } from "../../ui/qgFeedback.js";

const ASSET_BASE = "/assets/generated/playful-precision/";

function buildEmptyView(t, isEnglish) {
  const analystLabel = isEnglish ? "Analyst League" : "Analyst 联赛";
  return {
    seasonNo: 0,
    tierLabel: analystLabel,
    groupTitle: t("leagueGroupTitleA", { tier: analystLabel }),
    badge: `${ASSET_BASE}badge-level-1.webp`,
    nextTierUpper: "TRADER",
    prevTierUpper: "INTERN",
    countdown: t("leagueCountdownDays", { days: "—" }),
    myRank: 0,
    myZone: "down",
    myWeekXpFmt: "0",
    standings: [],
    raceLine: t("leagueRaceEmpty"),
    disclosure: t("leagueDisclosureBots"),
    rules: [],
    map: { nodes: [], doneCount: 0, total: 8, currentName: "" },
    shop: { coins: 0, coinsFmt: "0", freezeCards: 0, items: [] }
  };
}

export function useLeaguePageModel() {
  const api = usePageApi("league");
  const pageApi = usePageApi();
  const navigate = useNavigate();
  const t = pageApi?.t || ((key) => key);
  const isEnglish = pageApi?.getLanguage?.() === "en";
  const tierLabel = useCallback(
    (tier) => (isEnglish && tier?.labelEn) || tier?.label || "",
    [isEnglish]
  );
  const userState = useUserStateStore((state) => state.value || null);
  const [revision, setRevision] = useState(0);
  const settledRef = useRef(false);

  /* Weekly settlement: first visit after Sunday 24:00 settles last week
     (promotion / demotion + coin reward), then re-reads the view. */
  useEffect(() => {
    if (settledRef.current || !api?.settleIfDue) return;
    settledRef.current = true;
    let settlement = null;
    try {
      settlement = api.settleIfDue();
    } catch {
      settlement = null;
    }
    if (!settlement) return;
    setRevision((value) => value + 1);
    if (settlement.movement === "up") {
      qgToast(t("leaguePromotedTitle", { tier: tierLabel(settlement.toTier) }), {
        img: `${ASSET_BASE}mascot-trophy-v2.png`,
        sub: t("leagueSettleSubReward", { rank: settlement.rank, coins: settlement.coinsAwarded }),
        ms: 5200
      });
    } else if (settlement.movement === "stay-top") {
      qgToast(t("leagueDefendedTitle"), {
        img: `${ASSET_BASE}mascot-trophy-v2.png`,
        sub: t("leagueSettleSubReward", { rank: settlement.rank, coins: settlement.coinsAwarded }),
        ms: 5200
      });
    } else if (settlement.movement === "down") {
      qgToast(t("leagueDemotedTitle", { tier: tierLabel(settlement.toTier) }), {
        img: `${ASSET_BASE}mascot-oops.png`,
        sub: t("leagueSettleSubDemote", { rank: settlement.rank }),
        ms: 5200
      });
    } else {
      qgToast(t("leagueNewSeasonTitle"), {
        img: `${ASSET_BASE}badge-level-1.webp`,
        sub: t("leagueSettleSubNew", { rank: settlement.rank }),
        ms: 4200
      });
    }
  }, [api, t, tierLabel]);

  const view = useMemo(() => {
    void userState;
    void revision;
    try {
      return api?.getView?.() || buildEmptyView(t, isEnglish);
    } catch {
      return buildEmptyView(t, isEnglish);
    }
  }, [api, userState, revision, t, isEnglish]);

  const goTrain = useCallback(() => {
    navigate("/tools");
  }, [navigate]);

  const openNode = useCallback((node) => {
    if (!node) return;
    if (node.status === "current") {
      if (node.topic) {
        try {
          pageApi?.problems?.applyFilterAction?.({ type: "theme", value: node.topic });
        } catch {
          /* filter pre-selection is best-effort */
        }
      }
      navigate(node.path || "/problems");
      return;
    }
    if (node.status === "done") {
      qgToast(t("leagueNodeCleared"), { ms: 1600 });
      return;
    }
    qgToast(t("leagueNodeLockedTitle", { name: view.map.currentName || t("leagueNodeCurrentFallback") }), {
      sub: t("leagueNodeLockedSub"),
      ms: 2400
    });
  }, [navigate, pageApi, view.map.currentName, t]);

  const buyItem = useCallback((itemId) => {
    const result = api?.buyItem?.(itemId);
    if (!result) return;
    const { item } = result;
    if (result.ok) {
      const isFreeze = Boolean(item?.stackable) || itemId === "freeze";
      const itemName = (isEnglish && item?.nameEn) || item?.name || "";
      qgToast(t("leagueBuyOkTitle", { name: itemName }), {
        img: item?.img,
        sub: isFreeze
          ? t("leagueBuyOkStackedSub", { held: result.held })
          : t("leagueBuyOkCoinsSub", { coins: result.coins.toLocaleString("en-US") }),
        ms: 3200
      });
    } else if (result.reason === "owned") {
      qgToast(t("leagueBuyOwnedTitle"), { ms: 1800 });
    } else if (result.reason === "insufficient") {
      qgToast(t("leagueBuyPoorTitle"), {
        tone: "gold",
        emoji: "!",
        sub: t("leagueBuyPoorSub", { missing: result.missing }),
        ms: 2600
      });
    } else {
      qgToast(t("leagueBuyUnavailableTitle"), {
        emoji: "…",
        sub: t("leagueBuyUnavailableSub"),
        ms: 2400
      });
    }
    setRevision((value) => value + 1);
  }, [api, t, isEnglish]);

  return { view, goTrain, openNode, buyItem, t };
}
