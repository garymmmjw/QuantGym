import { Navigate } from "react-router-dom";
import { AuthShell } from "../components/shell/AuthShell.jsx";
import { useAppServicesContext, useAuthStore } from "../stores/AppServicesContext.jsx";

export function AuthLayout() {
  const appServices = useAppServicesContext();
  const currentUser = useAuthStore((state) => state.currentUser) || appServices.appState?.currentUser;
  if (currentUser) return <Navigate to="/" replace />;
  return <AuthShell />;
}
