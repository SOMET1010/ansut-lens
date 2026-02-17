import { Eye, Zap, Settings, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
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

interface RolePermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: RoleConfig | undefined;
  permissionsByCategory: Record<string, Permission[]>;
  hasRolePermission: (role: RoleValue, permissionCode: string) => boolean;
  onToggle: (params: { role: RoleValue; permissionCode: string; enabled: boolean }) => void;
  isLoading: boolean;
}

const CATEGORY_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  consultation: { label: 'Consultation', icon: Eye, color: 'text-blue-500' },
  actions: { label: 'Actions', icon: Zap, color: 'text-green-500' },
  admin: { label: 'Administration', icon: Settings, color: 'text-red-500' },
};

export function RolePermissionsDialog({
  open,
  onOpenChange,
  role,
  permissionsByCategory,
  hasRolePermission,
  onToggle,
  isLoading,
}: RolePermissionsDialogProps) {
  if (!role) return null;

  const handleToggle = (permissionCode: string, currentValue: boolean) => {
    onToggle({
      role: role.value,
      permissionCode,
      enabled: !currentValue,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurer : {role.label}</DialogTitle>
          <DialogDescription>{role.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Les modifications prennent effet immédiatement pour tous les utilisateurs de ce rôle. Les changements sont tracés dans le journal d'audit.
            </p>
          </div>
          {Object.entries(CATEGORY_CONFIG).map(([categoryKey, categoryConfig]) => {
            const permissions = permissionsByCategory[categoryKey] ?? [];
            if (permissions.length === 0) return null;

            const CategoryIcon = categoryConfig.icon;

            return (
              <div key={categoryKey} className="space-y-3">
                <div className="flex items-center gap-2">
                  <CategoryIcon className={cn('h-4 w-4', categoryConfig.color)} />
                  <h4 className="font-semibold text-sm">{categoryConfig.label}</h4>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  {permissions.map(permission => {
                    const isEnabled = hasRolePermission(role.value, permission.code);

                    return (
                      <div
                        key={permission.code}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            id={permission.code}
                            checked={isEnabled}
                            disabled={isLoading}
                            onCheckedChange={() => handleToggle(permission.code, isEnabled)}
                          />
                          <label
                            htmlFor={permission.code}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {permission.label_fr}
                          </label>
                        </div>
                        {permission.description && (
                          <span className="text-xs text-muted-foreground max-w-[200px] text-right">
                            {permission.description}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
