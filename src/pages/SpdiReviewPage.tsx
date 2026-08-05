import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Users, BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SPDIStabilityTable } from '@/components/spdi/SPDIStabilityTable';
import { SPDIAxesRanking } from '@/components/spdi/SPDIAxesRanking';
import { SPDIComparaisonTemporelle } from '@/components/spdi/SPDIComparaisonTemporelle';

interface KPIs {
  total: number;
  scoreMoyen: number;
  enHausse: number;
  enAlerte: number;
}

const KpiCard = ({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </CardContent>
  </Card>
);

export default function SpdiReviewPage() {
  const { data: kpis } = useQuery<KPIs>({
    queryKey: ['spdi-review-kpis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personnalites')
        .select('id, score_spdi_actuel')
        .eq('suivi_spdi_actif', true);
      if (error) throw error;

      const rows = data || [];
      const scores = rows.map(r => Number(r.score_spdi_actuel) || 0);

      // « En hausse » dérivé de la VARIATION 30 j RÉELLE (dernier − premier score
      // mesuré), pas du champ tendance_spdi (level-based, valeurs 'up/down' →
      // comptait toujours 0). Audit P1 #5.
      let enHausse = 0;
      const ids = rows.map(r => r.id);
      if (ids.length > 0) {
        const date30 = new Date();
        date30.setDate(date30.getDate() - 30);
        const { data: metrics } = await supabase
          .from('presence_digitale_metrics')
          .select('personnalite_id, score_spdi, date_mesure')
          .in('personnalite_id', ids)
          .gte('date_mesure', date30.toISOString().split('T')[0])
          .order('date_mesure', { ascending: true });
        const byActor = new Map<string, { first: number; last: number }>();
        for (const m of metrics || []) {
          const score = Number(m.score_spdi) || 0;
          const e = byActor.get(m.personnalite_id);
          if (!e) byActor.set(m.personnalite_id, { first: score, last: score });
          else e.last = score;
        }
        byActor.forEach((v) => { if (v.last - v.first > 0.5) enHausse += 1; });
      }

      return {
        total: rows.length,
        scoreMoyen: rows.length ? Math.round(scores.reduce((s, v) => s + v, 0) / rows.length * 10) / 10 : 0,
        enHausse,
        enAlerte: rows.filter(r => (Number(r.score_spdi_actuel) || 0) < 40).length,
      };
    },
  });

  return (
    <div className="w-full space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Revue de Stabilité SPDI</h1>
        <p className="text-sm text-muted-foreground">Vue panoramique des tendances et risques de présence digitale</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={Users} label="Acteurs suivis" value={kpis?.total ?? '—'} color="bg-primary/10 text-primary" />
        <KpiCard icon={BarChart3} label="Score moyen" value={kpis?.scoreMoyen ?? '—'} color="bg-blue-500/10 text-blue-500" />
        <KpiCard icon={TrendingUp} label="En hausse" value={kpis?.enHausse ?? '—'} color="bg-green-500/10 text-green-500" />
        <KpiCard icon={AlertTriangle} label="En alerte" value={kpis?.enAlerte ?? '—'} color="bg-red-500/10 text-red-500" />
      </div>

      {/* Stability table */}
      <SPDIStabilityTable />

      {/* Temporal comparison (full width) */}
      <SPDIComparaisonTemporelle />

      {/* Axes ranking */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Classement par axe</h2>
        <SPDIAxesRanking />
      </div>
    </div>
  );
}
