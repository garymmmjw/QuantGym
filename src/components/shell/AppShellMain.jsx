import { useEffect, useMemo, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { setStreakPanelOpen as setStreakPanelOpenView } from "../../ui/streak.js";
import { getLevelInfo } from "../../modules/skills/data.js";
import { getEffectiveTotalXp } from "../../modules/economy/index.js";
import { CommandPalette } from "./CommandPalette.jsx";
import { OnboardingTour } from "./OnboardingTour.jsx";
import { RouteProgressBar } from "./RouteProgressBar.jsx";
import { QuantyImage } from "@/components/common/QuantyImage.jsx";

const THEME_STORAGE_KEY = "quantgym.ui.theme.v1";

const SHEET_NAV_GROUPS = [
  {
    label: "成长",
    items: [
      ["overview", "总览", "layout-dashboard"],
      ["plan", "计划", "calendar-check-2"],
      ["skills", "能力值", "radar"],
      ["league", "联赛", "trophy"]
    ]
  },
  {
    label: "训练",
    items: [
      ["interview", "模拟面试", "messages-square"],
      ["problems", "题目", "library-big"],
      ["tools", "Mental Math", "brain"],
      ["poker", "Poker", "spade"],
      ["pk", "PK 对战", "zap"],
      ["experiences", "面经", "notebook-pen"]
    ]
  },
  {
    label: "社群",
    items: [
      ["news", "新闻", "newspaper"],
      ["community", "论坛", "message-circle-heart"],
      ["messages", "聊天", "message-square-text"],
      ["network", "人脉", "network"]
    ]
  },
  {
    label: "求职",
    items: [
      ["resume", "简历", "file-user"],
      ["jobs", "求职", "briefcase-business"],
      ["companies", "公司", "building-2"]
    ]
  },
  {
    label: "资源",
    items: [
      ["courses", "课程", "video"],
      ["library", "书城", "book-open"],
      ["memory", "资料笔记", "archive"]
    ]
  },
  {
    label: "我的",
    items: [
      ["account", "账户", "user"],
      ["settings", "设置", "settings"]
    ]
  }
];

const BOTTOM_TABS = [
  ["overview", "总览", "layout-dashboard"],
  ["plan", "计划", "calendar-check-2"],
  ["problems", "题目", "library-big"],
  ["interview", "面试", "messages-square"]
];

function getStoredTheme() {
  try {
    return globalThis.localStorage?.getItem(THEME_STORAGE_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function AppShellMain() {
  const appServices = useAppServices();
  const shellServices = appServices.services || {};
  const shellServicesRef = useRef(shellServices);
  const [theme, setTheme] = useState(getStoredTheme);
  const [notifOpen, setNotifOpen] = useState(false);
  const [navSheetOpen, setNavSheetOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const overviewApi = usePageApi("overview");
  const planApi = usePageApi("plan");
  const newsState = useUserStateStore((state) => state.value?.news);
  const prepPlanState = useUserStateStore((state) => state.value?.prepPlan);
  const studyPlanState = useUserStateStore((state) => state.value?.studyPlan);
  const skillsState = useUserStateStore((state) => state.value?.skills);
  const bonusXpState = useUserStateStore((state) => state.value?.bonusXp);

  const levelInfo = useMemo(
    () => getLevelInfo(getEffectiveTotalXp({ skills: skillsState || {}, bonusXp: bonusXpState })),
    [skillsState, bonusXpState]
  );

  useEffect(() => {
    shellServicesRef.current = shellServices;
  }, [shellServices]);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.setAttribute("data-qg-theme", "dark");
    } else {
      root.removeAttribute("data-qg-theme");
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
    window.requestAnimationFrame(() => globalThis.lucide?.createIcons?.());
  }, [theme]);

  const getShellServices = () => {
    shellServicesRef.current.rebindElements?.();
    return shellServicesRef.current;
  };

  const applyStreakPanelOpen = (open) => {
    const text = appServices.t || ((key) => key);
    setStreakPanelOpenView({
      streakWidget: document.getElementById("streakWidget"),
      checkInPill: document.getElementById("checkInPill"),
      streakCalendarPanel: document.getElementById("streakCalendarPanel")
    }, open, { text });
  };

  const toggleStreakPanel = (event) => {
    event.stopPropagation();
    const shell = getShellServices();
    const panel = document.getElementById("streakCalendarPanel");
    const nextOpen = Boolean(panel?.hidden);
    shell.setStreakPanelOpen?.(nextOpen);
    if (panel && panel.hidden === nextOpen) applyStreakPanelOpen(nextOpen);
    if (nextOpen) {
      window.setTimeout(() => {
        if (document.getElementById("streakCalendarPanel")?.hidden) applyStreakPanelOpen(true);
      }, 0);
    }
  };

  const toggleTheme = () => {
    setTheme((current) => current === "dark" ? "light" : "dark");
  };

  useEffect(() => {
    const closeStreakPanel = (event) => {
      if (event.target?.closest?.(".streak-widget")) return;
      const shell = getShellServices();
      shell.setStreakPanelOpen?.(false);
      if (!document.getElementById("streakCalendarPanel")?.hidden) applyStreakPanelOpen(false);
    };
    document.addEventListener("click", closeStreakPanel);
    return () => document.removeEventListener("click", closeStreakPanel);
  }, []);

  useEffect(() => {
    const closeNotifPanel = (event) => {
      if (event.target?.closest?.(".qg-notif")) return;
      setNotifOpen(false);
    };
    document.addEventListener("click", closeNotifPanel);
    return () => document.removeEventListener("click", closeNotifPanel);
  }, []);

  useEffect(() => {
    const onKeydown = (event) => {
      if ((event.metaKey || event.ctrlKey) && String(event.key).toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
        return;
      }
      if (event.key === "Escape") {
        setNotifOpen(false);
        setNavSheetOpen(false);
      }
    };
    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, []);

  useEffect(() => {
    const resetDesktopRailScroll = () => {
      if (window.matchMedia("(max-width: 860px)").matches) return;
      const rail = document.getElementById("moduleNav");
      if (rail) rail.scrollTop = 0;
    };
    resetDesktopRailScroll();
    const firstTimer = window.setTimeout(resetDesktopRailScroll, 120);
    const secondTimer = window.setTimeout(resetDesktopRailScroll, 420);
    return () => {
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);
    };
  }, []);

  const wireItems = useMemo(() => {
    void newsState;
    try {
      return overviewApi?.getTickerNews?.() || [];
    } catch {
      return [];
    }
  }, [overviewApi, newsState]);

  const helperProgress = useMemo(() => {
    void prepPlanState;
    void studyPlanState;
    try {
      const view = planApi?.getViewModel?.();
      if (view?.mode === "dashboard") {
        return {
          total: view.tasks?.length || 0,
          done: view.doneCount || 0
        };
      }
    } catch {}
    try {
      const today = overviewApi?.getTodayPlan?.();
      if (today?.items?.length) {
        return {
          total: today.items.length,
          done: today.items.filter((item) => item?.done).length
        };
      }
    } catch {}
    return { total: 0, done: 0 };
  }, [planApi, overviewApi, prepPlanState, studyPlanState]);

  const helperLeft = Math.max(0, helperProgress.total - helperProgress.done);
  const helperPct = helperProgress.total
    ? Math.round((helperProgress.done / helperProgress.total) * 100)
    : 0;
  const helperText = !helperProgress.total
    ? "生成今日计划，开始训练"
    : (helperLeft === 0 ? "今日目标已全部达成" : `离今日目标还差 ${helperLeft} 项`);

  const openWireNews = (id) => {
    const targetId = String(id || "").trim();
    const shell = getShellServices();
    if (targetId) {
      window.__quantgymPendingNewsFocusId = targetId;
    }
    shell.switchModule?.("news");
    if (targetId) {
      const dispatchFocus = () => window.dispatchEvent(new CustomEvent("quantgym:news-focus", {
        detail: { id: targetId }
      }));
      window.setTimeout(dispatchFocus, 180);
      window.setTimeout(dispatchFocus, 700);
      window.setTimeout(dispatchFocus, 1400);
    }
  };

  const closeNavSheet = () => setNavSheetOpen(false);

  return (
    <main id="appShell" className="hidden qg-app-shell">
          <nav className="module-nav qg-shell-rail" id="moduleNav" aria-label="模块导航" data-i18n-aria-label="moduleNavLabel">
            <div className="sidebar-brand qg-shell-brand" aria-label="QuantGym">
              <img src="/assets/generated/playful-precision/brand-q-mark.webp" alt="" />
              <strong>Quant<span className="qg-brand-accent">Gym</span></strong>
            </div>
            <div className="module-nav-group" aria-label="成长" data-i18n-aria-label="navGrowth">
              <button className="module-nav-trigger" type="button" aria-haspopup="true">
                <span data-i18n="navGrowth">成长</span>
              </button>
              <div className="module-nav-menu">
                <button className="module-tab active" type="button" data-module-tab="overview">
                  <i data-lucide="layout-dashboard"></i>
                  总览
                </button>
                <button className="module-tab" type="button" data-module-tab="plan">
                  <i data-lucide="calendar-check-2"></i>
                  计划
                </button>
                <button className="module-tab" type="button" data-module-tab="skills">
                  <i data-lucide="radar"></i>
                  能力值
                </button>
                <button className="module-tab" type="button" data-module-tab="league">
                  <i data-lucide="trophy"></i>
                  联赛
                </button>
              </div>
            </div>
            <div className="module-nav-group" aria-label="训练" data-i18n-aria-label="navTraining">
              <button className="module-nav-trigger" type="button" aria-haspopup="true">
                <span data-i18n="navTraining">训练</span>
              </button>
              <div className="module-nav-menu wide">
                <button className="module-tab" type="button" data-module-tab="interview">
                  <i data-lucide="messages-square"></i>
                  模拟面试
                </button>
                <button className="module-tab" type="button" data-module-tab="problems">
                  <i data-lucide="library-big"></i>
                  题目
                </button>
                <button className="module-tab" type="button" data-module-tab="tools">
                  <i data-lucide="brain"></i>
                  Mental Math
                </button>
                <button className="module-tab" type="button" data-module-tab="poker">
                  <i data-lucide="spade"></i>
                  Poker
                </button>
                <button className="module-tab" type="button" data-module-tab="pk">
                  <i data-lucide="zap"></i>
                  PK 对战
                </button>
                <button className="module-tab" type="button" data-module-tab="experiences">
                  <i data-lucide="notebook-pen"></i>
                  面经
                </button>
              </div>
            </div>
            <div className="module-nav-group" aria-label="社群" data-i18n-aria-label="navSocial">
              <button className="module-nav-trigger" type="button" aria-haspopup="true">
                <span data-i18n="navSocial">社群</span>
              </button>
              <div className="module-nav-menu">
                <button className="module-tab" type="button" data-module-tab="news">
                  <i data-lucide="newspaper"></i>
                  新闻
                </button>
                <button className="module-tab" type="button" data-module-tab="community">
                  <i data-lucide="message-circle-heart"></i>
                  论坛
                </button>
                <button className="module-tab" type="button" data-module-tab="messages">
                  <i data-lucide="message-square-text"></i>
                  聊天
                </button>
                <button className="module-tab" type="button" data-module-tab="network">
                  <i data-lucide="network"></i>
                  人脉
                </button>
              </div>
            </div>
            <div className="module-nav-group" aria-label="求职" data-i18n-aria-label="navCareer">
              <button className="module-nav-trigger" type="button" aria-haspopup="true">
                <span data-i18n="navCareer">求职</span>
              </button>
              <div className="module-nav-menu">
                <button className="module-tab" type="button" data-module-tab="resume">
                  <i data-lucide="file-user"></i>
                  简历
                </button>
                <button className="module-tab" type="button" data-module-tab="jobs">
                  <i data-lucide="briefcase-business"></i>
                  求职
                </button>
                <button className="module-tab" type="button" data-module-tab="companies">
                  <i data-lucide="building-2"></i>
                  公司
                </button>
              </div>
            </div>
            <div className="module-nav-group" aria-label="资源" data-i18n-aria-label="navResources">
              <button className="module-nav-trigger" type="button" aria-haspopup="true">
                <span data-i18n="navResources">资源</span>
              </button>
              <div className="module-nav-menu">
                <button className="module-tab" type="button" data-module-tab="courses">
                  <i data-lucide="video"></i>
                  课程
                </button>
                <button className="module-tab" type="button" data-module-tab="library">
                  <i data-lucide="book-open"></i>
                  书城
                </button>
                <button className="module-tab" type="button" data-module-tab="memory">
                  <i data-lucide="archive"></i>
                  资料笔记
                </button>
              </div>
            </div>
            <div className="module-nav-group" aria-label="我的" data-i18n-aria-label="navMine">
              <button className="module-nav-trigger" type="button" aria-haspopup="true">
                <span data-i18n="navMine">我的</span>
              </button>
              <div className="module-nav-menu">
                <button className="module-tab" type="button" data-module-tab="account">
                  <i data-lucide="user"></i>
                  账户
                </button>
                <button className="module-tab" type="button" data-module-tab="settings">
                  <i data-lucide="settings"></i>
                  设置
                </button>
              </div>
            </div>
            <aside className="sidebar-helper qg-nav-helper" aria-label="Today guide">
              <div className="qg-nav-helper-row">
                <QuantyImage asset="focused" size="avatar" />
                <div className="qg-nav-helper-copy">
                  <strong>今日向导</strong>
                  <span>{helperText}</span>
                </div>
              </div>
              <div className="qg-nav-helper-track" aria-hidden="true">
                <div className="qg-nav-helper-fill" style={{ width: `${Math.max(helperPct, helperProgress.total ? 4 : 0)}%` }} />
              </div>
            </aside>
          </nav>

          <section className="app-command-bar qg-command-bar" aria-label="全局搜索和状态" data-i18n-aria-label="commandBarLabel">
            <button className="qg-mobile-menu-btn" type="button" aria-label="打开模块菜单" title="打开模块菜单" onClick={() => setNavSheetOpen(true)}>
              <i data-lucide="menu"></i>
            </button>
            <span className="qg-command-brand" aria-hidden="true">
              <img src="/assets/generated/playful-precision/brand-q-mark.webp" alt="" />
              <strong>Quant<span className="qg-brand-accent">Gym</span></strong>
            </span>
            <button className="sidebar-toggle-button" id="sidebarToggleBtn" type="button" aria-controls="moduleNav" aria-expanded="true" aria-label="隐藏模块列表" title="隐藏模块列表">
              <i data-lucide="panel-left-close"></i>
            </button>
            <div
              className="app-search qg-command-search"
              role="search"
              onMouseDown={(event) => {
                if (event.button !== 0) return;
                if (event.target?.closest?.("#globalSearchResults")) return;
                event.preventDefault();
                setPaletteOpen(true);
              }}
            >
              <i data-lucide="search"></i>
              <input id="globalSearchInput" type="search" placeholder="搜索题目、公司、课程，或跳转模块…" aria-label="Search topics" />
              <span className="qg-kbd" aria-hidden="true">⌘K</span>
              <div id="globalSearchResults" className="global-search-results hidden" role="listbox" aria-label="搜索结果" data-i18n-aria-label="searchResultsLabel"></div>
            </div>
            <div className="app-command-actions qg-command-actions">
              <div className="streak-widget" id="streakWidget">
                <button className="app-stat-pill streak-pill" id="checkInPill" type="button" aria-expanded="false" aria-controls="streakCalendarPanel" data-streak-react-handler="true" onClick={toggleStreakPanel}>
                  <span className="stat-art stat-art-fire" aria-hidden="true"></span>
                  <strong id="commandStreakCount">0</strong>
                  <small className="sr-only">day streak</small>
                  <i className="streak-toggle-icon" data-lucide="chevron-down" aria-hidden="true"></i>
                </button>
                <div className="streak-calendar-panel" id="streakCalendarPanel" hidden>
                  <div className="streak-panel-head">
                    <span className="streak-panel-kicker">Fire streak</span>
                    <strong id="streakPanelCount">0</strong>
                  </div>
                  <div className="streak-weekdays" id="streakCalendarWeekdays"></div>
                  <div className="streak-calendar-grid" id="streakCalendarGrid" aria-label="打卡日历"></div>
                  <p id="streakPanelMessage">完成任意一件事，今天的火苗会自动点亮。</p>
                </div>
              </div>
              <button
                className="app-stat-pill qg-level-pill"
                id="qgLevelPill"
                type="button"
                aria-label={`等级 Lv.${levelInfo.level}`}
                title={`Lv.${levelInfo.level} · 距 Lv.${levelInfo.level + 1} 还差 ${Math.max(0, levelInfo.next - levelInfo.current)} XP`}
                onClick={() => {
                  const shell = getShellServices();
                  shell.switchModule?.("skills");
                }}
              >
                <img src="/assets/generated/playful-precision/reward-xp.webp" alt="" loading="lazy" decoding="async" />
                <strong id="qgLevelPillValue">Lv.{levelInfo.level}</strong>
              </button>
              <button className="app-stat-pill chat-pill" id="commandChatBtn" type="button" data-jump-module="messages" aria-label="打开聊天" data-i18n-aria-label="openChat">
                <span className="stat-art stat-art-chat" aria-hidden="true"><i data-lucide="message-square-text"></i></span>
                <strong id="commandUnreadCount">0</strong>
                <small>聊天</small>
              </button>
              <div className="qg-notif">
                <button
                  className="qg-notif-btn"
                  id="qgNotifBtn"
                  type="button"
                  aria-haspopup="dialog"
                  aria-expanded={notifOpen}
                  aria-controls="qgNotifPanel"
                  aria-label="通知"
                  title="通知"
                  onClick={() => setNotifOpen((open) => !open)}
                >
                  <i data-lucide="bell"></i>
                </button>
                <div className="qg-notif-panel" id="qgNotifPanel" role="dialog" aria-label="通知" hidden={!notifOpen}>
                  <div className="qg-notif-head">
                    <strong>通知</strong>
                    <span>全部已读</span>
                  </div>
                  <div className="qg-notif-body">
                    <div className="qg-notif-empty">
                      <QuantyImage asset="happy" size="avatar" />
                      <strong>暂时没有新通知</strong>
                      <span>完成训练、升级、求职进展都会出现在这里</span>
                    </div>
                  </div>
                  <div className="qg-notif-foot">点击通知跳转对应模块 · 关闭即全部标记已读</div>
                </div>
              </div>
              <button
                className="app-theme-button"
                id="themeToggleBtn"
                type="button"
                aria-label={theme === "dark" ? "切换浅色主题" : "切换深色主题"}
                aria-pressed={theme === "dark"}
                title={theme === "dark" ? "切换浅色主题" : "切换深色主题"}
                onClick={toggleTheme}
              >
                <i data-lucide={theme === "dark" ? "sun" : "moon-star"}></i>
              </button>
              <span className="qg-command-divider" aria-hidden="true"></span>
              <button className="app-account-chip" type="button" data-jump-module="account" aria-label="打开账号" data-i18n-aria-label="openAccount">
                <span className="avatar app-account-avatar" id="commandUserAvatar" aria-hidden="true">Q</span>
                <span className="app-account-meta">
                  <strong id="commandUserName">Quant</strong>
                  <small id="commandUserProvider">账号</small>
                </span>
              </button>
              <button className="app-settings-button" type="button" data-jump-module="settings" aria-label="设置" data-i18n-aria-label="openSettings">
                <i data-lucide="settings"></i>
              </button>
            </div>
          </section>

          <div className="qg-wire-bar" aria-label="Quant Wire">
            <span className="qg-wire-pill">
              <i aria-hidden="true"></i>
              Quant Wire
            </span>
            <div className="qg-wire-viewport">
              <div className={wireItems.length ? "qg-wire-track" : "qg-wire-track is-static"}>
                {wireItems.length ? (
                  [...wireItems, ...wireItems].map((item, index) => (
                    <button
                      className="qg-wire-item"
                      type="button"
                      key={`${item.id}-${index}`}
                      tabIndex={index >= wireItems.length ? -1 : 0}
                      aria-hidden={index >= wireItems.length ? "true" : undefined}
                      onClick={() => openWireNews(item.id)}
                    >
                      <span>{item.source}</span>
                      <strong>{item.title}</strong>
                    </button>
                  ))
                ) : (
                  <span className="qg-wire-item is-empty">
                    {(appServices.t || ((key) => key))("newsTickerEmpty") || "暂无新闻"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <section className="module-view active" data-module-view="route" aria-live="polite">
            <div className="app-route-root qg-route-container">
              <Outlet />
            </div>
          </section>

          <nav className="qg-tabbar" aria-label="快捷导航">
            {BOTTOM_TABS.map(([moduleId, label, icon]) => (
              <button
                className={moduleId === "overview" ? "qg-tabbar-tab active" : "qg-tabbar-tab"}
                type="button"
                key={moduleId}
                data-module-tab={moduleId}
                onClick={closeNavSheet}
              >
                <i data-lucide={icon}></i>
                <span>{label}</span>
              </button>
            ))}
            <button
              className={navSheetOpen ? "qg-tabbar-tab qg-tabbar-more is-open" : "qg-tabbar-tab qg-tabbar-more"}
              type="button"
              aria-haspopup="dialog"
              aria-expanded={navSheetOpen}
              onClick={() => setNavSheetOpen((open) => !open)}
            >
              <i data-lucide="menu"></i>
              <span>更多</span>
            </button>
          </nav>

          <div
            className={navSheetOpen ? "qg-nav-sheet is-open" : "qg-nav-sheet"}
            aria-hidden={navSheetOpen ? undefined : "true"}
            onClick={closeNavSheet}
          >
            <div className="qg-nav-sheet-panel" role="dialog" aria-label="全部模块" onClick={(event) => event.stopPropagation()}>
              <div className="qg-nav-sheet-grip" aria-hidden="true"></div>
              <div className="qg-nav-sheet-head">
                <img src="/assets/generated/playful-precision/brand-q-mark.webp" alt="" />
                <strong>全部模块</strong>
                <button className="qg-nav-sheet-close" type="button" aria-label="关闭模块菜单" onClick={closeNavSheet}>
                  <i data-lucide="x"></i>
                </button>
              </div>
              <div className="qg-nav-sheet-groups">
                {SHEET_NAV_GROUPS.map((group) => (
                  <div className="qg-nav-sheet-group" key={group.label}>
                    <span className="qg-nav-sheet-label">{group.label}</span>
                    <div className="qg-nav-sheet-grid">
                      {group.items.map(([moduleId, label, icon]) => (
                        <button
                          className="qg-nav-sheet-item"
                          type="button"
                          key={moduleId}
                          data-module-tab={moduleId}
                          onClick={closeNavSheet}
                        >
                          <i data-lucide={icon}></i>
                          <span>{label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <RouteProgressBar />
          <CommandPalette
            open={paletteOpen}
            onClose={() => setPaletteOpen(false)}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          <OnboardingTour />
        </main>
  );
}
