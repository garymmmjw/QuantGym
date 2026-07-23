import {
  useCallback,
  useEffect,
  useId,
  useRef,
  type FocusEvent as ReactFocusEvent,
} from "react";

import type { ToastRecord, ToastTone } from "./types";
import styles from "./ToastRegion.module.css";

export type ToastRegionProps = Readonly<{
  dismissLabel?: string;
  label?: string;
  onDismiss: (id: string) => void;
  toasts: readonly ToastRecord[];
}>;

const toneIcon: Readonly<Record<ToastTone, string>> = {
  danger: "×",
  info: "i",
  success: "✓",
  warning: "!",
};

type PauseReason = "document-hidden" | "focus-within" | "hover";

function useToastAutoDismiss(
  toast: ToastRecord,
  onDismiss: (id: string) => void,
) {
  const timeoutIdRef = useRef<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const remainingMsRef = useRef(0);
  const enabledRef = useRef(false);
  const toastIdRef = useRef(toast.id);
  const pauseReasonsRef = useRef(new Set<PauseReason>());
  const onDismissRef = useRef(onDismiss);

  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);

  const stopCountdown = useCallback(() => {
    if (timeoutIdRef.current === null) return;

    window.clearTimeout(timeoutIdRef.current);
    timeoutIdRef.current = null;
    if (startedAtRef.current !== null) {
      const elapsedMs = Math.max(0, Date.now() - startedAtRef.current);
      remainingMsRef.current = Math.max(0, remainingMsRef.current - elapsedMs);
      startedAtRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    if (
      !enabledRef.current
      || pauseReasonsRef.current.size > 0
      || timeoutIdRef.current !== null
    ) {
      return;
    }

    if (remainingMsRef.current <= 0) {
      onDismissRef.current(toastIdRef.current);
      return;
    }

    startedAtRef.current = Date.now();
    timeoutIdRef.current = window.setTimeout(() => {
      timeoutIdRef.current = null;
      startedAtRef.current = null;
      remainingMsRef.current = 0;
      onDismissRef.current(toastIdRef.current);
    }, remainingMsRef.current);
  }, []);

  const pauseCountdown = useCallback((reason: PauseReason) => {
    pauseReasonsRef.current.add(reason);
    stopCountdown();
  }, [stopCountdown]);

  const resumeCountdown = useCallback((reason: PauseReason) => {
    pauseReasonsRef.current.delete(reason);
    startCountdown();
  }, [startCountdown]);

  const hasAction = toast.action !== null;

  useEffect(() => {
    stopCountdown();

    toastIdRef.current = toast.id;
    enabledRef.current = !hasAction
      && toast.durationMs !== null
      && toast.durationMs > 0;
    remainingMsRef.current = enabledRef.current ? toast.durationMs ?? 0 : 0;

    const syncDocumentVisibility = () => {
      if (document.visibilityState === "hidden") {
        pauseCountdown("document-hidden");
      } else {
        resumeCountdown("document-hidden");
      }
    };

    syncDocumentVisibility();
    document.addEventListener("visibilitychange", syncDocumentVisibility);
    startCountdown();

    return () => {
      document.removeEventListener("visibilitychange", syncDocumentVisibility);
      stopCountdown();
    };
  }, [
    hasAction,
    pauseCountdown,
    resumeCountdown,
    startCountdown,
    stopCountdown,
    toast.durationMs,
    toast.id,
    toast.revision,
  ]);

  const handleBlurCapture = useCallback((event: ReactFocusEvent<HTMLElement>) => {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
    resumeCountdown("focus-within");
  }, [resumeCountdown]);

  return {
    onBlurCapture: handleBlurCapture,
    onFocusCapture: () => pauseCountdown("focus-within"),
    onMouseEnter: () => pauseCountdown("hover"),
    onMouseLeave: () => resumeCountdown("hover"),
  };
}

function ToastItem({
  dismissLabel,
  onDismiss,
  toast,
}: Readonly<{
  onDismiss: (id: string) => void;
  dismissLabel: string;
  toast: ToastRecord;
}>) {
  const titleId = useId();
  const messageId = useId();
  const autoDismissHandlers = useToastAutoDismiss(toast, onDismiss);

  const selectAction = () => {
    if (toast.action === null) return;
    try {
      toast.action.onSelect();
    } finally {
      if (toast.action.dismissOnSelect !== false) onDismiss(toast.id);
    }
  };

  return (
    <li
      {...autoDismissHandlers}
      className={[styles.toast, styles[toast.tone]].join(" ")}
      data-toast-id={toast.id}
    >
      <article
        aria-describedby={toast.message === null ? undefined : messageId}
        aria-labelledby={titleId}
      >
        <span aria-hidden="true" className={styles.icon}>{toneIcon[toast.tone]}</span>
        <div className={styles.content}>
          <h2 className={styles.title} id={titleId}>{toast.title}</h2>
          {toast.message === null
            ? null
            : <div className={styles.message} id={messageId}>{toast.message}</div>}
          {toast.action === null ? null : (
            <button className={styles.action} type="button" onClick={selectAction}>
              {toast.action.label}
            </button>
          )}
        </div>
        <button
          aria-label={`${dismissLabel}: ${typeof toast.title === "string" ? toast.title : toast.id}`}
          className={styles.dismiss}
          type="button"
          onClick={() => onDismiss(toast.id)}
        >
          <span aria-hidden="true">×</span>
        </button>
      </article>
    </li>
  );
}

export function ToastRegion({
  dismissLabel = "关闭通知",
  label = "通知",
  onDismiss,
  toasts,
}: ToastRegionProps) {
  return (
    <section
      aria-atomic="false"
      aria-label={label}
      aria-live="polite"
      aria-relevant="additions text"
      className={styles.region}
      role="region"
    >
      <ol className={styles.list}>
        {toasts.map((toast) => (
          <ToastItem dismissLabel={dismissLabel} key={toast.id} onDismiss={onDismiss} toast={toast} />
        ))}
      </ol>
    </section>
  );
}
