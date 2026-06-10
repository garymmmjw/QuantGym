import { useEffect } from "react";

export function useScopedRefreshIcons(refreshIcons, selector, deps = []) {
  useEffect(() => {
    if (!refreshIcons) return;
    const root = typeof selector === "string"
      ? document.querySelector(selector)
      : selector?.current || selector || document;
    refreshIcons({ root: root || document });
  }, [refreshIcons, selector, ...deps]);
}
