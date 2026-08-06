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
import {
  Building2,
  Pencil,
  MoreHorizontal,
  Archive,
  Trash2,
  Flame,
  AlertTriangle,
  Newspaper,
  Clock,
  Radio,
  ArrowRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
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

// Cercle : information réelle, conservée comme repère. Le bleu reste discret
// (un point + une étiquette en contour), il n'écrase plus toute la carte —
// la couleur forte est réservée au signal (vert = activité, orange = attention).
const getCercleDot = (cercle: CercleStrategique) => {
  switch (cercle) {
    case 1: return 'bg-blue-500';
    case 2: return 'bg-teal-500';
    case 3: return 'bg-green-500';
    case 4: return 'bg-purple-500';
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

const CERCLE_LABEL: Record<CercleStrategique, string> = {
  1: 'Institutions',
  2: 'Opérateurs',
  3: 'Partenaires',
  4: 'Influenceurs',
};

/**
 * Fiche d'intelligence d'un acteur (et non une ligne de CRM).
 *
 * Principe (Charte de crédibilité) : on raconte quelque chose à partir de
 * FAITS, jamais de scores. Les indicateurs composites 0-100 (SPDI, « influence »,
 * « présence média ») sont retirés : le cerveau comprend « 7 citations presse »
 * immédiatement, il n'a pas besoin d'un score interprété.
 *
 * La carte ne disparaît jamais : sans activité mesurée, elle affiche un état
 * honnête (« Aucune mention reliée récemment ») plutôt qu'un « 0 » ou un vide.
 */
export function SmartActeurCard({
  personnalite,
  mentions7j,
  onClick,
  onEdit,
  onArchive,
  onDelete,
}: SmartActeurCardProps) {
  const initials = `${personnalite.prenom?.[0] || ''}${personnalite.nom[0]}`.toUpperCase();

  // Faits réels uniquement (aucune fabrication).
  const derniereActivite = personnalite.derniere_activite
    ? new Date(personnalite.derniere_activite)
    : null;
  const aDeMentions = typeof mentions7j === 'number' && mentions7j > 0;
  const aDeLActivite = aDeMentions || !!derniereActivite;
  const pourquoi = (personnalite.bio || '').trim();

  return (
    <div
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-md transition-all duration-300',
        'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg cursor-pointer',
      )}
      onClick={onClick}
    >
      <div className="flex flex-1 flex-col p-5">
        {/* En-tête : identité */}
        <div className="mb-4 flex items-start justify-between gap-2">
          <div className="flex min-w-0 gap-3">
            <Avatar className="h-12 w-12 shrink-0 border border-border/60 bg-muted">
              {personnalite.photo_url && (
                <AvatarImage src={personnalite.photo_url} alt={personnalite.nom} />
              )}
              <AvatarFallback className="bg-muted text-sm font-bold text-foreground/80">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold leading-tight text-foreground group-hover:text-primary">
                {personnalite.prenom} {personnalite.nom}
              </h3>
              {personnalite.fonction && (
                <p className="mt-0.5 line-clamp-2 text-xs font-medium text-muted-foreground">
                  {personnalite.fonction}
                </p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                  <span className={cn('h-1.5 w-1.5 rounded-full', getCercleDot(personnalite.cercle))} />
                  {CERCLE_LABEL[personnalite.cercle]}
                </span>
                {personnalite.categorie && (
                  <span className="rounded-md border border-border/70 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {getCategorieLabel(personnalite.categorie)}
                  </span>
                )}
                {personnalite.niveau_alerte === 'critique' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-0.5 rounded-md border border-incident-border bg-incident-soft px-1.5 py-0.5 text-[10px] font-bold text-incident">
                          <Flame className="h-2.5 w-2.5" />
                          Sensible
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p className="text-xs">Acteur à sensibilité élevée</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                {personnalite.niveau_alerte === 'eleve' && (
                  <span className="inline-flex items-center gap-0.5 rounded-md border border-attention-border bg-attention-soft px-1.5 py-0.5 text-[10px] font-semibold text-attention">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    Vigilance
                  </span>
                )}
              </div>
            </div>
          </div>

          {(onEdit || onArchive || onDelete) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Autres actions"
                  className="h-8 w-8 shrink-0 text-muted-foreground/50 hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {onEdit && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Modifier
                  </DropdownMenuItem>
                )}
                {onArchive && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(); }}>
                      <Archive className="mr-2 h-4 w-4" />
                      Archiver
                    </DropdownMenuItem>
                  </>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Cette semaine — des FAITS, jamais un score */}
        <div className="rounded-xl border border-border/50 bg-muted/25 p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/80">
            Cette semaine
          </p>
          {aDeLActivite ? (
            <ul className="space-y-1.5 text-xs">
              {aDeMentions && (
                <li className="flex items-center gap-2 font-medium text-foreground/90">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                  <Newspaper className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  {mentions7j} citation{mentions7j! > 1 ? 's' : ''} presse
                </li>
              )}
              {derniereActivite && (
                <li className="flex items-center gap-2 text-muted-foreground">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                  <Clock className="h-3.5 w-3.5" />
                  Dernière apparition&nbsp;: {formatDistanceToNow(derniereActivite, { addSuffix: true, locale: fr })}
                </li>
              )}
            </ul>
          ) : (
            <div className="flex items-start gap-2 text-xs text-muted-foreground">
              <Radio className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <span>Aucune mention reliée récemment.</span>
            </div>
          )}
        </div>

        {/* Pourquoi il est important — éditorial, humain, donc crédible */}
        {(pourquoi || personnalite.organisation) && (
          <div className="mt-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground/80">
              Pourquoi il compte
            </p>
            {pourquoi ? (
              <p className="line-clamp-3 text-xs leading-relaxed text-foreground/85">
                {pourquoi}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5 shrink-0" />
                <span className="line-clamp-1">{personnalite.organisation}</span>
              </p>
            )}
          </div>
        )}
      </div>

      {/* Pied : accès au dossier */}
      <div className="flex items-center justify-between border-t border-border/50 px-5 py-2.5">
        <span className="text-[11px] text-muted-foreground/70">Fiche acteur</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary transition-transform group-hover:translate-x-0.5">
          Voir le dossier
          <ArrowRight className="h-3.5 w-3.5" aria-hidden />
        </span>
      </div>
    </div>
  );
}
