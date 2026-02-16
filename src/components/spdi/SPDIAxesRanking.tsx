import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, MessageSquare, Award, Globe } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AxeConfig {
  key: string;
  label: string;
  field: string;
  icon: React.ElementType;
}

const AXES: AxeConfig[] = [
  { key: 'visibilite', label: 'Visibilité', field: 'score_visibilite', icon: Eye },
  { key: 'qualite', label: 'Qualité', field: 'score_qualite', icon: MessageSquare },
  { key: 'autorite', label: 'Autorité', field: 'score_autorite', icon: Award },
  { key: 'presence', label: 'Présence', field: 'score_presence', icon: Globe },
];

interface ActeurScore {
  personnalite_id: string;
  nom: string;
  prenom: string | null;
  score: number;
}

export function SPDIAxesRanking() {
  const { data: rankings, isLoading } = useQuery({
    queryKey: ['spdi-axes-ranking'],
    queryFn: async () => {
      // Get all SPDI-tracked actors
      const { data: persos } = await supabase
        .from('personnalites')
        .select('id, nom, prenom')
        .eq('suivi_spdi_actif', true);

      if (!persos?.length) return null;

      const ids = persos.map(p => p.id);
      const nameMap = new Map(persos.map(p => [p.id, p]));

      // Get the latest metric per actor
      const { data: metrics } = await supabase
        .from('presence_digitale_metrics')
        .select('personnalite_id, score_visibilite, score_qualite, score_autorite, score_presence, date_mesure')
        .in('personnalite_id', ids)
        .order('date_mesure', { ascending: false });

      if (!metrics?.length) return null;

      // Keep only the latest per actor
      const latestMap = new Map<string, typeof metrics[0]>();
      for (const m of metrics) {
        if (!latestMap.has(m.personnalite_id)) latestMap.set(m.personnalite_id, m);
      }

      // Build rankings per axis
      const result: Record<string, { top: ActeurScore[]; bottom: ActeurScore[] }> = {};

      for (const axe of AXES) {
        const scores: ActeurScore[] = [];
        latestMap.forEach((m, pid) => {
          const p = nameMap.get(pid);
          const val = Number((m as any)[axe.field]) || 0;
          if (p) scores.push({ personnalite_id: pid, nom: p.nom, prenom: p.prenom, score: val });
        });

        scores.sort((a, b) => b.score - a.score);
        result[axe.key] = {
          top: scores.slice(0, 3),
          bottom: scores.length > 3 ? scores.slice(-3).reverse() : [],
        };
      }

      return result;
    },
  });

  if (isLoading) return <div className="text-sm text-muted-foreground text-center py-8">Chargement…</div>;
  if (!rankings) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {AXES.map(axe => {
        const data = rankings[axe.key];
        const Icon = axe.icon;
        return (
          <Card key={axe.key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Icon className="h-4 w-4 text-primary" />
                {axe.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.top.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Top 3</p>
                  {data.top.map((a, i) => (
                    <div key={a.personnalite_id} className="flex items-center justify-between text-xs py-0.5">
                      <span className="truncate">{i + 1}. {a.prenom} {a.nom}</span>
                      <Badge variant="outline" className="text-[10px] ml-1">{a.score.toFixed(0)}</Badge>
                    </div>
                  ))}
                </div>
              )}
              {data.bottom.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Bottom 3</p>
                  {data.bottom.map((a) => (
                    <div key={a.personnalite_id} className="flex items-center justify-between text-xs py-0.5">
                      <span className="truncate text-muted-foreground">{a.prenom} {a.nom}</span>
                      <Badge variant="outline" className="text-[10px] ml-1 border-red-500/30 text-red-500">{a.score.toFixed(0)}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
