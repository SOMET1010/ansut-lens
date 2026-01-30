import { Input } from '@/components/ui/input';
import type { BlockProps } from '@/types/newsletter-studio';

export function ChiffreBlock({ block, isSelected, onSelect, onUpdate }: BlockProps) {
  const { content, style } = block;

  return (
    <div 
      onClick={onSelect}
      className={`relative cursor-pointer transition-all overflow-hidden ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
      style={{
        background: `linear-gradient(135deg, ${style.backgroundColor || '#1a237e'} 0%, #283593 100%)`,
        padding: style.padding || '48px',
        textAlign: style.textAlign || 'center',
        color: style.textColor || '#ffffff'
      }}
    >
      {/* Decorative overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-orange-600/10 via-transparent to-orange-600/10" />
      
      <div className="relative z-10">
        {/* Label */}
        <span className="text-xs font-bold uppercase tracking-[3px] opacity-70">📊 Le Chiffre Marquant</span>

        {isSelected ? (
          <div className="space-y-4 mt-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-center gap-4">
              <div>
                <label className="text-xs text-white/70 block mb-1">Valeur</label>
                <Input
                  value={(content.valeur as string) || ''}
                  onChange={(e) => onUpdate({ ...content, valeur: e.target.value })}
                  className="text-5xl font-extrabold text-center bg-white/20 border-white/30 text-orange-500 w-40"
                  placeholder="100"
                />
              </div>
              <div>
                <label className="text-xs text-white/70 block mb-1">Unité</label>
                <Input
                  value={(content.unite as string) || ''}
                  onChange={(e) => onUpdate({ ...content, unite: e.target.value })}
                  className="text-xl font-semibold text-center bg-white/20 border-white/30 text-white w-32"
                  placeholder="localités"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/70 block mb-1">Contexte</label>
              <Input
                value={(content.contexte as string) || ''}
                onChange={(e) => onUpdate({ ...content, contexte: e.target.value })}
                className="text-center bg-white/20 border-white/30 text-white/90"
                placeholder="Contexte du chiffre..."
              />
            </div>
          </div>
        ) : (
          <>
            <div className="text-6xl sm:text-7xl font-extrabold my-4 text-orange-500">
              {(content.valeur as string) || '100'}
            </div>
            <div className="text-2xl font-semibold opacity-90 uppercase tracking-[4px] mb-2">
              {(content.unite as string) || 'unité'}
            </div>
            <div className="text-sm opacity-75 max-w-md mx-auto">
              {(content.contexte as string) || 'Contexte...'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
