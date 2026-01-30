import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { CERCLE_LABELS, usePersonnalitesStats } from '@/hooks/usePersonnalites';
import type { CercleStrategique, CategorieActeur, NiveauAlerte } from '@/types';
import type { PersonnalitesFilters } from '@/hooks/usePersonnalites';
import { cn } from '@/lib/utils';

interface ActeurFiltersProps {
  filters: PersonnalitesFilters;
  onFiltersChange: (filters: PersonnalitesFilters) => void;
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

export function ActeurFilters({ filters, onFiltersChange }: ActeurFiltersProps) {
  const { data: stats } = usePersonnalitesStats();
  const hasFilters = filters.cercle || filters.categorie || filters.niveau_alerte || filters.search;

  const clearFilters = () => {
    onFiltersChange({ actif: true });
  };

  const toggleCercle = (cercle: CercleStrategique) => {
    if (filters.cercle === cercle) {
      onFiltersChange({ ...filters, cercle: undefined });
    } else {
      onFiltersChange({ ...filters, cercle });
    }
  };

  return (
    <div className="space-y-4">
      {/* Barre de recherche centrale */}
      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Rechercher un acteur, une fonction, une organisation..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
          className="pl-12 h-12 text-base rounded-xl border-border/50 shadow-sm focus:shadow-md transition-shadow"
        />
        {filters.search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
            onClick={() => onFiltersChange({ ...filters, search: undefined })}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Filtres : Chips cercles + Dropdowns */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {/* Chips pour les cercles */}
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {([1, 2, 3, 4] as CercleStrategique[]).map((cercle) => {
            const { color, label } = CERCLE_LABELS[cercle];
            const count = stats?.parCercle[cercle] ?? 0;
            const isActive = filters.cercle === cercle;
            
            return (
              <button
                key={cercle}
                onClick={() => toggleCercle(cercle)}
                className={cn(
                  'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all border',
                  isActive
                    ? 'bg-foreground text-background border-foreground shadow-md'
                    : 'bg-background text-foreground border-border hover:border-foreground/50 hover:shadow-sm'
                )}
              >
                <div className={cn('h-2.5 w-2.5 rounded-full', color)} />
                <span>C{cercle}</span>
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-background/20' : 'bg-muted'
                )}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="h-6 w-px bg-border hidden sm:block" />

        {/* Filtre par catégorie */}
        <Select
          value={filters.categorie || 'all'}
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              categorie: value === 'all' ? undefined : value as CategorieActeur 
            })
          }
        >
          <SelectTrigger className="w-[140px] h-9 rounded-lg">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes</SelectItem>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtre par niveau d'alerte */}
        <Select
          value={filters.niveau_alerte || 'all'}
          onValueChange={(value) => 
            onFiltersChange({ 
              ...filters, 
              niveau_alerte: value === 'all' ? undefined : value as NiveauAlerte 
            })
          }
        >
          <SelectTrigger className="w-[120px] h-9 rounded-lg">
            <SelectValue placeholder="Alerte" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous</SelectItem>
            {NIVEAUX_ALERTE.map((niveau) => (
              <SelectItem key={niveau.value} value={niveau.value}>
                {niveau.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Bouton reset */}
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1.5">
            <X className="h-4 w-4" />
            Effacer
          </Button>
        )}
      </div>
    </div>
  );
}
