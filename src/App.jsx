import { BrowserRouter, useLocation } from "react-router-dom";
import { AppServicesProvider } from "./stores/AppServicesContext.jsx";
import { AppRoutes } from "./routes/routes.jsx";
import { AppEffects } from "./components/shell/AppEffects.jsx";

function StudentAppEffects({ appServices }) {
  const location = useLocation();
  // The guardian page has its own session and never boots the student shell.
  if (location.pathname.replace(/\/+$/, "") === "/guardian") return null;
  return <AppEffects appServices={appServices} />;
}

export function App({ appServices }) {
  return (
    <AppServicesProvider appServices={appServices}>
      <BrowserRouter>
        <StudentAppEffects appServices={appServices} />
        <AppRoutes />
      </BrowserRouter>
    </AppServicesProvider>
  );
}
