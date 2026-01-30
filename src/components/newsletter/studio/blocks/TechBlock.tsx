import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploader } from '../../ImageUploader';
import type { BlockProps } from '@/types/newsletter-studio';

export function TechBlock({ block, isSelected, onSelect, onUpdate }: BlockProps) {
  const { content, style } = block;

  return (
    <div 
      onClick={onSelect}
      className={`relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
      style={{
        backgroundColor: style.backgroundColor || '#e3f2fd',
        padding: style.padding || '24px',
        borderRadius: style.borderRadius || '12px'
      }}
    >
      {/* Section header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-xl bg-blue-500 text-white flex items-center justify-center text-lg">🔬</div>
        <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Technologie</span>
      </div>

      {/* Image */}
      {content.imageUrl && !isSelected && (
        <img 
          src={content.imageUrl as string} 
          alt={(content.imageAlt as string) || (content.title as string)} 
          className="w-full h-44 object-cover rounded-xl mb-4"
        />
      )}

      {/* Content */}
      {isSelected ? (
        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
          <div>
            <label className="text-sm font-medium text-blue-900">Titre</label>
            <Input
              value={(content.title as string) || ''}
              onChange={(e) => onUpdate({ ...content, title: e.target.value })}
              placeholder="Pourquoi tout le monde parle de..."
            />
          </div>
          <div>
            <label className="text-sm font-medium text-blue-900">Contenu</label>
            <Textarea
              value={(content.content as string) || ''}
              onChange={(e) => onUpdate({ ...content, content: e.target.value })}
              placeholder="Explication de la tendance..."
              rows={3}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-blue-900">Lien avec l'ANSUT</label>
            <Textarea
              value={(content.lienAnsut as string) || ''}
              onChange={(e) => onUpdate({ ...content, lienAnsut: e.target.value })}
              placeholder="Comment ça concerne l'ANSUT..."
              rows={2}
            />
          </div>
          <ImageUploader
            value={content.imageUrl as string}
            alt={content.imageAlt as string}
            onImageChange={(url, alt) => onUpdate({ ...content, imageUrl: url, imageAlt: alt })}
            label="Image technologie (optionnelle)"
          />
        </div>
      ) : (
        <>
          <h3 className="font-semibold text-blue-900 mb-3 text-lg">
            {(content.title as string) || 'Tendance Tech'}
          </h3>
          <p className="text-sm text-blue-800 mb-4 leading-relaxed">
            {(content.content as string) || 'Contenu...'}
          </p>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <strong className="text-orange-600">👉 Pour l'ANSUT :</strong>
            <span className="text-blue-900 ml-1">
              {(content.lienAnsut as string) || '...'}
            </span>
          </div>
        </>
      )}
    </div>
  );
}
