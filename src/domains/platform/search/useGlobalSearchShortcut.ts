import { useGlobalShortcut } from "../../../shared/lib/useGlobalShortcut";

export type GlobalSearchShortcutOptions = Readonly<{
  enabled?: boolean;
  onOpen: () => void;
}>;

export const isGlobalSearchShortcut = (
  event: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey">,
) => (
  !event.altKey
  && (event.metaKey || event.ctrlKey)
  && event.key.toLocaleLowerCase() === "k"
);

export const useGlobalSearchShortcut = ({
  enabled = true,
  onOpen,
}: GlobalSearchShortcutOptions) => {
  useGlobalShortcut({
    enabled,
    matches: isGlobalSearchShortcut,
    onTrigger: onOpen,
  });
};
