import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, RefreshCw, Loader2, Send, Check, MousePointerClick, KeyRound, LogIn } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { getInitials, formatExactDate } from '@/utils/activity-status';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserStatus {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  last_active_at: string | null;
  password_set_at?: string | null;
  created_at: string;
}

interface UserWithProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: string;
  disabled: boolean;
  department: string | null;
}

interface InvitationTrackerProps {
  users: UserWithProfile[];
  usersStatus: Record<string, UserStatus>;
  onResendInvite: (userId: string, fullName: string, role: string) => void;
  isResending?: boolean;
}

interface InviteLog {
  target_user_id: string | null;
  action: string;
  created_at: string;
  details: unknown;
}

interface TrackedUser {
  user: UserWithProfile;
  status: UserStatus;
  lastInviteDate: string;
  steps: { invited: boolean; linkClicked: boolean; passwordSet: boolean; firstLogin: boolean };
  currentStep: number;
}

const STEPS = [
  { key: 'invited', label: 'Invité', icon: Send },
  { key: 'linkClicked', label: 'Lien cliqué', icon: MousePointerClick },
  { key: 'passwordSet', label: 'MDP défini', icon: KeyRound },
  { key: 'firstLogin', label: 'Connecté', icon: LogIn },
] as const;

function StepIndicator({ completed, isCurrent, icon: Icon, label }: {
  completed: boolean;
  isCurrent: boolean;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center gap-1">
            <div
              className={cn(
                'h-8 w-8 rounded-full flex items-center justify-center border-2 transition-all',
                completed
                  ? 'bg-emerald-500/15 border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : isCurrent
                    ? 'bg-amber-500/15 border-amber-500 text-amber-600 dark:text-amber-400 animate-pulse'
                    : 'bg-muted border-muted-foreground/20 text-muted-foreground/40'
              )}
            >
              {completed ? <Check className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
            </div>
            <span className={cn(
              'text-[10px] font-medium leading-tight text-center max-w-[52px]',
              completed ? 'text-emerald-600 dark:text-emerald-400'
                : isCurrent ? 'text-amber-600 dark:text-amber-400'
                  : 'text-muted-foreground/50'
            )}>
              {label}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{completed ? `${label} ✓` : isCurrent ? `En attente : ${label}` : label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div className={cn(
      'flex-1 h-0.5 mt-[-12px] min-w-[16px] max-w-[32px]',
      completed ? 'bg-emerald-500/40' : 'bg-muted-foreground/15'
    )} />
  );
}

function TrackedUserRow({ tracked, onResend, isResending }: {
  tracked: TrackedUser;
  onResend: () => void;
  isResending: boolean;
}) {
  const { user, status, lastInviteDate, steps, currentStep } = tracked;
  const initials = getInitials(user.full_name);
  const relativeDate = formatDistanceToNow(new Date(lastInviteDate), { addSuffix: true, locale: fr });

  return (
    <div className="flex items-center gap-3 py-3 px-2 rounded-lg hover:bg-muted/50 transition-colors">
      {/* Avatar + Name */}
      <div className="flex items-center gap-2.5 min-w-[140px] max-w-[180px]">
        <Avatar className="h-8 w-8">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{user.full_name || 'Sans nom'}</p>
          <p className="text-[11px] text-muted-foreground truncate">{status.email}</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-start gap-1 flex-1 justify-center">
        {STEPS.map((step, idx) => {
          const completed = steps[step.key as keyof typeof steps];
          const isCurrent = idx === currentStep;
          return (
            <div key={step.key} className="flex items-center gap-1">
              {idx > 0 && <StepConnector completed={steps[STEPS[idx - 1].key as keyof typeof steps]} />}
              <StepIndicator
                completed={completed}
                isCurrent={isCurrent}
                icon={step.icon}
                label={step.label}
              />
            </div>
          );
        })}
      </div>

      {/* Date + Resend */}
      <div className="flex items-center gap-2 ml-auto shrink-0">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground whitespace-nowrap">{relativeDate}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>Invité le {formatExactDate(lastInviteDate)}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs gap-1"
          onClick={onResend}
          disabled={isResending}
        >
          {isResending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Renvoyer
        </Button>
      </div>
    </div>
  );
}

export function InvitationTracker({ users, usersStatus, onResendInvite, isResending = false }: InvitationTrackerProps) {
  // Fetch invitation audit logs
  const { data: inviteLogs, isLoading: logsLoading } = useQuery({
    queryKey: ['invitation-audit-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('target_user_id, action, created_at, details')
        .in('action', ['user_invited', 'user_invitation_resent'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as InviteLog[];
    },
  });

  // Build tracked users list
  const trackedUsers = useMemo(() => {
    if (!users || !usersStatus || !inviteLogs) return [];

    // Map of userId -> latest invitation date
    const inviteDateMap = new Map<string, string>();
    for (const log of inviteLogs) {
      if (log.target_user_id && !inviteDateMap.has(log.target_user_id)) {
        inviteDateMap.set(log.target_user_id, log.created_at);
      }
    }

    const result: TrackedUser[] = [];

    for (const user of users) {
      const status = usersStatus[user.id];
      if (!status) continue;
      if (user.disabled) continue;

      // Only show users that were invited and haven't completed all steps
      const wasInvited = inviteDateMap.has(user.id);
      if (!wasInvited) continue;

      const steps = {
        invited: true, // always true since they have an invite log
        linkClicked: !!status.email_confirmed_at,
        passwordSet: !!status.password_set_at,
        firstLogin: !!status.last_active_at,
      };

      // Skip fully activated users
      if (steps.invited && steps.linkClicked && steps.passwordSet && steps.firstLogin) continue;

      // Determine current step (the first incomplete one)
      let currentStep = 0;
      if (steps.invited) currentStep = 1;
      if (steps.linkClicked) currentStep = 2;
      if (steps.passwordSet) currentStep = 3;

      result.push({
        user,
        status,
        lastInviteDate: inviteDateMap.get(user.id)!,
        steps,
        currentStep,
      });
    }

    // Sort by most recent invitation first
    result.sort((a, b) => new Date(b.lastInviteDate).getTime() - new Date(a.lastInviteDate).getTime());

    return result;
  }, [users, usersStatus, inviteLogs]);

  const pendingCount = trackedUsers.length;

  if (logsLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingCount === 0) return null;

  return (
    <Collapsible defaultOpen={pendingCount > 0}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors text-left group">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-amber-500/10">
                <Send className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="font-semibold text-sm">
                Suivi des invitations
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400">
                {pendingCount} en cours
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 pb-3 px-3">
            <div className="divide-y divide-border/50">
              {trackedUsers.map((tracked) => (
                <TrackedUserRow
                  key={tracked.user.id}
                  tracked={tracked}
                  onResend={() => onResendInvite(tracked.user.id, tracked.user.full_name || '', tracked.user.role)}
                  isResending={isResending}
                />
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
