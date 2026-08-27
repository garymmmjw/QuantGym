import { fireEvent, render } from "@testing-library/react";

import { useGlobalShortcut } from "./useGlobalShortcut";

const ShortcutHarness = ({
  enabled = true,
  onTrigger,
}: Readonly<{
  enabled?: boolean;
  onTrigger: () => void;
}>) => {
  useGlobalShortcut({
    enabled,
    matches: (event) => (
      (event.metaKey || event.ctrlKey)
      && event.key.toLocaleLowerCase() === "k"
    ),
    onTrigger,
  });
  return null;
};

describe("useGlobalShortcut", () => {
  it("owns the global listener, prevents the matched browser action, and cleans up", () => {
    const onTrigger = vi.fn();
    const { unmount } = render(<ShortcutHarness onTrigger={onTrigger} />);
    const event = new KeyboardEvent("keydown", {
      cancelable: true,
      key: "k",
      metaKey: true,
    });

    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(onTrigger).toHaveBeenCalledTimes(1);

    unmount();
    fireEvent.keyDown(window, { ctrlKey: true, key: "k" });
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it("does not subscribe while disabled", () => {
    const onTrigger = vi.fn();
    render(<ShortcutHarness enabled={false} onTrigger={onTrigger} />);

    fireEvent.keyDown(window, { ctrlKey: true, key: "k" });
    expect(onTrigger).not.toHaveBeenCalled();
  });
});
