import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BigSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  activeFilters?: string[];
  onClearFilter?: (filter: string) => void;
  onAdvancedFilters?: () => void;
  placeholder?: string;
  className?: string;
}

export function BigSearchBar({
  value,
  onChange,
  activeFilters = [],
  onClearFilter,
  onAdvancedFilters,
  placeholder = "Rechercher par mot-clé, acteur (ex: ANSUT, Ministre)...",
  className
}: BigSearchBarProps) {
  return (
    <div className={cn("mb-8", className)}>
      <div className="relative max-w-4xl">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-muted-foreground" />
        </div>
        <Input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-12 pr-32 py-6 text-base bg-card border-border/50 rounded-xl shadow-sm focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
          placeholder={placeholder}
        />
        <div className="absolute inset-y-0 right-2 flex items-center gap-2">
          {value && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onChange('')}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          {onAdvancedFilters && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onAdvancedFilters}
              className="flex items-center gap-1 text-xs font-semibold"
            >
              <Filter className="h-3.5 w-3.5" />
              Filtres
            </Button>
          )}
        </div>
      </div>
      
      {/* Filtres actifs */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3 max-w-4xl">
          <span className="text-xs text-muted-foreground py-1">Filtres actifs :</span>
          {activeFilters.map(filter => (
            <Badge 
              key={filter} 
              variant="secondary" 
              className="flex items-center gap-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
              onClick={() => onClearFilter?.(filter)}
            >
              {filter}
              <X className="h-3 w-3" />
            </Badge>
          ))}
          {activeFilters.length > 1 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => activeFilters.forEach(f => onClearFilter?.(f))}
              className="text-xs text-muted-foreground h-6"
            >
              Tout effacer
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
