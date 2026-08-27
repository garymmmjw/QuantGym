import { Spinner } from "../../design-system/primitives/Spinner";
import { useI18n } from "../../shared/i18n";

export const ProblemsRouteLoadingFallback = () => {
  const { language } = useI18n();

  return (
    <Spinner
      label={language === "zh-CN" ? "正在载入题目训练" : "Loading problem training"}
      size="large"
    />
  );
};
