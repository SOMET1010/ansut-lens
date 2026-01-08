import { Newspaper, Zap, Filter } from 'lucide-react';

export function ActualitesSlide() {
  return (
    <div className="w-full space-y-8">
      <h2 className="text-3xl font-bold text-white text-center">Module Actualités</h2>
      <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white/5 rounded-xl p-6">
          <Newspaper className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-white font-semibold mb-2">Collecte automatique</h3>
          <p className="text-white/60 text-sm">Agrégation des sources médias, réseaux sociaux et flux RSS</p>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <Zap className="w-8 h-8 text-yellow-400 mb-4" />
          <h3 className="text-white font-semibold mb-2">Enrichissement IA</h3>
          <p className="text-white/60 text-sm">Analyse de sentiment, catégorisation et score d'importance</p>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <Filter className="w-8 h-8 text-chart-2 mb-4" />
          <h3 className="text-white font-semibold mb-2">Filtres avancés</h3>
          <p className="text-white/60 text-sm">Par catégorie, importance, fraîcheur et mots-clés</p>
        </div>
      </div>
    </div>
  );
}
