import { useState } from 'react';
import { QuadrantType } from '@/types';
import { cn } from '@/lib/utils';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface QuadrantFilterBarProps {
  activeQuadrants: Set<QuadrantType>;
  quadrantOrder: QuadrantType[];
  onFilterChange: (active: Set<QuadrantType>) => void;
  onOrderChange: (order: QuadrantType[]) => void;
}

const quadrantMeta: Record<QuadrantType, { label: string; color: string; bg: string }> = {
  tech: { label: 'TECH', color: 'text-blue-500', bg: 'bg-blue-500/15 border-blue-500/40' },
  regulation: { label: 'RÉGUL.', color: 'text-amber-500', bg: 'bg-amber-500/15 border-amber-500/40' },
  market: { label: 'MARCHÉ', color: 'text-green-500', bg: 'bg-green-500/15 border-green-500/40' },
  reputation: { label: 'RÉPUT.', color: 'text-purple-500', bg: 'bg-purple-500/15 border-purple-500/40' },
};

function SortableChip({
  quadrant,
  active,
  onToggle,
}: {
  quadrant: QuadrantType;
  active: boolean;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: quadrant });
  const meta = quadrantMeta[quadrant];

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onToggle}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-bold border cursor-grab active:cursor-grabbing transition-opacity select-none',
        meta.bg,
        meta.color,
        !active && 'opacity-30',
        isDragging && 'shadow-lg',
      )}
    >
      {meta.label}
    </button>
  );
}

export function QuadrantFilterBar({ activeQuadrants, quadrantOrder, onFilterChange, onOrderChange }: QuadrantFilterBarProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = quadrantOrder.indexOf(active.id as QuadrantType);
      const newIndex = quadrantOrder.indexOf(over.id as QuadrantType);
      onOrderChange(arrayMove(quadrantOrder, oldIndex, newIndex));
    }
  }

  function toggleQuadrant(q: QuadrantType) {
    const next = new Set(activeQuadrants);
    if (next.has(q)) next.delete(q);
    else next.add(q);
    onFilterChange(next);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={quadrantOrder} strategy={horizontalListSortingStrategy}>
        <div className="flex items-center gap-2 flex-wrap">
          {quadrantOrder.map(q => (
            <SortableChip key={q} quadrant={q} active={activeQuadrants.has(q)} onToggle={() => toggleQuadrant(q)} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
