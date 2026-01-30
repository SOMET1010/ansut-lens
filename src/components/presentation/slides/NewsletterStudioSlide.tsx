import { GripVertical, LayoutGrid, Monitor, Tablet, Smartphone } from 'lucide-react';

export function NewsletterStudioSlide() {
  return (
    <div className="w-full space-y-8">
      <h2 className="text-3xl font-bold text-white text-center">Studio Newsletter</h2>
      <p className="text-white/60 text-center max-w-2xl mx-auto">
        Éditeur visuel WYSIWYG pour créer des newsletters professionnelles
      </p>
      
      <div className="grid grid-cols-3 gap-6 max-w-4xl mx-auto">
        <div className="bg-white/5 rounded-xl p-6">
          <GripVertical className="w-8 h-8 text-primary mb-4" />
          <h3 className="text-white font-semibold mb-2">Drag & Drop</h3>
          <p className="text-white/60 text-sm">Réorganisation intuitive des blocs par glisser-déposer</p>
        </div>
        
        <div className="bg-white/5 rounded-xl p-6">
          <LayoutGrid className="w-8 h-8 text-chart-4 mb-4" />
          <h3 className="text-white font-semibold mb-2">Blocs ANSUT</h3>
          <p className="text-white/60 text-sm">Header, Édito, Articles, Tech, Agenda, Chiffres, Footer</p>
        </div>
        
        <div className="bg-white/5 rounded-xl p-6">
          <div className="flex gap-1 mb-4">
            <Monitor className="w-6 h-6 text-chart-5" />
            <Tablet className="w-5 h-5 text-chart-5" />
            <Smartphone className="w-4 h-4 text-chart-5" />
          </div>
          <h3 className="text-white font-semibold mb-2">Responsive</h3>
          <p className="text-white/60 text-sm">Prévisualisation Desktop, Tablette et Mobile</p>
        </div>
      </div>

      <div className="flex justify-center gap-4 mt-6">
        <div className="bg-primary/20 text-primary px-3 py-1 rounded-full text-xs">
          Édition en temps réel
        </div>
        <div className="bg-chart-4/20 text-chart-4 px-3 py-1 rounded-full text-xs">
          Export HTML
        </div>
        <div className="bg-chart-5/20 text-chart-5 px-3 py-1 rounded-full text-xs">
          Templates personnalisables
        </div>
      </div>
    </div>
  );
}
