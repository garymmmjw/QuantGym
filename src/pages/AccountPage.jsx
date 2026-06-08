import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { AccountPageContent } from "../features/account/AccountPageContent.jsx";

export function AccountPage() {
  useSyncModuleRoute("account");
  return <AccountPageContent />;
}
