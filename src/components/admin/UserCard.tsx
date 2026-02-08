import { MoreVertical, Shield, User, Users, Mail, Clock, RefreshCw, UserCheck, UserX, Trash2, MailCheck, KeyRound, Building2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserStatus {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  last_active_at: string | null;
  created_at: string;
}

interface UserWithProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: AppRole;
  disabled: boolean;
  department?: string | null;
}

interface UserCardProps {
  user: UserWithProfile;
  status?: UserStatus;
  isCurrentUser: boolean;
  onRoleChange?: (userId: string, newRole: AppRole) => void;
  onToggle?: (userId: string, action: 'disable' | 'enable') => void;
  onDelete?: (userId: string) => void;
  onResendInvite?: (userId: string, fullName: string, role: AppRole) => void;
  onConfirmEmail?: (userId: string) => void;
  onGeneratePasswordLink?: (userId: string) => void;
  isLoading?: boolean;
}

// Labels métier enrichis
const roleLabels: Record<AppRole, string> = {
  admin: 'Administrateur',
  user: 'Analyste',
  council_user: 'Décideur',
  guest: 'Observateur',
};

const roleColors: Record<AppRole, string> = {
  admin: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700',
  user: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700',
  council_user: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700',
  guest: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
};

const roleIcons: Record<AppRole, React.ReactNode> = {
  admin: <Shield className="h-3.5 w-3.5" />,
  user: <User className="h-3.5 w-3.5" />,
  council_user: <Users className="h-3.5 w-3.5" />,
  guest: <Mail className="h-3.5 w-3.5" />,
};

// Formater la dernière activité de manière intelligente
function formatLastActivity(lastSignInAt: string | null): string {
  if (!lastSignInAt) return 'Jamais connecté';

  const now = new Date();
  const lastActive = new Date(lastSignInAt);
  const diffMs = now.getTime() - lastActive.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 5) return 'À l\'instant';
  if (diffMinutes < 60) return `Il y a ${diffMinutes} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays === 1) {
    return `Hier ${lastActive.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  
  return lastActive.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

// Vérifier si l'utilisateur est "en ligne" (activité < 15 min)
function isUserOnline(lastSignInAt: string | null): boolean {
  if (!lastSignInAt) return false;
  const now = new Date();
  const lastActive = new Date(lastSignInAt);
  const diffMs = now.getTime() - lastActive.getTime();
  return diffMs < 15 * 60 * 1000; // 15 minutes
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function UserCard({
  user,
  status,
  isCurrentUser,
  onRoleChange,
  onToggle,
  onDelete,
  onResendInvite,
  onConfirmEmail,
  onGeneratePasswordLink,
  isLoading,
}: UserCardProps) {
  const isOnline = isUserOnline(status?.last_active_at || null);
  const lastActivity = formatLastActivity(status?.last_active_at || null);
  const isEmailConfirmed = !!status?.email_confirmed_at;
  const isPending = !user.disabled && !isEmailConfirmed;

  return (
    <Card className={cn(
      "relative transition-all hover:shadow-md",
      user.disabled && "opacity-60",
      isOnline && "ring-2 ring-emerald-500/20"
    )}>
      <CardContent className="p-4">
        {/* Menu actions (3 points) - coin supérieur droit */}
        {!isCurrentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isPending && (
                <>
                  <DropdownMenuItem onClick={() => onConfirmEmail?.(user.id)}>
                    <MailCheck className="mr-2 h-4 w-4" />
                    Confirmer l'email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              {!user.disabled && (
                <DropdownMenuItem onClick={() => onGeneratePasswordLink?.(user.id)}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Réinitialiser mot de passe
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onClick={() => onResendInvite?.(user.id, user.full_name || 'Utilisateur', user.role)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Renvoyer l'invitation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user.disabled ? (
                <DropdownMenuItem onClick={() => onToggle?.(user.id, 'enable')}>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Réactiver
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={() => onToggle?.(user.id, 'disable')}>
                  <UserX className="mr-2 h-4 w-4" />
                  Désactiver
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete?.(user.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Indicateur en ligne - coin supérieur droit */}
        {isOnline && !isCurrentUser && (
          <div className="absolute top-3 right-12 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">En ligne</span>
          </div>
        )}

        {/* Header : Avatar & Identité */}
        <div className="flex items-start gap-3 mb-3">
          <div className="relative">
            <Avatar className="h-12 w-12">
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(user.full_name)}
              </AvatarFallback>
            </Avatar>
            {/* Petit indicateur de présence sur l'avatar */}
            {isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">
              {user.full_name || 'Sans nom'}
              {isCurrentUser && (
                <span className="ml-1 text-xs text-muted-foreground font-normal">(vous)</span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground truncate">
              {status?.email || '—'}
            </p>
          </div>
        </div>

        {/* Badges Rôle & Département */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="outline" 
                  className={cn("gap-1 text-xs border cursor-default", roleColors[user.role])}
                >
                  {roleIcons[user.role]}
                  {roleLabels[user.role]}
                </Badge>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Rôle : {roleLabels[user.role]}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {user.department && (
            <Badge variant="secondary" className="gap-1 text-xs">
              <Building2 className="h-3 w-3" />
              {user.department}
            </Badge>
          )}
        </div>

        {/* Footer : Activité & Statut */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="text-xs">
            <span className="text-muted-foreground">Dernière activité</span>
            <p className={cn(
              "font-medium",
              isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
            )}>
              {lastActivity}
            </p>
          </div>

          <div>
            {user.disabled ? (
              <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
                Désactivé
              </Badge>
            ) : isPending ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 gap-1 text-xs cursor-help">
                      <Clock className="h-3 w-3" />
                      En attente
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>L'utilisateur n'a pas encore activé son compte</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 text-xs">
                Actif
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
