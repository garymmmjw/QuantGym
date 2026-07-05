import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const RUN_MS = 520;
const FADE_MS = 260;

export function RouteProgressBar() {
  const location = useLocation();
  const [phase, setPhase] = useState("idle");
  const firstRenderRef = useRef(true);
  const lastPathRef = useRef(location.pathname);

  useEffect(() => {
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      lastPathRef.current = location.pathname;
      return undefined;
    }
    if (lastPathRef.current === location.pathname) return undefined;
    lastPathRef.current = location.pathname;
    setPhase("active");
    const doneTimer = window.setTimeout(() => setPhase("leaving"), RUN_MS);
    const idleTimer = window.setTimeout(() => setPhase("idle"), RUN_MS + FADE_MS);
    return () => {
      window.clearTimeout(doneTimer);
      window.clearTimeout(idleTimer);
    };
  }, [location.pathname]);

  if (phase === "idle") return null;

  return (
    <div
      className={phase === "leaving" ? "qg-route-loader is-leaving" : "qg-route-loader"}
      aria-hidden="true"
    >
      <div className="qg-route-loader-bar"></div>
    </div>
  );
}
