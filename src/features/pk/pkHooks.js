import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { usePageApi } from "../../stores/usePageApi.js";
import { skillDefs } from "../../skills.js";
import { buildPkAnswerOptions } from "./pkAnswerOptions.js";

const BATTLE_SECONDS = 30;
const MATCHING_DELAY_MS = 900;
// 设计稿 pick() 在 600ms 反馈动效后 settle；对/错样式与 shake 在这窗口播放。
const PICK_FEEDBACK_MS = 650;
const BASE_RATING = 1200;
const WIN_RATING_DELTA = 18;
const LOSS_RATING_DELTA = 12;
const PK_ENTRY_PATTERN = /对手 (.+?)，比分 (\d+)-(\d+)/;

const OPPONENT_PALETTE = [
  { bg: "#fff3dd", fg: "#b3610a" },
  { bg: "#f6f0ff", fg: "#8a63e8" },
  { bg: "#eafaf3", fg: "#16879a" }
];

const DIFFICULTY_KEYS = {
  easy: "pkDifficultyEasy",
  medium: "pkDifficultyMedium",
  hard: "pkDifficultyHard"
};

const IDLE_VIEW = {
  opponentName: "Online Quant",
  userScore: 0,
  opponentScore: 0,
  problemText: "点击匹配开始。",
  feed: [],
  answer: ""
};

