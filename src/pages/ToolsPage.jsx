import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";
import { PersonalWorkspace } from "../features/personal/PersonalWorkspace.jsx";
import { TrainingWorkspace } from "../features/personal/mental/TrainingWorkspace.jsx";

export function ToolsPage() {
  useSyncModuleRoute("tools");
  return <PersonalWorkspace>{(props) => <TrainingWorkspace {...props} />}</PersonalWorkspace>;
}
