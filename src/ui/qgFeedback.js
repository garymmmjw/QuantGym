/* Playful Precision global feedback layer: design-styled toast + celebration modal.
   Visuals ported from the design mockup (ui-design/qg-state.js); styling lives in
   src/styles/playful-precision-feedback.css.
   Only real store events trigger feedback:
   - streak check-in / freeze toasts: called from src/ui/streakController.js (markActivityCheckIn chain)
   - level up: userStateStore subscription + getLevelInfo(getEffectiveTotalXp) (skills XP + bonusXp)
   - training completion (+XP / +coins): userStateStore subscription, entry + economy.coins deltas
   - daily plan tasks all done: userStateStore subscription + getPrepDailyTasks,
     awards a REAL +50 bonus XP through the app's save path (state.bonusXp)
   Per-day dedup is kept in localStorage keyed by user id + date. */

import { escapeHtml } from "../lib/text.js";
import { localDateKey, timestampOrZero } from "../lib/date.js";
import { getLevelInfo } from "../modules/skills/data.js";
import { getEffectiveTotalXp, normalizeBonusXp, ensureEconomy } from "../modules/economy/index.js";
import { getPrepDailyTasks, normalizePrepPlan } from "../modules/plan/data.js";

const ASSET_BASE = "/assets/generated/playful-precision/";

export const QG_FEEDBACK_ASSETS = {
  fire: `${ASSET_BASE}mascot-fire-v2.png`,
  rewardFire: `${ASSET_BASE}reward-fire.webp`,
  levelUp: `${ASSET_BASE}mascot-levelup.png`,
  trophy: `${ASSET_BASE}mascot-trophy-v2.png`,
  oops: `${ASSET_BASE}mascot-oops.png`
};

const DAILY_ALL_CLEAR_BONUS_XP = 50;

const DEDUP_PREFIX = "quantgym.feedback.v1";
const CONFETTI_COLORS = ["#5b5ff5", "#ff9f2e", "#2ec38a", "#ff7a3d", "#8a7bff", "#ffd479"];

/* ---------- toast engine ---------- */

let toastBox = null;

function ensureToastBox() {
  if (toastBox && document.body && document.body.contains(toastBox)) return toastBox;
  toastBox = document.createElement("div");
  toastBox.className = "qg-fb-toasts";
  toastBox.setAttribute("role", "status");
  toastBox.setAttribute("aria-live", "polite");
  document.body.appendChild(toastBox);
  return toastBox;
}

export function qgToast(message, opts = {}) {
  if (typeof document === "undefined" || !document.body) return null;
  const box = ensureToastBox();
  const el = document.createElement("div");
  el.className = "qg-fb-toast";
  const icon = opts.img
    ? `<img class="qg-fb-toast-img" src="${escapeHtml(opts.img)}" alt="">`
    : `<span class="qg-fb-toast-glyph${opts.tone === "gold" ? " is-gold" : ""}" aria-hidden="true">${escapeHtml(opts.emoji || "✓")}</span>`;
  const xp = Number(opts.xp);
  el.innerHTML = `${icon}<span class="qg-fb-toast-body"><strong class="qg-fb-toast-title">${escapeHtml(message)}</strong>${
    opts.sub ? `<small class="qg-fb-toast-sub">${escapeHtml(opts.sub)}</small>` : ""
  }</span>${Number.isFinite(xp) && xp > 0 ? `<span class="qg-fb-toast-xp">+${Math.round(xp)} XP</span>` : ""}`;
  let killed = false;
  const kill = () => {
    if (killed) return;
    killed = true;
    el.classList.add("is-leaving");
    window.setTimeout(() => el.remove(), 240);
  };
  el.addEventListener("click", kill);
  box.appendChild(el);
  window.setTimeout(kill, Math.max(1200, Number(opts.ms) || 3400));
  return { dismiss: kill, element: el };
}

/* ---------- celebration modal (queued: one overlay at a time) ---------- */

let activeOverlay = null;
const celebrateQueue = [];

