import {
  hasCheckedInOnDate,
  markActivityCheckIn
} from '../state/activity.js';
import {
  animateStreakCount,
  createStreakUiState,
  queueCheckInCelebration,
  renderStreakCalendar,
  setStreakPanelOpen,
  showCheckInToast,
  updateCheckInPill
} from './streak.js';

export function createStreakController(deps = {}) {
  const uiState = createStreakUiState(deps.initialState);
  const getElements = () => deps.elements || {};
  const getState = () => deps.getState?.() || {};
  const getCurrentUser = () => deps.getCurrentUser?.() || null;
  const nowIso = () => deps.nowIso?.() || new Date().toISOString();

  function togglePanel() {
    setPanelOpen(uiState.toggleOpen());
  }

  function setPanelOpen(open) {
    uiState.setOpen(open);
    setStreakPanelOpen(getElements(), uiState.isOpen(), {
      text: deps.t,
      renderCalendar: renderCalendar
    });
  }

  function markActivity() {
    const elements = getElements();
    const state = getState();
    const displayedStreak = Number(elements.streakCount?.textContent || elements.commandStreakCount?.textContent || state.streakCount || 0);
    const result = markActivityCheckIn(state, {
      enabled: Boolean(getCurrentUser()),
      displayedStreak,
      getStreak: deps.getStreak
    });
    if (result) uiState.setFreshKey(result.day);
    return result;
  }

  function persistActivity(options = {}) {
    const currentUser = getCurrentUser();
    if (!currentUser) return;
    const checkInResult = markActivity();
    if (!checkInResult) return;
    const state = getState();
    state.updatedAt = nowIso();
    deps.writeUserState?.(currentUser.id, state, {
      serializeState: deps.serializeState,
      userStateKey: deps.userStateKey
    });
    if (options.sync !== false) deps.queueCloudSync?.("state");
    queueCelebration(checkInResult);
  }

  function queueCelebration(checkInResult) {
    queueCheckInCelebration(checkInResult, {
      windowRef: deps.windowRef,
      updateCheckInPill: updatePill,
      renderCalendar,
      updateSidebarCount(next) {
        const elements = getElements();
        if (elements.streakCount) elements.streakCount.textContent = String(next);
      },
      animateCount,
      showToast
    });
  }

  function hasCheckedInToday() {
    return hasCheckedInOnDate(getState().checkIns);
  }

  function updatePill() {
    updateCheckInPill(getElements(), {
      checked: hasCheckedInToday(),
      open: uiState.isOpen(),
      text: deps.t,
      renderCalendar
    });
  }

  function renderCalendar() {
    const state = getState();
    renderStreakCalendar(getElements(), {
      entries: state.entries,
      checkIns: state.checkIns,
      freshKey: uiState.getFreshKey(),
      streak: deps.getStreak?.(),
      checked: hasCheckedInToday(),
      locale: deps.getLocale?.(),
      text: deps.t
    });
  }

  function showToast(streak) {
    showCheckInToast(streak, {
      text: deps.t,
      escapeHtml: deps.escapeHtml,
      getTimer: () => uiState.getToastTimer(),
      setTimer: (timer) => {
        uiState.setToastTimer(timer);
      }
    });
  }

  function animateCount(previous, next) {
    animateStreakCount(getElements(), previous, next);
  }

  return {
    animateCount,
    hasCheckedInToday,
    markActivity,
    persistActivity,
    queueCelebration,
    renderCalendar,
    setPanelOpen,
    showToast,
    togglePanel,
    updatePill
  };
}
