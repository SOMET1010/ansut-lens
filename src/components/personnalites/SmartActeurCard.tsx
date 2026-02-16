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
import { Award, Building2, Network, Eye, Pencil, MoreHorizontal, Archive, Trash2, Info, Activity } from 'lucide-react';
import { CERCLE_LABELS } from '@/hooks/usePersonnalites';
import type { Personnalite, CercleStrategique } from '@/types';
import { cn } from '@/lib/utils';

interface SmartActeurCardProps {
  personnalite: Personnalite;
  allPersonnalites?: Personnalite[];
  onClick?: () => void;
  onEdit?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
}

// --- SPDI helpers ---

const getSPDIColor = (score: number) => {
  if (score >= 80) return { text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500', badge: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950/50 dark:text-green-300 dark:border-green-800' };
  if (score >= 60) return { text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500', badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800' };
  if (score >= 40) return { text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500', badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800' };
  return { text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500', badge: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800' };
};

const getSPDIAdvice = (personnalite: Personnalite): { text: string; color: string } => {
  if (!personnalite.suivi_spdi_actif) {
    return { text: 'Activer le suivi SPDI', color: 'text-muted-foreground' };
  }
  const score = personnalite.score_spdi_actuel ?? 0;
  if (score >= 80) return { text: 'Excellente visibilité', color: 'text-green-600 dark:text-green-400' };
  if (score >= 60) return { text: 'Renforcer la présence LinkedIn', color: 'text-blue-600 dark:text-blue-400' };
  if (score >= 40) return { text: 'Augmenter les prises de parole', color: 'text-orange-600 dark:text-orange-400' };
  return { text: 'Action urgente recommandée', color: 'text-red-600 dark:text-red-400' };
};

// Connexions simulées basées sur le même cercle/organisation
const getConnections = (personnalite: Personnalite, all: Personnalite[]): Personnalite[] => {
  return all
    .filter(p => p.id !== personnalite.id)
    .filter(p => 
      p.cercle === personnalite.cercle || 
      (p.organisation && personnalite.organisation && p.organisation === personnalite.organisation)
    )
    .slice(0, 3);
};

const getCercleStyles = (cercle: CercleStrategique) => {
  switch (cercle) {
    case 1: return { 
      badge: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800', 
      avatar: 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950 dark:text-blue-300',
      bar: 'bg-blue-500'
    };
    case 2: return { 
      badge: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800', 
      avatar: 'bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-950 dark:text-orange-300',
      bar: 'bg-orange-500'
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
    regulateur: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
    politique: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
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
  allPersonnalites = [],
  onClick, 
  onEdit, 
  onArchive, 
  onDelete 
}: SmartActeurCardProps) {
  const cercleStyles = getCercleStyles(personnalite.cercle);
  const initials = `${personnalite.prenom?.[0] || ''}${personnalite.nom[0]}`.toUpperCase();
  const connections = getConnections(personnalite, allPersonnalites);
  const remainingConnections = Math.max(0, allPersonnalites.filter(p => 
    p.id !== personnalite.id && p.cercle === personnalite.cercle
  ).length - 3);
  const influenceScore = personnalite.score_influence ?? 50;

  const suiviActif = personnalite.suivi_spdi_actif ?? false;
  const scoreSPDI = personnalite.score_spdi_actuel;
  const spdiAdvice = getSPDIAdvice(personnalite);

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
            
            {/* Badge SPDI */}
            {suiviActif && scoreSPDI != null ? (
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
                    <p className="text-xs">Score SPDI — Présence digitale</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : !suiviActif ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="absolute -bottom-1 -right-1 bg-background p-0.5 rounded-full shadow-sm">
                      <div className="flex items-center gap-0.5 bg-muted text-muted-foreground text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-border">
                        <Info className="h-2 w-2" />
                        SPDI
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">Suivi SPDI inactif</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}
          </div>
          
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-foreground leading-tight group-hover:text-primary transition-colors truncate">
              {personnalite.prenom} {personnalite.nom}
            </h3>
            {/* Badges Cercle + Type */}
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

      {/* Footer : Connexions, Influence & Conseil SPDI */}
      <div className="pt-4 border-t border-border/30 flex flex-col gap-3 mt-auto">
        <div className="flex items-center justify-between">
          {/* Mini-réseau de connexions */}
          <div className="flex flex-col gap-1">
            <span className="text-[10px] text-muted-foreground font-medium uppercase flex items-center gap-1">
              <Network className="h-3 w-3" /> Connexions
            </span>
            <div className="flex -space-x-2">
              {connections.length > 0 ? (
                <>
                  {connections.map((c) => (
                    <TooltipProvider key={c.id}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Avatar className="h-6 w-6 border-2 border-background cursor-pointer">
                            {c.photo_url && <AvatarImage src={c.photo_url} alt={c.nom} />}
                            <AvatarFallback className="text-[8px] font-bold bg-muted">
                              {c.nom[0]}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p className="text-xs">{c.prenom} {c.nom}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ))}
                  {remainingConnections > 0 && (
                    <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[9px] font-medium text-muted-foreground border-2 border-background">
                      +{remainingConnections}
                    </div>
                  )}
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground/60">—</span>
              )}
            </div>
          </div>

          {/* Jauge d'influence */}
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground font-medium uppercase">Influence</span>
            <div className="flex items-center gap-2 mt-1">
              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all" 
                  style={{ width: `${influenceScore}%` }}
                />
              </div>
              <span className="text-xs font-bold text-primary">
                {influenceScore}
              </span>
            </div>
          </div>
        </div>

        {/* Mini-conseil SPDI */}
        <div className={cn('text-[11px] font-medium flex items-center gap-1', spdiAdvice.color)}>
          <Activity className="h-3 w-3 shrink-0" />
          {spdiAdvice.text}
        </div>
      </div>
    </div>
  );
}
