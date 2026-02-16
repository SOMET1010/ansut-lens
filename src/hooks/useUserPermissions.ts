import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useUserPermissions() {
  const { role } = useAuth();

  const { 
    data: permissions, 
    isPending,
    isFetching,
    isSuccess
  } = useQuery({
    queryKey: ['user-permissions', role],
    queryFn: async () => {
      if (!role) return [];

      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_code')
        .eq('role', role)
        .eq('enabled', true);

      if (error) {
        console.error('Error fetching permissions:', error);
        return [];
      }

      return data?.map(p => p.permission_code) ?? [];
    },
    enabled: !!role,
    staleTime: 5 * 60 * 1000,
  });

  // Chargement en cours si le rôle n'est pas défini OU si les permissions ne sont pas encore chargées avec succès
  const isLoading = !role || (isPending && !isSuccess);

  const hasPermission = (code: string): boolean => {
    return permissions?.includes(code) ?? false;
  };

  return {
    permissions: permissions ?? [],
    hasPermission,
    isLoading,
  };
}
