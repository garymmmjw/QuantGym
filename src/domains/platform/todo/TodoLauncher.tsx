import { forwardRef } from "react";

import { ShellIcon } from "../../../design-system/patterns/AppShell/ShellIcon";
import styles from "./TodoDock.module.css";

export type TodoLauncherProps = Readonly<{
  count?: number;
  language: "zh-CN" | "en";
  onClick: () => void;
  open?: boolean;
}>;

export const TodoLauncher = forwardRef<HTMLButtonElement, TodoLauncherProps>(
  function TodoLauncher({ count = 0, language, onClick, open = false }, ref) {
    const isChinese = language === "zh-CN";
    return (
      <button
        aria-controls="qg-todo-dock"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={isChinese ? `打开今日待办，${count} 项` : `Open today's tasks, ${count} items`}
        className={styles.launcher}
        onClick={onClick}
        ref={ref}
        type="button"
      >
        <ShellIcon name="calendar" />
        <span>{isChinese ? "今日待办" : "Today"}</span>
        {count > 0 ? <strong data-qg-metric>{count}</strong> : null}
      </button>
    );
  },
);
