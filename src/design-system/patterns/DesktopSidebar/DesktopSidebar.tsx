import { NavLink } from "react-router-dom";

import brandMark from "../../../../assets/generated/playful-precision/brand-q-mark.webp";
import { ShellIcon } from "../AppShell/ShellIcon";
import { localizeShellText, type ShellLanguage, type ShellNavigationGroup } from "../AppShell/shell.types";
import styles from "./DesktopSidebar.module.css";

export type DesktopSidebarProps = Readonly<{
  collapsed?: boolean;
  language: ShellLanguage;
  navigationGroups: readonly ShellNavigationGroup[];
}>;

export function DesktopSidebar({
  collapsed = false,
  language,
  navigationGroups,
}: DesktopSidebarProps) {
  const navigationLabel = language === "zh-CN" ? "主导航" : "Main navigation";

  return (
    <aside className={styles.root} data-collapsed={collapsed || undefined}>
      <NavLink className={styles.brand ?? ""} to="/" aria-label="QuantGym">
        <img src={brandMark} alt="" width="38" height="38" />
        <span className={styles.brandName}>Quant<span>Gym</span></span>
      </NavLink>
      <nav className={styles.navigation} aria-label={navigationLabel}>
        {navigationGroups.map((group) => (
          <section className={styles.group} key={group.id} aria-label={localizeShellText(group.label, language)}>
            <h2 className={styles.groupLabel}>{localizeShellText(group.label, language)}</h2>
            <div className={styles.groupItems}>
              {group.items.map((navigationItem) => {
                const label = localizeShellText(navigationItem.label, language);
                return (
                  <NavLink
                    aria-label={label}
                    className={({ isActive }) => (
                      [styles.item, isActive ? styles.activeItem : undefined]
                        .filter(Boolean)
                        .join(" ")
                    )}
                    end
                    key={navigationItem.id}
                    title={collapsed ? label : undefined}
                    to={navigationItem.path}
                  >
                    <ShellIcon className={styles.itemIcon} name={navigationItem.icon} />
                    <span className={styles.itemLabel}>{label}</span>
                  </NavLink>
                );
              })}
            </div>
          </section>
        ))}
      </nav>
      <div className={styles.quest} aria-label={language === "zh-CN" ? "本周目标进度" : "Weekly goal progress"}>
        <div className={styles.questHeading}>
          <span>{language === "zh-CN" ? "本周训练" : "Weekly training"}</span>
          <strong data-qg-metric>0 / 5</strong>
        </div>
        <div className={styles.questTrack} aria-hidden="true">
          <span />
        </div>
        <p>{language === "zh-CN" ? "完成一次训练，开启你的连续记录。" : "Finish one session to start your streak."}</p>
      </div>
    </aside>
  );
}
