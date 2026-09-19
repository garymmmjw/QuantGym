import { PersonalWorkspace } from "../personal/PersonalWorkspace.jsx";
import { BehavioralWorkspace } from "../personal/behavioral/BehavioralWorkspace.jsx";

export function BehavioralInterviewPageContent() {
  return <PersonalWorkspace>{(props) => <BehavioralWorkspace {...props} />}</PersonalWorkspace>;
}
