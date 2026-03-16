import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle, Mail, Users } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export function MatinaleHistoryWidget() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['matinale-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diffusion_logs')
        .select('*')
        .eq('contenu_type', 'matinale')
        .order('created_at', { ascending: false })
        .limit(7);
      if (error) throw error;
      return data;
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-primary" />
          Historique des envois
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : !logs?.length ? (
          <p className="text-xs text-muted-foreground text-center py-4">Aucun envoi enregistré</p>
        ) : (
          <div className="space-y-1.5">
            {logs.map(log => {
              const allSuccess = log.echec_count === 0 && log.succes_count > 0;
              const allFailed = log.succes_count === 0 && log.echec_count > 0;
              return (
                <div key={log.id} className="flex items-center gap-2 p-2 rounded-md bg-muted/40 text-xs">
                  {allSuccess ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  ) : allFailed ? (
                    <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  ) : (
                    <Mail className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                  )}
                  <span className="flex-1 truncate font-medium">
                    {format(new Date(log.created_at), "EEE d MMM · HH:mm", { locale: fr })}
                  </span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3 w-3" />
                    {log.succes_count}/{log.destinataires_count}
                  </span>
                  <Badge
                    variant={allSuccess ? 'secondary' : allFailed ? 'destructive' : 'secondary'}
                    className={allSuccess ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] px-1.5' : 'text-[10px] px-1.5'}
                  >
                    {allSuccess ? '✓' : allFailed ? '✗' : 'partiel'}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
