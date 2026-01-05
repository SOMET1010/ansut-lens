import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Wifi, Wallet, Building2, Landmark, GraduationCap, Newspaper, AlertTriangle, Star, ExternalLink, Pencil } from 'lucide-react';
import { CERCLE_LABELS, SOUS_CATEGORIE_LABELS } from '@/hooks/usePersonnalites';
import type { Personnalite, CercleStrategique } from '@/types';
import { cn } from '@/lib/utils';

interface ActeurCardProps {
  personnalite: Personnalite;
  onClick?: () => void;
  onEdit?: () => void;
}

const getCercleColors = (cercle: CercleStrategique) => {
  switch (cercle) {
    case 1: return { border: 'border-l-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-500' };
    case 2: return { border: 'border-l-orange-500', bg: 'bg-orange-500/10', text: 'text-orange-500' };
    case 3: return { border: 'border-l-green-500', bg: 'bg-green-500/10', text: 'text-green-500' };
    case 4: return { border: 'border-l-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-500' };
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

const getNiveauAlerteStyle = (niveau?: string) => {
  switch (niveau) {
    case 'critique': return 'bg-destructive/20 text-destructive border-destructive/30';
    case 'eleve': return 'bg-signal-warning/20 text-signal-warning border-signal-warning/30';
    default: return '';
  }
};

export function ActeurCard({ personnalite, onClick, onEdit }: ActeurCardProps) {
  const cercleColors = getCercleColors(personnalite.cercle);
  const CategorieIcon = getCategorieIcon(personnalite.categorie);
  const initials = `${personnalite.prenom?.[0] || ''}${personnalite.nom[0]}`.toUpperCase();
  const alerteStyle = getNiveauAlerteStyle(personnalite.niveau_alerte);

  // Score d'influence (1-5 étoiles)
  const stars = Math.round((personnalite.score_influence / 100) * 5);

  return (
    <Card 
      className={cn(
        'glass hover:shadow-lg transition-all cursor-pointer border-l-4 group relative',
        cercleColors.border,
        alerteStyle && 'border',
        alerteStyle
      )}
      onClick={onClick}
    >
      {/* Bouton modifier au survol */}
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      )}
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <Avatar className="h-12 w-12 shrink-0">
            {personnalite.photo_url && (
              <AvatarImage src={personnalite.photo_url} alt={personnalite.nom} />
            )}
            <AvatarFallback className={cn(cercleColors.bg, cercleColors.text, 'font-bold text-sm')}>
              {initials}
            </AvatarFallback>
          </Avatar>

          {/* Infos principales */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm leading-tight truncate">
                  {personnalite.prenom} {personnalite.nom}
                </h3>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {personnalite.fonction}
                </p>
                {personnalite.organisation && (
                  <p className="text-xs text-muted-foreground/70 truncate">
                    {personnalite.organisation}
                  </p>
                )}
              </div>
              
              {/* Niveau alerte */}
              {personnalite.niveau_alerte && personnalite.niveau_alerte !== 'normal' && (
                <AlertTriangle className={cn(
                  'h-4 w-4 shrink-0',
                  personnalite.niveau_alerte === 'critique' ? 'text-destructive' : 'text-signal-warning'
                )} />
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {/* Badge cercle */}
              <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', cercleColors.bg, cercleColors.text)}>
                C{personnalite.cercle}
              </Badge>

              {/* Badge catégorie */}
              {personnalite.categorie && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5">
                  <CategorieIcon className="h-2.5 w-2.5" />
                  {personnalite.categorie}
                </Badge>
              )}

              {/* Score influence */}
              <div className="flex items-center gap-0.5 ml-auto">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      'h-3 w-3',
                      i < stars ? 'fill-secondary text-secondary' : 'text-muted-foreground/30'
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Thématiques */}
            {personnalite.thematiques && personnalite.thematiques.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {personnalite.thematiques.slice(0, 3).map((theme) => (
                  <Badge key={theme} variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                    {theme}
                  </Badge>
                ))}
                {personnalite.thematiques.length > 3 && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                    +{personnalite.thematiques.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Réseaux sociaux */}
            {personnalite.reseaux && Object.keys(personnalite.reseaux).length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                {Object.entries(personnalite.reseaux).map(([network, url]) => (
                  <a
                    key={network}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
