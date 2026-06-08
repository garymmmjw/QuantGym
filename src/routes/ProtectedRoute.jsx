import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppServicesContext, useAuthStore } from "../stores/AppServicesContext.jsx";

export function ProtectedRoute() {
  const appServices = useAppServicesContext();
  const currentUser = useAuthStore((state) => state.currentUser) || appServices.appState?.currentUser;
  const location = useLocation();
  if (!currentUser) {
    if (location.pathname === "/login") return null;
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return <Outlet />;
}
