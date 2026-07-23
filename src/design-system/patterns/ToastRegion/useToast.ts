import { useContext } from "react";

import { ToastContext } from "./toastContext";

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === null) throw new Error("TOAST_PROVIDER_REQUIRED");
  return context;
};
