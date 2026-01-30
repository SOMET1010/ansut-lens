import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Wifi, Wallet, Building2, Landmark, GraduationCap, Newspaper, AlertTriangle, Star, Eye, Pencil } from 'lucide-react';
import { CERCLE_LABELS } from '@/hooks/usePersonnalites';
import type { Personnalite, CercleStrategique } from '@/types';
import { cn } from '@/lib/utils';

interface ActeurCardProps {
  personnalite: Personnalite;
  onClick?: () => void;
  onEdit?: () => void;
}

const getCercleStyles = (cercle: CercleStrategique) => {
  switch (cercle) {
    case 1: return { 
      badge: 'bg-blue-100 text-blue-700 border-blue-200', 
      avatar: 'bg-blue-100 text-blue-700',
      dot: 'bg-blue-500'
    };
    case 2: return { 
      badge: 'bg-orange-100 text-orange-700 border-orange-200', 
      avatar: 'bg-orange-100 text-orange-700',
      dot: 'bg-orange-500'
    };
    case 3: return { 
      badge: 'bg-green-100 text-green-700 border-green-200', 
      avatar: 'bg-green-100 text-green-700',
      dot: 'bg-green-500'
    };
    case 4: return { 
      badge: 'bg-purple-100 text-purple-700 border-purple-200', 
      avatar: 'bg-purple-100 text-purple-700',
      dot: 'bg-purple-500'
    };
  }
};

const getCategorieIcon = (categorie?: string) => {
  switch (categorie) {
    case 'fai': return Wifi;
    case 'fintech': return Wallet;
    case 'operateur': return Building2;
    case 'regulateur':
    case 'politique': return Landmark;
    case 'expert':
    case 'academique': return GraduationCap;
    case 'media': return Newspaper;
    default: return Building2;
  }
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

export function ActeurCard({ personnalite, onClick, onEdit }: ActeurCardProps) {
  const cercleStyles = getCercleStyles(personnalite.cercle);
  const CategorieIcon = getCategorieIcon(personnalite.categorie);
  const initials = `${personnalite.prenom?.[0] || ''}${personnalite.nom[0]}`.toUpperCase();
  
  // Score d'influence (1-5 étoiles)
  const stars = Math.round((personnalite.score_influence / 100) * 5);
  
  // Alerte critique ou élevée
  const hasAlert = personnalite.niveau_alerte === 'critique' || personnalite.niveau_alerte === 'eleve';

  return (
    <Card 
      className={cn(
        'bg-card rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer group relative border border-border/50',
        hasAlert && personnalite.niveau_alerte === 'critique' && 'ring-2 ring-destructive/30',
        hasAlert && personnalite.niveau_alerte === 'eleve' && 'ring-2 ring-yellow-500/30'
      )}
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Header avec Avatar et Badge Cercle */}
        <div className="flex justify-between items-start gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-12 w-12 shrink-0 ring-2 ring-background shadow-sm">
              {personnalite.photo_url && (
                <AvatarImage src={personnalite.photo_url} alt={personnalite.nom} />
              )}
              <AvatarFallback className={cn(cercleStyles.avatar, 'font-bold text-sm')}>
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-base text-foreground truncate">
                {personnalite.prenom} {personnalite.nom}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={cn('inline-flex text-xs font-medium px-2 py-0.5 rounded-full border', cercleStyles.badge)}>
                  Cercle {personnalite.cercle}
                </span>
                {hasAlert && (
                  <AlertTriangle className={cn(
                    'h-3.5 w-3.5',
                    personnalite.niveau_alerte === 'critique' ? 'text-destructive' : 'text-yellow-500'
                  )} />
                )}
              </div>
            </div>
          </div>
          
          {/* Bouton modifier au survol */}
          {onEdit && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Tags alignés */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {personnalite.categorie && (
            <Badge variant="secondary" className="text-xs font-semibold gap-1 rounded-md">
              <CategorieIcon className="h-3 w-3" />
              {getCategorieLabel(personnalite.categorie)}
            </Badge>
          )}
          {personnalite.sous_categorie && (
            <Badge variant="outline" className="text-xs rounded-md text-muted-foreground">
              {personnalite.sous_categorie.replace(/_/g, ' ')}
            </Badge>
          )}
        </div>

        {/* Fonction avec tooltip pour texte tronqué */}
        {personnalite.fonction && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-3 leading-snug min-h-[2.5rem]">
                  {personnalite.fonction}
                  {personnalite.organisation && ` • ${personnalite.organisation}`}
                </p>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{personnalite.fonction}</p>
                {personnalite.organisation && (
                  <p className="text-muted-foreground">{personnalite.organisation}</p>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Thématiques */}
        {personnalite.thematiques && personnalite.thematiques.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
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

        {/* Footer : Score étoiles + Voir le profil */}
        <div className="pt-4 mt-4 border-t border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-0.5">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  'h-3.5 w-3.5',
                  i < stars ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'
                )}
              />
            ))}
          </div>
          <span className="text-sm font-medium text-primary flex items-center gap-1 group-hover:underline">
            <Eye className="h-3.5 w-3.5" />
            Voir le profil
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
