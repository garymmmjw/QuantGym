import { act, renderHook } from "@testing-library/react";

import { useOnlineStatus } from "./useOnlineStatus";

describe("useOnlineStatus", () => {
  it("reads the browser status and follows offline and online events", () => {
    let online = true;
    vi.spyOn(navigator, "onLine", "get").mockImplementation(() => online);

    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);

    act(() => {
      online = false;
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);

    act(() => {
      online = true;
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });

  it("removes both browser listeners when the consumer unmounts", () => {
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith("online", expect.any(Function));
    expect(removeEventListener).toHaveBeenCalledWith("offline", expect.any(Function));
  });
});
