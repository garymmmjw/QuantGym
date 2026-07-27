import "@testing-library/jest-dom/vitest";

import {
  act,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { readFileSync } from "node:fs";
import { MemoryRouter } from "react-router-dom";

import { I18nProvider } from "../shared/i18n";
import { LegacyRouteAdapter } from "./LegacyRouteAdapter";

const renderAdapter = (entry: string, language: "zh-CN" | "en" = "zh-CN") => render(
  <MemoryRouter initialEntries={[entry]}>
    <I18nProvider language={language}>
      <LegacyRouteAdapter />
    </I18nProvider>
  </MemoryRouter>,
);

afterEach(() => {
  vi.useRealTimers();
});

describe("LegacyRouteAdapter", () => {
  it("renders a clearly labelled, tightly sandboxed cross-origin compatibility frame", () => {
    renderAdapter("/skills?private=value#secret");

    expect(screen.getByText("兼容预览")).toBeVisible();
    expect(screen.getByRole("heading", { name: "能力值" })).toBeVisible();
    expect(screen.getByText(/隔离的旧版预览/u)).toBeVisible();
    const frame = screen.getByTitle("能力值 · 旧版兼容页面");
    expect(frame).toHaveAttribute(
      "src",
      "https://legacy-compat.quantgym-v2-preview.pages.dev/skills",
    );
    expect(frame).toHaveAttribute(
      "sandbox",
      "allow-forms allow-same-origin allow-scripts",
    );
    expect(frame).toHaveAttribute("referrerpolicy", "no-referrer");
    expect(frame.getAttribute("sandbox")).not.toMatch(/popup|top-navigation|download/u);
    expect(frame.getAttribute("src")).not.toMatch(/[?#]/u);
    expect(screen.getByRole("status")).toHaveTextContent("正在载入兼容页面");
  });

  it("announces ready, error, and explicit reload states", () => {
    vi.useFakeTimers();
    renderAdapter("/problems");

    const initialFrame = screen.getByTitle("题目 · 旧版兼容页面");
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    const error = screen.getByRole("alert");
    expect(error).toHaveTextContent("兼容页面暂时无法载入");

    fireEvent.click(screen.getAllByRole("button", { name: "重新加载兼容页面" })[1]!);
    expect(screen.getByRole("status")).toHaveTextContent("正在载入兼容页面");
    const reloadedFrame = screen.getByTitle("题目 · 旧版兼容页面");
    expect(reloadedFrame).not.toBe(initialFrame);
    expect(reloadedFrame).toHaveAttribute(
      "src",
      "https://legacy-compat.quantgym-v2-preview.pages.dev/problems",
    );
    fireEvent.load(reloadedFrame);
    expect(screen.getByRole("status")).toHaveTextContent("兼容页面已载入");
  });

  it("does not replace a confirmed ready state when the load timer settles", () => {
    vi.useFakeTimers();
    renderAdapter("/network");

    fireEvent.load(screen.getByTitle("人脉 · 旧版兼容页面"));
    act(() => {
      vi.advanceTimersByTime(20_000);
    });

    expect(screen.getByRole("status")).toHaveTextContent("兼容页面已载入");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not create a frame for an unapproved route", () => {
    renderAdapter("/admin?next=/plan");

    expect(screen.getByRole("alert")).toHaveTextContent("不在兼容预览白名单");
    expect(screen.queryByTitle(/旧版兼容页面/u)).not.toBeInTheDocument();
  });

  it("keeps the adapter independent from V1 state, data clients, and window bridges", () => {
    const source = [
      readFileSync("src/legacy-preview/LegacyRouteAdapter.tsx", "utf8"),
      readFileSync("src/legacy-preview/unmigratedRoutes.ts", "utf8"),
    ].join("\n");

    expect(source).not.toMatch(/postMessage/u);
    expect(source).not.toMatch(/@tanstack\/react-query|zustand/u);
    expect(source).not.toMatch(/src\/(?:app|features|modules|routes|stores|ui)\//u);
    expect(source).not.toMatch(/(?:localStorage|sessionStorage|document\\.cookie)/u);
  });

  it("provides the same compatibility disclosure and controls in English", () => {
    renderAdapter("/account", "en");

    expect(screen.getByText("Compatibility preview")).toBeVisible();
    expect(screen.getByRole("heading", { name: "Account" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Reload compatibility page" })).toBeVisible();
    expect(screen.getByRole("status")).toHaveTextContent("Loading compatibility page");
  });
});
