import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, Filter } from 'lucide-react';
import { CERCLE_LABELS } from '@/hooks/usePersonnalites';
import type { CercleStrategique, CategorieActeur, NiveauAlerte } from '@/types';
import type { PersonnalitesFilters, PersonnalitesStats } from '@/hooks/usePersonnalites';
import { cn } from '@/lib/utils';

interface UnifiedFilterBarProps {
  filters: PersonnalitesFilters;
  onFiltersChange: (filters: PersonnalitesFilters) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  stats?: PersonnalitesStats;
}

const CATEGORIES: { value: CategorieActeur; label: string }[] = [
  { value: 'regulateur', label: 'Régulateur' },
  { value: 'politique', label: 'Politique' },
  { value: 'operateur', label: 'Opérateur' },
  { value: 'fai', label: 'FAI' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'bailleur', label: 'Bailleur' },
  { value: 'expert', label: 'Expert' },
  { value: 'media', label: 'Média' },
  { value: 'autre', label: 'Autre' },
];

const NIVEAUX_ALERTE: { value: NiveauAlerte; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'eleve', label: 'Élevé' },
  { value: 'critique', label: 'Critique' },
];

export function UnifiedFilterBar({ 
  filters, 
  onFiltersChange, 
  activeTab, 
  onTabChange,
  stats 
}: UnifiedFilterBarProps) {
  const hasFilters = filters.categorie || filters.niveau_alerte || filters.search;

  const clearFilters = () => {
    onFiltersChange({ actif: true });
  };

  return (
    <div className="bg-card p-2 rounded-xl border border-border/50 shadow-sm flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
      
      {/* Zone de recherche */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un acteur, une fonction..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
          className="pl-10 h-10 bg-muted/30 border-transparent focus:border-primary/30 focus:bg-background transition-all"
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => onFiltersChange({ ...filters, search: undefined })}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Separator */}
      <div className="hidden lg:block h-8 w-px bg-border" />

      {/* Tabs Cercles intégrés */}
      <div className="flex bg-muted/50 p-1 rounded-lg overflow-x-auto">
        <button
          onClick={() => onTabChange('all')}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5',
            activeTab === 'all' 
              ? 'bg-background text-foreground shadow-sm' 
              : 'text-muted-foreground hover:text-foreground hover:bg-muted'
          )}
        >
          Tous
          {stats && (
            <span className={cn(
              'text-[10px] px-1.5 py-0.5 rounded-full',
              activeTab === 'all' ? 'bg-primary/10 text-primary' : 'bg-muted'
            )}>
              {stats.total}
            </span>
          )}
        </button>
        
        {([1, 2, 3, 4] as CercleStrategique[]).map((cercle) => {
          const { color } = CERCLE_LABELS[cercle];
          const count = stats?.parCercle[cercle] ?? 0;
          const isActive = activeTab === cercle.toString();
          
          return (
            <button
              key={cercle}
              onClick={() => onTabChange(cercle.toString())}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap flex items-center gap-1.5',
                isActive 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              )}
            >
              <div className={cn('h-2 w-2 rounded-full', color)} />
              <span className="hidden sm:inline">C</span>{cercle}
              <span className={cn(
                'text-[10px] px-1.5 py-0.5 rounded-full',
                isActive ? 'bg-primary/10 text-primary' : 'bg-muted'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Separator */}
      <div className="hidden lg:block h-8 w-px bg-border" />

      {/* Filtres additionnels */}
      <div className="flex items-center gap-2">
        <Select
          value={filters.categorie || 'all'}
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              categorie: value === 'all' ? undefined : value as CategorieActeur 
            })
          }
        >
          <SelectTrigger className="w-[130px] h-9 text-xs">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.niveau_alerte || 'all'}
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              niveau_alerte: value === 'all' ? undefined : value as NiveauAlerte 
            })
          }
        >
          <SelectTrigger className="w-[100px] h-9 text-xs">
            <SelectValue placeholder="Alerte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous niveaux</SelectItem>
            {NIVEAUX_ALERTE.map((niveau) => (
              <SelectItem key={niveau.value} value={niveau.value}>
                {niveau.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1 text-xs">
            <X className="h-3.5 w-3.5" />
            Effacer
          </Button>
        )}
      </div>
    </div>
  );
}
