import { getQuantyAsset, QUANTY_DEFAULT_SIZES } from "@/lib/quantyAssets.js";

export function QuantyImage({
  asset: assetName,
  alt = "",
  size = "small",
  sizes,
  priority = false,
  loading,
  decoding = "async",
  width,
  height,
  ...props
}) {
  const asset = getQuantyAsset(assetName);
  const renderedWidth = width ?? asset.width;
  const renderedHeight = height ?? (width ? Math.round((width * asset.height) / asset.width) : asset.height);

  return (
    <img
      {...props}
      src={asset.src}
      srcSet={asset.srcSet}
      sizes={sizes ?? QUANTY_DEFAULT_SIZES[size] ?? QUANTY_DEFAULT_SIZES.small}
      width={renderedWidth}
      height={renderedHeight}
      alt={alt}
      loading={priority ? "eager" : (loading ?? "lazy")}
      decoding={decoding}
      fetchPriority={priority ? "high" : undefined}
    />
  );
}
