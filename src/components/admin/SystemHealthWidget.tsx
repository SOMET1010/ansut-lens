import { Activity, Database, Newspaper, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface SystemHealthWidgetProps {
  lastCollecteTime: string | null;
  lastCollecteStatus: 'success' | 'error' | null;
  lastCollecteDuration: number | null;
  articlesLast24h: number;
  isLoading?: boolean;
}

export function SystemHealthWidget({
  lastCollecteTime,
  lastCollecteStatus,
  lastCollecteDuration,
  articlesLast24h,
  isLoading = false,
}: SystemHealthWidgetProps) {
  const getSystemStatus = () => {
    if (!lastCollecteTime) return { label: 'Inconnu', color: 'text-muted-foreground', bg: 'bg-muted' };
    
    const hoursAgo = (Date.now() - new Date(lastCollecteTime).getTime()) / (1000 * 60 * 60);
    
    if (lastCollecteStatus === 'error') {
      return { label: 'Erreur Détectée', color: 'text-red-400', bg: 'bg-red-500/20', pulse: true };
    }
    if (hoursAgo > 24) {
      return { label: 'Inactif', color: 'text-amber-400', bg: 'bg-amber-500/20', pulse: false };
    }
    if (hoursAgo > 6) {
      return { label: 'Dégradé', color: 'text-amber-400', bg: 'bg-amber-500/20', pulse: true };
    }
    return { label: 'Opérationnel', color: 'text-emerald-400', bg: 'bg-emerald-500/20', pulse: true };
  };

  const status = getSystemStatus();
  const collecteTimeLabel = lastCollecteTime
    ? formatDistanceToNow(new Date(lastCollecteTime), { addSuffix: true, locale: fr })
    : 'Jamais';

  const formatDuration = (ms: number | null) => {
    if (!ms) return '—';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (isLoading) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 mb-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-5 mb-8 shadow-sm">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Global Status */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className={cn(
              'h-12 w-12 rounded-full flex items-center justify-center',
              status.bg,
              status.pulse && 'animate-pulse'
            )}>
              <Activity size={24} className={status.color} />
            </div>
            <div className={cn(
              'absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-card',
              lastCollecteStatus === 'error' ? 'bg-red-500' :
              lastCollecteStatus === 'success' ? 'bg-emerald-500' : 'bg-muted-foreground'
            )} />
          </div>
          <div>
            <h2 className={cn('font-bold text-lg', status.color)}>
              Système {status.label}
            </h2>
            <p className="text-xs text-muted-foreground">
              Dernière collecte: {collecteTimeLabel} • v2.1.0
            </p>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="flex flex-wrap gap-6 lg:gap-8 lg:border-l lg:border-border lg:pl-8">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Clock size={12} /> Durée Collecte
            </span>
            <span className={cn(
              'text-sm font-mono font-bold',
              lastCollecteDuration && lastCollecteDuration > 5000 ? 'text-amber-500' : 'text-chart-2'
            )}>
              {formatDuration(lastCollecteDuration)}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Database size={12} /> Statut
            </span>
            <span className={cn(
              'text-sm font-mono font-bold',
              lastCollecteStatus === 'success' ? 'text-emerald-500' :
              lastCollecteStatus === 'error' ? 'text-red-500' : 'text-muted-foreground'
            )}>
              {lastCollecteStatus === 'success' ? 'OK' : 
               lastCollecteStatus === 'error' ? 'ERREUR' : '—'}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1">
              <Newspaper size={12} /> Articles (24h)
            </span>
            <span className="text-sm font-mono font-bold text-chart-1">
              {articlesLast24h}
            </span>
          </div>
        </div>

        {/* Action */}
        <Link
          to="/admin/cron-jobs"
          className="text-xs font-semibold bg-muted hover:bg-accent px-4 py-2 rounded-lg transition-colors shrink-0"
        >
          Voir les logs
        </Link>
      </div>
    </div>
  );
}
