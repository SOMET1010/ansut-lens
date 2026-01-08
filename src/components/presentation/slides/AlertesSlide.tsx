import { Bell, AlertTriangle, Shield } from 'lucide-react';

export function AlertesSlide() {
  return (
    <div className="w-full space-y-8">
      <h2 className="text-3xl font-bold text-white text-center">Système d'Alertes</h2>
      <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white/5 rounded-xl p-6">
          <Bell className="w-8 h-8 text-chart-4 mb-4" />
          <h3 className="text-white font-semibold mb-2">Temps réel</h3>
          <p className="text-white/60 text-sm">Notifications instantanées sur les événements critiques</p>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <AlertTriangle className="w-8 h-8 text-orange-400 mb-4" />
          <h3 className="text-white font-semibold mb-2">Niveaux de criticité</h3>
          <p className="text-white/60 text-sm">Classification : info, warning, critique</p>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <Shield className="w-8 h-8 text-red-400 mb-4" />
          <h3 className="text-white font-semibold mb-2">Suivi</h3>
          <p className="text-white/60 text-sm">Historique et marquage des alertes traitées</p>
        </div>
      </div>
    </div>
  );
}
