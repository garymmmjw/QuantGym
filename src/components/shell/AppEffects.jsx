import { useEffect, useRef } from "react";
import { bootstrapApp } from "../../app/bootstrapApp.js";
import { useAuthStore } from "../../stores/AppServicesContext.jsx";

export function AppEffects({ appServices }) {
  const disposeRef = useRef(null);
  const currentUser = useAuthStore((state) => state.currentUser) || appServices?.appState?.currentUser;

  useEffect(() => {
    if (!appServices) return undefined;
    let cancelled = false;
    let frameId = 0;

    function hasRequiredShell() {
      const requiredId = appServices.appState?.currentUser ? "appShell" : "authShell";
      return Boolean(document.getElementById(requiredId));
    }

    function startWhenReady(attempt = 0) {
      if (cancelled) return;
      if (hasRequiredShell() || attempt > 30) {
        disposeRef.current?.();
        disposeRef.current = bootstrapApp(appServices);
        return;
      }
      frameId = requestAnimationFrame(() => startWhenReady(attempt + 1));
    }

    startWhenReady();

    return () => {
      cancelled = true;
      if (frameId) cancelAnimationFrame(frameId);
      disposeRef.current?.();
      disposeRef.current = null;
    };
  }, [appServices, Boolean(currentUser)]);

  return null;
}
