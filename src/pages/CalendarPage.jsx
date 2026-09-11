import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { PersonalWorkspace } from "../features/personal/PersonalWorkspace.jsx";
import { TrainingCalendar } from "../features/personal/calendar/TrainingCalendar.jsx";
import { useLeetCode } from "../features/leetcode/useLeetCode.js";

export function CalendarPage() {
  useSyncModuleRoute("calendar");
  const leetcode = useLeetCode();
  return <PersonalWorkspace>{(props) => <TrainingCalendar {...props} leetcode={leetcode} />}</PersonalWorkspace>;
}
