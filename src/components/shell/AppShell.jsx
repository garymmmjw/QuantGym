import { useEffect } from "react";
import { TopbarShell } from "./TopbarShell.jsx";
import { AuthShell } from "./AuthShell.jsx";
import { AppShellMain } from "./AppShellMain.jsx";
import { TodoShell } from "./TodoShell.jsx";
import { SkillTemplate } from "./SkillTemplate.jsx";

function useAuthStatCounters() {
  useEffect(() => {
    function easeOutQuart(t) {
      return 1 - (1 - t) ** 4;
    }

    function animateCounter(el) {
      const target = parseInt(el.dataset.count, 10);
      const suffix = el.dataset.suffix || "";
      const duration = 1600;
      let start = null;

      function format(n) {
        return n >= 1000 ? `${Math.floor(n / 100) / 10},000` : String(n);
      }

      function step(ts) {
        if (!start) start = ts;
        const progress = Math.min((ts - start) / duration, 1);
        const value = Math.floor(easeOutQuart(progress) * target);
        el.textContent = `${format(value)}${suffix}`;
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = `${format(target)}${suffix}`;
      }

      requestAnimationFrame(step);
    }

    function runCounters() {
      document.querySelectorAll(".auth-stat-num[data-count]").forEach((el) => animateCounter(el));
    }

    const brand = document.querySelector(".auth-brand");
    if (!brand) return undefined;

    if ("IntersectionObserver" in window) {
      const obs = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting) {
          runCounters();
          obs.disconnect();
        }
      }, { threshold: 0.3 });
      obs.observe(brand);
      return () => obs.disconnect();
    }

    const timer = window.setTimeout(runCounters, 400);
    return () => window.clearTimeout(timer);
  }, []);
}

export function AppShell() {
  useAuthStatCounters();
  return (
    <>
      <TopbarShell />
      <AuthShell />
      <AppShellMain />
      <TodoShell />
      <SkillTemplate />
    </>
  );
}
