import type { ReactNode } from "react";

export type ToastTone = "danger" | "info" | "success" | "warning";

export type ToastAction = Readonly<{
  dismissOnSelect?: boolean;
  label: ReactNode;
  onSelect: () => void;
}>;

export type ToastInput = Readonly<{
  action?: ToastAction;
  dedupeKey?: string;
  durationMs?: number | null;
  id?: string;
  message?: ReactNode;
  title: ReactNode;
  tone?: ToastTone;
}>;

export type ToastRecord = Readonly<{
  action: ToastAction | null;
  dedupeKey: string | null;
  durationMs: number | null;
  id: string;
  message: ReactNode | null;
  revision: number;
  title: ReactNode;
  tone: ToastTone;
}>;

export type ToastQueueApi = Readonly<{
  addToast: (toast: ToastInput) => string;
  clearToasts: () => void;
  dismissToast: (id: string) => void;
}>;
