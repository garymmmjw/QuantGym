import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { PersonalWorkspace } from "../features/personal/PersonalWorkspace.jsx";
import { DailyMockWorkspace } from "../features/personal/daily/DailyMockWorkspace.jsx";

export function DailyMockPage() {
  useSyncModuleRoute("daily-mock");
  return <PersonalWorkspace>{(props) => <DailyMockWorkspace {...props} />}</PersonalWorkspace>;
}
