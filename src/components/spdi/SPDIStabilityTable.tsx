import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Minus, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type SortKey = 'nom' | 'score' | 'tendance' | 'variation';
type SortDir = 'asc' | 'desc';

interface ActeurRow {
  id: string;
  nom: string;
  prenom: string | null;
  cercle: number | null;
  score_spdi_actuel: number | null;
  tendance_spdi: string | null;
  variation30j: number | null;
}

const getScoreColor = (score: number | null) => {
  if (score == null) return 'bg-muted text-muted-foreground';
  if (score >= 80) return 'bg-green-500/15 text-green-700 dark:text-green-400';
  if (score >= 60) return 'bg-blue-500/15 text-blue-700 dark:text-blue-400';
  if (score >= 40) return 'bg-attention/15 text-attention';
  return 'bg-red-500/15 text-red-700 dark:text-red-400';
};

// Lecture du score selon les paliers DOCUMENTÉS du SPDI (voir CLAUDE.md :
// 80-100 forte, 60-79 solide, 40-59 faible, <40 risque). On DÉCRIT le niveau —
// on ne prescrit pas une action codée en dur (« Renforcer LinkedIn ») comme si
// elle était calculée.
const getNiveau = (score: number | null) => {
  if (score == null) return 'Aucune donnée';
  if (score >= 80) return 'Présence forte';
  if (score >= 60) return 'Présence solide';
  if (score >= 40) return 'Présence faible';
  return 'À risque';
};

// Tendance dérivée de la VARIATION 30 j RÉELLE (dernier − premier score mesuré),
// et non du champ tendance_spdi (calculé sur le niveau absolu, valeurs 'up/down'
// jamais reconnues par l'UI → icônes toujours neutres). Audit P1 #5.
function tendanceDepuisVariation(variation: number | null): 'hausse' | 'baisse' | 'stable' {
  if (variation == null || Math.abs(variation) < 0.5) return 'stable';
  return variation > 0 ? 'hausse' : 'baisse';
}

const TendanceIcon = ({ variation }: { variation: number | null }) => {
  const t = tendanceDepuisVariation(variation);
  if (t === 'hausse') return <TrendingUp className="h-4 w-4 text-confirme" />;
  if (t === 'baisse') return <TrendingDown className="h-4 w-4 text-incident" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

export function SPDIStabilityTable() {
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const { data: acteurs, isLoading } = useQuery({
    queryKey: ['spdi-stability-table'],
    queryFn: async () => {
      const { data: persos, error } = await supabase
        .from('personnalites')
        .select('id, nom, prenom, cercle, score_spdi_actuel, tendance_spdi')
        .eq('suivi_spdi_actif', true)
        .order('nom');
      if (error) throw error;

      // Fetch 30-day variation for each actor
      const ids = (persos || []).map(p => p.id);
      if (ids.length === 0) return [];

      const date30 = new Date();
      date30.setDate(date30.getDate() - 30);
      const dateStr = date30.toISOString().split('T')[0];

      const { data: metrics } = await supabase
        .from('presence_digitale_metrics')
        .select('personnalite_id, date_mesure, score_spdi')
        .in('personnalite_id', ids)
        .gte('date_mesure', dateStr)
        .order('date_mesure', { ascending: true });

      // For each actor, compute variation = latest - earliest in window
      const variationMap = new Map<string, number>();
      if (metrics) {
        const byActor = new Map<string, { first: number; last: number }>();
        for (const m of metrics) {
          const score = Number(m.score_spdi) || 0;
          const existing = byActor.get(m.personnalite_id);
          if (!existing) {
            byActor.set(m.personnalite_id, { first: score, last: score });
          } else {
            existing.last = score;
          }
        }
        byActor.forEach((v, k) => variationMap.set(k, Math.round((v.last - v.first) * 10) / 10));
      }

      return (persos || []).map(p => ({
        ...p,
        variation30j: variationMap.get(p.id) ?? null,
      })) as ActeurRow[];
    },
  });

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = useMemo(() => {
    if (!acteurs) return [];
    return [...acteurs].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'nom': cmp = `${a.prenom} ${a.nom}`.localeCompare(`${b.prenom} ${b.nom}`); break;
        case 'score': cmp = (a.score_spdi_actuel ?? -1) - (b.score_spdi_actuel ?? -1); break;
        case 'tendance': cmp = (a.tendance_spdi ?? '').localeCompare(b.tendance_spdi ?? ''); break;
        case 'variation': cmp = (a.variation30j ?? 0) - (b.variation30j ?? 0); break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [acteurs, sortKey, sortDir]);

  const SortButton = ({ label, field }: { label: string; field: SortKey }) => (
    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground" onClick={() => toggleSort(field)}>
      {label} <ArrowUpDown className="ml-1 h-3 w-3" />
    </Button>
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Synthèse des acteurs suivis</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-sm text-muted-foreground text-center py-8">Chargement…</div>
        ) : sorted.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center py-8">Aucun acteur avec suivi SPDI actif</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><SortButton label="Acteur" field="nom" /></TableHead>
                <TableHead className="text-center">Cercle</TableHead>
                <TableHead className="text-center"><SortButton label="Score" field="score" /></TableHead>
                <TableHead className="text-center"><SortButton label="Tendance" field="tendance" /></TableHead>
                <TableHead className="text-center"><SortButton label="Var. 30j" field="variation" /></TableHead>
                <TableHead>Niveau</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map(a => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.prenom} {a.nom}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline" className="text-xs">C{a.cercle}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${getScoreColor(a.score_spdi_actuel)} border-0`}>
                      {a.score_spdi_actuel != null ? Number(a.score_spdi_actuel).toFixed(0) : '—'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <TendanceIcon variation={a.variation30j} />
                      <span className="text-xs capitalize">{tendanceDepuisVariation(a.variation30j)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {a.variation30j != null ? (
                      <span className={`text-xs font-medium ${a.variation30j > 0 ? 'text-green-600' : a.variation30j < 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                        {a.variation30j > 0 ? '+' : ''}{a.variation30j}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{getNiveau(a.score_spdi_actuel)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
