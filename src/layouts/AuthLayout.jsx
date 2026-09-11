import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { AuthShell } from "../components/shell/AuthShell.jsx";
import { useAppServicesContext, useAuthStore } from "../stores/AppServicesContext.jsx";
import { clearCloudReauthentication, getCloudReauthentication, getPendingAuthReturnPath, clearPendingAuthReturnPath, safeReturnPath } from "../state/cloudReauthentication.js";

function LoginSuccessRedirect() {
  const location = useLocation();
  const from = location.state?.from;
  const previousPath = typeof from === "string" ? from : from?.pathname ? `${from.pathname}${from.search || ""}${from.hash || ""}` : "/";
  const target = safeReturnPath(getCloudReauthentication()?.returnTo || getPendingAuthReturnPath() || previousPath, "/");
  useEffect(() => { clearCloudReauthentication(); clearPendingAuthReturnPath(); }, []);
  return <Navigate to={target} replace />;
}

export function AuthLayout() {
  const appServices = useAppServicesContext();
  const currentUser = useAuthStore((state) => state.currentUser) || appServices.appState?.currentUser;
  if (currentUser) return <LoginSuccessRedirect />;
  return <AuthShell />;
}
