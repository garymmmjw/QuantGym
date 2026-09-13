import { useSyncModuleRoute } from '../hooks/useSyncModuleRoute.js';
import { PersonalWorkspace } from '../features/personal/PersonalWorkspace.jsx';
import { TechnicalInterviewWorkspace } from '../features/personal/practice/TechnicalInterviewWorkspace.jsx';

export function TechnicalInterviewPage() {
  useSyncModuleRoute('technical-interview');
  return <PersonalWorkspace>{props => <TechnicalInterviewWorkspace {...props} />}</PersonalWorkspace>;
}
