import { createContext } from "react";

import type { ToastQueueApi } from "./types";

export const ToastContext = createContext<ToastQueueApi | null>(null);
