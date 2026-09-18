import { Navigate, useLocation } from "react-router-dom";

export function SettingsPage() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  if (!params.has("section")) params.set("section", "preferences");
  return <Navigate to={`/account?${params}`} replace />;
}
