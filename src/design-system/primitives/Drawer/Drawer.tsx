import type { MouseEvent, ReactNode, RefObject } from "react";
import { useId, useRef } from "react";
import { createPortal } from "react-dom";

import { useModalFocus } from "../Dialog/useModalFocus";
import styles from "./Drawer.module.css";

export type DrawerSide = "left" | "right" | "bottom";

export type DrawerProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  side?: DrawerSide;
  closeLabel?: string;
  closeOnBackdrop?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
}>;

export const Drawer = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  side = "right",
  closeLabel = "Close drawer",
  closeOnBackdrop = true,
  initialFocusRef,
  returnFocusRef,
  className,
}: DrawerProps) => {
  const panelRef = useRef<HTMLElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  const requestClose = () => onOpenChange(false);

  const { focusFirst, focusLast } = useModalFocus({
    open,
    panelRef,
    initialFocusRef,
    returnFocusRef,
    onRequestClose: requestClose,
  });

  if (!open || typeof document === "undefined") return null;

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdrop && event.target === event.currentTarget) requestClose();
  };
  const panelClassName = [styles.panel, styles[side], className].filter(Boolean).join(" ");

  return createPortal(
    <div className={styles.backdrop} onMouseDown={handleBackdropClick}>
      <aside
        ref={panelRef}
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description === undefined ? undefined : descriptionId}
        data-side={side}
        tabIndex={-1}
      >
        <span
          className={styles.focusGuard}
          data-modal-focus-guard="start"
          tabIndex={0}
          onFocus={focusLast}
        />
        <header className={styles.header}>
          <div className={styles.heading}>
            <h2 id={titleId} className={styles.title}>{title}</h2>
            {description === undefined
              ? null
              : <p id={descriptionId} className={styles.description}>{description}</p>}
          </div>
          <button
            type="button"
            className={styles.closeButton}
            aria-label={closeLabel}
            onClick={requestClose}
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer === undefined ? null : <footer className={styles.footer}>{footer}</footer>}
        <span
          className={styles.focusGuard}
          data-modal-focus-guard="end"
          tabIndex={0}
          onFocus={focusFirst}
        />
      </aside>
    </div>,
    document.body,
  );
};
