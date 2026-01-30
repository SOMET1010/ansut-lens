import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { NewsletterBlock, BlockStyle, GlobalStyles } from '@/types/newsletter-studio';

interface PropertiesPanelProps {
  selectedBlock: NewsletterBlock | null;
  onUpdateStyle: (style: Partial<BlockStyle>) => void;
  globalStyles: GlobalStyles;
  onUpdateGlobalStyles: (styles: Partial<GlobalStyles>) => void;
}

export function PropertiesPanel({ 
  selectedBlock, 
  onUpdateStyle, 
  globalStyles, 
  onUpdateGlobalStyles 
}: PropertiesPanelProps) {
  if (!selectedBlock) {
    return (
      <div className="h-full overflow-y-auto p-4">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
          🎨 Styles globaux
        </h3>
        
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Couleur principale</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={globalStyles.primaryColor}
                onChange={(e) => onUpdateGlobalStyles({ primaryColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <Input
                value={globalStyles.primaryColor}
                onChange={(e) => onUpdateGlobalStyles({ primaryColor: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Couleur accent</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={globalStyles.accentColor}
                onChange={(e) => onUpdateGlobalStyles({ accentColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <Input
                value={globalStyles.accentColor}
                onChange={(e) => onUpdateGlobalStyles({ accentColor: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs">Largeur max</Label>
            <Select
              value={globalStyles.maxWidth}
              onValueChange={(v) => onUpdateGlobalStyles({ maxWidth: v })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="560px">Compact (560px)</SelectItem>
                <SelectItem value="680px">Standard (680px)</SelectItem>
                <SelectItem value="800px">Large (800px)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs">Fond</Label>
            <div className="flex items-center gap-2 mt-1">
              <input
                type="color"
                value={globalStyles.backgroundColor}
                onChange={(e) => onUpdateGlobalStyles({ backgroundColor: e.target.value })}
                className="w-10 h-10 rounded cursor-pointer"
              />
              <Input
                value={globalStyles.backgroundColor}
                onChange={(e) => onUpdateGlobalStyles({ backgroundColor: e.target.value })}
                className="flex-1"
              />
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground text-center">
            Sélectionnez un bloc pour modifier ses propriétés
          </p>
        </div>
      </div>
    );
  }

  const { style } = selectedBlock;

  return (
    <div className="h-full overflow-y-auto p-4">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
        📐 Propriétés du bloc
      </h3>

      <div className="space-y-4">
        <div>
          <Label className="text-xs">Type</Label>
          <div className="mt-1 p-2 bg-muted rounded text-sm font-medium capitalize">
            {selectedBlock.type}
          </div>
        </div>

        <div>
          <Label className="text-xs">Couleur de fond</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={style.backgroundColor || '#ffffff'}
              onChange={(e) => onUpdateStyle({ backgroundColor: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer"
            />
            <Input
              value={style.backgroundColor || ''}
              onChange={(e) => onUpdateStyle({ backgroundColor: e.target.value })}
              placeholder="#ffffff"
              className="flex-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Couleur du texte</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={style.textColor || '#000000'}
              onChange={(e) => onUpdateStyle({ textColor: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer"
            />
            <Input
              value={style.textColor || ''}
              onChange={(e) => onUpdateStyle({ textColor: e.target.value })}
              placeholder="#000000"
              className="flex-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Padding</Label>
          <Input
            value={style.padding || ''}
            onChange={(e) => onUpdateStyle({ padding: e.target.value })}
            placeholder="16px"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs">Bordure arrondie</Label>
          <Input
            value={style.borderRadius || ''}
            onChange={(e) => onUpdateStyle({ borderRadius: e.target.value })}
            placeholder="8px"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-xs">Couleur de bordure</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="color"
              value={style.borderColor || '#e5e7eb'}
              onChange={(e) => onUpdateStyle({ borderColor: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer"
            />
            <Input
              value={style.borderColor || ''}
              onChange={(e) => onUpdateStyle({ borderColor: e.target.value })}
              placeholder="#e5e7eb"
              className="flex-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-xs">Alignement du texte</Label>
          <Select
            value={style.textAlign || 'left'}
            onValueChange={(v) => onUpdateStyle({ textAlign: v as 'left' | 'center' | 'right' })}
          >
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Gauche</SelectItem>
              <SelectItem value="center">Centré</SelectItem>
              <SelectItem value="right">Droite</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-xs">Taille du texte</Label>
          <Input
            value={style.fontSize || ''}
            onChange={(e) => onUpdateStyle({ fontSize: e.target.value })}
            placeholder="14px"
            className="mt-1"
          />
        </div>
      </div>
    </div>
  );
}
