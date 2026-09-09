import { useSyncModuleRoute } from '../hooks/useSyncModuleRoute.js';
import { PersonalWorkspace } from '../features/personal/PersonalWorkspace.jsx';
import { ApplicationTracker } from '../features/personal/applications/ApplicationTracker.jsx';
import { isSafeApplicationUrl } from '../features/personal/applications/applicationModel.js';
import { useSearchParams } from 'react-router-dom';

export function ApplicationsPage() {
  useSyncModuleRoute('applications');
  const [params] = useSearchParams();
  const key = params.toString();
  const hasPrefill = ['company', 'role', 'location', 'url'].some(field => params.has(field));
  const prefill = hasPrefill ? {
    company: (params.get('company') || '').trim().slice(0, 200),
    role: (params.get('role') || '').trim().slice(0, 300),
    location: (params.get('location') || '').trim().slice(0, 300),
    url: isSafeApplicationUrl(params.get('url') || '') && (params.get('url') || '').length <= 2048 ? params.get('url') || '' : '',
  } : null;
  return <PersonalWorkspace>{props => <ApplicationTracker key={key} {...props} prefill={prefill} focusApplicationId={(params.get('application') || '').slice(0, 512)} />}</PersonalWorkspace>;
}
