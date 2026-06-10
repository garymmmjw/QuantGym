import { Outlet } from "react-router-dom";

export function AppShellMain() {
  return (
    <main id="appShell" className="hidden">
          <nav className="module-nav" id="moduleNav" aria-label="模块导航" data-i18n-aria-label="moduleNavLabel">
            <div className="sidebar-brand" aria-label="QuantGym">
              <img src="assets/generated/brand-q-mark.webp?v=premium-system-2" alt="" />
              <strong>QuantGym</strong>
            </div>
            <div className="module-nav-group primary" aria-label="总览" data-i18n-aria-label="navOverview">
              <button className="module-tab active" type="button" data-module-tab="overview">
                <i data-lucide="layout-dashboard"></i>
                总览
              </button>
            </div>
            <div className="module-nav-group" aria-label="成长" data-i18n-aria-label="navGrowth">
              <button className="module-nav-trigger" type="button" aria-haspopup="true">
                <span data-i18n="navGrowth">成长</span>
                <i data-lucide="chevron-down"></i>
              </button>
              <div className="module-nav-menu">
                <button className="module-tab" type="button" data-module-tab="plan">
                  <i data-lucide="calendar-check-2"></i>
                  计划
                </button>
                <button className="module-tab" type="button" data-module-tab="skills">
                  <i data-lucide="radar"></i>
                  能力值
                </button>
              </div>
            </div>
            <div className="module-nav-group" aria-label="刷题" data-i18n-aria-label="navTraining">
              <button className="module-nav-trigger" type="button" aria-haspopup="true">
                <span data-i18n="navTraining">刷题</span>
                <i data-lucide="chevron-down"></i>
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
                <button className="module-tab" type="button" data-module-tab="experiences">
                  <i data-lucide="notebook-pen"></i>
                  面经
                </button>
              </div>
            </div>
            <div className="module-nav-group" aria-label="社群" data-i18n-aria-label="navSocial">
              <button className="module-nav-trigger" type="button" aria-haspopup="true">
                <span data-i18n="navSocial">社群</span>
                <i data-lucide="chevron-down"></i>
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
                <i data-lucide="chevron-down"></i>
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
                <i data-lucide="chevron-down"></i>
              </button>
              <div className="module-nav-menu">
                <button className="module-tab" type="button" data-module-tab="library">
                  <i data-lucide="book-open"></i>
                  书城
                </button>
                <button className="module-tab" type="button" data-module-tab="courses">
                  <i data-lucide="video"></i>
                  课程
                </button>
                <button className="module-tab" type="button" data-module-tab="memory">
                  <i data-lucide="archive"></i>
                  资料笔记
                </button>
              </div>
            </div>
            <div className="module-nav-group compact" aria-label="设置" data-i18n-aria-label="settings">
              <button className="module-tab" type="button" data-module-tab="settings">
                <i data-lucide="settings"></i>
                设置
              </button>
            </div>
            <aside className="sidebar-helper hidden" aria-label="Today guide">
              <img src="assets/generated/quanty-side-coach.webp?v=premium-system-2" alt="" loading="lazy" decoding="async" />
              <strong>今日向导</strong>
              <span>3 个任务待完成</span>
            </aside>
          </nav>

          <section className="app-command-bar" aria-label="全局搜索和状态" data-i18n-aria-label="commandBarLabel">
            <button className="sidebar-toggle-button" id="sidebarToggleBtn" type="button" aria-controls="moduleNav" aria-expanded="true" aria-label="隐藏模块列表" title="隐藏模块列表">
              <i data-lucide="panel-left-close"></i>
            </button>
            <div className="app-search" role="search">
              <i data-lucide="search"></i>
              <input id="globalSearchInput" type="search" placeholder="Search topics, lessons, or concepts..." aria-label="Search topics" />
              <div id="globalSearchResults" className="global-search-results hidden" role="listbox" aria-label="搜索结果" data-i18n-aria-label="searchResultsLabel"></div>
            </div>
            <div className="app-command-actions">
              <div className="streak-widget" id="streakWidget">
                <button className="app-stat-pill streak-pill" id="checkInPill" type="button" aria-expanded="false" aria-controls="streakCalendarPanel">
                  <span className="stat-art stat-art-fire" aria-hidden="true"></span>
                  <strong id="commandStreakCount" className="sr-only">0</strong>
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
              <button className="app-stat-pill chat-pill" id="commandChatBtn" type="button" data-jump-module="messages" aria-label="打开聊天" data-i18n-aria-label="openChat">
                <span className="stat-art stat-art-chat" aria-hidden="true"><i data-lucide="message-square-text"></i></span>
                <strong id="commandUnreadCount">0</strong>
                <small>聊天</small>
              </button>
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

          <section className="module-view active" data-module-view="route" aria-live="polite">
            <div className="app-route-root">
              <Outlet />
            </div>
          </section>
        </main>
  );
}