function buildConfetti() {
  let html = "";
  for (let index = 0; index < 18; index += 1) {
    const style = [
      `top:${(-10 - Math.random() * 40).toFixed(1)}px`,
      `left:${(6 + Math.random() * 88).toFixed(1)}%`,
      `width:${(6 + Math.random() * 6).toFixed(1)}px`,
      `height:${(10 + Math.random() * 8).toFixed(1)}px`,
      `background:${CONFETTI_COLORS[index % CONFETTI_COLORS.length]}`,
      `animation-duration:${(1.6 + Math.random() * 1.4).toFixed(2)}s`,
      `animation-delay:${(Math.random() * 0.8).toFixed(2)}s`
    ].join(";");
    html += `<i class="qg-fb-confetti" style="${style}" aria-hidden="true"></i>`;
  }
  return html;
}

export function qgCelebrate(opts = {}) {
  if (typeof document === "undefined" || !document.body) return null;
  if (activeOverlay) {
    celebrateQueue.push(opts);
    return null;
  }
  const wrap = document.createElement("div");
  wrap.className = "qg-fb-celebrate";
  wrap.setAttribute("role", "dialog");
  wrap.setAttribute("aria-modal", "true");
  wrap.setAttribute("aria-label", String(opts.title || "Celebration"));
  wrap.innerHTML = `
    <div class="qg-fb-celebrate-card">
      ${buildConfetti()}
      <img class="qg-fb-celebrate-img" src="${escapeHtml(opts.img || QG_FEEDBACK_ASSETS.levelUp)}" alt="">
      <span class="qg-fb-celebrate-kicker">${escapeHtml(opts.kicker || "LEVEL UP")}</span>
      <strong class="qg-fb-celebrate-title">${escapeHtml(opts.title || "升级了！")}</strong>
      <span class="qg-fb-celebrate-sub">${escapeHtml(opts.sub || "")}</span>
      <button type="button" class="qg-fb-celebrate-btn">${escapeHtml(opts.cta || "继续训练")}</button>
    </div>`;
  let closed = false;
  const onKey = (event) => {
    if (event.key === "Escape") close();
  };
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", onKey, true);
    wrap.classList.add("is-closing");
    window.setTimeout(() => {
      wrap.remove();
      if (activeOverlay === wrap) activeOverlay = null;
      const next = celebrateQueue.shift();
      if (next) qgCelebrate(next);
    }, 220);
  }
  wrap.addEventListener("click", (event) => {
    if (event.target === wrap || event.target.closest?.(".qg-fb-celebrate-btn")) close();
  });
  document.addEventListener("keydown", onKey, true);
  document.body.appendChild(wrap);
  activeOverlay = wrap;
  wrap.querySelector(".qg-fb-celebrate-btn")?.focus?.({ preventScroll: true });
  return { close, element: wrap };
}

/* ---------- streak check-in toast (design copy, real streak count) ---------- */

export function showStreakCheckInToast(streak, opts = {}) {
  const count = Math.max(1, Math.round(Number(streak) || 1));
  const isZh = String(opts.locale || "zh").toLowerCase().startsWith("zh");
  return qgToast(
    isZh ? `连胜 +1 · 已连续 ${count} 天` : `Streak +1 · ${count} day${count > 1 ? "s" : ""} in a row`,
    {
      img: QG_FEEDBACK_ASSETS.fire,
      sub: isZh ? "保持节奏，别断签" : "Keep the rhythm going",
      ms: 4200
    }
  );
}

/* ---------- streak freeze / break toasts (design copy, real freeze results) ---------- */

export function showStreakFreezeToast(freeze = {}, opts = {}) {
  const used = Math.max(1, Math.round(Number(freeze.usedCards) || 1));
  const streak = Math.max(1, Math.round(Number(opts.streak) || 1));
  const isZh = String(opts.locale || "zh").toLowerCase().startsWith("zh");
  return qgToast(isZh ? "连胜冻结卡生效" : "Streak freeze kicked in", {
    img: QG_FEEDBACK_ASSETS.rewardFire,
    sub: isZh
      ? `抵挡 ${used} 天断签 · 连胜 ${streak} 天保住了`
      : `Bridged ${used} missed day${used > 1 ? "s" : ""} · ${streak}-day streak saved`,
    ms: 4800
  });
}

