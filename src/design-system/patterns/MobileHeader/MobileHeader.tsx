import { forwardRef } from "react";
import { Link } from "react-router-dom";

import brandMark from "../../../../assets/generated/playful-precision/brand-q-mark.webp";
import { QuantyImage } from "../QuantyImage";
import { ShellIcon } from "../AppShell/ShellIcon";
import type { ShellLanguage, ShellTheme } from "../AppShell/shell.types";
import styles from "./MobileHeader.module.css";

export type MobileHeaderProps = Readonly<{
  language: ShellLanguage;
  notificationCount?: number;
  onOpenDrawer: () => void;
  onOpenNotifications: () => void;
  onToggleTheme: () => void;
  streakDays?: number;
  theme: ShellTheme;
}>;

export const MobileHeader = forwardRef<HTMLButtonElement, MobileHeaderProps>(function MobileHeader(
  {
    language,
    notificationCount = 0,
    onOpenDrawer,
    onOpenNotifications,
    onToggleTheme,
    streakDays = 0,
    theme,
  },
  menuButtonRef,
) {
  const isChinese = language === "zh-CN";

  return (
    <header className={styles.root}>
      <button
        aria-label={isChinese ? "打开全部模块" : "Open all modules"}
        className={styles.iconButton}
        onClick={onOpenDrawer}
        ref={menuButtonRef}
        type="button"
      >
        <ShellIcon name="menu" />
      </button>
      <Link aria-label="QuantGym" className={styles.brand} to="/">
        <img src={brandMark} alt="" width="32" height="32" />
        <span>Quant<strong>Gym</strong></span>
      </Link>
      <div className={styles.spacer} />
      <div className={styles.reward} aria-label={isChinese ? `连续 ${streakDays} 天` : `${streakDays} day streak`}>
        <span aria-hidden="true">🔥</span>
        <strong data-qg-metric>{streakDays}</strong>
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
        className={styles.themeButton}
        onClick={onToggleTheme}
        type="button"
      >
        <ShellIcon name={theme === "dark" ? "sun" : "moon"} />
      </button>
      <Link aria-label={isChinese ? "打开账户" : "Open account"} className={styles.account} to="/account">
        <QuantyImage alt="" asset="happy" size="avatar" />
      </Link>
    </header>
  );
});
