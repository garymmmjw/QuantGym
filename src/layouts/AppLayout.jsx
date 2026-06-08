import { Outlet } from "react-router-dom";
import { HashCompatRedirect } from "../routes/HashCompatRedirect.jsx";

/** Route outlet only; visible chrome lives in AppShell. */
export function AppLayout() {
  return (
    <>
      <HashCompatRedirect />
      <Outlet />
    </>
  );
}
