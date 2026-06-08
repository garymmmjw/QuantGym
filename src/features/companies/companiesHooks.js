import { useCallback, useMemo, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";

export function useCompaniesPageModel() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const userState = useUserStateStore((state) => state.value || {});
  const [tierFilter, setTierFilterState] = useState(() => appServices.companyTierFilterState?.getTier?.() || "all");

  const t = appServices.t || ((key) => key);
  const language = appServices.getLanguage?.() || "zh";
  const isEnglish = language === "en";
  const companies = appServices.companyDefs || [];
  const problems = userState.problems || appServices.getCatalogProblems?.() || [];

  const entries = useMemo(() => {
    const tierWeight = appServices.companyTierWeight || (() => 5);
    return companies
      .map((company) => ({
        company,
        stats: appServices.getCompanyProblemStats?.(company, problems) || { total: 0, completed: 0, percent: 0 },
        jobs: appServices.getCompanyJobs?.(company) || []
      }))
      .filter((entry) => tierFilter === "all" || entry.company.tier.toLowerCase() === tierFilter)
      .sort((left, right) => (
        tierWeight(left.company.tier) - tierWeight(right.company.tier)
        || right.stats.total - left.stats.total
        || left.company.name.localeCompare(right.company.name)
      ));
  }, [companies, problems, tierFilter, appServices]);

  const setTierFilter = useCallback((value) => {
    appServices.companyTierFilterState?.setTier?.(value);
    setTierFilterState(value);
  }, [appServices]);

  const summary = appServices.formatCompanySummary?.(
    entries.length,
    entries.reduce((sum, entry) => sum + entry.stats.total, 0)
  ) || "";

  return {
    t,
    isEnglish,
    entries,
    tierFilter,
    setTierFilter,
    summary,
    formatCompanyMeta: appServices.formatCompanyMeta,
    getOpenRolesLabel: appServices.getCompanyOpenRolesLabel,
    getLocationsLabel: appServices.getCompanyLocationsLabel,
    practiceCompany: appServices.practiceCompanyProblems,
    openCareers: appServices.openExternalUrl,
    refreshIcons: appServices.services?.refreshIcons
  };
}
