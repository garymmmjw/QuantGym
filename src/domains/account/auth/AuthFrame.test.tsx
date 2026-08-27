import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";

import { AuthFrame } from "./AuthFrame";

describe("AuthFrame", () => {
  it("renders exactly one primary hero Quanty from lossless responsive assets", () => {
    render(
      <AuthFrame announcement="登录表单已就绪">
        <p>Account controls</p>
      </AuthFrame>,
    );

    const quantyImages = screen.getAllByRole("img", { name: "Quanty 向你挥手" });
    expect(quantyImages).toHaveLength(1);

    const hero = quantyImages[0];
    expect(hero).toHaveAttribute("data-quanty-asset", "hero");
    expect(hero).toHaveAttribute("data-quanty-prominence", "primary");
    expect(hero).toHaveAttribute("loading", "eager");
    expect(hero).toHaveAttribute("fetchpriority", "high");
    expect(hero?.getAttribute("src")).toMatch(/\.webp$/u);
    expect(hero?.getAttribute("srcset")).not.toMatch(/\.png(?:\s|,|$)/iu);
    expect(screen.getByText("Account controls")).toBeInTheDocument();
    expect(screen.getByText("登录表单已就绪")).toHaveAttribute("aria-live", "polite");
  });
});
