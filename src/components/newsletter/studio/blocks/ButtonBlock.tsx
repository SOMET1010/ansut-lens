import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BlockProps } from '@/types/newsletter-studio';

export function ButtonBlock({ block, isSelected, onSelect, onUpdate, onStyleUpdate }: BlockProps) {
  const { content, style } = block;
  const variant = (content.variant as string) || 'primary';

  const variantStyles: Record<string, { bg: string; text: string; border?: string }> = {
    primary: { bg: '#e65100', text: '#ffffff' },
    secondary: { bg: '#1a237e', text: '#ffffff' },
    outline: { bg: 'transparent', text: '#e65100', border: '#e65100' },
    ghost: { bg: 'transparent', text: '#374151' }
  };

  const currentVariant = variantStyles[variant as keyof typeof variantStyles] || variantStyles.primary;

  return (
    <div 
      onClick={onSelect}
      className={`relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
      style={{
        padding: '16px 24px',
        textAlign: style.textAlign || 'center'
      }}
    >
      {isSelected ? (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Texte du bouton</label>
              <Input
                value={(content.text as string) || ''}
                onChange={(e) => onUpdate({ ...content, text: e.target.value })}
                placeholder="En savoir plus"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">URL</label>
              <Input
                value={(content.url as string) || ''}
                onChange={(e) => onUpdate({ ...content, url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Style</label>
            <Select
              value={variant}
              onValueChange={(v) => onUpdate({ ...content, variant: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="primary">Principal (Orange)</SelectItem>
                <SelectItem value="secondary">Secondaire (Marine)</SelectItem>
                <SelectItem value="outline">Contour</SelectItem>
                <SelectItem value="ghost">Transparent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ) : (
        <a 
          href={content.url as string || '#'}
          className="inline-block font-semibold text-sm transition-colors"
          style={{
            backgroundColor: currentVariant.bg,
            color: currentVariant.text,
            padding: style.padding || '12px 24px',
            borderRadius: style.borderRadius || '8px',
            border: currentVariant.border ? `2px solid ${currentVariant.border}` : 'none',
            textDecoration: 'none'
          }}
          onClick={(e) => e.preventDefault()}
        >
          {(content.text as string) || 'En savoir plus'}
        </a>
      )}
    </div>
  );
}
