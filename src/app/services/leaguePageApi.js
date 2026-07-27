import {
  DEFAULT_LEAGUE_TIER,
  LEAGUE_TIERS,
  SHOP_ITEMS,
  ensureEconomy,
  isItemOwned,
  isoWeekKey,
  purchaseShopItem
} from "../../modules/economy/index.js";
import { loadInterviewHistory } from "../../modules/interview/session.js";
import { localDateKey, timestampOrZero } from "../../lib/date.js";

/* Storage key defined in initRuntimeSlice (not exported there); value is stable. */
const INTERVIEW_HISTORY_STORAGE_KEY = "quantgym-interview-history-v1";
const FEEDBACK_DEDUP_PREFIX = "quantgym.feedback.v1";
const DAY_MS = 24 * 60 * 60 * 1000;

/* ---------------------------------------------------------------- *
 *  Sparring-partner roster (design list). These are disclosed bots: *
 *  their weekly points are a deterministic simulation, never data   *
 *  presented as real users. Disclosure lives in the rules card and  *
 *  on each row's hover title.                                       *
 * ---------------------------------------------------------------- */
const SPARRING_BOTS = [
  { id: "bot-ari", name: "Ari Chen", initials: "AC", city: "上海", cityEn: "Shanghai", pace: 940, bg: "#fff3dd", fg: "#b3610a" },
  { id: "bot-mina", name: "Mina Patel", initials: "MP", city: "伦敦", cityEn: "London", pace: 860, bg: "#eef0f4", fg: "#7a8090" },
  { id: "bot-sofia", name: "Sofia Kim", initials: "SK", city: "新加坡", cityEn: "Singapore", pace: 610, bg: "#eafaf3", fg: "#0f9d63" },
  { id: "bot-leo", name: "Leo Wang", initials: "LW", city: "香港", cityEn: "Hong Kong", pace: 585, bg: "#eef0ff", fg: "#5b5ff5" },
  { id: "bot-dan", name: "Dan Ito", initials: "DI", city: "东京", cityEn: "Tokyo", pace: 540, bg: "#fdeceb", fg: "#d0524b" },
  { id: "bot-noah", name: "Noah Fields", initials: "NF", city: "芝加哥", cityEn: "Chicago", pace: 512, bg: "#e7f2fb", fg: "#2f7fc0" },
  { id: "bot-elena", name: "Elena Ruiz", initials: "ER", city: "纽约", cityEn: "New York", pace: 476, bg: "#f6f0ff", fg: "#8a63e8" },
  { id: "bot-tom", name: "Tom Zhao", initials: "TZ", city: "北京", cityEn: "Beijing", pace: 402, bg: "#eafaf3", fg: "#16879a" },
  { id: "bot-kenji", name: "Kenji Sato", initials: "KS", city: "东京", cityEn: "Tokyo", pace: 355, bg: "#fff3dd", fg: "#c98a1e" }
];

const CLOUD_AVATAR_PALETTE = [
  { bg: "#fff3dd", fg: "#b3610a" },
  { bg: "#eef0ff", fg: "#5b5ff5" },
  { bg: "#eafaf3", fg: "#0f9d63" },
  { bg: "#f6f0ff", fg: "#8a63e8" },
  { bg: "#e7f2fb", fg: "#2f7fc0" },
  { bg: "#fdeceb", fg: "#d0524b" }
];

/* ------------------------- date helpers ------------------------- */

