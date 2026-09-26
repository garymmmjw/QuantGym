import { Navigate, useLocation } from 'react-router-dom';

// Keep saved technical-practice links working while the question bank owns UI.
export function TechnicalInterviewPage() {
  const location = useLocation();
  return <Navigate to={{ pathname: '/problems', search: location.search }} replace />;
}
