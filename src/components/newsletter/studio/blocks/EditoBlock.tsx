import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import type { BlockProps } from '@/types/newsletter-studio';

export function EditoBlock({ block, isSelected, onSelect, onUpdate }: BlockProps) {
  const { content, style } = block;

  return (
    <div 
      onClick={onSelect}
      className={`relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
      style={{
        padding: style.padding || '24px',
        backgroundColor: style.backgroundColor || '#ffffff'
      }}
    >
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center text-lg">📝</div>
        <span className="text-xs font-bold uppercase tracking-wider text-orange-600">Édito</span>
      </div>

      {/* Content */}
      {isSelected ? (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <Textarea
            value={(content.text as string) || ''}
            onChange={(e) => onUpdate({ ...content, text: e.target.value })}
            placeholder="Votre édito ici..."
            className="min-h-[100px] italic text-muted-foreground border-l-4 border-orange-600 pl-4"
            rows={4}
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Signé par :</span>
            <Input
              value={(content.author as string) || 'La Rédaction ANSUT'}
              onChange={(e) => onUpdate({ ...content, author: e.target.value })}
              className="w-64"
            />
          </div>
        </div>
      ) : (
        <>
          <blockquote 
            className="text-base italic text-muted-foreground border-l-4 border-orange-600 pl-4 leading-relaxed"
            style={{ borderColor: style.borderColor || '#e65100' }}
          >
            {(content.text as string) || 'Votre édito ici...'}
          </blockquote>
          <p className="text-right mt-4 text-sm text-muted-foreground font-medium">
            — {(content.author as string) || 'La Rédaction ANSUT'}
          </p>
        </>
      )}
    </div>
  );
}
