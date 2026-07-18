import {
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import styles from "./Tabs.module.css";

export type TabDefinition = Readonly<{
  content: ReactNode;
  disabled?: boolean;
  id: string;
  label: ReactNode;
}>;

export type TabsProps = Readonly<{
  ariaLabel: string;
  autoFocus?: boolean;
  className?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  tabs: readonly TabDefinition[];
  value?: string;
}>;

export function Tabs({
  ariaLabel,
  autoFocus = false,
  className,
  defaultValue,
  onValueChange,
  orientation = "horizontal",
  tabs,
  value,
}: TabsProps) {
  const baseId = useId();
  const firstEnabledIndex = tabs.findIndex((tab) => !tab.disabled);
  const firstEnabledValue = firstEnabledIndex >= 0 ? tabs[firstEnabledIndex]?.id : undefined;
  const [uncontrolledValue, setUncontrolledValue] = useState(
    defaultValue ?? firstEnabledValue,
  );
  const isControlled = value !== undefined;
  const requestedValue = isControlled ? value : uncontrolledValue;
  const requestedIndex = tabs.findIndex(
    (tab) => tab.id === requestedValue && !tab.disabled,
  );
  const selectedIndex = requestedIndex >= 0 ? requestedIndex : firstEnabledIndex;
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const classes = [styles.root, className]
    .filter((entry): entry is string => Boolean(entry))
    .join(" ");

  const selectTabAt = (index: number) => {
    const tab = tabs[index];
    if (tab === undefined || tab.disabled) return;
    if (!isControlled) setUncontrolledValue(tab.id);
    onValueChange?.(tab.id);
  };

  const enabledIndices = tabs.flatMap((tab, index) => (tab.disabled ? [] : [index]));

  const moveTo = (currentIndex: number, direction: "first" | "last" | "next" | "previous") => {
    if (enabledIndices.length === 0) return;
    const enabledPosition = enabledIndices.indexOf(currentIndex);
    let targetPosition = enabledPosition;
    if (direction === "first") targetPosition = 0;
    if (direction === "last") targetPosition = enabledIndices.length - 1;
    if (direction === "next") {
      targetPosition = (Math.max(enabledPosition, 0) + 1) % enabledIndices.length;
    }
    if (direction === "previous") {
      targetPosition =
        (enabledPosition <= 0 ? enabledIndices.length : enabledPosition) - 1;
    }
    const targetIndex = enabledIndices[targetPosition];
    if (targetIndex === undefined) return;
    selectTabAt(targetIndex);
    tabRefs.current[targetIndex]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const nextKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
    const previousKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    if (event.key === nextKey) {
      event.preventDefault();
      moveTo(index, "next");
    } else if (event.key === previousKey) {
      event.preventDefault();
      moveTo(index, "previous");
    } else if (event.key === "Home") {
      event.preventDefault();
      moveTo(index, "first");
    } else if (event.key === "End") {
      event.preventDefault();
      moveTo(index, "last");
    }
  };

  return (
    <div className={classes} data-orientation={orientation}>
      <div aria-label={ariaLabel} aria-orientation={orientation} className={styles.tabList} role="tablist">
        {tabs.map((tab, index) => {
          const isSelected = index === selectedIndex;
          const tabId = `${baseId}-tab-${index}`;
          const panelId = `${baseId}-panel-${index}`;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              aria-controls={panelId}
              aria-selected={isSelected}
              autoFocus={autoFocus && isSelected}
              className={styles.tab}
              disabled={tab.disabled}
              id={tabId}
              role="tab"
              tabIndex={isSelected ? 0 : -1}
              type="button"
              onClick={() => selectTabAt(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className={styles.panels}>
        {tabs.map((tab, index) => {
          const isSelected = index === selectedIndex;
          return (
            <div
              key={tab.id}
              aria-labelledby={`${baseId}-tab-${index}`}
              className={styles.panel}
              hidden={!isSelected}
              id={`${baseId}-panel-${index}`}
              role="tabpanel"
              tabIndex={isSelected ? 0 : -1}
            >
              {tab.content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
