import { Rss, Mail, Settings } from 'lucide-react';

export function FluxSlide() {
  return (
    <div className="w-full space-y-8">
      <h2 className="text-3xl font-bold text-white text-center">Flux de Veille Personnalisés</h2>
      <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white/5 rounded-xl p-6">
          <Settings className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-white font-semibold mb-2">Personnalisation</h3>
          <p className="text-white/60 text-sm">Créez vos propres flux avec mots-clés et filtres sur mesure</p>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <Rss className="w-8 h-8 text-orange-400 mb-4" />
          <h3 className="text-white font-semibold mb-2">Agrégation</h3>
          <p className="text-white/60 text-sm">Centralisation des actualités correspondant à vos critères</p>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <Mail className="w-8 h-8 text-chart-1 mb-4" />
          <h3 className="text-white font-semibold mb-2">Digests</h3>
          <p className="text-white/60 text-sm">Récapitulatifs périodiques envoyés par email</p>
        </div>
      </div>
    </div>
  );
}
