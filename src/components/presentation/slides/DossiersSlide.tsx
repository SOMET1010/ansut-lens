import { FileText, Mail, Sparkles } from 'lucide-react';

export function DossiersSlide() {
  return (
    <div className="w-full space-y-8">
      <h2 className="text-3xl font-bold text-white text-center">Studio de Publication</h2>
      <p className="text-white/60 text-center max-w-2xl mx-auto">
        Workflow unifié pour la production de contenus stratégiques
      </p>
      
      <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white/5 rounded-xl p-6">
          <FileText className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-white font-semibold mb-2">Notes Stratégiques</h3>
          <p className="text-white/60 text-sm">Rédaction Markdown avec éditeur riche et prévisualisation</p>
        </div>
        
        <div className="bg-white/5 rounded-xl p-6">
          <Mail className="w-8 h-8 text-chart-4 mb-4" />
          <h3 className="text-white font-semibold mb-2">Newsletters</h3>
          <p className="text-white/60 text-sm">Production visuelle et envoi programmé aux destinataires</p>
        </div>
        
        <div className="bg-white/5 rounded-xl p-6">
          <Sparkles className="w-8 h-8 text-chart-5 mb-4" />
          <h3 className="text-white font-semibold mb-2">Génération IA</h3>
          <p className="text-white/60 text-sm">Création automatique de contenu à partir des actualités</p>
        </div>
      </div>
    </div>
  );
}
