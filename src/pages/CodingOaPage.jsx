import { useSyncModuleRoute } from '../hooks/useSyncModuleRoute.js';
import { PersonalWorkspace } from '../features/personal/PersonalWorkspace.jsx';
import { CodingOaWorkspace } from '../features/personal/practice/CodingOaWorkspace.jsx';

export function CodingOaPage() {
  useSyncModuleRoute('coding-oa');
  return <PersonalWorkspace>{props => <CodingOaWorkspace {...props} />}</PersonalWorkspace>;
}
