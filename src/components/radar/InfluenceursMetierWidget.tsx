import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Linkedin, Twitter, Globe, TrendingUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

function useInfluenceursMetier() {
  return useQuery({
    queryKey: ['influenceurs-metier-top'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('influenceurs_metier')
        .select('*')
        .eq('actif', true)
        .order('score_pertinence', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

const platformIcon = (p: string) => {
  if (p === 'linkedin') return <Linkedin className="h-3.5 w-3.5" />;
  if (p === 'twitter' || p === 'x') return <Twitter className="h-3.5 w-3.5" />;
  return <Globe className="h-3.5 w-3.5" />;
};

export default function InfluenceursMetierWidget() {
  const { data, isLoading } = useInfluenceursMetier();

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Influenceurs Métier
          {data && data.length > 0 && (
            <Badge variant="secondary" className="text-xs">{data.length} actifs</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(!data || data.length === 0) ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun influenceur configuré. Ajoutez des comptes à surveiller dans l'administration.
          </p>
        ) : (
          <div className="space-y-2.5">
            {data.map((inf: any) => (
              <div key={inf.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                <div className="p-1.5 rounded bg-primary/10">
                  {platformIcon(inf.plateforme)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{inf.nom}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {inf.fonction || inf.organisation || inf.categorie}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-primary" />
                    <span className="text-xs font-medium">{inf.score_pertinence}</span>
                  </div>
                  {inf.derniere_activite && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(inf.derniere_activite), { addSuffix: true, locale: fr })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
