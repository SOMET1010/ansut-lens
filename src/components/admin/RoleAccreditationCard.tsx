import { Shield, Users, Lock, BarChart3, Crown, Eye, Check, X, Settings } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Permission, RolePermission } from '@/hooks/useRolePermissions';

type RoleValue = 'admin' | 'user' | 'council_user' | 'guest';

interface RoleConfig {
  value: RoleValue;
  label: string;
  description: string;
  theme: 'purple' | 'blue' | 'amber' | 'slate';
  isSystem: boolean;
}

interface RoleAccreditationCardProps {
  role: RoleConfig;
  userCount: number;
  permissionsByCategory: Record<string, Permission[]>;
  hasRolePermission: (role: RoleValue, permissionCode: string) => boolean;
  onConfigure: () => void;
}

const THEME_STYLES = {
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
    icon: 'bg-purple-100 text-purple-600 dark:bg-purple-900/50 dark:text-purple-400',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    icon: 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
  },
  amber: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    icon: 'bg-amber-100 text-amber-600 dark:bg-amber-900/50 dark:text-amber-400',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
  },
  slate: {
    bg: 'bg-slate-500/10',
    border: 'border-slate-500/20',
    icon: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  },
};

const ROLE_ICONS: Record<RoleValue, React.ElementType> = {
  admin: Shield,
  user: BarChart3,
  council_user: Crown,
  guest: Eye,
};

const CATEGORY_LABELS: Record<string, string> = {
  consultation: 'Consultation',
  actions: 'Actions',
  admin: 'Administration',
};

export function RoleAccreditationCard({
  role,
  userCount,
  permissionsByCategory,
  hasRolePermission,
  onConfigure,
}: RoleAccreditationCardProps) {
  const theme = THEME_STYLES[role.theme];
  const Icon = ROLE_ICONS[role.value];

  // Calculate permission counts per category
  const categorySummary = Object.entries(permissionsByCategory).map(([category, permissions]) => {
    const enabledCount = permissions.filter(p => hasRolePermission(role.value, p.code)).length;
    const totalCount = permissions.length;
    
    let status: 'full' | 'partial' | 'none';
    let statusLabel: string;
    
    if (enabledCount === totalCount) {
      status = 'full';
      statusLabel = 'Complet';
    } else if (enabledCount > 0) {
      status = 'partial';
      statusLabel = 'Partiel';
    } else {
      status = 'none';
      statusLabel = 'Aucun';
    }
    
    return {
      category,
      label: CATEGORY_LABELS[category] || category,
      enabledCount,
      totalCount,
      status,
      statusLabel,
    };
  });

  return (
    <Card className={cn('relative transition-all hover:shadow-lg', theme.border)}>
      {/* System protected badge */}
      {role.isSystem && (
        <div className="absolute top-4 right-4" title="Rôle système protégé">
          <Lock className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      <CardContent className="pt-6">
        {/* Header with icon and member count */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={cn('h-12 w-12 rounded-xl flex items-center justify-center', theme.icon)}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold">{role.label}</h3>
              <p className="text-xs text-muted-foreground">{role.description}</p>
            </div>
          </div>
        </div>

        {/* Member count badge */}
        <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium mb-4', theme.badge)}>
          <Users className="h-3 w-3" />
          <span>{userCount} membre{userCount !== 1 ? 's' : ''}</span>
        </div>

        {/* Permission summary by category */}
        <div className="space-y-2 mb-6">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Accès autorisés
          </p>
          
          {categorySummary.map(({ category, label, enabledCount, totalCount, status, statusLabel }) => (
            <div key={category} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-2">
                {status !== 'none' ? (
                  <Check className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <X className="h-3.5 w-3.5 text-muted-foreground/50" />
                )}
                {label} ({enabledCount}/{totalCount})
              </span>
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded font-medium',
                status === 'full' && 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
                status === 'partial' && 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
                status === 'none' && 'bg-muted text-muted-foreground'
              )}>
                {statusLabel}
              </span>
            </div>
          ))}
        </div>

        {/* Action button */}
        <div className="pt-4 border-t">
          <Button
            variant="outline"
            className="w-full"
            onClick={onConfigure}
            disabled={role.isSystem}
          >
            {role.isSystem ? (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Protégé
              </>
            ) : (
              <>
                <Settings className="h-4 w-4 mr-2" />
                Configurer
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
