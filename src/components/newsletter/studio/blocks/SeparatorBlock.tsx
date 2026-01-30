import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { BlockProps } from '@/types/newsletter-studio';

export function SeparatorBlock({ block, isSelected, onSelect, onUpdate, onStyleUpdate }: BlockProps) {
  const { content, style } = block;
  const separatorStyle = (content.style as string) || 'line';

  return (
    <div 
      onClick={onSelect}
      className={`relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
      style={{
        padding: style.padding || '16px'
      }}
    >
      {isSelected && (
        <div className="flex items-center gap-2 mb-2" onClick={(e) => e.stopPropagation()}>
          <label className="text-sm text-muted-foreground">Style :</label>
          <Select
            value={separatorStyle}
            onValueChange={(v) => onUpdate({ ...content, style: v })}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="line">Ligne</SelectItem>
              <SelectItem value="dashed">Pointillés</SelectItem>
              <SelectItem value="dots">Points</SelectItem>
              <SelectItem value="gradient">Dégradé</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {separatorStyle === 'line' && (
        <hr 
          className="border-t"
          style={{ borderColor: style.borderColor || '#e5e7eb' }}
        />
      )}
      {separatorStyle === 'dashed' && (
        <hr 
          className="border-t border-dashed"
          style={{ borderColor: style.borderColor || '#e5e7eb' }}
        />
      )}
      {separatorStyle === 'dots' && (
        <div className="flex justify-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: style.borderColor || '#e5e7eb' }} />
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: style.borderColor || '#e5e7eb' }} />
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: style.borderColor || '#e5e7eb' }} />
        </div>
      )}
      {separatorStyle === 'gradient' && (
        <div className="h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent rounded-full" />
      )}
    </div>
  );
}
