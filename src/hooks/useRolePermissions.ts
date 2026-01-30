import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Permission {
  id: string;
  code: string;
  category: string;
  label_fr: string;
  description: string | null;
  display_order: number;
}

export interface RolePermission {
  id: string;
  role: 'admin' | 'user' | 'council_user' | 'guest';
  permission_code: string;
  enabled: boolean;
}

export function useRolePermissions() {
  const queryClient = useQueryClient();

  // Récupérer le registre des permissions
  const permissionsQuery = useQuery({
    queryKey: ['permissions-registry'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('permissions_registry')
        .select('*')
        .order('display_order');
      
      if (error) throw error;
      return data as Permission[];
    },
  });

  // Récupérer les permissions par rôle
  const rolePermissionsQuery = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*');
      
      if (error) throw error;
      return data as RolePermission[];
    },
  });

  // Compter les membres par rôle
  const userCountByRoleQuery = useQuery({
    queryKey: ['user-count-by-role'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {
        admin: 0,
        user: 0,
        council_user: 0,
        guest: 0,
      };
      
      data?.forEach(({ role }) => {
        if (role in counts) counts[role as keyof typeof counts]++;
      });
      
      return counts;
    },
  });

  // Mutation pour activer/désactiver une permission
  const togglePermission = useMutation({
    mutationFn: async ({ 
      role, 
      permissionCode, 
      enabled 
    }: { 
      role: RolePermission['role']; 
      permissionCode: string; 
      enabled: boolean;
    }) => {
      // Vérifier si l'entrée existe
      const { data: existing } = await supabase
        .from('role_permissions')
        .select('id')
        .eq('role', role)
        .eq('permission_code', permissionCode)
        .single();

      if (existing) {
        // Mettre à jour
        const { error } = await supabase
          .from('role_permissions')
          .update({ enabled, updated_at: new Date().toISOString() })
          .eq('role', role)
          .eq('permission_code', permissionCode);
        
        if (error) throw error;
      } else {
        // Créer
        const { error } = await supabase
          .from('role_permissions')
          .insert({ role, permission_code: permissionCode, enabled });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      toast.success('Permission mise à jour');
    },
    onError: (error) => {
      console.error('Error toggling permission:', error);
      toast.error('Erreur lors de la mise à jour');
    },
  });

  // Helper pour vérifier si un rôle a une permission
  const hasRolePermission = (role: RolePermission['role'], permissionCode: string): boolean => {
    const permission = rolePermissionsQuery.data?.find(
      rp => rp.role === role && rp.permission_code === permissionCode
    );
    return permission?.enabled ?? false;
  };

  // Grouper les permissions par catégorie
  const permissionsByCategory = permissionsQuery.data?.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>) ?? {};

  return {
    permissions: permissionsQuery.data ?? [],
    permissionsByCategory,
    rolePermissions: rolePermissionsQuery.data ?? [],
    hasRolePermission,
    togglePermission,
    userCountByRole: userCountByRoleQuery.data ?? { admin: 0, user: 0, council_user: 0, guest: 0 },
    isLoading: permissionsQuery.isLoading || rolePermissionsQuery.isLoading || userCountByRoleQuery.isLoading,
  };
}
