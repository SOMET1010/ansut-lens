import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Radar, MapPin, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

function useRadarProximite() {
  return useQuery({
    queryKey: ['radar-proximite'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('radar_proximite')
        .select('*')
        .order('similitude_score', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10 * 60 * 1000,
  });
}

function useDetecterProximite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('detecter-proximite');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['radar-proximite'] });
      toast.success(`${data?.detected || 0} projets similaires détectés`);
    },
    onError: () => toast.error('Erreur lors de la détection'),
  });
}

const scoreColor = (score: number) => {
  if (score >= 80) return 'bg-destructive/15 text-destructive';
  if (score >= 60) return 'bg-amber-500/15 text-amber-600';
  return 'bg-muted text-muted-foreground';
};

export default function RadarProximiteWidget() {
  const { data, isLoading } = useRadarProximite();
  const detecter = useDetecterProximite();

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
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Radar className="h-4 w-4 text-primary" />
            Radar de Proximité
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => detecter.mutate()}
            disabled={detecter.isPending}
          >
            {detecter.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {(!data || data.length === 0) ? (
          <div className="text-center py-6">
            <Radar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              Aucun projet similaire détecté. Lancez une analyse pour comparer avec les pays voisins.
            </p>
            <Button size="sm" onClick={() => detecter.mutate()} disabled={detecter.isPending}>
              Lancer l'analyse
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {data.map((projet: any) => (
              <div key={projet.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      <Badge variant="outline" className="text-[10px]">{projet.pays}</Badge>
                      <Badge className={`text-[10px] ${scoreColor(projet.similitude_score)}`}>
                        {projet.similitude_score}% similaire
                      </Badge>
                    </div>
                    <p className="text-sm font-medium line-clamp-1">{projet.titre}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{projet.description}</p>
                  </div>
                </div>

                {projet.projet_ansut_equivalent && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ArrowRight className="h-3 w-3 text-primary" />
                    <span>Équivalent ANSUT : <strong className="text-foreground">{projet.projet_ansut_equivalent}</strong></span>
                  </div>
                )}

                {projet.recommandation_com && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                    💡 {projet.recommandation_com}
                  </p>
                )}

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>{projet.organisme}</span>
                  {projet.date_detection && (
                    <span>{formatDistanceToNow(new Date(projet.date_detection), { addSuffix: true, locale: fr })}</span>
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
