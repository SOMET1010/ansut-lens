import { TrendingUp, Activity, BarChart3 } from 'lucide-react';

export function DashboardSlide() {
  return (
    <div className="w-full space-y-8">
      <h2 className="text-3xl font-bold text-white text-center">Tableau de Bord</h2>
      <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white/5 rounded-xl p-6 text-center">
          <Activity className="w-10 h-10 text-chart-1 mx-auto mb-3" />
          <div className="text-3xl font-bold text-white">SPDI</div>
          <p className="text-white/60 text-sm mt-2">Score de Présence Digitale Intégrée</p>
        </div>
        <div className="bg-white/5 rounded-xl p-6 text-center">
          <TrendingUp className="w-10 h-10 text-chart-2 mx-auto mb-3" />
          <div className="text-3xl font-bold text-white">Tendances</div>
          <p className="text-white/60 text-sm mt-2">Évolution des indicateurs clés</p>
        </div>
        <div className="bg-white/5 rounded-xl p-6 text-center">
          <BarChart3 className="w-10 h-10 text-chart-3 mx-auto mb-3" />
          <div className="text-3xl font-bold text-white">KPIs</div>
          <p className="text-white/60 text-sm mt-2">Métriques de performance</p>
        </div>
      </div>
      <p className="text-center text-white/60 max-w-2xl mx-auto">
        Vue consolidée des indicateurs stratégiques avec visualisations interactives et suivi en temps réel.
      </p>
    </div>
  );
}
