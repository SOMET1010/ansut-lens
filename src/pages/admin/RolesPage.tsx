import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Users, Eye, Zap, Settings } from 'lucide-react';
import { useRolePermissions } from '@/hooks/useRolePermissions';
import { cn } from '@/lib/utils';

const ROLES = [
  { 
    value: 'admin' as const, 
    label: 'Admin', 
    description: 'Accès complet',
    color: 'bg-red-500/10 text-red-500 border-red-500/20'
  },
  { 
    value: 'user' as const, 
    label: 'Utilisateur', 
    description: 'Accès standard',
    color: 'bg-blue-500/10 text-blue-500 border-blue-500/20'
  },
  { 
    value: 'council_user' as const, 
    label: 'Conseil', 
    description: 'Accès limité',
    color: 'bg-amber-500/10 text-amber-500 border-amber-500/20'
  },
  { 
    value: 'guest' as const, 
    label: 'Invité', 
    description: 'Lecture seule',
    color: 'bg-gray-500/10 text-gray-500 border-gray-500/20'
  },
];

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  consultation: { label: 'Consultation', icon: Eye, color: 'text-blue-400' },
  actions: { label: 'Actions', icon: Zap, color: 'text-green-400' },
  admin: { label: 'Administration', icon: Settings, color: 'text-red-400' },
};

export default function RolesPage() {
  const { 
    permissionsByCategory, 
    hasRolePermission, 
    togglePermission, 
    isLoading 
  } = useRolePermissions();

  const handleToggle = (
    role: 'admin' | 'user' | 'council_user' | 'guest',
    permissionCode: string,
    currentValue: boolean
  ) => {
    // Empêcher de désactiver les permissions admin pour le rôle admin
    if (role === 'admin') {
      return;
    }
    
    togglePermission.mutate({
      role,
      permissionCode,
      enabled: !currentValue,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div>
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Card className="glass">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          Gestion des Rôles
        </h1>
        <p className="text-muted-foreground mt-1">
          Configurez les permissions pour chaque rôle de l'application
        </p>
      </div>

      {/* Légende des rôles */}
      <div className="flex flex-wrap gap-3">
        {ROLES.map(role => (
          <Badge key={role.value} variant="outline" className={cn('px-3 py-1', role.color)}>
            <Users className="h-3 w-3 mr-1" />
            {role.label}
            <span className="ml-1 text-xs opacity-70">({role.description})</span>
          </Badge>
        ))}
      </div>

      {/* Matrice des permissions */}
      {Object.entries(CATEGORY_CONFIG).map(([categoryKey, categoryConfig]) => {
        const permissions = permissionsByCategory[categoryKey] ?? [];
        if (permissions.length === 0) return null;

        const CategoryIcon = categoryConfig.icon;

        return (
          <Card key={categoryKey} className="glass overflow-hidden">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2">
                <CategoryIcon className={cn('h-5 w-5', categoryConfig.color)} />
                {categoryConfig.label}
              </CardTitle>
              <CardDescription>
                {categoryKey === 'consultation' && 'Accès en lecture aux différentes sections'}
                {categoryKey === 'actions' && 'Capacité à créer et modifier du contenu'}
                {categoryKey === 'admin' && 'Fonctions d\'administration système'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground w-1/3">
                        Permission
                      </th>
                      {ROLES.map(role => (
                        <th 
                          key={role.value} 
                          className="text-center py-3 px-4 font-medium text-muted-foreground"
                        >
                          <span className="hidden sm:inline">{role.label}</span>
                          <span className="sm:hidden">{role.label.slice(0, 1)}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {permissions.map(permission => (
                      <tr 
                        key={permission.code} 
                        className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-medium text-sm">{permission.label_fr}</div>
                          {permission.description && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {permission.description}
                            </div>
                          )}
                        </td>
                        {ROLES.map(role => {
                          const isEnabled = hasRolePermission(role.value, permission.code);
                          const isAdmin = role.value === 'admin';
                          
                          return (
                            <td key={role.value} className="py-3 px-4 text-center">
                              <Checkbox
                                checked={isEnabled}
                                disabled={isAdmin || togglePermission.isPending}
                                onCheckedChange={() => handleToggle(role.value, permission.code, isEnabled)}
                                className={cn(
                                  'transition-all',
                                  isAdmin && 'opacity-50 cursor-not-allowed',
                                  isEnabled && 'bg-primary border-primary'
                                )}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Note informative */}
      <Card className="glass border-amber-500/20 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-500">Note de sécurité</p>
              <p className="text-sm text-muted-foreground mt-1">
                Les permissions du rôle <strong>Admin</strong> ne peuvent pas être modifiées pour des raisons de sécurité.
                Les modifications sont appliquées immédiatement et affectent tous les utilisateurs du rôle concerné.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
