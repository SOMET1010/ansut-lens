import { Users, Activity, Clock, Shield } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SecurityKpiCardsProps {
  totalUsers: number;
  activeUsers: number;
  onlineUsers: number;
  pendingInvitations: number;
  adminCount: number;
  isLoading?: boolean;
}

interface KpiCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  subtext?: string;
  colorClass: string;
  isLoading?: boolean;
}

function KpiCard({ icon, value, label, subtext, colorClass, isLoading }: KpiCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="flex-1">
              <Skeleton className="h-7 w-16 mb-1" />
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2.5 rounded-lg", colorClass)}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-sm font-medium text-foreground">{label}</p>
            {subtext && (
              <p className="text-xs text-muted-foreground truncate">{subtext}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SecurityKpiCards({
  totalUsers,
  activeUsers,
  onlineUsers,
  pendingInvitations,
  adminCount,
  isLoading = false,
}: SecurityKpiCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        icon={<Users className="h-5 w-5 text-primary" />}
        value={`${activeUsers}/${totalUsers}`}
        label="Utilisateurs actifs"
        subtext="Comptes confirmés"
        colorClass="bg-primary/10"
        isLoading={isLoading}
      />
      
      <KpiCard
        icon={<Activity className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
        value={onlineUsers}
        label="En ligne maintenant"
        subtext="Session < 15 min"
        colorClass="bg-emerald-500/10"
        isLoading={isLoading}
      />
      
      <KpiCard
        icon={<Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />}
        value={pendingInvitations}
        label="Invitations en attente"
        subtext={pendingInvitations > 0 ? "En attente d'activation" : "Aucune invitation"}
        colorClass="bg-amber-500/10"
        isLoading={isLoading}
      />
      
      <KpiCard
        icon={<Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />}
        value={adminCount}
        label="Administrateurs"
        subtext="Accès privilégié"
        colorClass="bg-purple-500/10"
        isLoading={isLoading}
      />
    </div>
  );
}
