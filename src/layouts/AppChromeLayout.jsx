import { HashCompatRedirect } from "../routes/HashCompatRedirect.jsx";
import { AppShell } from "../components/shell/AppShell.jsx";

/** Authenticated shell; child routes render via Outlet inside AppShellMain. */
export function AppChromeLayout() {
  return (
    <>
      <HashCompatRedirect />
      <AppShell />
    </>
  );
}
