import { useSyncModuleRoute } from '../hooks/useSyncModuleRoute.js';
import { PersonalWorkspace } from '../features/personal/PersonalWorkspace.jsx';
import { ReviewWorkspace } from '../features/personal/review/ReviewWorkspace.jsx';

export function ReviewPage() {
  useSyncModuleRoute('review');
  return <PersonalWorkspace>{props => <ReviewWorkspace {...props} />}</PersonalWorkspace>;
}
