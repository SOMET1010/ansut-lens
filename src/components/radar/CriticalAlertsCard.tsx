import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, ChevronRight, BellOff } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { RelativeTime } from '@/components/ui/relative-time';

interface CriticalAlert {
  id: string;
  titre: string;
  message: string | null;
  type: string;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

function useCriticalAlerts() {
  return useQuery({
    queryKey: ['critical-alerts-home'],
    queryFn: async (): Promise<CriticalAlert[]> => {
      const { data } = await supabase
        .from('alertes')
        .select('id, titre, message, type, reference_type, reference_id, created_at')
        .eq('niveau', 'critical')
        .eq('traitee', false)
        .order('created_at', { ascending: false })
        .limit(5);
      return data ?? [];
    },
    refetchInterval: 60_000,
  });
}

function resolveTarget(alert: CriticalAlert): string {
  const refType = alert.reference_type?.toLowerCase() ?? '';
  const t = alert.type?.toLowerCase() ?? '';

  if (refType.includes('personnalite') || refType.includes('acteur') || t.includes('personnalite') || t.includes('vip')) {
    return alert.reference_id ? `/personnalites?id=${alert.reference_id}` : '/personnalites';
  }
  // Default: news/actualités
  return alert.reference_id ? `/actualites?id=${alert.reference_id}` : '/actualites';
}

export default function CriticalAlertsCard() {
  const { data, isLoading } = useCriticalAlerts();
  const navigate = useNavigate();

  return (
    <Card className="glass border-destructive/30">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          Notifications critiques
          {data && data.length > 0 && (
            <Badge variant="destructive" className="ml-1">{data.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : !data || data.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <BellOff className="h-6 w-6 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Aucune alerte critique en attente</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {data.map((alert) => {
              const target = resolveTarget(alert);
              const isPersonnalite = target.startsWith('/personnalites');
              return (
                <li key={alert.id}>
                  <button
                    type="button"
                    onClick={() => navigate(target)}
                    className="w-full text-left rounded-md border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 transition-colors p-3 group"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-[10px] border-destructive/40 text-destructive">
                            {isPersonnalite ? 'Personnalité' : 'Actualité'}
                          </Badge>
                          <RelativeTime date={alert.created_at} className="text-[10px] text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium line-clamp-1">{alert.titre}</p>
                        {alert.message && (
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{alert.message}</p>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0 mt-1" />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
