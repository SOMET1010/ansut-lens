import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Award, Building2, AlertTriangle, Star, Eye, Pencil, MoreHorizontal, Archive, Trash2 } from 'lucide-react';
import { CERCLE_LABELS } from '@/hooks/usePersonnalites';
import type { Personnalite, CercleStrategique } from '@/types';
import { cn } from '@/lib/utils';

interface ActeurCardProps {
  personnalite: Personnalite;
  onClick?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

const getCercleStyles = (cercle: CercleStrategique) => {
  switch (cercle) {
    case 1: return { 
      badge: 'bg-blue-50 text-blue-700 border-blue-200', 
      avatar: 'bg-blue-50 text-blue-700 border-blue-100',
      bar: 'bg-blue-500'
    };
    case 2: return { 
      badge: 'bg-orange-50 text-orange-700 border-orange-200', 
      avatar: 'bg-orange-50 text-orange-700 border-orange-100',
      bar: 'bg-orange-500'
    };
    case 3: return { 
      badge: 'bg-green-50 text-green-700 border-green-200', 
      avatar: 'bg-green-50 text-green-700 border-green-100',
      bar: 'bg-green-500'
    };
    case 4: return { 
      badge: 'bg-purple-50 text-purple-700 border-purple-200', 
      avatar: 'bg-purple-50 text-purple-700 border-purple-100',
      bar: 'bg-purple-500'
    };
  }
};

const getCategorieStyle = (categorie?: string) => {
  const styles: Record<string, string> = {
    regulateur: 'bg-orange-50 text-orange-700 border-orange-200',
    politique: 'bg-orange-50 text-orange-700 border-orange-200',
    operateur: 'bg-purple-50 text-purple-700 border-purple-200',
    fai: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    fintech: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    bailleur: 'bg-green-50 text-green-700 border-green-200',
    expert: 'bg-blue-50 text-blue-700 border-blue-200',
    media: 'bg-pink-50 text-pink-700 border-pink-200',
    autre: 'bg-gray-50 text-gray-700 border-gray-200',
  };
  return styles[categorie || 'autre'] || styles.autre;
};

const getCategorieLabel = (categorie?: string) => {
  const labels: Record<string, string> = {
    regulateur: 'Régulateur',
    politique: 'Politique',
    operateur: 'Opérateur',
    fai: 'FAI',
    fintech: 'Fintech',
    bailleur: 'Bailleur',
    expert: 'Expert',
    media: 'Média',
    autre: 'Autre',
  };
  return labels[categorie || 'autre'] || 'Autre';
};

export function ActeurCard({ personnalite, onClick, onEdit, onArchive, onDelete }: ActeurCardProps) {
  const cercleStyles = getCercleStyles(personnalite.cercle);
  const initials = `${personnalite.prenom?.[0] || ''}${personnalite.nom[0]}`.toUpperCase();
  
  // Score d'influence (1-5 étoiles)
  const stars = Math.round((personnalite.score_influence / 100) * 5);
  
  // Alerte critique ou élevée
  const hasAlert = personnalite.niveau_alerte === 'critique' || personnalite.niveau_alerte === 'eleve';

  return (
    <div 
      className={cn(
        'group bg-card rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 flex flex-col h-full relative overflow-hidden cursor-pointer',
        hasAlert && personnalite.niveau_alerte === 'critique' && 'ring-2 ring-destructive/30',
        hasAlert && personnalite.niveau_alerte === 'eleve' && 'ring-2 ring-yellow-500/30'
      )}
      onClick={onClick}
    >
      {/* Barre de couleur en haut au survol */}
      <div className={cn(
        'absolute top-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity',
        cercleStyles.bar
      )} />

      {/* Header : Avatar + Infos principales */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex gap-4 min-w-0">
          {/* Avatar */}
          <Avatar className={cn('h-14 w-14 shrink-0 border', cercleStyles.avatar)}>
            {personnalite.photo_url && (
              <AvatarImage src={personnalite.photo_url} alt={personnalite.nom} />
            )}
            <AvatarFallback className={cn('text-lg font-bold', cercleStyles.avatar)}>
              {initials}
            </AvatarFallback>
          </Avatar>
          
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors truncate">
              {personnalite.prenom} {personnalite.nom}
            </h3>
            {/* Badges Cercle + Type */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                Cercle {personnalite.cercle}
              </span>
              {personnalite.categorie && (
                <span className={cn(
                  'px-2 py-0.5 rounded-full text-xs font-semibold border',
                  getCategorieStyle(personnalite.categorie)
                )}>
                  {getCategorieLabel(personnalite.categorie)}
                </span>
              )}
              {hasAlert && (
                <AlertTriangle className={cn(
                  'h-3.5 w-3.5',
                  personnalite.niveau_alerte === 'critique' ? 'text-destructive' : 'text-yellow-500'
                )} />
              )}
            </div>
          </div>
        </div>

        {/* Menu contextuel */}
        {(onEdit || onArchive || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground/50 hover:text-foreground shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
              )}
              {onArchive && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); }}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archiver
                  </DropdownMenuItem>
                </>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }} 
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Corps : Fonction et Organisation avec icônes */}
      <div className="mb-6 flex-grow space-y-2">
        {personnalite.fonction && (
          <div className="flex items-start gap-2">
            <Award className="h-4 w-4 mt-0.5 text-muted-foreground/60 shrink-0" />
            <p className="text-sm font-semibold text-foreground/90 line-clamp-2">
              {personnalite.fonction}
            </p>
          </div>
        )}
        {personnalite.organisation && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground/60 shrink-0" />
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {personnalite.organisation}
                  </p>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{personnalite.organisation}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Thématiques (optionnel) */}
      {personnalite.thematiques && personnalite.thematiques.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {personnalite.thematiques.slice(0, 2).map((theme) => (
            <span key={theme} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              {theme}
            </span>
          ))}
          {personnalite.thematiques.length > 2 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              +{personnalite.thematiques.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Footer : Stars & Action */}
      <div className="flex items-center justify-between pt-4 border-t border-border/30 mt-auto">
        {/* Rating Stars */}
        <div className="flex gap-0.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={cn(
                'h-3.5 w-3.5',
                i < stars ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/20'
              )}
            />
          ))}
        </div>

        {/* Bouton Action */}
        <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">
          <Eye className="h-3.5 w-3.5" />
          <span>Détails</span>
        </span>
      </div>
    </div>
  );
}
