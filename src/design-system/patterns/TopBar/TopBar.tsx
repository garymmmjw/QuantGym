import { AccountMenu } from "../AccountMenu";
import { ShellIcon } from "../AppShell/ShellIcon";
import type { ShellLanguage, ShellTheme, ShellUser } from "../AppShell/shell.types";
import styles from "./TopBar.module.css";

export type TopBarProps = Readonly<{
  language: ShellLanguage;
  level?: number;
  notificationCount?: number;
  onLanguageChange: (language: ShellLanguage) => void;
  onOpenNotifications: () => void;
  onOpenSearch: () => void;
  onSignOut?: (() => void) | undefined;
  onToggleSidebar: () => void;
  onToggleTheme: () => void;
  sidebarCollapsed: boolean;
  streakDays?: number;
  theme: ShellTheme;
  user: ShellUser;
}>;

export function TopBar({
  language,
  level = 1,
  notificationCount = 0,
  onLanguageChange,
  onOpenNotifications,
  onOpenSearch,
  onSignOut,
  onToggleSidebar,
  onToggleTheme,
  sidebarCollapsed,
  streakDays = 0,
  theme,
  user,
}: TopBarProps) {
  const isChinese = language === "zh-CN";

  return (
    <header className={styles.root}>
      <button
        aria-label={sidebarCollapsed
          ? (isChinese ? "展开侧边栏" : "Expand sidebar")
          : (isChinese ? "收起侧边栏" : "Collapse sidebar")}
        aria-pressed={sidebarCollapsed}
        className={styles.iconButton}
        onClick={onToggleSidebar}
        type="button"
      >
        <ShellIcon name="panel" />
      </button>
      <button className={styles.search} onClick={onOpenSearch} type="button">
        <ShellIcon name="search" />
        <span>{isChinese ? "搜索题目、公司、课程，或跳转模块…" : "Search problems, companies, courses, or modules…"}</span>
        <kbd>⌘K</kbd>
      </button>
      <div className={styles.spacer} />
      <div className={styles.reward} aria-label={isChinese ? `连续 ${streakDays} 天` : `${streakDays} day streak`}>
        <span aria-hidden="true">🔥</span>
        <strong data-qg-metric>{streakDays}</strong>
      </div>
      <div className={styles.level} aria-label={isChinese ? `等级 ${level}` : `Level ${level}`}>
        <span aria-hidden="true">XP</span>
        <strong data-qg-metric>Lv.{level}</strong>
      </div>
      <button
        aria-label={isChinese ? "打开通知" : "Open notifications"}
        className={styles.iconButton}
        onClick={onOpenNotifications}
        type="button"
      >
        <ShellIcon name="bell" />
        {notificationCount > 0 ? <span className={styles.badge}>{notificationCount}</span> : null}
      </button>
      <button
        aria-label={theme === "dark"
          ? (isChinese ? "切换到浅色主题" : "Switch to light theme")
          : (isChinese ? "切换到深色主题" : "Switch to dark theme")}
        className={styles.iconButton}
        onClick={onToggleTheme}
        type="button"
      >
        <ShellIcon name={theme === "dark" ? "sun" : "moon"} />
      </button>
      <span className={styles.separator} aria-hidden="true" />
      <AccountMenu
        language={language}
        onLanguageChange={onLanguageChange}
        onSignOut={onSignOut}
        theme={theme}
        user={user}
      />
    </header>
  );
}
