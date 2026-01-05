import { useUserPermissions } from '@/hooks/useUserPermissions';

interface PermissionGateProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGate({ 
  permission, 
  children, 
  fallback = null 
}: PermissionGateProps) {
  const { hasPermission } = useUserPermissions();

  if (!hasPermission(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
