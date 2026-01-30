import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BlockRenderer } from './BlockRenderer';
import type { NewsletterBlock, BlockStyle, GlobalStyles } from '@/types/newsletter-studio';

interface CanvasAreaProps {
  blocks: NewsletterBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlock: (id: string, content: Record<string, string | number | boolean | undefined>) => void;
  onUpdateBlockStyle: (id: string, style: Partial<BlockStyle>) => void;
  onDeleteBlock: (id: string) => void;
  onDuplicateBlock: (id: string) => void;
  onMoveBlock: (id: string, direction: 'up' | 'down') => void;
  globalStyles: GlobalStyles;
  viewportWidth?: string;
}

function SortableBlock({ 
  block, 
  isSelected, 
  onSelect, 
  onUpdate, 
  onStyleUpdate,
  onDelete,
  onDuplicate,
  onMove,
  isFirst,
  isLast
}: {
  block: NewsletterBlock;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (content: Record<string, string | number | boolean | undefined>) => void;
  onStyleUpdate: (style: Partial<BlockStyle>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMove: (direction: 'up' | 'down') => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? 'shadow-2xl' : ''}`}
    >
      {/* Block actions toolbar */}
      <div 
        className={`absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col gap-1 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <div 
          {...attributes} 
          {...listeners}
          className="p-1.5 rounded bg-muted hover:bg-accent cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onMove('up'); }}
          disabled={isFirst}
        >
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onMove('down'); }}
          disabled={isLast}
        >
          <ChevronDown className="h-4 w-4" />
        </Button>
      </div>

      {/* Block actions (right side) */}
      <div 
        className={`absolute -right-10 top-2 flex flex-col gap-1 transition-opacity ${
          isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={(e) => { e.stopPropagation(); onDuplicate(); }}
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Block renderer */}
      <BlockRenderer
        block={block}
        isSelected={isSelected}
        onSelect={onSelect}
        onUpdate={onUpdate}
        onStyleUpdate={onStyleUpdate}
      />
    </div>
  );
}

export function CanvasArea({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onUpdateBlock,
  onUpdateBlockStyle,
  onDeleteBlock,
  onDuplicateBlock,
  onMoveBlock,
  globalStyles,
  viewportWidth
}: CanvasAreaProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'canvas-drop-zone'
  });

  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);
  const blockIds = sortedBlocks.map(b => b.id);

  return (
    <div 
      className="flex-1 overflow-y-auto p-8 bg-muted/30"
      onClick={() => onSelectBlock(null)}
    >
      <div 
        ref={setNodeRef}
        className={`mx-auto shadow-xl rounded-lg overflow-hidden transition-all duration-300 ${
          isOver ? 'ring-2 ring-primary ring-offset-2' : ''
        }`}
        style={{ 
          maxWidth: viewportWidth || globalStyles.maxWidth,
          backgroundColor: globalStyles.backgroundColor 
        }}
      >
        <SortableContext items={blockIds} strategy={verticalListSortingStrategy}>
          {sortedBlocks.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground border-2 border-dashed rounded-lg m-4">
              <p className="text-lg mb-2">📧 Canvas vide</p>
              <p className="text-sm">Glissez des blocs depuis la barre d'outils ou cliquez pour les ajouter</p>
            </div>
          ) : (
            sortedBlocks.map((block, index) => (
              <SortableBlock
                key={block.id}
                block={block}
                isSelected={selectedBlockId === block.id}
                onSelect={() => onSelectBlock(block.id)}
                onUpdate={(content) => onUpdateBlock(block.id, content)}
                onStyleUpdate={(style) => onUpdateBlockStyle(block.id, style)}
                onDelete={() => onDeleteBlock(block.id)}
                onDuplicate={() => onDuplicateBlock(block.id)}
                onMove={(dir) => onMoveBlock(block.id, dir)}
                isFirst={index === 0}
                isLast={index === sortedBlocks.length - 1}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
