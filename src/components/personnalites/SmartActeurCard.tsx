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
import { Award, Building2, Pencil, MoreHorizontal, Archive, Trash2, Activity, Flame, AlertTriangle, Newspaper, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CERCLE_LABELS } from '@/hooks/usePersonnalites';
import { MiniSparkline } from '@/components/spdi/MiniSparkline';
import { SentimentBar } from '@/components/spdi/SentimentBar';
import { useActeurDigitalDashboard } from '@/hooks/useActeurDigitalDashboard';
import type { Personnalite, CercleStrategique } from '@/types';
import { cn } from '@/lib/utils';

interface SmartActeurCardProps {
  personnalite: Personnalite;
  allPersonnalites?: Personnalite[];
  /** Nombre de mentions réelles sur 7 jours (job lier-mentions-acteurs). */
  mentions7j?: number;
  onClick?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

// --- SPDI helpers ---

const getSPDIColor = (score: number) => {
  if (score >= 80) return { text: 'text-confirme', bg: 'bg-confirme', badge: 'bg-confirme-soft text-confirme border-confirme-border' };
  if (score >= 60) return { text: 'text-primary', bg: 'bg-primary', badge: 'bg-primary/10 text-primary border-primary/20' };
  if (score >= 40) return { text: 'text-attention', bg: 'bg-attention', badge: 'bg-attention-soft text-attention border-attention-border' };
  return { text: 'text-incident', bg: 'bg-incident', badge: 'bg-incident-soft text-incident border-incident-border' };
};

const getCercleStyles = (cercle: CercleStrategique) => {
  switch (cercle) {
    case 1: return { 
      badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800', 
      avatar: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950 dark:text-blue-300',
      bar: 'bg-blue-500'
    };
    case 2: return { 
      badge: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800', 
      avatar: 'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-950 dark:text-teal-300',
      bar: 'bg-teal-500'
    };
    case 3: return { 
      badge: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800', 
      avatar: 'bg-green-50 text-green-700 border-green-100 dark:bg-green-950 dark:text-green-300',
      bar: 'bg-green-500'
    };
    case 4: return { 
      badge: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800', 
      avatar: 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950 dark:text-purple-300',
      bar: 'bg-purple-500'
    };
  }
};

const getCategorieStyle = (categorie?: string) => {
  const styles: Record<string, string> = {
    regulateur: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
    politique: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
    operateur: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
    fai: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800',
    fintech: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    bailleur: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800',
    expert: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800',
    media: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800',
    autre: 'bg-muted text-muted-foreground border-border',
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

export function SmartActeurCard({
  personnalite,
  mentions7j,
  onClick,
  onEdit,
  onArchive,
  onDelete
}: SmartActeurCardProps) {
  const cercleStyles = getCercleStyles(personnalite.cercle);
  const initials = `${personnalite.prenom?.[0] || ''}${personnalite.nom[0]}`.toUpperCase();

  // Activité réelle (Charte : n'affiche que ce qui est mesuré et sourcé).
  const derniereActivite = personnalite.derniere_activite
    ? new Date(personnalite.derniere_activite)
    : null;
  const aDeMentions = typeof mentions7j === 'number' && mentions7j > 0;
  const aDeLActivite = aDeMentions || !!derniereActivite;

  const suiviActif = personnalite.suivi_spdi_actif ?? false;
  const scoreSPDI = personnalite.score_spdi_actuel;
  const dashboard = useActeurDigitalDashboard(
    suiviActif ? personnalite.id : undefined,
    personnalite.cercle
  );

  return (
    <div 
      className={cn(
        'group bg-card rounded-2xl p-5 border border-border/50 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300 flex flex-col h-full relative overflow-hidden cursor-pointer'
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
          {/* Avatar avec badge SPDI */}
          <div className="relative shrink-0">
            <Avatar className={cn('h-14 w-14 border', cercleStyles.avatar)}>
              {personnalite.photo_url && (
                <AvatarImage src={personnalite.photo_url} alt={personnalite.nom} />
              )}
              <AvatarFallback className={cn('text-lg font-bold', cercleStyles.avatar)}>
                {initials}
              </AvatarFallback>
            </Avatar>
            
            {/* Badge de présence médiatique — affiché uniquement si la présence
                est réellement suivie et mesurée (Charte : pas de score fabriqué). */}
            {suiviActif && scoreSPDI != null && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="absolute -bottom-1 -right-1 bg-background p-0.5 rounded-full shadow-sm">
                      <div className={cn(
                        'flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full border',
                        getSPDIColor(scoreSPDI).badge
                      )}>
                        <Activity className="h-2 w-2" />
                        {Math.round(scoreSPDI)}
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Présence médiatique observée (0 à 100)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {/* Mini sparkline under avatar */}
            {suiviActif && dashboard.sparklineData.length >= 2 && (
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                <MiniSparkline data={dashboard.sparklineData} width={40} height={12} />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors truncate">
              {personnalite.prenom} {personnalite.nom}
            </h3>
            {/* Badges Cercle + Type + Alignement */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={cn(
                'px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide border',
                cercleStyles.badge
              )}>
                Cercle {personnalite.cercle}
              </span>
              {personnalite.categorie && (
                <span className={cn(
                  'px-2 py-0.5 rounded-md text-[10px] font-semibold border',
                  getCategorieStyle(personnalite.categorie)
                )}>
                  {getCategorieLabel(personnalite.categorie)}
                </span>
              )}
              {personnalite.niveau_alerte === 'critique' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold border bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800">
                        <Flame className="h-2.5 w-2.5" />
                        Sensible
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="bottom"><p className="text-xs">Acteur à sensibilité élevée</p></TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {personnalite.niveau_alerte === 'eleve' && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border bg-attention-soft text-attention border-attention-border">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Vigilance
                </span>
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
                size="icon" aria-label="Autres actions"
                className="h-8 w-8 text-muted-foreground/50 hover:text-foreground shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              {onEdit && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} aria-label="Autres actions">
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

      {/* Corps : Fonction et Organisation */}
      <div className="mb-4 flex-grow space-y-2">
        {personnalite.fonction && (
          <div className="flex items-start gap-2">
            <Award className="h-4 w-4 mt-0.5 text-muted-foreground/60 shrink-0" />
            <p className="text-sm font-medium text-foreground/90 line-clamp-2">
              {personnalite.fonction}
            </p>
          </div>
        )}
        {personnalite.organisation && (
          <div className="flex items-start gap-2">
            <Building2 className="h-4 w-4 mt-0.5 text-muted-foreground/60 shrink-0" />
            <p className="text-sm text-muted-foreground line-clamp-1">
              {personnalite.organisation}
            </p>
          </div>
        )}
      </div>

      {/* Tags thématiques */}
      {personnalite.thematiques && personnalite.thematiques.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-4">
          {personnalite.thematiques.slice(0, 3).map((theme) => (
            <span 
              key={theme} 
              className="text-[10px] px-2 py-0.5 rounded bg-muted/80 text-muted-foreground border border-border/50"
            >
              #{theme}
            </span>
          ))}
          {personnalite.thematiques.length > 3 && (
            <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground">
              +{personnalite.thematiques.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Compact sentiment bar */}
      {suiviActif && (
        <div className="mb-3">
          <SentimentBar {...dashboard.sentimentDistribution} compact />
        </div>
      )}

      {/* Activité réelle — affichée uniquement si des mentions sont reliées
          (job lier-mentions-acteurs). Sinon rien : pas de « 0 » fabriqué. */}
      {aDeLActivite && (
        <div className="mt-auto pt-3 border-t border-border/50 flex items-center gap-3 text-[11px] text-muted-foreground">
          {aDeMentions && (
            <span className="inline-flex items-center gap-1 font-medium text-foreground/80">
              <Newspaper className="h-3 w-3" />
              {mentions7j} {mentions7j! > 1 ? 'mentions' : 'mention'} · 7 j
            </span>
          )}
          {derniereActivite && (
            <span className="inline-flex items-center gap-1" title="Date de la mention la plus récente">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(derniereActivite, { addSuffix: true, locale: fr })}
            </span>
          )}
        </div>
      )}

    </div>
  );
}
