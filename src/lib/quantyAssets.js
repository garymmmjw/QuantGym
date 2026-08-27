const QUANTY_ASSET_BASE = "/assets/generated/playful-precision/optimized";

function getVariantUrl(slug, width) {
  return `${QUANTY_ASSET_BASE}/${slug}-${width}.webp`;
}

function defineAsset(slug, width, height, master) {
  const variants = Object.freeze({
    160: getVariantUrl(slug, 160),
    320: getVariantUrl(slug, 320),
    640: getVariantUrl(slug, 640)
  });
  return Object.freeze({
    slug,
    width,
    height,
    master: `/assets/generated/playful-precision/${master}`,
    variants,
    src: variants[320],
    srcSet: [160, 320, 640]
      .map((candidateWidth) => `${variants[candidateWidth]} ${candidateWidth}w`)
      .join(", ")
  });
}

export const QUANTY_ASSETS = Object.freeze({
  hero: defineAsset("hero-wave", 1114, 1412, "mascot-hero-v6-hq.png"),
  trophy: defineAsset("trophy", 1113, 1414, "mascot-trophy-v3-hq.png"),
  calculator: defineAsset("calculator", 1112, 1415, "mascot-calculator-v3-hq.png"),
  teacher: defineAsset("teacher", 1106, 1422, "mascot-teacher-v4-hq.png"),
  fire: defineAsset("fire", 1112, 1414, "mascot-fire-v3-hq.png"),
  laptop: defineAsset("laptop", 1113, 1414, "mascot-laptop-v3-hq.png"),
  levelup: defineAsset("levelup", 1110, 1417, "mascot-levelup-v2-hq.png"),
  happy: defineAsset("avatar-happy", 1113, 1414, "avatar-happy-v3-hq.png"),
  focused: defineAsset("avatar-focused", 1112, 1415, "avatar-focused-v3-hq.png"),
  wow: defineAsset("avatar-wow", 1112, 1414, "avatar-wow-v4-hq.png"),
  wink: defineAsset("avatar-wink", 1100, 1400, "avatar-wink-v2.png"),
  interview: defineAsset("interview", 1100, 1400, "mascot-interview.png"),
  oops: defineAsset("oops", 1100, 1400, "mascot-oops.png"),
  poker: defineAsset("poker", 1100, 1400, "mascot-poker.png"),
  search: defineAsset("search", 1100, 1400, "mascot-search.png"),
  sleep: defineAsset("sleep", 1100, 1400, "mascot-sleep.png")
});

export const QUANTY_DEFAULT_SIZES = Object.freeze({
  avatar: "64px",
  small: "120px",
  medium: "240px",
  hero: "(max-width: 1080px) 220px, 300px"
});

const LEGACY_QUANTY_FILENAMES = Object.freeze({
  "mascot-hero-v5-clean.png": "hero",
  "mascot-trophy-v2.png": "trophy",
  "mascot-calculator-v2.png": "calculator",
  "mascot-teacher-v2.png": "teacher",
  "mascot-fire-v2.png": "fire",
  "mascot-laptop-v2.png": "laptop",
  "mascot-levelup.png": "levelup",
  "avatar-happy-v2.png": "happy",
  "avatar-focused-v2.png": "focused",
  "avatar-wow-v2.png": "wow",
  "avatar-wink-v2.png": "wink",
  "mascot-interview.png": "interview",
  "mascot-oops.png": "oops",
  "mascot-poker.png": "poker",
  "mascot-search.png": "search",
  "mascot-sleep.png": "sleep"
});

export function getQuantyAsset(name) {
  const asset = QUANTY_ASSETS[name];
  if (!asset) throw new Error(`Unknown Quanty asset: ${name}`);
  return asset;
}

export function getQuantySrc(name, preferredWidth = 320) {
  const asset = getQuantyAsset(name);
  const width = preferredWidth <= 160 ? 160 : preferredWidth <= 320 ? 320 : 640;
  return asset.variants[width];
}

export function resolveLegacyQuantySrc(src = "", preferredWidth = 320) {
  const cleanSrc = String(src).split(/[?#]/, 1)[0];
  const filename = cleanSrc.split("/").pop();
  const assetName = LEGACY_QUANTY_FILENAMES[filename];
  return assetName ? getQuantySrc(assetName, preferredWidth) : src;
}
