import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { BLOCK_DEFINITIONS } from '@/types/newsletter-studio';

interface BlockToolbarProps {
  onAddBlock: (type: string) => void;
}

function DraggableBlockItem({ definition, onAddBlock }: { 
  definition: typeof BLOCK_DEFINITIONS[0]; 
  onAddBlock: (type: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `toolbar-${definition.type}`,
    data: {
      type: 'new-block',
      blockType: definition.type
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onAddBlock(definition.type)}
      className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent cursor-grab active:cursor-grabbing transition-colors group"
    >
      <div className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
        <GripVertical className="h-4 w-4" />
      </div>
      <span className="text-xl">{definition.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{definition.label}</div>
        <div className="text-xs text-muted-foreground truncate">{definition.description}</div>
      </div>
    </div>
  );
}

export function BlockToolbar({ onAddBlock }: BlockToolbarProps) {
  // Grouper les blocs par catégorie
  const contentBlocks = BLOCK_DEFINITIONS.filter(b => 
    ['header', 'edito', 'article', 'tech', 'chiffre', 'agenda'].includes(b.type)
  );
  const mediaBlocks = BLOCK_DEFINITIONS.filter(b => 
    ['image', 'separator', 'button'].includes(b.type)
  );
  const layoutBlocks = BLOCK_DEFINITIONS.filter(b => 
    ['text', 'footer'].includes(b.type)
  );

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          📰 Contenu
        </h3>
        <div className="space-y-2">
          {contentBlocks.map(def => (
            <DraggableBlockItem key={def.type} definition={def} onAddBlock={onAddBlock} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          🖼️ Média
        </h3>
        <div className="space-y-2">
          {mediaBlocks.map(def => (
            <DraggableBlockItem key={def.type} definition={def} onAddBlock={onAddBlock} />
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          📋 Mise en page
        </h3>
        <div className="space-y-2">
          {layoutBlocks.map(def => (
            <DraggableBlockItem key={def.type} definition={def} onAddBlock={onAddBlock} />
          ))}
        </div>
      </div>
    </div>
  );
}
