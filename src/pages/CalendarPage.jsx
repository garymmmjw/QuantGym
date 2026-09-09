import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { PersonalWorkspace } from "../features/personal/PersonalWorkspace.jsx";
import { TrainingCalendar } from "../features/personal/calendar/TrainingCalendar.jsx";

export function CalendarPage() {
  useSyncModuleRoute("calendar");
  return <PersonalWorkspace>{(props) => <TrainingCalendar {...props} />}</PersonalWorkspace>;
}
