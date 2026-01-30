import { Input } from '@/components/ui/input';
import { ImageUploader } from '../../ImageUploader';
import type { BlockProps } from '@/types/newsletter-studio';

export function ImageBlock({ block, isSelected, onSelect, onUpdate }: BlockProps) {
  const { content, style } = block;

  return (
    <div 
      onClick={onSelect}
      className={`relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
      style={{
        padding: style.padding || '16px'
      }}
    >
      {isSelected ? (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <ImageUploader
            value={content.url as string}
            alt={content.alt as string}
            onImageChange={(url, alt) => onUpdate({ ...content, url, alt })}
            label="Image"
          />
          <div>
            <label className="text-sm font-medium text-muted-foreground">Légende (optionnelle)</label>
            <Input
              value={(content.caption as string) || ''}
              onChange={(e) => onUpdate({ ...content, caption: e.target.value })}
              placeholder="Description de l'image..."
            />
          </div>
        </div>
      ) : (
        <>
          {content.url ? (
            <div>
              <img 
                src={content.url as string} 
                alt={(content.alt as string) || ''} 
                className="w-full h-auto rounded-lg"
                style={{ borderRadius: style.borderRadius || '8px' }}
              />
              {content.caption && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {content.caption as string}
                </p>
              )}
            </div>
          ) : (
            <div className="h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
              <span className="text-2xl mr-2">🖼️</span>
              Cliquez pour ajouter une image
            </div>
          )}
        </>
      )}
    </div>
  );
}
