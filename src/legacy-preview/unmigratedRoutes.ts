export const LEGACY_PREVIEW_ORIGIN = (
  "https://legacy-compat.quantgym-v2-preview.pages.dev"
) as const;
export const LEGACY_PREVIEW_COMMIT = (
  "7a85c2a43b24013d5a49969eca7b4a5f1d093640"
) as const;

export type UnmigratedRoute = Readonly<{
  id: string;
  path: string;
  label: Readonly<{
    "zh-CN": string;
    en: string;
  }>;
}>;

export const UNMIGRATED_ROUTES = Object.freeze([
  { id: "skills", path: "/skills", label: { "zh-CN": "能力值", en: "Skills" } },
  { id: "league", path: "/league", label: { "zh-CN": "联赛", en: "League" } },
  { id: "interview", path: "/interview", label: { "zh-CN": "模拟面试", en: "Interview" } },
  { id: "tools", path: "/tools", label: { "zh-CN": "训练工具", en: "Tools" } },
  { id: "poker", path: "/poker", label: { "zh-CN": "Poker", en: "Poker" } },
  { id: "experiences", path: "/experiences", label: { "zh-CN": "面经", en: "Experiences" } },
  { id: "news", path: "/news", label: { "zh-CN": "新闻", en: "News" } },
  { id: "community", path: "/community", label: { "zh-CN": "论坛", en: "Community" } },
  { id: "messages", path: "/messages", label: { "zh-CN": "聊天", en: "Messages" } },
  { id: "network", path: "/network", label: { "zh-CN": "人脉", en: "Network" } },
  { id: "resume", path: "/resume", label: { "zh-CN": "简历", en: "Resume" } },
  { id: "jobs", path: "/jobs", label: { "zh-CN": "求职", en: "Jobs" } },
  { id: "companies", path: "/companies", label: { "zh-CN": "公司", en: "Companies" } },
  { id: "library", path: "/library", label: { "zh-CN": "资料库", en: "Library" } },
  { id: "courses", path: "/courses", label: { "zh-CN": "课程", en: "Courses" } },
  { id: "memory", path: "/memory", label: { "zh-CN": "资料笔记", en: "Memory" } },
  { id: "settings", path: "/settings", label: { "zh-CN": "设置", en: "Settings" } },
  { id: "account", path: "/account", label: { "zh-CN": "账户", en: "Account" } },
  { id: "pk", path: "/pk", label: { "zh-CN": "PK 对战", en: "PK Arena" } },
] as const satisfies readonly UnmigratedRoute[]);

const routesByPath: ReadonlyMap<string, UnmigratedRoute> = new Map(
  UNMIGRATED_ROUTES.map((route) => [route.path, route]),
);

const stripQueryAndFragment = (value: string) => value.split(/[?#]/u, 1)[0] ?? "";

export const normalizeUnmigratedPathname = (value: unknown): string | null => {
  if (typeof value !== "string") return null;

  const pathname = stripQueryAndFragment(value).trim();
  if (
    pathname === ""
    || !pathname.startsWith("/")
    || pathname.startsWith("//")
    || pathname.includes("\\")
    || /%(?:2e|2f|5c)/iu.test(pathname)
  ) {
    return null;
  }

  const normalized = pathname
    .replace(/\/{2,}/gu, "/")
    .replace(/\/+$/u, "") || "/";

  return routesByPath.has(normalized) ? normalized : null;
};

export const resolveUnmigratedRoute = (value: unknown): UnmigratedRoute | null => {
  const pathname = normalizeUnmigratedPathname(value);
  return pathname === null ? null : routesByPath.get(pathname) ?? null;
};

export const buildLegacyPreviewUrl = (value: unknown): string | null => {
  const pathname = normalizeUnmigratedPathname(value);
  if (pathname === null) return null;

  const url = new URL(pathname, `${LEGACY_PREVIEW_ORIGIN}/`);
  url.search = "";
  url.hash = "";
  return url.href;
};