function opponentInitials(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "Q";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0] || ""}${words[1][0] || ""}`.toUpperCase();
}

function opponentPalette(name) {
  const text = String(name || "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash * 31 + text.charCodeAt(index)) % 997;
  }
  return OPPONENT_PALETTE[hash % OPPONENT_PALETTE.length];
}

function categoryLabel(category, isEnglish) {
  const def = skillDefs[category];
  if (!def) return category || "";
  // zh subtitle stays the default; EN prefers the English `name` since
  // skillDefs subtitles are Chinese-only.
  return isEnglish
    ? (def.name || def.subtitle || category || "")
    : (def.subtitle || def.name || category || "");
}

function entryCategoryLabel(gains, isEnglish) {
  const hit = Object.entries(gains || {}).find(([, xp]) => Number(xp) > 0);
  if (!hit) return "PK";
  return categoryLabel(hit[0], isEnglish) || "PK";
}

export function usePkPageModel() {
  const pageApi = usePageApi();
  const api = usePageApi("pk");
  const t = pageApi?.t || ((key) => key);
  const isEnglish = pageApi?.getLanguage?.() === "en";
  const userState = useUserStateStore((state) => state.value || {});
  const [view, setView] = useState(() => api?.getView?.() || { ...IDLE_VIEW });
  const [phase, setPhase] = useState("lobby");
  const [matching, setMatching] = useState(false);
  const [timeLeft, setTimeLeft] = useState(BATTLE_SECONDS);
  const [battleId, setBattleId] = useState(0);
  const [oppSubmitted, setOppSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [answerRevealed, setAnswerRevealed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [picked, setPicked] = useState(null);

  const viewRef = useRef(view);
  viewRef.current = view;
  const matchTimerRef = useRef(null);
  const pickTimerRef = useRef(null);
  const handleTimeoutRef = useRef(() => {});

  // --- Derived record from the real training log (entries written by the pk api).
  const stats = useMemo(() => {
    void revision;
    const entries = Array.isArray(userState.entries) ? userState.entries : [];
    const rows = [];
    let wins = 0;
    let losses = 0;
    let rating = BASE_RATING;
    entries.forEach((entry) => {
      const text = String(entry?.text || "");
      if (!text.startsWith("PK：")) return;
      const match = text.match(PK_ENTRY_PATTERN);
      if (!match) return;
      const myScore = Number(match[2]);
      const oppScore = Number(match[3]);
      const win = myScore >= oppScore;
      if (win) {
        wins += 1;
        rating += WIN_RATING_DELTA;
      } else {
        losses += 1;
        rating -= LOSS_RATING_DELTA;
      }
      rows.push({
        id: entry.id || text,
        win,
        opponent: match[1],
        meta: t("pkHistMeta", { category: entryCategoryLabel(entry.gains, isEnglish), you: myScore, opp: oppScore }),
        delta: win ? `+${WIN_RATING_DELTA}` : `−${LOSS_RATING_DELTA}`
      });
    });
    const total = wins + losses;
    return {
      rating,
      wins,
      losses,
      ratingText: rating.toLocaleString("en-US"),
      recordText: t("pkRecordText", { wins, losses }),
      winRateText: total ? `${Math.round((wins / total) * 100)}%` : "—",
      history: rows.reverse().slice(0, 6)
    };
  }, [userState.entries, revision, t, isEnglish]);

  // --- Battle countdown --------------------------------------------------
  useEffect(() => {
    if (phase !== "battle") return undefined;
    const startedAt = Date.now();
    setTimeLeft(BATTLE_SECONDS);
    const timer = setInterval(() => {
      const left = BATTLE_SECONDS - Math.floor((Date.now() - startedAt) / 1000);
      if (left <= 0) {
        clearInterval(timer);
        handleTimeoutRef.current?.();
      } else {
        setTimeLeft(left);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [phase, battleId]);

  // Presentational "对手已提交" status flip, like the design's opponent timer.
  useEffect(() => {
    if (phase !== "battle") return undefined;
    const delay = (8 + Math.random() * 14) * 1000;
    const timer = setTimeout(() => setOppSubmitted(true), delay);
    return () => clearTimeout(timer);
  }, [phase, battleId]);

  useEffect(() => () => {
    if (matchTimerRef.current) {
      clearTimeout(matchTimerRef.current);
      matchTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => {
    if (pickTimerRef.current) {
      clearTimeout(pickTimerRef.current);
      pickTimerRef.current = null;
    }
  }, []);

  const finalize = useCallback((nextView, { timeout = false } = {}) => {
    if (nextView?.session?.finished) {
      const win = Number(nextView.userScore) >= Number(nextView.opponentScore);
      setResult({
        win,
        timeout,
        recorded: true,
        userScore: nextView.userScore,
        opponentScore: nextView.opponentScore,
        ratingDelta: win ? `+${WIN_RATING_DELTA}` : `−${LOSS_RATING_DELTA}`
      });
    } else {
      setResult({
        win: false,
        timeout: true,
        recorded: false,
        userScore: 0,
        opponentScore: viewRef.current?.session?.opponentScore ?? "—",
        ratingDelta: "±0"
      });
    }
    setAnswerRevealed(false);
    setRevision((value) => value + 1);
    setPhase("reveal");
  }, []);

  const start = useCallback(() => {
    if (matchTimerRef.current) return;
    setMatching(true);
    matchTimerRef.current = setTimeout(() => {
      matchTimerRef.current = null;
      const next = api?.start?.();
      if (next) setView(next);
      setMatching(false);
      setRevision((value) => value + 1);
      if (next?.session) {
        setResult(null);
        setAnswerRevealed(false);
        setOppSubmitted(false);
        if (pickTimerRef.current) {
          clearTimeout(pickTimerRef.current);
          pickTimerRef.current = null;
        }
        setPicked(null);
        setTimeLeft(BATTLE_SECONDS);
        setBattleId((id) => id + 1);
        setPhase("battle");
      } else {
        setPhase("lobby");
      }
    }, MATCHING_DELAY_MS);
  }, [api]);

  const submit = useCallback((event) => {
    event?.preventDefault?.();
    const current = viewRef.current;
    const submittedAnswer = event?.currentTarget?.elements?.pkAnswer?.value ?? current.answer;
    const normalized = String(submittedAnswer || "").trim();
    if (!normalized || !current.session || current.session.finished) return;
    const next = api?.submit?.(normalized);
    if (next) setView(next);
    finalize(next, { timeout: false });
  }, [api, finalize]);

  const handleTimeout = useCallback(() => {
    const current = viewRef.current;
    const normalized = String(current.answer || "").trim();
    if (normalized && current.session && !current.session.finished) {
      const next = api?.submit?.(normalized);
      if (next) setView(next);
      finalize(next, { timeout: true });
    } else {
      finalize(null, { timeout: true });
    }
  }, [api, finalize]);

  // 数值题四选项：点选即提交（用户决策 #6）。提交仍走与作答框完全相同的
  // api.submit(值) 真实判分路径 —— 等价于把选项值填进 #pkAnswer 后交卷，
  // 只是先播 650ms 的对/错反馈（shake / pop）再结算。
  const pickOption = useCallback((option) => {
    if (!option || pickTimerRef.current) return;
    const current = viewRef.current;
    if (!current.session || current.session.finished) return;
    setPicked({ value: option.value, correct: Boolean(option.correct) });
    // 把选项值同步进真实作答字段：若反馈窗口内恰好倒计时归零，
    // handleTimeout 会用同一个值走同一条提交路径。
    const synced = api?.setAnswer?.(option.value);
    if (synced) setView(synced);
    pickTimerRef.current = setTimeout(() => {
      pickTimerRef.current = null;
      const latest = viewRef.current;
      if (!latest.session || latest.session.finished) return;
      const next = api?.submit?.(option.value);
      if (next) setView(next);
      finalize(next, { timeout: false });
    }, PICK_FEEDBACK_MS);
  }, [api, finalize]);

  useEffect(() => {
    handleTimeoutRef.current = handleTimeout;
  }, [handleTimeout]);

  const reveal = useCallback(() => {
    const next = api?.reveal?.();
    if (next) setView(next);
    setAnswerRevealed(true);
  }, [api]);

  const backToLobby = useCallback(() => {
    setPhase("lobby");
    setMatching(false);
    setResult(null);
    setAnswerRevealed(false);
    if (pickTimerRef.current) {
      clearTimeout(pickTimerRef.current);
      pickTimerRef.current = null;
    }
    setPicked(null);
  }, []);

  const setAnswer = useCallback((value) => {
    const next = api?.setAnswer?.(value);
    if (next) setView(next);
    else setView((prev) => ({ ...prev, answer: value }));
  }, [api]);

  // Lucide icons never initialised on first paint before — refresh per phase.
  useEffect(() => {
    pageApi?.refreshIcons?.({ root: document.querySelector(".pk-section") || document });
  }, [pageApi, phase, matching, answerRevealed]);

  // 数值题（答案可解析为数值）→ 四选项数组；文字题 → null（维持自由作答框）。
  // 选项值与顺序由题目 id 做确定性种子，重渲染/刷新不会变位。
  const answerOptions = useMemo(
    () => buildPkAnswerOptions(view.session?.problem),
    [view.session?.problem]
  );

  // --- Battle derived view ------------------------------------------------
  const battle = useMemo(() => {
    const problem = view.session?.problem;
    const difficultyKey = DIFFICULTY_KEYS[String(problem?.difficulty || "").toLowerCase()];
    const difficulty = difficultyKey ? t(difficultyKey) : (problem?.difficulty || "");
    const qMeta = problem
      ? [categoryLabel(problem.category, isEnglish), difficulty].filter(Boolean).join(" · ")
      : t("pkQMetaFallback");
    return {
      opponentName: view.opponentName || "Online Quant",
      initials: opponentInitials(view.opponentName),
      palette: opponentPalette(view.opponentName),
      qMeta,
      oppNote: t("pkOppMatchedSub", { status: oppSubmitted ? t("pkOppSubmitted") : t("pkOppThinking") })
    };
  }, [view.opponentName, view.session, oppSubmitted, t, isEnglish]);

  const outcome = useMemo(() => {
    const win = Boolean(result?.win);
    const timeoutNoAnswer = Boolean(result?.timeout && !result?.recorded);
    return {
      win,
      img: win
        ? "/assets/generated/playful-precision/mascot-trophy-v2.png"
        : "/assets/generated/playful-precision/mascot-oops.png",
      kicker: win ? "VICTORY" : "DEFEAT",
      title: win ? t("pkOutcomeWinTitle") : timeoutNoAnswer ? t("pkOutcomeTimeoutTitle") : t("pkOutcomeLoseTitle"),
      sub: win
        ? t("pkOutcomeWinSub")
        : timeoutNoAnswer
          ? t("pkOutcomeTimeoutSub")
          : t("pkOutcomeLoseSub"),
      deltaText: `Rating ${result?.ratingDelta || "±0"}`,
      userScore: result?.userScore ?? view.userScore,
      opponentScore: result?.opponentScore ?? view.opponentScore
    };
  }, [result, view.userScore, view.opponentScore, t]);

  return {
    view,
    phase,
    matching,
    timeLeft,
    timerPct: Math.max(0, Math.min(100, Math.round((timeLeft / BATTLE_SECONDS) * 100))),
    oppSubmitted,
    answerRevealed,
    stats,
    battle,
    outcome,
    answerOptions,
    picked,
    pickOption,
    start,
    submit,
    reveal,
    setAnswer,
    backToLobby,
    t,
    idlePlaceholder: IDLE_VIEW.problemText
  };
}
