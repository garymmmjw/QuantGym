import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";

import { QuantyImage } from "./QuantyImage";
import { QUANTY_ASSETS, QUANTY_ASSET_NAMES } from "./quantyAssets.generated";

describe("QuantyImage", () => {
  it("keeps public sizing bounded and preserves the intrinsic aspect ratio", () => {
    type QuantyProps = ComponentProps<typeof QuantyImage>;
    type HasWidthOverride = "width" extends keyof QuantyProps ? true : false;
    type HasHeightOverride = "height" extends keyof QuantyProps ? true : false;
    type HasStyleOverride = "style" extends keyof QuantyProps ? true : false;
    type HasUnboundedFullSize = "full" extends NonNullable<QuantyProps["size"]> ? true : false;

    const hasWidthOverride: HasWidthOverride = false;
    const hasHeightOverride: HasHeightOverride = false;
    const hasStyleOverride: HasStyleOverride = false;
    const hasUnboundedFullSize: HasUnboundedFullSize = false;

    expect({
      hasWidthOverride,
      hasHeightOverride,
      hasStyleOverride,
      hasUnboundedFullSize,
    }).toEqual({
      hasWidthOverride: false,
      hasHeightOverride: false,
      hasStyleOverride: false,
      hasUnboundedFullSize: false,
    });
  });

  it("locks all 16 logical assets to 48 unique responsive WebP variants", () => {
    expect(QUANTY_ASSET_NAMES).toHaveLength(16);

    const sources = QUANTY_ASSET_NAMES.flatMap((name) => {
      const asset = QUANTY_ASSETS[name];
      expect(asset.variants.map((variant) => variant.width)).toEqual([160, 320, 640]);
      return asset.variants.map((variant) => variant.src);
    });

    expect(new Set(sources)).toHaveLength(48);
    expect(sources.every((source) => source.endsWith(".webp"))).toBe(true);
    expect(sources.every((source) => !source.includes(".png"))).toBe(true);
  });

  it("renders intrinsic dimensions, srcSet, sizes, and lazy defaults", () => {
    render(<QuantyImage asset="search" alt="Quanty searching" size="small" />);

    const image = screen.getByRole("img", { name: "Quanty searching" });
    expect(image).toHaveAttribute("src", expect.stringContaining("search-320.webp"));
    expect(image).toHaveAttribute(
      "srcset",
      expect.stringMatching(/search-160\.webp 160w, .*search-320\.webp 320w, .*search-640\.webp 640w/),
    );
    expect(image).toHaveAttribute("sizes", "120px");
    expect(image).toHaveAttribute("width", "1100");
    expect(image).toHaveAttribute("height", "1400");
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image).toHaveAttribute("decoding", "async");
    expect(image).toHaveAttribute("data-quanty-asset", "search");
  });

  it("marks a primary, high-priority mascot without changing the asset source contract", () => {
    render(
      <QuantyImage
        asset="hero"
        alt="Quanty waving"
        size="hero"
        priority
        prominence="primary"
      />,
    );

    const image = screen.getByRole("img", { name: "Quanty waving" });
    expect(image).toHaveAttribute("loading", "eager");
    expect(image).toHaveAttribute("fetchpriority", "high");
    expect(image).toHaveAttribute("data-quanty-prominence", "primary");
    expect(image).toHaveAttribute("sizes", "(max-width: 860px) 220px, 300px");
  });
});
