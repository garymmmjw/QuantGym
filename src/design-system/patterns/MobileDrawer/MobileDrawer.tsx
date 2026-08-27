import type { RefObject } from "react";
import { NavLink } from "react-router-dom";

import { Drawer } from "../../primitives/Drawer";
import { ShellIcon } from "../AppShell/ShellIcon";
import { localizeShellText, type ShellLanguage, type ShellNavigationGroup, type ShellTheme } from "../AppShell/shell.types";
import styles from "./MobileDrawer.module.css";

export type MobileDrawerProps = Readonly<{
  language: ShellLanguage;
  navigationGroups: readonly ShellNavigationGroup[];
  onLanguageChange: (language: ShellLanguage) => void;
  onOpenChange: (open: boolean) => void;
  onSignOut?: (() => void) | undefined;
  onToggleTheme: () => void;
  open: boolean;
  returnFocusRef: RefObject<HTMLElement | null>;
  theme: ShellTheme;
}>;

export function MobileDrawer({
  language,
  navigationGroups,
  onLanguageChange,
  onOpenChange,
  onSignOut,
  onToggleTheme,
  open,
  returnFocusRef,
  theme,
}: MobileDrawerProps) {
  const isChinese = language === "zh-CN";
  const close = () => onOpenChange(false);

  return (
    <Drawer
      className={styles.panel ?? ""}
      closeLabel={isChinese ? "关闭全部模块" : "Close all modules"}
      description={isChinese ? "全部功能入口与外观偏好" : "All product areas and appearance preferences"}
      footer={(
        <div className={styles.preferences}>
          <button type="button" onClick={onToggleTheme}>
            <ShellIcon name={theme === "dark" ? "sun" : "moon"} />
            {theme === "dark"
              ? (isChinese ? "浅色主题" : "Light theme")
              : (isChinese ? "深色主题" : "Dark theme")}
          </button>
          <button type="button" onClick={() => onLanguageChange(isChinese ? "en" : "zh-CN")}>
            <span aria-hidden="true">文</span>
            {isChinese ? "English" : "简体中文"}
          </button>
          {onSignOut === undefined ? null : (
            <button
              type="button"
              onClick={() => {
                close();
                onSignOut();
              }}
            >
              <ShellIcon name="account" />
              {isChinese ? "退出登录" : "Sign out"}
            </button>
          )}
        </div>
      )}
      onOpenChange={onOpenChange}
      open={open}
      returnFocusRef={returnFocusRef}
      side="bottom"
      title={isChinese ? "全部模块" : "All modules"}
    >
      <nav aria-label={isChinese ? "移动主导航" : "Mobile navigation"} className={styles.navigation}>
        {navigationGroups.map((group) => (
          <section className={styles.group} key={group.id}>
            <h3>{localizeShellText(group.label, language)}</h3>
            <div className={styles.items}>
              {group.items.map((navigationItem) => {
                const label = localizeShellText(navigationItem.label, language);
                return (
                  <NavLink
                    className={({ isActive }) => (
                      [styles.item, isActive ? styles.activeItem : undefined]
                        .filter(Boolean)
                        .join(" ")
                    )}
                    end
                    key={navigationItem.id}
                    onClick={close}
                    to={navigationItem.path}
                  >
                    <ShellIcon name={navigationItem.icon} />
                    <span>{label}</span>
                  </NavLink>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
    </Drawer>
  );
}
