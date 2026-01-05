import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { LoadingScreen } from './LoadingScreen';
import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface PermissionRouteProps {
  permission: string;
  children?: React.ReactNode;
  redirectTo?: string;
}

export function PermissionRoute({ 
  permission, 
  children,
  redirectTo = '/radar'
}: PermissionRouteProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { hasPermission, isLoading: permissionsLoading } = useUserPermissions();
  const location = useLocation();
  const toastShown = useRef(false);
  
  const isLoading = authLoading || permissionsLoading;
  const hasAccess = hasPermission(permission);

  useEffect(() => {
    if (!isLoading && user && !hasAccess && !toastShown.current) {
      toast.error("Vous n'avez pas accès à cette page");
      toastShown.current = true;
    }
  }, [isLoading, user, hasAccess]);

  // Reset toast flag when permission changes
  useEffect(() => {
    toastShown.current = false;
  }, [permission]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (!hasAccess) {
    return <Navigate to={redirectTo} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
