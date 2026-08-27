import type { ReactNode } from "react";

export type ShellLanguage = "zh-CN" | "en";
export type ShellTheme = "light" | "dark";

export type ShellIconName =
  | "account"
  | "briefcase"
  | "building"
  | "calendar"
  | "community"
  | "courses"
  | "grid"
  | "interview"
  | "league"
  | "library"
  | "memory"
  | "messages"
  | "network"
  | "problems"
  | "resume"
  | "settings"
  | "skills"
  | "tools"
  | "news"
  | "poker"
  | "menu"
  | "search"
  | "bell"
  | "moon"
  | "sun"
  | "panel";

export type LocalizedShellText = Readonly<Record<ShellLanguage, string>>;

export type ShellNavigationItem = Readonly<{
  id: string;
  icon: ShellIconName;
  label: LocalizedShellText;
  path: string;
}>;

export type ShellNavigationGroup = Readonly<{
  id: string;
  label: LocalizedShellText;
  items: readonly ShellNavigationItem[];
}>;

export type ShellUser = Readonly<{
  displayName: string;
  email?: string | undefined;
}>;

export type ShellAction = Readonly<{
  label: string;
  onAction: () => void;
  icon?: ReactNode;
}>;

export const localizeShellText = (text: LocalizedShellText, language: ShellLanguage) => (
  text[language]
);
