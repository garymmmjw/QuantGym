import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { PersonalWorkspace } from "../features/personal/PersonalWorkspace.jsx";
import { MentalMathTrainer } from "../features/personal/mental/MentalMathTrainer.jsx";

export function ToolsPage() {
  useSyncModuleRoute("tools");
  return <PersonalWorkspace>{(props) => <MentalMathTrainer {...props} />}</PersonalWorkspace>;
}