export function showStreakBrokenToast(freeze = {}, opts = {}) {
  const isZh = String(opts.locale || "zh").toLowerCase().startsWith("zh");
  return qgToast(isZh ? "连胜中断了" : "Streak broken", {
    img: QG_FEEDBACK_ASSETS.oops,
    sub: isZh
      ? "从今天重新出发 · 冻结卡可自动防断签"
      : "Fresh start today · freeze cards can bridge missed days",
    ms: 4800
  });
}

/* ---------- per-day dedup (localStorage, keyed by user id + date) ---------- */

function dedupKey(userId, event) {
  return `${DEDUP_PREFIX}:${userId || "anon"}:${localDateKey()}:${event}`;
}

function wasShown(key) {
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function markShown(key) {
  try {
    window.localStorage.setItem(key, "1");
  } catch {
    /* storage unavailable: fall back to in-session dedup only */
  }
}

function pruneStaleDedupKeys() {
  try {
    const today = `:${localDateKey()}:`;
    const stale = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key && key.startsWith(`${DEDUP_PREFIX}:`) && !key.includes(today)) stale.push(key);
    }
    stale.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    /* ignore */
  }
}

/* ---------- real event subscriptions ---------- */

function readLevel(value) {
  // Effective XP = skills XP + bonusXp (daily all-clear rewards), per economy design §2.
  return getLevelInfo(getEffectiveTotalXp(value || {})).level;
}

function readEntriesCount(value) {
  return Array.isArray(value?.entries) ? value.entries.length : 0;
}

function readCoins(value) {
  return Math.max(0, Math.round(Number(value?.economy?.coins) || 0));
}

function readTodayTasks(value) {
  const plan = normalizePrepPlan(value?.prepPlan, { localDateKey });
  if (!plan) return null;
  const tasks = getPrepDailyTasks(plan, { localDateKey });
  if (!tasks.length) return null;
  return { total: tasks.length, done: tasks.filter((task) => task.done).length };
}

let activeDispose = null;

export function disposeQgFeedback() {
  activeDispose?.();
}

