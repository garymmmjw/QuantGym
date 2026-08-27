export const appLanguages = ["zh-CN", "en"] as const;

export type AppLanguage = (typeof appLanguages)[number];

export const isAppLanguage = (value: unknown): value is AppLanguage => (
  typeof value === "string"
  && appLanguages.some((language) => language === value)
);
