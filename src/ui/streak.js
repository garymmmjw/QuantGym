import { dayKey, shiftDate } from '../lib/date.js';
import { showStreakCheckInToast } from './qgFeedback.js';

export function createStreakUiState(initialState = {}) {
  let open = Boolean(initialState.open);
  let freshKey = String(initialState.freshKey || "");
  let toastTimer = initialState.toastTimer || null;
  return {
    isOpen() {
      return open;
    },
    setOpen(value) {
      open = Boolean(value);
      return open;
    },
    toggleOpen() {
      open = !open;
      return open;
    },
    getFreshKey() {
      return freshKey;
    },
    setFreshKey(value = "") {
      freshKey = String(value || "");
      return freshKey;
    },
    getToastTimer() {
      return toastTimer;
    },
    setToastTimer(timer) {
      toastTimer = timer || null;
      return toastTimer;
    }
  };
}

export function setStreakPanelOpen(elements = {}, open = false, options = {}) {
  const {
    text = (key) => key,
    renderCalendar = () => {}
  } = options;
  const isOpen = Boolean(open);
  elements.streakWidget?.classList.toggle("is-open", isOpen);
  elements.checkInPill?.setAttribute("aria-expanded", String(isOpen));
  elements.checkInPill?.setAttribute("aria-label", text(isOpen ? "closeStreakCalendar" : "openStreakCalendar"));
  elements.checkInPill?.setAttribute("title", text(isOpen ? "closeStreakCalendar" : "openStreakCalendar"));
  const actions = elements.checkInPill?.closest(".app-command-actions");
  actions?.classList.toggle("is-streak-open", isOpen);
  if (elements.streakCalendarPanel) elements.streakCalendarPanel.hidden = !isOpen;
  if (isOpen) renderCalendar();
}

export function updateCheckInPill(elements = {}, options = {}) {
  const {
    checked = false,
    open = false,
    streak,
    text = (key) => key,
    renderCalendar = () => {}
  } = options;
  const pill = elements.checkInPill;
  if (!pill) return;
  pill.classList.toggle("is-checked", checked);
  pill.disabled = false;
  pill.setAttribute("aria-disabled", "false");
  pill.setAttribute("aria-label", text(open ? "closeStreakCalendar" : "openStreakCalendar"));
  pill.setAttribute("title", text(open ? "closeStreakCalendar" : "openStreakCalendar"));
  const label = pill.querySelector("small");
  if (label) label.textContent = checked ? text("checkInDone") : text("commandStreakLabel");
  if (elements.commandStreakCount && streak !== undefined) {
    elements.commandStreakCount.textContent = String(Math.max(0, Number(streak || 0)));
  }
  renderCalendar();
}

export function renderStreakCalendar(elements = {}, options = {}) {
  const {
    entries = [],
    checkIns = [],
    freshKey = "",
    streak = 0,
    checked = false,
    locale = "zh-CN",
    text = (key) => key,
    frozenDays = []
  } = options;
  const frozenSet = new Set(Array.isArray(frozenDays) ? frozenDays : []);
  if (!elements.streakCalendarGrid || !elements.streakCalendarWeekdays) return;
  const daySet = getActivityDaySet(entries, checkIns);
  const days = buildStreakCalendarDays();
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  elements.streakCalendarWeekdays.innerHTML = "";
  days.slice(0, 7).forEach(({ date }) => {
    const label = document.createElement("span");
    label.textContent = formatter.format(date).replace("周", "");
    elements.streakCalendarWeekdays.appendChild(label);
  });

  elements.streakCalendarGrid.innerHTML = "";
  days.forEach(({ date, key }) => {
    const frozen = frozenSet.has(key);
    const lit = daySet.has(key) || frozen;
    const beforeLit = daySet.has(dayKey(shiftDate(date, -1))) || frozenSet.has(dayKey(shiftDate(date, -1)));
    const afterLit = daySet.has(dayKey(shiftDate(date, 1))) || frozenSet.has(dayKey(shiftDate(date, 1)));
    const cell = document.createElement("span");
    cell.className = [
      "streak-day",
      lit ? "is-lit" : "",
      frozen ? "is-frozen" : "",
      lit && beforeLit ? "connect-left" : "",
      lit && afterLit ? "connect-right" : "",
      key === dayKey(new Date()) ? "is-today" : "",
      key === freshKey ? "is-fresh" : ""
    ].filter(Boolean).join(" ");
    cell.title = frozen ? `${key} · 冻结卡抵挡日` : key;
    cell.innerHTML = `
      <span class="streak-day-number">${date.getDate()}</span>
      <span class="streak-day-fire" aria-hidden="true">${frozen ? "❄" : ""}</span>
    `;
    elements.streakCalendarGrid.appendChild(cell);
  });

  if (elements.streakPanelCount) elements.streakPanelCount.textContent = String(streak);
  const kicker = elements.streakCalendarPanel?.querySelector(".streak-panel-kicker");
  if (kicker) kicker.textContent = text("streakPanelTitle");
  if (elements.streakPanelMessage) {
    elements.streakPanelMessage.textContent = checked ? text("streakPanelReady") : text("streakPanelPrompt");
  }
}

export function getActivityDaySet(entries = [], checkIns = []) {
  return new Set([
    ...(Array.isArray(entries) ? entries : []).map((entry) => dayKey(entry.date)),
    ...(Array.isArray(checkIns) ? checkIns : []).map((item) => dayKey(item.date))
  ].filter(Boolean));
}

export function buildStreakCalendarDays(today = new Date()) {
  const start = shiftDate(today, -13);
  return Array.from({ length: 14 }, (_, index) => {
    const date = shiftDate(start, index);
    return { date, key: dayKey(date) };
  });
}

export function showCheckInToast(streak, options = {}) {
  const {
    getTimer = () => null,
    setTimer = () => {},
    locale
  } = options;
  // Visual upgrade: delegate to the Playful Precision feedback layer
  // (design-styled toast with mascot-fire-v2 and the real streak count).
  const timer = getTimer();
  if (timer) window.clearTimeout(timer);
  setTimer(null);
  showStreakCheckInToast(streak, { locale });
}

export function animateStreakCount(elements = {}, previous = 0, next = 0) {
  const pill = elements.checkInPill;
  const countNode = elements.commandStreakCount;
  if (!pill || !countNode) return;
  pill.classList.remove("is-burning");
  pill.offsetWidth;
  pill.classList.add("is-burning");
  const burst = document.createElement("span");
  burst.className = "streak-burst";
  burst.textContent = "+1";
  pill.appendChild(burst);
  const start = performance.now();
  const duration = 520;
  const animate = (time) => {
    const progress = Math.min(1, (time - start) / duration);
    const value = Math.round(previous + (next - previous) * progress);
    countNode.textContent = value;
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      countNode.textContent = next;
      window.setTimeout(() => {
        pill.classList.remove("is-burning");
        burst.remove();
      }, 520);
    }
  };
  requestAnimationFrame(animate);
}

export function queueCheckInCelebration(checkInResult, options = {}) {
  if (!checkInResult) return false;
  const {
    windowRef = globalThis.window,
    updateCheckInPill = () => {},
    renderCalendar = () => {},
    updateSidebarCount = () => {},
    animateCount = () => {},
    showToast = () => {}
  } = options;
  windowRef?.requestAnimationFrame?.(() => {
    updateCheckInPill();
    renderCalendar();
    updateSidebarCount(checkInResult.next);
    animateCount(checkInResult.previous, checkInResult.next);
    showToast(checkInResult.next);
  });
  return true;
}