export function initQgFeedback(appServices = {}) {
  disposeQgFeedback();
  const userStateStore = appServices?.stores?.userStateStore;
  if (!userStateStore?.subscribe || !userStateStore?.getState) return () => {};

  // Reuse the app's i18n so celebration/toast copy follows the active language.
  const t = typeof appServices?.t === "function"
    ? appServices.t
    : (key) => key;

  const getUserId = () =>
    appServices?.stores?.authStore?.getState?.()?.currentUser?.id
    || appServices?.appState?.currentUser?.id
    || "anon";

  pruneStaleDedupKeys();

  // Real +50 bonus XP for the daily all-clear, booked through the app's save
  // path so it persists + cloud-syncs like any other state change.
  function awardDailyAllClearBonus(taskCount, userId) {
    window.setTimeout(() => {
      if (getUserId() !== userId) return;
      const stateValue = appServices?.userState?.value
        || appServices?.userStateRuntime?.state?.value
        || userStateStore.getState()?.value;
      const saveState = appServices?.saveState
        || appServices?.pageApi?.saveState
        || appServices?.userStateRuntime?.save;
      if (stateValue) {
        stateValue.bonusXp = normalizeBonusXp(stateValue.bonusXp) + DAILY_ALL_CLEAR_BONUS_XP;
        ensureEconomy(stateValue);
        if (!Array.isArray(stateValue.economy.bonusXpLog)) stateValue.economy.bonusXpLog = [];
        // Anchor to local noon of the local day so the week bucket matches the
        // local-day semantics used by streak/freeze/dedup (avoids a UTC/local
        // off-by-one at the day boundary that would mis-bucket the league week).
        stateValue.economy.bonusXpLog.push({ date: `${localDateKey()}T12:00:00`, xp: DAILY_ALL_CLEAR_BONUS_XP });
      }
      // Celebrate before saving: the save re-notifies the store and a level-up
      // (effective XP crossed a threshold) would otherwise jump the queue.
      qgCelebrate({
        kicker: "DAILY GOAL CLEAR",
        title: t("fbDailyDoneTitle", { count: taskCount }),
        sub: t("fbDailyDoneSub"),
        img: QG_FEEDBACK_ASSETS.fire,
        cta: t("fbDailyDoneCta")
      });
      if (stateValue && typeof saveState === "function") saveState();
    }, 250);
  }

  let trackedUserId = getUserId();
  let prevLevel = readLevel(userStateStore.getState()?.value);
  let prevTasks = readTodayTasks(userStateStore.getState()?.value);
  let prevEntriesCount = readEntriesCount(userStateStore.getState()?.value);
  let prevCoins = readCoins(userStateStore.getState()?.value);

  const unsubscribe = userStateStore.subscribe((state) => {
    const value = state?.value || {};
    const userId = getUserId();
    const level = readLevel(value);
    const tasks = readTodayTasks(value);
    const entriesCount = readEntriesCount(value);
    const coins = readCoins(value);

    if (userId !== trackedUserId) {
      // Account switched under the same subscription: re-baseline silently.
      trackedUserId = userId;
      prevLevel = level;
      prevTasks = tasks;
      prevEntriesCount = entriesCount;
      prevCoins = coins;
      return;
    }

    // Training completion: new real entries → "+N XP · +M 币" toast.
    // Bulk growth (cloud merges/imports) and stale entries never toast.
    if (entriesCount > prevEntriesCount && entriesCount - prevEntriesCount <= 3) {
      const added = (Array.isArray(value.entries) ? value.entries : []).slice(prevEntriesCount);
      const xpDelta = added.reduce((sum, entry) => sum + Math.max(0, Number(entry?.totalXp) || 0), 0);
      const coinsDelta = Math.max(0, coins - prevCoins);
      const isFresh = added.every((entry) => Date.now() - timestampOrZero(entry?.date) < 120000);
      if (xpDelta > 0 && isFresh) {
        // Design toast pattern: title + "+N XP" badge (xp param) + coins sub → 「+N XP · +M 币」.
        qgToast(t("fbTrainDoneTitle"), {
          xp: xpDelta,
          sub: coinsDelta > 0 ? t("fbTrainDoneCoins", { coins: coinsDelta }) : t("fbTrainDoneXp"),
          emoji: "✓",
          ms: 3600
        });
      }
    }

    if (level > prevLevel && prevLevel > 0) {
      const key = dedupKey(userId, `level-up:${level}`);
      if (!wasShown(key)) {
        markShown(key);
        qgCelebrate({
          kicker: "LEVEL UP",
          title: t("fbLevelUpTitle"),
          sub: `Lv.${prevLevel} → Lv.${level}`,
          cta: t("fbLevelUpCta"),
          img: QG_FEEDBACK_ASSETS.levelUp
        });
      }
    }

    const hadUnfinished = Boolean(prevTasks && prevTasks.done < prevTasks.total);
    const allDone = Boolean(tasks && tasks.total > 0 && tasks.done >= tasks.total);
    if (hadUnfinished && allDone) {
      const key = dedupKey(userId, "daily-tasks-clear");
      if (!wasShown(key)) {
        markShown(key);
        awardDailyAllClearBonus(tasks.total, userId);
      }
    }

    prevLevel = level;
    prevTasks = tasks;
    prevEntriesCount = entriesCount;
    prevCoins = coins;
  });

  const dispose = () => {
    if (activeDispose === dispose) activeDispose = null;
    unsubscribe?.();
  };
  activeDispose = dispose;
  return dispose;
}
