import { Users, Network, TrendingUp } from 'lucide-react';

export function ActeursSlide() {
  return (
    <div className="w-full space-y-8">
      <h2 className="text-3xl font-bold text-white text-center">Cartographie des Acteurs</h2>
      <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white/5 rounded-xl p-6">
          <Users className="w-8 h-8 text-chart-3 mb-4" />
          <h3 className="text-white font-semibold mb-2">Personnalités clés</h3>
          <p className="text-white/60 text-sm">Profils détaillés des acteurs de l'écosystème numérique</p>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <Network className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-white font-semibold mb-2">Cercles d'influence</h3>
          <p className="text-white/60 text-sm">Classification par niveau de proximité stratégique</p>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <TrendingUp className="w-8 h-8 text-chart-2 mb-4" />
          <h3 className="text-white font-semibold mb-2">Suivi SPDI</h3>
          <p className="text-white/60 text-sm">Évolution de la présence digitale dans le temps</p>
        </div>
      </div>
    </div>
  );
}
