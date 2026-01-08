import { Radar } from 'lucide-react';

export function CoverSlide() {
  return (
    <div className="text-center space-y-8">
      <div className="flex justify-center">
        <div className="w-24 h-24 rounded-2xl bg-primary/20 flex items-center justify-center">
          <Radar className="w-14 h-14 text-primary" />
        </div>
      </div>
      <div className="space-y-4">
        <h1 className="text-5xl font-bold text-white">ANSUT RADAR</h1>
        <p className="text-2xl text-primary">Plateforme de Veille Stratégique</p>
      </div>
      <div className="pt-8 text-white/60">
        <p>Surveillance intelligente de l'écosystème numérique ivoirien</p>
        <p className="mt-2 text-sm">Janvier 2025</p>
      </div>
    </div>
  );
}
