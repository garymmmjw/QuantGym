import "@testing-library/jest-dom/vitest";

import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect } from "react";

import { ToastProvider } from "./ToastProvider";
import type { ToastQueueApi } from "./types";
import { useToast } from "./useToast";

function ToastHarness({ onReady }: Readonly<{ onReady: (api: ToastQueueApi) => void }>) {
  const api = useToast();
  useEffect(() => onReady(api), [api, onReady]);
  return <p>Application content</p>;
}

const renderToasts = (props: Readonly<{
  defaultDurationMs?: number;
  dismissLabel?: string;
  maxToasts?: number;
}> = {}) => {
  const mounted: { api: ToastQueueApi | null } = { api: null };
  const onReady = (api: ToastQueueApi) => {
    mounted.api = api;
  };
  render(
    <ToastProvider {...props}>
      <ToastHarness onReady={onReady} />
    </ToastProvider>,
  );
  if (mounted.api === null) throw new Error("Toast API was not mounted");
  return mounted.api;
};

describe("ToastRegion", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.documentElement.removeAttribute("data-qg-motion");
  });

  it("adds and manually removes queued messages from a polite live region", () => {
    const api = renderToasts();

    act(() => {
      api.addToast({ id: "saved", title: "已保存", message: "计划已经更新。", durationMs: null });
      api.addToast({ id: "synced", title: "已同步", tone: "success", durationMs: null });
    });

    const region = screen.getByRole("region", { name: "通知" });
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveTextContent("已保存");
    expect(region).toHaveTextContent("已同步");

    fireEvent.click(screen.getByRole("button", { name: "关闭通知: 已保存" }));
    expect(screen.queryByText("已保存")).not.toBeInTheDocument();
    expect(screen.getByText("已同步")).toBeInTheDocument();

    act(() => api.clearToasts());
    expect(screen.queryByText("已同步")).not.toBeInTheDocument();
  });

  it("uses the supplied language for the dismiss action", () => {
    const api = renderToasts({ dismissLabel: "Dismiss notification" });
    act(() => api.addToast({ title: "Saved", durationMs: null }));

    expect(screen.getByRole("button", { name: "Dismiss notification: Saved" })).toBeVisible();
  });

  it("deduplicates by key, replaces copy, and restarts automatic dismissal", () => {
    vi.useFakeTimers();
    const api = renderToasts({ defaultDurationMs: 1_000 });

    act(() => {
      api.addToast({ dedupeKey: "preferences", title: "正在保存" });
      vi.advanceTimersByTime(800);
      api.addToast({ dedupeKey: "preferences", title: "保存完成", tone: "success" });
    });

    expect(screen.queryByText("正在保存")).not.toBeInTheDocument();
    expect(screen.getAllByText("保存完成")).toHaveLength(1);
    act(() => vi.advanceTimersByTime(800));
    expect(screen.getByText("保存完成")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByText("保存完成")).not.toBeInTheDocument();
  });

  it("runs an action immediately and removes its toast without waiting for motion", () => {
    document.documentElement.dataset.qgMotion = "reduced";
    const onSelect = vi.fn();
    const api = renderToasts();

    act(() => {
      api.addToast({
        title: "同步失败",
        durationMs: null,
        action: { label: "立即重试", onSelect },
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "立即重试" }));

    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByText("同步失败")).not.toBeInTheDocument();
  });

  it("keeps an actionable toast available until the user chooses an action", () => {
    vi.useFakeTimers();
    const onSelect = vi.fn();
    const api = renderToasts({ defaultDurationMs: 1_000 });

    act(() => {
      api.addToast({
        title: "同步失败",
        action: { label: "立即重试", onSelect },
      });
      vi.advanceTimersByTime(10_000);
    });

    expect(screen.getByText("同步失败")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "立即重试" }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByText("同步失败")).not.toBeInTheDocument();
  });

  it("exposes a mutation recovery state without changing live-region behavior", () => {
    const api = renderToasts();
    act(() => api.addToast({
      durationMs: null,
      recoveryState: "stale-version-conflict",
      title: "偏好版本已变化",
    }));

    expect(screen.getByText("偏好版本已变化").closest("li")).toHaveAttribute(
      "data-recovery-state",
      "stale-version-conflict",
    );
  });

  it("pauses automatic dismissal while hovered and resumes with the remaining time", () => {
    vi.useFakeTimers();
    const api = renderToasts({ defaultDurationMs: 1_000 });
    act(() => api.addToast({ id: "hovered", title: "保存完成" }));
    const toast = screen.getByText("保存完成").closest("li");
    if (toast === null) throw new Error("Toast item was not rendered");

    act(() => vi.advanceTimersByTime(400));
    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.getByText("保存完成")).toBeInTheDocument();

    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(599));
    expect(screen.getByText("保存完成")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText("保存完成")).not.toBeInTheDocument();
  });

  it("pauses automatic dismissal while focus remains within the toast", () => {
    vi.useFakeTimers();
    const api = renderToasts({ defaultDurationMs: 1_000 });
    act(() => api.addToast({ id: "focused", title: "计划已更新" }));
    const dismissButton = screen.getByRole("button", { name: "关闭通知: 计划已更新" });

    act(() => vi.advanceTimersByTime(300));
    fireEvent.focus(dismissButton);
    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.getByText("计划已更新")).toBeInTheDocument();

    fireEvent.blur(dismissButton, { relatedTarget: null });
    act(() => vi.advanceTimersByTime(699));
    expect(screen.getByText("计划已更新")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText("计划已更新")).not.toBeInTheDocument();
  });

  it("pauses automatic dismissal while the document is hidden", () => {
    vi.useFakeTimers();
    const visibilityState = vi.spyOn(document, "visibilityState", "get");
    visibilityState.mockReturnValue("visible");
    const api = renderToasts({ defaultDurationMs: 1_000 });
    act(() => api.addToast({ id: "backgrounded", title: "后台同步完成" }));

    act(() => vi.advanceTimersByTime(400));
    visibilityState.mockReturnValue("hidden");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(2_000));
    expect(screen.getByText("后台同步完成")).toBeInTheDocument();

    visibilityState.mockReturnValue("visible");
    act(() => document.dispatchEvent(new Event("visibilitychange")));
    act(() => vi.advanceTimersByTime(599));
    expect(screen.getByText("后台同步完成")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText("后台同步完成")).not.toBeInTheDocument();
  });

  it("keeps only the configured queue capacity", () => {
    const api = renderToasts({ maxToasts: 2 });
    act(() => {
      api.addToast({ title: "First", durationMs: null });
      api.addToast({ title: "Second", durationMs: null });
      api.addToast({ title: "Third", durationMs: null });
    });

    expect(screen.queryByText("First")).not.toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(screen.getByText("Third")).toBeInTheDocument();
  });
});
