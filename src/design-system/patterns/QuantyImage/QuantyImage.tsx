import type { ImgHTMLAttributes } from "react";

import styles from "./QuantyImage.module.css";
import { QUANTY_ASSETS, type QuantyAssetName } from "./quantyAssets.generated";

export type QuantyImageSize = "avatar" | "small" | "medium" | "hero";
export type QuantyProminence = "primary" | "supporting";

const defaultSizes: Readonly<Record<QuantyImageSize, string>> = Object.freeze({
  avatar: "64px",
  small: "120px",
  medium: "240px",
  hero: "(max-width: 860px) 220px, 300px",
});

export type QuantyImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "height" | "sizes" | "src" | "srcSet" | "style" | "width"
> & Readonly<{
  asset: QuantyAssetName;
  alt: string;
  size?: QuantyImageSize;
  sizes?: string;
  priority?: boolean;
  prominence?: QuantyProminence;
}>;

export const QuantyImage = ({
  asset: assetName,
  alt,
  size = "small",
  sizes,
  priority = false,
  prominence = "supporting",
  loading,
  decoding = "async",
  fetchPriority,
  className,
  ...imageProps
}: QuantyImageProps) => {
  const asset = QUANTY_ASSETS[assetName];
  const defaultVariant = asset.variants[1];
  if (defaultVariant === undefined) {
    throw new Error(`Quanty asset ${assetName} is missing its 320px variant.`);
  }

  const srcSet = asset.variants
    .map((variant) => `${variant.src} ${variant.width}w`)
    .join(", ");
  const imageClassName = [styles.root, styles[size], className].filter(Boolean).join(" ");

  return (
    <img
      {...imageProps}
      className={imageClassName}
      src={defaultVariant.src}
      srcSet={srcSet}
      sizes={sizes ?? defaultSizes[size]}
      width={asset.intrinsicWidth}
      height={asset.intrinsicHeight}
      alt={alt}
      loading={priority ? "eager" : (loading ?? "lazy")}
      decoding={decoding}
      fetchPriority={priority ? "high" : fetchPriority}
      data-quanty-asset={assetName}
      data-quanty-role={asset.role}
      data-quanty-prominence={prominence}
    />
  );
};
