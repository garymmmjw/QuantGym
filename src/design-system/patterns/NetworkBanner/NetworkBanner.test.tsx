import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NetworkBanner } from "./NetworkBanner";

describe("NetworkBanner", () => {
  it("presents an offline state without owning browser connectivity listeners", async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    const onDismiss = vi.fn();
    const addEventListener = vi.spyOn(window, "addEventListener");

    render(
      <NetworkBanner
        status="offline"
        onAction={onAction}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByRole("complementary", { name: "网络连接状态" }))
      .toHaveAttribute("data-network-status", "offline");
    expect(screen.getByRole("status")).toHaveTextContent("当前处于离线状态");
    expect(addEventListener).not.toHaveBeenCalledWith("online", expect.any(Function));
    expect(addEventListener).not.toHaveBeenCalledWith("offline", expect.any(Function));

    await user.click(screen.getByRole("button", { name: "重试连接" }));
    await user.click(screen.getByRole("button", { name: "关闭离线提示" }));
    expect(onAction).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it("supports a restored state and fully replaceable copy", () => {
    render(
      <NetworkBanner
        status="restored"
        ariaLabel="Connectivity"
        title="Back online"
        message="Requests can continue."
      />,
    );

    const banner = screen.getByRole("complementary", { name: "Connectivity" });
    expect(banner).toHaveAttribute("data-network-status", "restored");
    expect(screen.getByRole("status")).toHaveTextContent("Back online");
    expect(screen.getByRole("status")).toHaveTextContent("Requests can continue.");
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
