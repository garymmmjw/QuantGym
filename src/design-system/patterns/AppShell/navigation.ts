import type {
  ShellLanguage,
  ShellNavigationGroup,
  ShellNavigationItem,
} from "./shell.types";
import { localizeShellText } from "./shell.types";

const item = (
  id: string,
  path: string,
  icon: ShellNavigationItem["icon"],
  zhCN: string,
  en: string,
): ShellNavigationItem => ({
  id,
  path,
  icon,
  label: { "zh-CN": zhCN, en },
});

export const SHELL_NAVIGATION_GROUPS: readonly ShellNavigationGroup[] = Object.freeze([
  {
    id: "growth",
    label: { "zh-CN": "成长", en: "Growth" },
    items: [
      item("overview", "/", "grid", "总览", "Overview"),
      item("plan", "/plan", "calendar", "计划", "Plan"),
      item("skills", "/skills", "skills", "能力值", "Skills"),
      item("league", "/league", "league", "联赛", "League"),
    ],
  },
  {
    id: "training",
    label: { "zh-CN": "训练", en: "Training" },
    items: [
      item("interview", "/interview", "interview", "模拟面试", "Interview"),
      item("problems", "/problems", "problems", "题目", "Problems"),
      item("tools", "/tools", "tools", "训练工具", "Tools"),
      item("poker", "/poker", "poker", "Poker", "Poker"),
      item("experiences", "/experiences", "memory", "面经", "Experiences"),
    ],
  },
  {
    id: "social",
    label: { "zh-CN": "社群", en: "Social" },
    items: [
      item("news", "/news", "news", "新闻", "News"),
      item("community", "/community", "community", "论坛", "Community"),
      item("messages", "/messages", "messages", "聊天", "Messages"),
      item("network", "/network", "network", "人脉", "Network"),
    ],
  },
  {
    id: "career",
    label: { "zh-CN": "求职", en: "Career" },
    items: [
      item("resume", "/resume", "resume", "简历", "Resume"),
      item("jobs", "/jobs", "briefcase", "求职", "Jobs"),
      item("companies", "/companies", "building", "公司", "Companies"),
    ],
  },
  {
    id: "resources",
    label: { "zh-CN": "资源", en: "Resources" },
    items: [
      item("library", "/library", "library", "资料库", "Library"),
      item("courses", "/courses", "courses", "课程", "Courses"),
      item("memory", "/memory", "memory", "资料笔记", "Memory"),
    ],
  },
  {
    id: "platform",
    label: { "zh-CN": "我的", en: "Platform" },
    items: [
      item("settings", "/settings", "settings", "设置", "Settings"),
      item("account", "/account", "account", "账户", "Account"),
    ],
  },
]);

export const SHELL_NAVIGATION_ITEMS = Object.freeze(
  SHELL_NAVIGATION_GROUPS.flatMap((group) => group.items),
);

const pkRoute = item("pk", "/pk", "league", "PK 对战", "PK Arena");

export const PREVIEW_BUSINESS_ROUTES: readonly ShellNavigationItem[] = Object.freeze([
  ...SHELL_NAVIGATION_ITEMS,
  pkRoute,
]);

const primaryIds = new Set(["overview", "plan", "problems", "interview"]);
export const MOBILE_PRIMARY_NAVIGATION = Object.freeze(
  SHELL_NAVIGATION_ITEMS.filter((navigationItem) => primaryIds.has(navigationItem.id)),
);

export const shellRouteTitle = (pathname: string, language: ShellLanguage) => {
  const navigationItem = PREVIEW_BUSINESS_ROUTES.find(({ path }) => path === pathname);
  if (navigationItem === undefined) {
    return language === "zh-CN" ? "页面未找到" : "Page not found";
  }
  return localizeShellText(navigationItem.label, language);
};
