import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { BlockProps } from '@/types/newsletter-studio';

export function TextBlock({ block, isSelected, onSelect, onUpdate }: BlockProps) {
  const { content, style } = block;
  const isDecryptage = content.sectionType === 'decryptage';

  if (isDecryptage) {
    return (
      <div 
        onClick={onSelect}
        className={`relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
        style={{
          backgroundColor: style.backgroundColor || '#fffde7',
          padding: style.padding || '24px',
          borderRadius: style.borderRadius || '12px'
        }}
      >
        {/* Section header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center text-lg">📚</div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">En 2 Minutes</span>
        </div>

        {isSelected ? (
          <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
            <div>
              <label className="text-sm font-medium text-amber-900">Titre</label>
              <Input
                value={(content.title as string) || ''}
                onChange={(e) => onUpdate({ ...content, title: e.target.value })}
                placeholder="C'est quoi vraiment..."
              />
            </div>
            <div>
              <label className="text-sm font-medium text-amber-900">Contenu</label>
              <Textarea
                value={(content.text as string) || ''}
                onChange={(e) => onUpdate({ ...content, text: e.target.value })}
                placeholder="Explication simple..."
                rows={4}
              />
            </div>
          </div>
        ) : (
          <>
            <h3 className="font-semibold text-amber-900 mb-3 text-lg">
              {(content.title as string) || 'Titre'}
            </h3>
            <p className="text-sm text-amber-800 leading-relaxed">
              {(content.text as string) || 'Contenu...'}
            </p>
          </>
        )}
      </div>
    );
  }

  // Generic text block
  return (
    <div 
      onClick={onSelect}
      className={`relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
      style={{
        backgroundColor: style.backgroundColor || 'transparent',
        padding: style.padding || '16px'
      }}
    >
      {isSelected ? (
        <div onClick={(e) => e.stopPropagation()}>
          <Textarea
            value={(content.text as string) || ''}
            onChange={(e) => onUpdate({ ...content, text: e.target.value })}
            placeholder="Votre texte ici..."
            rows={4}
            style={{
              fontSize: style.fontSize || '14px',
              textAlign: style.textAlign || 'left'
            }}
          />
        </div>
      ) : (
        <p 
          className="leading-relaxed"
          style={{
            fontSize: style.fontSize || '14px',
            color: style.textColor || '#374151',
            textAlign: style.textAlign || 'left'
          }}
        >
          {(content.text as string) || 'Votre texte ici...'}
        </p>
      )}
    </div>
  );
}
