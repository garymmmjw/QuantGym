import { NavLink, useLocation } from "react-router-dom";

import { ShellIcon } from "../AppShell/ShellIcon";
import { localizeShellText, type ShellLanguage, type ShellNavigationItem } from "../AppShell/shell.types";
import styles from "./BottomNavigation.module.css";

export type BottomNavigationProps = Readonly<{
  language: ShellLanguage;
  navigationItems: readonly ShellNavigationItem[];
  onOpenDrawer: () => void;
}>;

export function BottomNavigation({
  language,
  navigationItems,
  onOpenDrawer,
}: BottomNavigationProps) {
  const { pathname } = useLocation();
  const primaryPaths = new Set(navigationItems.map(({ path }) => path));
  const moreActive = !primaryPaths.has(pathname);
  const isChinese = language === "zh-CN";

  return (
    <nav aria-label={isChinese ? "底部主导航" : "Primary bottom navigation"} className={styles.root}>
      {navigationItems.map((navigationItem) => (
        <NavLink
          className={({ isActive }) => (
            [styles.item, isActive ? styles.activeItem : undefined]
              .filter(Boolean)
              .join(" ")
          )}
          end
          key={navigationItem.id}
          to={navigationItem.path}
        >
          <ShellIcon name={navigationItem.icon} />
          <span>{localizeShellText(navigationItem.label, language)}</span>
        </NavLink>
      ))}
      <button
        aria-current={moreActive ? "page" : undefined}
        className={[styles.item, moreActive ? styles.activeItem : undefined].filter(Boolean).join(" ")}
        onClick={onOpenDrawer}
        type="button"
      >
        <ShellIcon name="menu" />
        <span>{isChinese ? "更多" : "More"}</span>
      </button>
    </nav>
  );
}
