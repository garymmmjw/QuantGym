import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";

import { ToastRegion } from "./ToastRegion";
import { ToastContext } from "./toastContext";
import type { ToastInput, ToastQueueApi, ToastRecord } from "./types";

export type ToastProviderProps = Readonly<{
  children: ReactNode;
  defaultDurationMs?: number;
  dismissLabel?: string;
  maxToasts?: number;
  regionLabel?: string;
}>;

const normalizedKey = (value: string | undefined) => {
  const key = value?.trim() ?? "";
  return key.length === 0 ? null : key;
};

const normalizedId = (value: string | undefined) => {
  const id = value?.trim() ?? "";
  return id.length === 0 ? null : id;
};

const normalizedDuration = (value: number | null | undefined, fallback: number) => {
  if (value === null) return null;
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.max(0, Math.round(value));
};

export function ToastProvider({
  children,
  defaultDurationMs = 6_000,
  dismissLabel,
  maxToasts = 4,
  regionLabel,
}: ToastProviderProps) {
  const [toasts, setToasts] = useState<readonly ToastRecord[]>([]);
  const toastsRef = useRef(toasts);
  const sequence = useRef(0);
  const queueLimit = Math.max(1, Math.floor(maxToasts));
  const fallbackDuration = Math.max(0, Math.round(defaultDurationMs));

  const updateToasts = useCallback((update: (current: readonly ToastRecord[]) => readonly ToastRecord[]) => {
    const next = update(toastsRef.current);
    toastsRef.current = next;
    setToasts(next);
  }, []);

  const dismissToast = useCallback((id: string) => {
    updateToasts((current) => current.filter((toast) => toast.id !== id));
  }, [updateToasts]);

  const clearToasts = useCallback(() => {
    updateToasts(() => []);
  }, [updateToasts]);

  const addToast = useCallback((input: ToastInput) => {
    const dedupeKey = normalizedKey(input.dedupeKey);
    const requestedId = normalizedId(input.id);
    const duplicate = toastsRef.current.find((toast) => (
      (requestedId !== null && toast.id === requestedId)
      || (dedupeKey !== null && toast.dedupeKey === dedupeKey)
    ));
    sequence.current += 1;
    const id = requestedId ?? duplicate?.id ?? `qg-toast-${sequence.current}`;
    const record: ToastRecord = {
      action: input.action ?? null,
      dedupeKey,
      durationMs: normalizedDuration(input.durationMs, fallbackDuration),
      id,
      message: input.message ?? null,
      revision: (duplicate?.revision ?? 0) + 1,
      recoveryState: input.recoveryState ?? null,
      title: input.title,
      tone: input.tone ?? "info",
    };

    updateToasts((current) => {
      const duplicateIndex = current.findIndex((toast) => (
        toast.id === id || (dedupeKey !== null && toast.dedupeKey === dedupeKey)
      ));
      if (duplicateIndex >= 0) {
        return current.map((toast, index) => index === duplicateIndex ? record : toast);
      }
      return [...current, record].slice(-queueLimit);
    });
    return id;
  }, [fallbackDuration, queueLimit, updateToasts]);

  const api = useMemo<ToastQueueApi>(() => ({
    addToast,
    clearToasts,
    dismissToast,
  }), [addToast, clearToasts, dismissToast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <ToastRegion
        {...(dismissLabel === undefined ? {} : { dismissLabel })}
        {...(regionLabel === undefined ? {} : { label: regionLabel })}
        onDismiss={dismissToast}
        toasts={toasts}
      />
    </ToastContext.Provider>
  );
}
