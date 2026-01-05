import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { LoadingScreen } from './LoadingScreen';

interface PermissionRouteProps {
  permission: string;
  children?: React.ReactNode;
}

export function PermissionRoute({ 
  permission, 
  children
}: PermissionRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { hasPermission, isLoading: permissionsLoading } = useUserPermissions();
  const location = useLocation();
  
  const isLoading = authLoading || permissionsLoading;
  const hasAccess = hasPermission(permission);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/access-denied" state={{ from: location.pathname, permission }} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
