import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingScreen } from './LoadingScreen';
import { useEffect } from 'react';
import { toast } from 'sonner';

interface AdminRouteProps {
  children?: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { user, role, isLoading, isAdmin } = useAuth();

  useEffect(() => {
    if (!isLoading && user && !isAdmin) {
      toast.error('Accès réservé aux administrateurs');
    }
  }, [isLoading, user, isAdmin]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/radar" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}
