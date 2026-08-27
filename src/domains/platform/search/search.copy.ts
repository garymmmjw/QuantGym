import type { SearchLanguage } from "./search.types";

export type CommandPaletteCopy = Readonly<{
  closeLabel: string;
  compatibilityLabel: string;
  description: string;
  empty: string;
  inputLabel: string;
  loading: string;
  placeholder: string;
  resultsLabel: string;
  title: string;
  v2Label: string;
}>;

export const commandPaletteCopy: Readonly<Record<SearchLanguage, CommandPaletteCopy>> = {
  "zh-CN": {
    closeLabel: "关闭全局搜索",
    compatibilityLabel: "兼容预览",
    description: "搜索 V2 功能，或跳转到明确标注的兼容预览页面。",
    empty: "没有找到匹配结果",
    inputLabel: "全局搜索",
    loading: "正在搜索",
    placeholder: "搜索功能或业务页面…",
    resultsLabel: "搜索结果",
    title: "全局搜索",
    v2Label: "V2",
  },
  "en": {
    closeLabel: "Close global search",
    compatibilityLabel: "Compatibility preview",
    description: "Search V2 features or navigate to clearly labelled compatibility previews.",
    empty: "No matching results",
    inputLabel: "Global search",
    loading: "Searching",
    placeholder: "Search features or business pages…",
    resultsLabel: "Search results",
    title: "Global search",
    v2Label: "V2",
  },
};
