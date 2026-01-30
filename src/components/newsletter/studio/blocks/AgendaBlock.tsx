import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { BlockProps } from '@/types/newsletter-studio';

interface AgendaItem {
  type: 'evenement' | 'appel_projets' | 'deploiement' | 'decision';
  titre: string;
  date?: string;
}

const typeConfig = {
  evenement: { icon: '📆', label: 'Événement', color: 'bg-violet-500' },
  appel_projets: { icon: '📢', label: 'Appel à projets', color: 'bg-emerald-500' },
  deploiement: { icon: '🚀', label: 'Déploiement', color: 'bg-blue-500' },
  decision: { icon: '⚖️', label: 'Décision', color: 'bg-amber-500' }
};

export function AgendaBlock({ block, isSelected, onSelect, onUpdate }: BlockProps) {
  const { content, style } = block;
  
  const [items, setItems] = useState<AgendaItem[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse((content.items as string) || '[]');
      setItems(parsed);
    } catch {
      setItems([]);
    }
  }, [content.items]);

  const updateItems = (newItems: AgendaItem[]) => {
    setItems(newItems);
    onUpdate({ ...content, items: JSON.stringify(newItems) });
  };

  const addItem = () => {
    updateItems([...items, { type: 'evenement', titre: 'Nouvel événement' }]);
  };

  const removeItem = (index: number) => {
    updateItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, updates: Partial<AgendaItem>) => {
    updateItems(items.map((item, i) => i === index ? { ...item, ...updates } : item));
  };

  return (
    <div 
      onClick={onSelect}
      className={`relative cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary ring-offset-2' : 'hover:ring-1 hover:ring-muted-foreground/30'}`}
      style={{
        backgroundColor: style.backgroundColor || '#f3e5f5',
        padding: style.padding || '24px',
        borderRadius: style.borderRadius || '12px'
      }}
    >
      {/* Section header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center text-lg">📅</div>
          <span className="text-xs font-bold uppercase tracking-wider text-violet-700">À Venir</span>
        </div>
        {isSelected && (
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); addItem(); }}>
            <Plus className="h-4 w-4 mr-1" />
            Ajouter
          </Button>
        )}
      </div>

      {/* Items */}
      <div className="space-y-3">
        {items.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Aucun événement à venir
          </p>
        )}
        {items.map((item, index) => (
          <div 
            key={index} 
            className={`flex items-center gap-3 ${isSelected ? 'bg-white/50 p-2 rounded-lg' : ''}`}
          >
            {isSelected ? (
              <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                <Select
                  value={item.type}
                  onValueChange={(v) => updateItem(index, { type: v as AgendaItem['type'] })}
                >
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeConfig).map(([key, cfg]) => (
                      <SelectItem key={key} value={key}>
                        {cfg.icon} {cfg.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={item.titre}
                  onChange={(e) => updateItem(index, { titre: e.target.value })}
                  placeholder="Titre"
                  className="flex-1"
                />
                <Input
                  value={item.date || ''}
                  onChange={(e) => updateItem(index, { date: e.target.value })}
                  placeholder="Date"
                  className="w-28"
                />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="text-destructive"
                  onClick={() => removeItem(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className={`w-8 h-8 ${typeConfig[item.type]?.color || 'bg-gray-400'} rounded-lg flex items-center justify-center text-sm`}>
                  {typeConfig[item.type]?.icon || '📌'}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-foreground text-sm">{item.titre}</div>
                  {item.date && (
                    <div className="text-xs text-muted-foreground">{item.date}</div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
