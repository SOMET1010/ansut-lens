import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Info, ExternalLink } from 'lucide-react';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { RoleAccreditationCard } from '@/components/admin/RoleAccreditationCard';
import { RolePermissionsDialog } from '@/components/admin/RolePermissionsDialog';

type RoleValue = 'admin' | 'user' | 'council_user' | 'guest';

const ROLES_CONFIG: Array<{
  value: RoleValue;
  label: string;
  description: string;
  theme: 'purple' | 'blue' | 'amber' | 'slate';
  isSystem: boolean;
}> = [
  { 
    value: 'admin', 
    label: 'Administrateur', 
    description: 'Accès complet à la configuration et aux données',
    theme: 'purple',
    isSystem: true,
  },
  { 
    value: 'user', 
    label: 'Analyste', 
    description: 'Peut créer des veilles et rédiger des notes',
    theme: 'blue',
    isSystem: false,
  },
  { 
    value: 'council_user', 
    label: 'Décideur', 
    description: 'Consultation des rapports finaux uniquement',
    theme: 'amber',
    isSystem: false,
  },
  { 
    value: 'guest', 
    label: 'Observateur', 
    description: 'Accès temporaire restreint',
    theme: 'slate',
    isSystem: false,
  },
];

export default function RolesPage() {
  const { 
    permissionsByCategory, 
    hasRolePermission, 
    togglePermission,
    userCountByRole,
    isLoading 
  } = useRolePermissions();

  const [selectedRole, setSelectedRole] = useState<RoleValue | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          Rôles & Accréditations
        </h1>
        <p className="text-muted-foreground mt-1">
          Définissez les niveaux d'accès aux données sensibles de la plateforme
        </p>
      </div>

      {/* RBAC Info note */}
      <Card className="glass border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                Architecture de sécurité RBAC
                <ExternalLink className="h-3 w-3" />
              </h4>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Les permissions sont appliquées immédiatement. Un utilisateur hérite des droits de son rôle.
                Les permissions du rôle <strong>Administrateur</strong> sont protégées et ne peuvent être modifiées.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {ROLES_CONFIG.map(role => (
          <RoleAccreditationCard
            key={role.value}
            role={role}
            userCount={userCountByRole[role.value] || 0}
            permissionsByCategory={permissionsByCategory}
            hasRolePermission={hasRolePermission}
            onConfigure={() => setSelectedRole(role.value)}
          />
        ))}
      </div>

      {/* Permissions dialog */}
      <RolePermissionsDialog
        open={!!selectedRole}
        onOpenChange={(open) => !open && setSelectedRole(null)}
        role={ROLES_CONFIG.find(r => r.value === selectedRole)}
        permissionsByCategory={permissionsByCategory}
        hasRolePermission={hasRolePermission}
        onToggle={togglePermission.mutate}
        isLoading={togglePermission.isPending}
      />
    </div>
  );
}
