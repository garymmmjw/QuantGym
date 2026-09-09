import { useSyncModuleRoute } from '../hooks/useSyncModuleRoute.js';
import { PersonalWorkspace } from '../features/personal/PersonalWorkspace.jsx';
import { PreparationDashboard } from '../features/personal/dashboard/PreparationDashboard.jsx';
export function OverviewPage() {
  useSyncModuleRoute('overview');
  return <PersonalWorkspace>{props => <PreparationDashboard {...props} />}</PersonalWorkspace>;
}
