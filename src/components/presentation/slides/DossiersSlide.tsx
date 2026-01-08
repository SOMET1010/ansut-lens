import { FolderOpen, FileText, Lock } from 'lucide-react';

export function DossiersSlide() {
  return (
    <div className="w-full space-y-8">
      <h2 className="text-3xl font-bold text-white text-center">Dossiers Stratégiques</h2>
      <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white/5 rounded-xl p-6">
          <FolderOpen className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-white font-semibold mb-2">Organisation</h3>
          <p className="text-white/60 text-sm">Catégorisation par thématique : politique, économie, social</p>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <FileText className="w-8 h-8 text-chart-4 mb-4" />
          <h3 className="text-white font-semibold mb-2">Édition riche</h3>
          <p className="text-white/60 text-sm">Rédaction en Markdown avec prévisualisation</p>
        </div>
        <div className="bg-white/5 rounded-xl p-6">
          <Lock className="w-8 h-8 text-chart-5 mb-4" />
          <h3 className="text-white font-semibold mb-2">Confidentialité</h3>
          <p className="text-white/60 text-sm">Gestion des statuts : brouillon, validé, archivé</p>
        </div>
      </div>
    </div>
  );
}
