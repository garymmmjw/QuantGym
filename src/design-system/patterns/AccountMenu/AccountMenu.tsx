import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { NavLink } from "react-router-dom";

import { QuantyImage } from "../QuantyImage";
import type { ShellLanguage, ShellTheme, ShellUser } from "../AppShell/shell.types";
import styles from "./AccountMenu.module.css";

export type AccountMenuProps = Readonly<{
  language: ShellLanguage;
  onLanguageChange: (language: ShellLanguage) => void;
  onSignOut?: (() => void) | undefined;
  theme: ShellTheme;
  user: ShellUser;
}>;

export function AccountMenu({
  language,
  onLanguageChange,
  onSignOut,
  theme,
  user,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const firstItemRef = useRef<HTMLAnchorElement>(null);
  const menuId = useId();
  const isChinese = language === "zh-CN";

  useEffect(() => {
    if (!open) return undefined;
    firstItemRef.current?.focus({ preventScroll: true });
    const handlePointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [open]);

  const closeMenu = () => setOpen(false);
  const closeMenuAndRestoreFocus = () => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };
  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    const items = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    if (items.length === 0) return;
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex = event.key === "Home"
      ? 0
      : event.key === "End"
        ? items.length - 1
        : event.key === "ArrowDown"
          ? (currentIndex + 1) % items.length
          : (currentIndex - 1 + items.length) % items.length;
    event.preventDefault();
    items[nextIndex]?.focus({ preventScroll: true });
  };

  return (
    <div
      className={styles.root}
      onBlur={(event) => {
        if (
          event.relatedTarget instanceof Node
          && event.currentTarget.contains(event.relatedTarget)
        ) {
          return;
        }
        closeMenu();
      }}
      ref={rootRef}
    >
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={isChinese ? "打开账户菜单" : "Open account menu"}
        className={styles.trigger}
        onClick={() => setOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <span className={styles.avatar} aria-hidden="true">
          <QuantyImage alt="" asset="happy" size="avatar" />
        </span>
        <span className={styles.triggerName}>{user.displayName}</span>
        <span aria-hidden="true" className={styles.chevron}>⌄</span>
      </button>
      {open ? (
        <div
          aria-label={isChinese ? "账户操作" : "Account actions"}
          className={styles.menu}
          id={menuId}
          onKeyDown={handleMenuKeyDown}
          role="menu"
        >
          <div className={styles.identity} role="none">
            <strong>{user.displayName}</strong>
            {user.email === undefined ? null : <span>{user.email}</span>}
          </div>
          <NavLink className={styles.menuItem ?? ""} end onClick={closeMenu} ref={firstItemRef} role="menuitem" tabIndex={-1} to="/account">
            {isChinese ? "账户资料" : "Account"}
          </NavLink>
          <NavLink className={styles.menuItem ?? ""} end onClick={closeMenu} role="menuitem" tabIndex={-1} to="/settings">
            {isChinese ? "偏好设置" : "Preferences"}
          </NavLink>
          <button
            className={styles.menuItem}
            onClick={() => {
              onLanguageChange(isChinese ? "en" : "zh-CN");
              closeMenuAndRestoreFocus();
            }}
            role="menuitem"
            tabIndex={-1}
            type="button"
          >
            {isChinese ? "Switch to English" : "切换到简体中文"}
          </button>
          <p className={styles.themeNote} role="none">
            {isChinese ? "当前主题" : "Theme"}: {theme === "dark" ? (isChinese ? "深色" : "Dark") : (isChinese ? "浅色" : "Light")}
          </p>
          {onSignOut === undefined ? null : (
            <button
              className={styles.signOut}
              onClick={() => {
                closeMenuAndRestoreFocus();
                onSignOut();
              }}
              role="menuitem"
              tabIndex={-1}
              type="button"
            >
              {isChinese ? "退出登录" : "Sign out"}
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
