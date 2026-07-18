import type { MouseEvent, ReactNode, RefObject } from "react";
import { useId, useRef } from "react";
import { createPortal } from "react-dom";

import styles from "./Dialog.module.css";
import { useModalFocus } from "./useModalFocus";

export type DialogProps = Readonly<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  closeOnBackdrop?: boolean;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  className?: string;
}>;

export const Dialog = ({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  closeLabel = "Close dialog",
  closeOnBackdrop = true,
  initialFocusRef,
  returnFocusRef,
  className,
}: DialogProps) => {
  const panelRef = useRef<HTMLDivElement>(null);
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
  const panelClassName = [styles.panel, className].filter(Boolean).join(" ");

  return createPortal(
    <div
      className={styles.backdrop}
      data-testid="dialog-backdrop"
      onMouseDown={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className={panelClassName}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description === undefined ? undefined : descriptionId}
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
      </div>
    </div>,
    document.body,
  );
};
