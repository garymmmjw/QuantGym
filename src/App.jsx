import { BrowserRouter } from "react-router-dom";
import { AppServicesProvider } from "./stores/AppServicesContext.jsx";
import { AppRoutes } from "./routes/routes.jsx";
import { AppEffects } from "./components/shell/AppEffects.jsx";

export function App({ appServices }) {
  return (
    <AppServicesProvider appServices={appServices}>
      <AppEffects appServices={appServices} />
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppServicesProvider>
  );
}
