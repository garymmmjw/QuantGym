import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { CompaniesPageContent } from "../features/companies/CompaniesPageContent.jsx";

export function CompaniesPage() {
  useSyncModuleRoute("companies");
  return <CompaniesPageContent />;
}
