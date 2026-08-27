import { Spinner } from "../../design-system/primitives/Spinner";
import { useI18n } from "../../shared/i18n";

export const PlanRouteLoadingFallback = () => {
  const { language } = useI18n();

  return (
    <Spinner
      label={language === "zh-CN" ? "正在载入训练计划" : "Loading training plan"}
      size="large"
    />
  );
};
