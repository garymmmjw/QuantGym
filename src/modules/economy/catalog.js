/**
 * QuantGym economy catalog constants (design truth: ui-design/qg-state.js).
 * Consumers must import these via `src/modules/economy/index.js`.
 */

import { getQuantySrc } from "../../lib/quantyAssets.js";

/* Chinese `name`/`desc`/`label` remain the visual authority; the `*En`
 * fields and `nameKey`/`descKey`/`labelKey` i18n keys let consumers render
 * the shop and tiers in English without mutating the zh copy. */
export const SHOP_ITEMS = [
  { id: "freeze", name: "连胜冻结卡", nameEn: "Streak Freeze Card", nameKey: "shopItemFreezeName", desc: "断签自动抵挡 1 天，连胜不清零", descEn: "Auto-blocks one missed day so your streak survives", descKey: "shopItemFreezeDesc", img: "/assets/generated/playful-precision/reward-fire.webp", price: 350, stackable: true },
  { id: "poker-skin", name: "鲨鱼牌手皮肤", nameEn: "Shark Card Player Skin", nameKey: "shopItemPokerSkinName", desc: "Poker 桌专属出场形象", descEn: "Exclusive entrance look at the poker table", descKey: "shopItemPokerSkinDesc", img: getQuantySrc("poker", 320), price: 500 },
  { id: "frame", name: "庆典彩带头像框", nameEn: "Confetti Avatar Frame", nameKey: "shopItemFrameName", desc: "排行榜与论坛头像特效", descEn: "Avatar effect on the leaderboard and forum", descKey: "shopItemFrameDesc", img: getQuantySrc("levelup", 320), price: 420 },
  { id: "teacher", name: "讲师鲨鱼表情包", nameEn: "Teacher Shark Sticker Pack", nameKey: "shopItemTeacherName", desc: "聊天与论坛专属贴纸", descEn: "Exclusive stickers for chat and the forum", descKey: "shopItemTeacherDesc", img: getQuantySrc("teacher", 320), price: 260 },
  { id: "coder", name: "键盘侠鲨鱼贴纸", nameEn: "Keyboard Shark Sticker", nameKey: "shopItemCoderName", desc: "简历与笔记页彩蛋装饰", descEn: "Easter-egg decoration on the resume and notes pages", descKey: "shopItemCoderDesc", img: getQuantySrc("laptop", 320), price: 300 },
  { id: "sleep", name: "晚安主题壁纸", nameEn: "Good-Night Wallpaper", nameKey: "shopItemSleepName", desc: "深色模式限定登录画面", descEn: "Dark-mode-only login screen", descKey: "shopItemSleepDesc", img: getQuantySrc("sleep", 320), price: 800 }
];

export const LEAGUE_TIERS = [
  { id: "intern", label: "Intern 联赛", labelEn: "Intern League" },
  { id: "analyst", label: "Analyst 联赛", labelEn: "Analyst League" },
  { id: "trader", label: "Trader 联赛", labelEn: "Trader League" },
  { id: "pm", label: "Quant PM 联赛", labelEn: "Quant PM League" }
];

export const DEFAULT_LEAGUE_TIER = "analyst";

export function getShopItem(itemId) {
  return SHOP_ITEMS.find((item) => item.id === itemId) || null;
}

export function isLeagueTier(tierId) {
  return LEAGUE_TIERS.some((tier) => tier.id === tierId);
}