function mondayOf(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

export function mondayOfIsoWeek(weekKey = "") {
  const match = /^(\d{4})-W(\d{2})$/.exec(String(weekKey));
  if (!match) return null;
  const jan4 = new Date(Number(match[1]), 0, 4);
  const monday = mondayOf(jan4);
  monday.setDate(monday.getDate() + (Number(match[2]) - 1) * 7);
  return monday;
}

function isoWeekNumber(weekKey = "") {
  const match = /^(\d{4})-W(\d{2})$/.exec(String(weekKey));
  return match ? Number(match[2]) : 0;
}

/* --------------------- deterministic drift ---------------------- *
 * Not Math.random: bot points must stay identical for a given day  *
 * (design P1 "随日漂移，同一天内刷新不变").                          */

function hash32(text = "") {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededUnit(text = "") {
  let h = hash32(text);
  h = Math.imul(h ^ (h >>> 15), h | 1);
  h ^= h + Math.imul(h ^ (h >>> 7), h | 61);
  return ((h ^ (h >>> 14)) >>> 0) / 4294967296;
}

export function botDailyXp(botId, weekKey, dayIdx, pace) {
  if (seededUnit(`${botId}|${weekKey}|${dayIdx}|rest`) < 0.14) return 0; // rest day
  const u = seededUnit(`${botId}|${weekKey}|${dayIdx}|xp`);
  return Math.round((pace / 7) * (0.45 + 1.25 * u));
}

export function botWeekXp(botId, weekKey, throughDayIdx, pace) {
  let sum = 0;
  for (let day = 0; day <= Math.min(6, Math.max(0, throughDayIdx)); day += 1) {
    sum += botDailyXp(botId, weekKey, day, pace);
  }
  return sum;
}

/* ------------------------- tier helpers ------------------------- */

function tierIndexOf(tierId) {
  const index = LEAGUE_TIERS.findIndex((tier) => tier.id === tierId);
  return index >= 0 ? index : LEAGUE_TIERS.findIndex((tier) => tier.id === DEFAULT_LEAGUE_TIER);
}

function tierAt(index) {
  return LEAGUE_TIERS[Math.min(LEAGUE_TIERS.length - 1, Math.max(0, index))];
}

function tierShortUpper(label) {
  return String(label || "").replace(/\s*(?:联赛|League)\s*$/i, "").toUpperCase();
}

function badgeForTier(tierId) {
  if (tierId === "pm") return "/assets/generated/playful-precision/badge-top-rank.webp";
  if (tierId === "trader") return "/assets/generated/playful-precision/badge-gold.webp";
  return "/assets/generated/playful-precision/badge-level-1.webp";
}

/* --------------------------- factory ---------------------------- */

export function createLeaguePageApi(deps = {}) {
  function isEnglish() {
    return deps.getLanguage?.() === "en";
  }

  /* Translate with the app i18n; falls back to the key so the API never
     throws when running without deps.t (tests / isolated harness). */
  function t(key, params = {}) {
    return typeof deps.t === "function" ? deps.t(key, params) : key;
  }

  /* zh label ("Analyst 联赛") stays the visual authority; EN renders labelEn. */
  function tierLabel(tier) {
    return (isEnglish() && tier?.labelEn) || tier?.label || "";
  }

  function getState() {
    return deps.getState?.() || {};
  }

  function syncStore() {
    deps.userStateRuntime?.store?.setState?.(getState());
  }

  function getUserId() {
    return deps.getCurrentUser?.()?.id || deps.appState?.currentUser?.id || "anon";
  }

  /* Economy defaults come from the economy core (contract entry point). */
  function ensureLeagueSlice(state) {
    return ensureEconomy(state).league;
  }

  /* -------- real weekly XP (same source as overview weekly rhythm:
             entries aggregated per ISO week + this week's bonus XP) -------- */

  function entriesXpInRange(state, start, end) {
    const startTs = start.getTime();
    const endTs = end.getTime();
    return (Array.isArray(state.entries) ? state.entries : []).reduce((sum, entry) => {
      const ts = timestampOrZero(entry?.date);
      if (ts >= startTs && ts < endTs) return sum + Number(entry?.totalXp || 0);
      return sum;
    }, 0);
  }

  function bonusXpInRange(state, start, end) {
    // Preferred: dated bonus log kept by the economy layer, if present.
    const log = state?.economy?.bonusXpLog || state?.bonusXpLog;
    if (Array.isArray(log)) {
      return log.reduce((sum, item) => {
        const ts = timestampOrZero(typeof item === "string" ? item : item?.date);
        if (ts >= start.getTime() && ts < end.getTime()) {
          return sum + Number((typeof item === "object" && item?.xp) || 50);
        }
        return sum;
      }, 0);
    }
    // Fallback: today's real daily-clear marker (only when bonus XP was
    // actually granted — never fabricates points).
    if (Number(state?.bonusXp || 0) <= 0) return 0;
    const now = Date.now();
    if (now < start.getTime() || now >= end.getTime()) return 0;
    try {
      const key = `${FEEDBACK_DEDUP_PREFIX}:${getUserId()}:${localDateKey()}:daily-tasks-clear`;
      return window.localStorage.getItem(key) === "1" ? 50 : 0;
    } catch {
      return 0;
    }
  }

  function userWeekXp(state, weekStart) {
    const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
    return entriesXpInRange(state, weekStart, weekEnd) + bonusXpInRange(state, weekStart, weekEnd);
  }

  /* -------------------------- cohort ------------------------------ */

  function buildCloudCohort() {
    try {
      if (!deps.canUseCloud?.()) return null;
      const snapshot = deps.getCloudSnapshot?.() || {};
      if (!Number(snapshot.rowCount || 0)) return null;
      const settings = deps.normalizeLeaderboardSettings?.(deps.getRawLeaderboardSettings?.()) || {};
      const rows = deps.getLeaderboardRowsForSettings?.({ ...settings, scope: "global", metric: "overall" }, 60) || [];
      const cloudRows = rows.filter((row) => row?.source === "cloud" && !row.isCurrent && row.id);
      if (cloudRows.length < 3) return null;
      const myPlace = rows.findIndex((row) => row.isCurrent);
      const anchor = myPlace >= 0 ? myPlace : Math.floor(cloudRows.length / 2);
      const sorted = [...cloudRows].sort(
        (a, b) => Math.abs((a.place || 0) - anchor) - Math.abs((b.place || 0) - anchor)
      );
      const members = sorted.slice(0, 9).map((row, index) => {
        const palette = CLOUD_AVATAR_PALETTE[hash32(row.id) % CLOUD_AVATAR_PALETTE.length];
        return {
          id: `cloud-${row.id}`,
          name: row.name,
          initials: deps.getInitials?.(row.name) || String(row.name || "Q").slice(0, 2).toUpperCase(),
          city: String(row.locationLabel || "").split(" · ")[0] || t("leagueCityFallback"),
          pace: 260 + Math.round(Number(row.score || 0) * 8),
          bg: palette.bg,
          fg: palette.fg,
          cloud: true,
          key: `cloud-${row.id}-${index}`
        };
      });
      return members.length >= 3 ? members : null;
    } catch {
      return null;
    }
  }

  function buildCohort() {
    const cloudMembers = buildCloudCohort();
    if (cloudMembers && cloudMembers.length) {
      // Top up with sparring bots so the group always holds 10 seats.
      const padded = [...cloudMembers];
      for (const bot of SPARRING_BOTS) {
        if (padded.length >= 9) break;
        padded.push({ ...bot, bot: true });
      }
      return { source: "cloud", members: padded.slice(0, 9) };
    }
    return { source: "bots", members: SPARRING_BOTS.map((bot) => ({ ...bot, bot: true })) };
  }

  function memberWeekXp(member, weekKey, throughDayIdx) {
    return botWeekXp(member.id, weekKey, throughDayIdx, member.pace);
  }

  /* ----------------------- standings model ------------------------ */

  function buildStandings(weekKey, throughDayIdx, myXp, options = {}) {
    const cohort = options.cohort || buildCohort();
    const streak = Number(deps.getStreak?.() || 0);
    const me = {
      id: "me",
      name: t("leagueMeName", { name: deps.getCurrentUserName?.() || "Quant" }),
      initials: t("leagueMeInitials"),
      sub: t("leagueMeSub", {
        region: deps.getCurrentUser?.()?.region || t("leagueMeRegionFallback"),
        streak
      }),
      xp: Math.max(0, Math.round(myXp)),
      me: true
    };
    const en = isEnglish();
    const rows = cohort.members.map((member) => ({
      id: member.id,
      name: member.name,
      initials: member.initials,
      sub: member.cloud
        ? t("leagueMemberCloudSub", { city: member.city })
        : t("leagueMemberBotSub", { city: (en && member.cityEn) || member.city }),
      xp: memberWeekXp(member, weekKey, throughDayIdx),
      bg: member.bg,
      fg: member.fg,
      bot: !member.cloud,
      cloud: Boolean(member.cloud)
    }));
    rows.push(me);
    rows.sort((a, b) => b.xp - a.xp || Number(Boolean(b.me)) - Number(Boolean(a.me)));
    const myRank = rows.findIndex((row) => row.me) + 1;
    return { rows, myRank, cohortSource: cohort.source };
  }

  /* ------------------------- settlement ---------------------------
     Runs on first visit after Sunday 24:00 (i.e. the stored weekKey
     is older than the current ISO week). Top 3 promote, bottom 2
     demote (clamped), promotion bonus +100 coins (+150 for 1st). */

  function settleIfDue(now = new Date()) {
    const state = getState();
    if (!state || typeof state !== "object") return null;
    const league = ensureLeagueSlice(state);
    const currentKey = isoWeekKey(now);
    if (!league.weekKey) {
      league.weekKey = currentKey;
      deps.saveState?.();
      syncStore();
      return null;
    }
    if (league.weekKey === currentKey) return null;
    const settledKey = league.weekKey;
    const weekStart = mondayOfIsoWeek(settledKey);
    if (!weekStart) {
      league.weekKey = currentKey;
      deps.saveState?.();
      syncStore();
      return null;
    }

    const myXp = userWeekXp(state, weekStart);
    const { rows, myRank } = buildStandings(settledKey, 6, myXp);
    const tierIdx = tierIndexOf(league.tier);
    const previousTier = tierAt(tierIdx);
    let movement = "stay";
    let nextIdx = tierIdx;
    let coinsAwarded = 0;
    if (myRank <= 3) {
      movement = tierIdx < LEAGUE_TIERS.length - 1 ? "up" : "stay-top";
      nextIdx = Math.min(LEAGUE_TIERS.length - 1, tierIdx + 1);
      coinsAwarded = myRank === 1 ? 150 : 100;
    } else if (myRank >= rows.length - 1) {
      movement = tierIdx > 0 ? "down" : "stay-bottom";
      nextIdx = Math.max(0, tierIdx - 1);
    }
    const nextTier = tierAt(nextIdx);

    if (coinsAwarded > 0) {
      state.economy.coins = Math.max(0, Math.round(Number(state.economy.coins || 0) + coinsAwarded));
    }
    /* history movement is contract-constrained to "up" | "down" | "stay" */
    const historyMovement = movement === "up" ? "up" : movement === "down" ? "down" : "stay";
    league.history = [
      ...league.history,
      { weekKey: settledKey, tier: previousTier.id, rank: myRank, movement: historyMovement }
    ].slice(-52);
    league.tier = nextTier.id;
    league.weekKey = currentKey;
    deps.saveState?.();
    syncStore();

    return {
      settledWeekKey: settledKey,
      rank: myRank,
      movement,
      coinsAwarded,
      fromTier: previousTier,
      toTier: nextTier,
      weekXp: myXp
    };
  }

  /* ----------------------- learning map --------------------------- */

  /* Compatibility fallback: deps.getCatalogProblems may be the pure
     (problems, isCatalogProblem) helper which yields [] with no args. */
  function getLeagueCatalogProblems() {
    const catalogProblems = deps.getCatalogProblems?.();
    if (Array.isArray(catalogProblems) && catalogProblems.length) return catalogProblems;
    const stateProblems = getState().problems;
    if (!Array.isArray(stateProblems) || !stateProblems.length) return [];
    const isCatalogProblem = deps.isCatalogProblem || (() => true);
    return stateProblems.filter((problem) => {
      try {
        return isCatalogProblem(problem);
      } catch {
        return true;
      }
    });
  }

  /* Count real completions through the bound personal-state controller
     (deps.getProblemCompletionCount may be the pure 2-arg helper). */
  function countCompleted(problems) {
    const getPersonal = deps.getProblemPersonalState;
    if (typeof getPersonal === "function") {
      return problems.reduce((sum, problem) => {
        try {
          return sum + (getPersonal(problem?.id)?.completed ? 1 : 0);
        } catch {
          return sum;
        }
      }, 0);
    }
    return Number(deps.getProblemCompletionCount?.(problems) || 0);
  }

  function solvedCountForCategory(problems, categoryKey) {
    const normalizeCategory = deps.normalizeCategory || ((value) => value);
    const list = problems.filter((problem) => normalizeCategory(problem?.category) === categoryKey);
    return {
      done: countCompleted(list),
      total: list.length
    };
  }

  function getMapModel() {
    const state = getState();
    const allProblems = getLeagueCatalogProblems();
    const pe = solvedCountForCategory(allProblems, "probabilityExpectation").done;
    const st = solvedCountForCategory(allProblems, "statistics").done;
    const op = solvedCountForCategory(allProblems, "option").done;
    const totalSolved = countCompleted(allProblems);
    const mm = Array.isArray(state.mentalMathRecords) ? state.mentalMathRecords.length : 0;
    let history = [];
    try {
      history = loadInterviewHistory(INTERVIEW_HISTORY_STORAGE_KEY);
    } catch {
      history = [];
    }
    const interviews = history.length;
    const liveInterviews = history.filter((item) => item?.mode === "live").length;

    const unitProblems = t("leagueUnitProblems");
    const unitRounds = t("leagueUnitRounds");
    const unitTimes = t("leagueUnitTimes");
    const defs = [
      { id: "prob-basics", name: t("leagueMapProbBasics"), value: pe, goal: 12, unit: unitProblems, doneSub: t("leagueMapDoneProblems", { n: 12 }), path: "/problems", topic: "probabilityExpectation" },
      { id: "expectation", name: t("leagueMapExpectation"), value: pe, goal: 22, unit: unitProblems, doneSub: t("leagueMapDoneProblems", { n: 22 }), path: "/problems", topic: "probabilityExpectation" },
      { id: "mental-sprint", name: t("leagueMapMentalSprint"), value: mm, goal: 5, unit: unitRounds, doneSub: t("leagueMapDoneMilestone"), path: "/tools" },
      { id: "stochastic", name: t("leagueMapStochastic"), value: st, goal: 10, unit: unitProblems, doneSub: t("leagueMapDoneProblems", { n: 10 }), path: "/problems", topic: "statistics", currentSub: t("leagueMapCurrentWeak") },
      { id: "options-intro", name: t("leagueMapOptionsIntro"), value: op, goal: 8, unit: unitProblems, doneSub: t("leagueMapDoneProblems", { n: 8 }), lockedSub: t("leagueMapLockedHull"), path: "/problems", topic: "option" },
      { id: "combinatorics", name: t("leagueMapCombinatorics"), value: totalSolved, goal: 80, unit: unitProblems, doneSub: t("leagueMapDoneProblems", { n: 80 }), lockedSub: t("leagueMapLockedProblems", { n: 80 }), path: "/problems" },
      { id: "interview-live", name: t("leagueMapInterviewLive"), value: interviews, goal: 1, unit: unitTimes, doneSub: t("leagueMapDoneMilestone"), lockedSub: t("leagueMapLockedMilestoneReward"), path: "/interview" },
      { id: "boss-final", name: t("leagueMapBossFinal"), value: liveInterviews, goal: 1, unit: unitTimes, doneSub: t("leagueMapDoneInterviewer"), lockedSub: t("leagueMapLockedInterviewer"), path: "/interview" }
    ];

    let currentAssigned = false;
    const nodes = defs.map((def, index) => {
      const done = def.value >= def.goal;
      let status = "locked";
      if (done) {
        status = "done";
      } else if (!currentAssigned) {
        status = "current";
        currentAssigned = true;
      }
      const progress = `${Math.min(def.value, def.goal)}/${def.goal} ${def.unit}`;
      const sub = status === "done"
        ? def.doneSub
        : status === "current"
          ? (def.currentSub || t("leagueMapProgressDoing", { progress }))
          : (def.lockedSub || t("leagueMapProgressLocked", { progress }));
      return {
        id: def.id,
        index,
        name: def.name,
        sub,
        status,
        mark: status === "done" ? "✓" : status === "current" ? String(index + 1) : "·",
        path: def.path,
        topic: def.topic || "",
        hasLink: index < defs.length - 1
      };
    });

    const currentNode = nodes.find((node) => node.status === "current") || null;
    return {
      nodes,
      doneCount: nodes.filter((node) => node.status === "done").length,
      total: nodes.length,
      currentName: currentNode?.name || "",
      currentId: currentNode?.id || ""
    };
  }

  /* --------------------------- shop -------------------------------- */

  function getShopModel() {
    const state = getState();
    const coins = Math.max(0, Math.round(Number(state?.economy?.coins || 0)));
    const freezeCards = Math.max(0, Math.round(Number(state?.economy?.freezeCards || 0)));
    const items = SHOP_ITEMS.map((item) => {
      const isFreeze = Boolean(item.stackable);
      let owned = false;
      try {
        owned = !isFreeze && isItemOwned(state, item.id);
      } catch {
        owned = false;
      }
      const affordable = coins >= item.price;
      const en = isEnglish();
      const name = (en && item.nameEn) || item.name;
      const desc = (en && item.descEn) || item.desc;
      return {
        id: item.id,
        name,
        desc: isFreeze && freezeCards > 0
          ? t("leagueShopStackedDesc", { desc, held: freezeCards })
          : desc,
        img: item.img,
        price: item.price,
        owned,
        affordable,
        held: isFreeze ? freezeCards : 0,
        btnLabel: owned
          ? t("leagueShopOwned")
          : isFreeze && freezeCards > 0
            ? t("leagueShopBtnRestock", { price: item.price })
            : t("leagueShopBtnBuy", { price: item.price }),
        btnState: owned ? "owned" : affordable ? "buy" : "poor"
      };
    });
    return { coins, coinsFmt: coins.toLocaleString("en-US"), freezeCards, items };
  }

  function buyItem(itemId) {
    const state = getState();
    const item = SHOP_ITEMS.find((entry) => entry.id === itemId) || null;
    if (!item) return { ok: false, reason: "unknown", item: null };
    const coinsBefore = Math.max(0, Math.round(Number(state?.economy?.coins || 0)));
    try {
      const result = purchaseShopItem(state, itemId) || {};
      if (result.ok) {
        deps.saveState?.();
        syncStore();
      }
      const reason = result.ok
        ? ""
        : result.reason === "already-owned"
          ? "owned"
          : result.reason === "insufficient-coins"
            ? "insufficient"
            : result.reason || "rejected";
      return {
        ok: Boolean(result.ok),
        reason,
        item,
        coins: Math.max(0, Math.round(Number(state?.economy?.coins || 0))),
        held: Math.max(0, Math.round(Number(state?.economy?.freezeCards || 0))),
        missing: Math.max(0, Math.round(Number(result.missingCoins ?? Math.max(0, item.price - coinsBefore))))
      };
    } catch {
      // Defensive: if the economy core ever throws, degrade without mutating.
      return {
        ok: false,
        reason: "unavailable",
        item,
        coins: coinsBefore,
        held: Math.max(0, Math.round(Number(state?.economy?.freezeCards || 0))),
        missing: Math.max(0, item.price - coinsBefore)
      };
    }
  }

  /* --------------------------- view -------------------------------- */

  function getView(now = new Date()) {
    const state = getState();
    const league = ensureLeagueSlice(state);
    const weekKey = isoWeekKey(now);
    const dayIdx = (now.getDay() + 6) % 7; // Mon=0 … Sun=6
    const weekStart = mondayOf(now);
    const myXp = userWeekXp(state, weekStart);
    const cohort = buildCohort();
    const { rows, myRank, cohortSource } = buildStandings(weekKey, dayIdx, myXp, { cohort });

    const tierIdx = tierIndexOf(league.tier);
    const tier = tierAt(tierIdx);
    const nextTier = tierAt(tierIdx + 1);
    const prevTier = tierAt(tierIdx - 1);
    const atTop = tierIdx >= LEAGUE_TIERS.length - 1;

    const standings = rows.map((row, index) => {
      const rank = index + 1;
      const zone = rank <= 3 ? "up" : rank >= rows.length - 1 ? "down" : "safe";
      return {
        key: row.id,
        rank,
        name: row.name,
        sub: row.sub,
        xp: row.xp,
        xpFmt: row.xp.toLocaleString("en-US"),
        initials: row.initials,
        me: Boolean(row.me),
        bot: Boolean(row.bot),
        bg: row.bg,
        fg: row.fg,
        zone,
        zoneLabel: zone === "up" ? t("leagueZoneUp") : zone === "down" ? t("leagueZoneDown") : "",
        cutTop: rank === 1,
        cutBottom: rank === rows.length - 1,
        rankTone: rank === 1 ? "gold" : rank <= 3 ? "up" : rank >= rows.length - 1 ? "down" : "muted"
      };
    });

    const ahead = rows[myRank - 2];
    const gapToAhead = ahead ? Math.max(1, ahead.xp - myXp + 1) : 0;
    const gapToPromo = rows[2] ? Math.max(1, rows[2].xp - myXp + 1) : 0;
    const raceLine = myRank <= 3
      ? myRank === 1
        ? atTop
          ? t("leagueRaceLeadTop")
          : t("leagueRaceLeadPromo", { tier: tierLabel(nextTier) })
        : t("leagueRaceInPromo", { rank: myRank, gap: gapToAhead })
      : t("leagueRaceBelowPromo", { rank: myRank, gap: gapToPromo });

    const disclosure = cohortSource === "cloud"
      ? t("leagueDisclosureCloud")
      : t("leagueDisclosureBots");

    return {
      seasonNo: isoWeekNumber(weekKey),
      weekKey,
      tier,
      tierLabel: tierLabel(tier),
      groupTitle: t("leagueGroupTitleA", { tier: tierLabel(tier) }),
      badge: badgeForTier(tier.id),
      nextTierUpper: tierShortUpper(tierLabel(nextTier)),
      prevTierUpper: tierShortUpper(tierLabel(prevTier)),
      nextTierLabel: tierLabel(nextTier),
      prevTierLabel: tierLabel(prevTier),
      countdown: t("leagueCountdownDays", { days: 7 - dayIdx }),
      myRank,
      myZone: myRank <= 3 ? "up" : "down",
      myWeekXp: myXp,
      myWeekXpFmt: Math.round(myXp).toLocaleString("en-US"),
      standings,
      raceLine,
      disclosure,
      cohortSource,
      rules: [
        { tone: "green", num: 1, text: t("leagueRule1") },
        {
          tone: "brand",
          num: 2,
          text: atTop
            ? t("leagueRule2Top", { tier: tierLabel(tier), prevTier: tierLabel(prevTier) })
            : t("leagueRule2", { tier: tierLabel(nextTier), prevTier: tierLabel(prevTier) })
        },
        { tone: "amber", num: 3, text: t("leagueRule3") }
      ],
      map: getMapModel(),
      shop: getShopModel(),
      history: Array.isArray(league.history) ? [...league.history] : []
    };
  }

  return {
    getView,
    settleIfDue,
    buyItem,
    getShopModel,
    getMapModel,
    tiers: LEAGUE_TIERS,
    shopItems: SHOP_ITEMS
  };
}
