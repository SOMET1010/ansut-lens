import { Target, Eye, Bell, FileText, Bot } from 'lucide-react';

const objectives = [
  { icon: Eye, label: 'Veille en temps réel', desc: 'Surveillance continue des actualités du secteur numérique' },
  { icon: Target, label: 'Cartographie des acteurs', desc: 'Suivi des personnalités clés et de leur influence' },
  { icon: Bell, label: 'Alertes intelligentes', desc: 'Notifications sur les événements critiques' },
  { icon: FileText, label: 'Dossiers stratégiques', desc: 'Documentation et analyses approfondies' },
  { icon: Bot, label: 'Assistant IA', desc: 'Analyse augmentée par intelligence artificielle' },
];

export function ObjectivesSlide() {
  return (
    <div className="w-full space-y-8">
      <h2 className="text-3xl font-bold text-white text-center">Objectifs de la plateforme</h2>
      <div className="grid grid-cols-1 gap-4 max-w-3xl mx-auto">
        {objectives.map((obj, i) => (
          <div key={i} className="flex items-center gap-4 bg-white/5 rounded-xl p-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
              <obj.icon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-white font-semibold">{obj.label}</h3>
              <p className="text-white/60 text-sm">{obj.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
