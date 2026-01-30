import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ImageUploader } from '../../ImageUploader';
import type { BlockProps } from '@/types/newsletter-studio';

export function HeaderBlock({ block, isSelected, onSelect, onUpdate }: BlockProps) {
  const { content, style } = block;
  
  const isAnsutRadar = content.title === 'ANSUT RADAR';

  return (
    <div 
      onClick={onSelect}
      className={`relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
      style={{
        background: `linear-gradient(135deg, ${style.backgroundColor || '#1a237e'} 0%, ${isAnsutRadar ? '#1e293b' : '#283593'} 100%)`,
        padding: style.padding || '24px',
        color: style.textColor || '#ffffff'
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="w-14 h-14 bg-white rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-3xl">📡</span>
          </div>
          {/* Title */}
          <div>
            {isSelected ? (
              <Input
                value={(content.title as string) || ''}
                onChange={(e) => onUpdate({ ...content, title: e.target.value })}
                className="text-3xl font-extrabold bg-transparent border-none text-orange-500 p-0 h-auto focus-visible:ring-0"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <h1 className="text-3xl font-extrabold text-orange-500 tracking-tight">
                {(content.title as string) || 'ANSUT RADAR'}
              </h1>
            )}
            {isSelected ? (
              <Input
                value={(content.subtitle as string) || ''}
                onChange={(e) => onUpdate({ ...content, subtitle: e.target.value })}
                className="text-sm bg-transparent border-none text-white/90 p-0 h-auto focus-visible:ring-0 tracking-wider"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p className="text-sm text-white/90 tracking-wider">
                {(content.subtitle as string) || 'NEWSLETTER ANSUT'}
              </p>
            )}
          </div>
        </div>
        {/* Numero */}
        <div className="text-right">
          <div className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold text-lg inline-block">
            N°{content.numero || 1}
          </div>
        </div>
      </div>

      {/* Orange wave decoration */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-600 via-orange-400 to-orange-600" />

      {/* Header Image Editor (only when selected) */}
      {isSelected && (
        <div className="mt-4 p-4 bg-white/10 rounded-lg" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 mb-3">
            <Switch 
              id="show-logo"
              checked={(content.showLogo as boolean) ?? true}
              onCheckedChange={(checked) => onUpdate({ ...content, showLogo: checked })}
            />
            <Label htmlFor="show-logo" className="text-white text-sm">Afficher le logo</Label>
          </div>
          <ImageUploader
            value={content.headerImageUrl as string}
            alt={content.headerImageAlt as string}
            onImageChange={(url, alt) => onUpdate({ ...content, headerImageUrl: url, headerImageAlt: alt })}
            label="Image d'en-tête (optionnelle)"
          />
        </div>
      )}
    </div>
  );
}
