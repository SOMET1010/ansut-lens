import { Input } from '@/components/ui/input';
import type { BlockProps } from '@/types/newsletter-studio';

export function FooterBlock({ block, isSelected, onSelect, onUpdate }: BlockProps) {
  const { content, style } = block;

  return (
    <div 
      onClick={onSelect}
      className={`relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
      style={{
        backgroundColor: style.backgroundColor || '#f5f5f5',
        padding: style.padding || '32px',
        textAlign: style.textAlign || 'center',
        color: style.textColor || '#666666'
      }}
    >
      {isSelected ? (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Adresse</label>
            <Input
              value={(content.address as string) || ''}
              onChange={(e) => onUpdate({ ...content, address: e.target.value })}
              placeholder="ANSUT - Plateau, Abidjan"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Téléphone</label>
              <Input
                value={(content.phone as string) || ''}
                onChange={(e) => onUpdate({ ...content, phone: e.target.value })}
                placeholder="+225 xx xx xx xx"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Email</label>
              <Input
                value={(content.email as string) || ''}
                onChange={(e) => onUpdate({ ...content, email: e.target.value })}
                placeholder="contact@ansut.ci"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Texte de désabonnement</label>
            <Input
              value={(content.unsubscribeText as string) || ''}
              onChange={(e) => onUpdate({ ...content, unsubscribeText: e.target.value })}
              placeholder="Se désabonner"
            />
          </div>
        </div>
      ) : (
        <>
          <p className="font-semibold text-foreground mb-2">ANSUT</p>
          <p className="text-sm mb-1">{(content.address as string) || 'Plateau, Abidjan'}</p>
          {content.phone && <p className="text-sm mb-1">{content.phone as string}</p>}
          {content.email && <p className="text-sm mb-4">{content.email as string}</p>}
          <a href="#" className="text-xs text-muted-foreground underline" onClick={(e) => e.preventDefault()}>
            {(content.unsubscribeText as string) || 'Se désabonner'}
          </a>
        </>
      )}
    </div>
  );
}
