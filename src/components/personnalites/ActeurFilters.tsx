import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { CERCLE_LABELS, SOUS_CATEGORIE_LABELS, type PersonnalitesFilters } from '@/hooks/usePersonnalites';
import type { CercleStrategique, CategorieActeur, NiveauAlerte, SousCategorieActeur } from '@/types';

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
  const hasFilters = filters.cercle || filters.categorie || filters.niveau_alerte || filters.search;

  const clearFilters = () => {
    onFiltersChange({});
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Recherche */}
      <div className="relative flex-1 min-w-[200px] max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un acteur..."
          value={filters.search || ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
          className="pl-9"
        />
      </div>

      {/* Filtre par cercle */}
      <Select
        value={filters.cercle?.toString() || 'all'}
        onValueChange={(value) => 
          onFiltersChange({ 
            ...filters, 
            cercle: value === 'all' ? undefined : parseInt(value) as CercleStrategique 
          })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Tous les cercles" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les cercles</SelectItem>
          {([1, 2, 3, 4] as CercleStrategique[]).map((cercle) => (
            <SelectItem key={cercle} value={cercle.toString()}>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${CERCLE_LABELS[cercle].color}`} />
                <span>Cercle {cercle}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

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
        <SelectTrigger className="w-[150px]">
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
        <SelectTrigger className="w-[130px]">
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
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <X className="h-4 w-4 mr-1" />
          Effacer
        </Button>
      )}
    </div>
  );
}
