import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploader } from '../../ImageUploader';
import type { BlockProps } from '@/types/newsletter-studio';

export function ArticleBlock({ block, isSelected, onSelect, onUpdate }: BlockProps) {
  const { content, style } = block;
  const index = (content.index as number) || 1;

  return (
    <div 
      onClick={onSelect}
      className={`relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
      style={{
        backgroundColor: style.backgroundColor || '#fff8f0',
        padding: style.padding || '20px',
        borderRadius: style.borderRadius || '12px',
        borderLeft: `4px solid ${style.borderColor || '#e65100'}`,
        margin: '0 16px 16px 16px'
      }}
    >
      {/* Image */}
      {content.imageUrl && !isSelected && (
        <img 
          src={content.imageUrl as string} 
          alt={(content.imageAlt as string) || (content.title as string)} 
          className="w-full h-36 object-cover rounded-lg mb-3"
        />
      )}

      {/* Title */}
      <div className="flex items-start gap-2.5 mb-3">
        <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
          {index}
        </span>
        {isSelected ? (
          <Input
            value={(content.title as string) || ''}
            onChange={(e) => onUpdate({ ...content, title: e.target.value })}
            className="font-semibold"
            placeholder="Titre de l'article"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <h3 className="font-semibold text-foreground">
            {(content.title as string) || 'Titre de l\'article'}
          </h3>
        )}
      </div>

      {/* Content */}
      {isSelected ? (
        <div className="space-y-3 pl-8" onClick={(e) => e.stopPropagation()}>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Pourquoi c'est important</label>
            <Textarea
              value={(content.pourquoi as string) || ''}
              onChange={(e) => onUpdate({ ...content, pourquoi: e.target.value })}
              placeholder="Pourquoi c'est important..."
              rows={2}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground">Impact concret</label>
            <Textarea
              value={(content.impact as string) || ''}
              onChange={(e) => onUpdate({ ...content, impact: e.target.value })}
              placeholder="Impact concret..."
              rows={2}
            />
          </div>
          <ImageUploader
            value={content.imageUrl as string}
            alt={content.imageAlt as string}
            onImageChange={(url, alt) => onUpdate({ ...content, imageUrl: url, imageAlt: alt })}
            label="Image de l'article (optionnelle)"
          />
        </div>
      ) : (
        <>
          <p className="text-sm text-muted-foreground mb-2 pl-8">
            <strong className="text-foreground/80">Pourquoi :</strong> {(content.pourquoi as string) || '...'}
          </p>
          <p className="text-sm text-green-600 font-semibold pl-8">
            → {(content.impact as string) || '...'}
          </p>
        </>
      )}
    </div>
  );
}
