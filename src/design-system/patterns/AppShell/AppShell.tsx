import { useRef, useState, type ReactNode } from "react";

import { BottomNavigation } from "../BottomNavigation";
import { DesktopSidebar } from "../DesktopSidebar";
import { MobileDrawer } from "../MobileDrawer";
import { MobileHeader } from "../MobileHeader";
import { TopBar } from "../TopBar";
import { MOBILE_PRIMARY_NAVIGATION, SHELL_NAVIGATION_GROUPS } from "./navigation";
import type { ShellLanguage, ShellTheme, ShellUser } from "./shell.types";
import styles from "./AppShell.module.css";

export type AppShellProps = Readonly<{
  children: ReactNode;
  language: ShellLanguage;
  level?: number | undefined;
  notificationCount?: number;
  notificationsOpen?: boolean;
  onLanguageChange: (language: ShellLanguage) => void;
  onOpenNotifications?: (() => void) | undefined;
  onOpenSearch?: (() => void) | undefined;
  onSignOut?: (() => void) | undefined;
  onToggleTheme: () => void;
  searchOpen?: boolean;
  streakDays?: number | undefined;
  theme: ShellTheme;
  user: ShellUser;
}>;

export function AppShell({
  children,
  language,
  level,
  notificationCount = 0,
  notificationsOpen = false,
  onLanguageChange,
  onOpenNotifications,
  onOpenSearch,
  onSignOut,
  onToggleTheme,
  searchOpen = false,
  streakDays,
  theme,
  user,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerReturnFocusRef = useRef<HTMLElement>(null);
  const isChinese = language === "zh-CN";

  const announcePendingSurface = (surface: "search" | "notifications") => {
    setAnnouncement(surface === "search"
      ? (isChinese ? "搜索面板将在下一共享系统阶段接入。" : "Search will connect in the next shared-systems step.")
      : (isChinese ? "通知中心将在下一共享系统阶段接入。" : "Notifications will connect in the next shared-systems step."));
  };
  const openSearch = onOpenSearch ?? (() => announcePendingSurface("search"));
  const openNotifications = onOpenNotifications ?? (() => announcePendingSurface("notifications"));
  const openDrawer = () => {
    drawerReturnFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : menuButtonRef.current;
    setDrawerOpen(true);
  };

  return (
    <div className={styles.shell} data-sidebar-collapsed={sidebarCollapsed || undefined}>
      <a className={styles.skipLink} href="#qg-main-content">
        {isChinese ? "跳到主要内容" : "Skip to main content"}
      </a>
      <div className={styles.desktopSidebar}>
        <DesktopSidebar
          collapsed={sidebarCollapsed}
          language={language}
          navigationGroups={SHELL_NAVIGATION_GROUPS}
        />
      </div>
      <div className={styles.column}>
        <div className={styles.desktopTopBar}>
          <TopBar
            language={language}
            level={level}
            notificationCount={notificationCount}
            notificationsOpen={notificationsOpen}
            onLanguageChange={onLanguageChange}
            onOpenNotifications={openNotifications}
            onOpenSearch={openSearch}
            onSignOut={onSignOut}
            onToggleSidebar={() => setSidebarCollapsed((current) => !current)}
            onToggleTheme={onToggleTheme}
            sidebarCollapsed={sidebarCollapsed}
            searchOpen={searchOpen}
            streakDays={streakDays}
            theme={theme}
            user={user}
          />
        </div>
        <div className={styles.mobileHeader}>
          <MobileHeader
            language={language}
            notificationCount={notificationCount}
            notificationsOpen={notificationsOpen}
            onOpenDrawer={openDrawer}
            onOpenNotifications={openNotifications}
            onOpenSearch={openSearch}
            searchOpen={searchOpen}
            onToggleTheme={onToggleTheme}
            ref={menuButtonRef}
            streakDays={streakDays}
            theme={theme}
          />
        </div>
        <main className={styles.main} id="qg-main-content" tabIndex={-1}>
          <div className={styles.content}>{children}</div>
        </main>
      </div>
      <div className={styles.bottomNavigation}>
        <BottomNavigation
          language={language}
          navigationItems={MOBILE_PRIMARY_NAVIGATION}
          onOpenDrawer={openDrawer}
        />
      </div>
      <MobileDrawer
        language={language}
        navigationGroups={SHELL_NAVIGATION_GROUPS}
        onLanguageChange={onLanguageChange}
        onOpenChange={setDrawerOpen}
        onSignOut={onSignOut}
        onToggleTheme={onToggleTheme}
        open={drawerOpen}
        returnFocusRef={drawerReturnFocusRef}
        theme={theme}
      />
      <p aria-live="polite" className={styles.liveAnnouncement} role="status">
        {announcement}
      </p>
    </div>
  );
}
