import { useEffect } from "react";

export type GlobalShortcutOptions = Readonly<{
  enabled?: boolean;
  matches: (event: KeyboardEvent) => boolean;
  onTrigger: (event: KeyboardEvent) => void;
}>;

export const useGlobalShortcut = ({
  enabled = true,
  matches,
  onTrigger,
}: GlobalShortcutOptions) => {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!matches(event)) return;
      event.preventDefault();
      onTrigger(event);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, matches, onTrigger]);
};
