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
        .select('score_spdi_actuel, tendance_spdi')
        .eq('suivi_spdi_actif', true);
      if (error) throw error;

      const rows = data || [];
      const scores = rows.map(r => Number(r.score_spdi_actuel) || 0);
      return {
        total: rows.length,
        scoreMoyen: rows.length ? Math.round(scores.reduce((s, v) => s + v, 0) / rows.length * 10) / 10 : 0,
        enHausse: rows.filter(r => r.tendance_spdi === 'hausse').length,
        enAlerte: rows.filter(r => (Number(r.score_spdi_actuel) || 0) < 40).length,
      };
    },
  });

  return (
    <div className="space-y-6 p-6">
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
