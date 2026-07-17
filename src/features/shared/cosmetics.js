/**
 * Shop cosmetics helpers — 商店装扮的真实生效面共用逻辑。
 *
 * Ownership is READ-ONLY here: the single source of truth is the economy
 * API (`isItemOwned`). Surfaces render nothing at all when an item is not
 * owned, so unowned users see zero trace of any cosmetic.
 */
import { isItemOwned } from "../../modules/economy/index.js";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { getQuantySrc } from "../../lib/quantyAssets.js";

/** React hook: true when the signed-in user owns the one-time shop item. */
export function useOwnedCosmetic(itemId) {
  return useUserStateStore((state) => isItemOwned(state.value, itemId));
}

/**
 * 讲师鲨鱼表情包 (shop item `teacher`) — 12 stickers reusing the existing
 * Playful Precision mascot art. Stable ids remain compatible with saved
 * message tokens while the rendered source comes from the optimized set.
 */
export const TEACHER_STICKERS = [
  { id: "mascot-teacher-v2", asset: "teacher", label: "讲师开讲", labelKey: "stickerLabelTeacher" },
  { id: "mascot-hero-v5-clean", asset: "hero", label: "满血出场", labelKey: "stickerLabelHero" },
  { id: "mascot-calculator-v2", asset: "calculator", label: "速算全开", labelKey: "stickerLabelCalculator" },
  { id: "mascot-fire-v2", asset: "fire", label: "手感火热", labelKey: "stickerLabelFire" },
  { id: "mascot-levelup", asset: "levelup", label: "升级啦", labelKey: "stickerLabelLevelup" },
  { id: "mascot-trophy-v2", asset: "trophy", label: "捧杯时刻", labelKey: "stickerLabelTrophy" },
  { id: "mascot-poker", asset: "poker", label: "牌桌鲨手", labelKey: "stickerLabelPoker" },
  { id: "mascot-interview", asset: "interview", label: "面试稳住", labelKey: "stickerLabelInterview" },
  { id: "mascot-laptop-v2", asset: "laptop", label: "码力全开", labelKey: "stickerLabelLaptop" },
  { id: "mascot-search", asset: "search", label: "找找思路", labelKey: "stickerLabelSearch" },
  { id: "mascot-oops", asset: "oops", label: "翻车了", labelKey: "stickerLabelOops" },
  { id: "mascot-sleep", asset: "sleep", label: "先睡为敬", labelKey: "stickerLabelSleep" }
].map(({ asset, ...sticker }) => ({ ...sticker, src: getQuantySrc(asset, 320) }));

/* zh `label` stays the visual default; resolve the localized label via i18n
 * (`labelKey`) so EN surfaces show English sticker names. */
export function stickerLabel(sticker, t) {
  if (!sticker) return "";
  if (typeof t === "function" && sticker.labelKey) {
    const translated = t(sticker.labelKey);
    if (translated && translated !== sticker.labelKey) return translated;
  }
  return sticker.label || "";
}

/**
 * Direct-message stickers travel through the EXISTING message send path as
 * real message text (`[sticker:<id>]`) — the community store only persists
 * plain text fields, so the token keeps the data honest and normalizable.
 */
export function stickerMessageText(stickerId) {
  return `[sticker:${stickerId}]`;
}

const STICKER_TOKEN_RE = /^\[sticker:([a-z0-9-]+)\]$/;

/** Returns the sticker for a message text token, or null for normal text. */
export function parseStickerText(text) {
  const match = STICKER_TOKEN_RE.exec(String(text || "").trim());
  if (!match) return null;
  return TEACHER_STICKERS.find((sticker) => sticker.id === match[1]) || null;
}
