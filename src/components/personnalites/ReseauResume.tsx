import { useMemo } from 'react';
import { Network, Newspaper, Target, ChevronRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { CERCLE_LABELS } from '@/hooks/usePersonnalites';
import type { PersonnalitesStats } from '@/hooks/usePersonnalites';
import type { Personnalite, CercleStrategique } from '@/types';
import { cn } from '@/lib/utils';

interface ReseauResumeProps {
  personnalites?: Personnalite[];
  mentions7j?: Record<string, number>;
  stats?: PersonnalitesStats;
  onActeurClick?: (acteur: Personnalite) => void;
  onVoirRadar?: () => void;
}

const CERCLE_COULEUR: Record<CercleStrategique, string> = {
  1: 'bg-blue-500',
  2: 'bg-teal-500',
  3: 'bg-green-500',
  4: 'bg-purple-500',
};

/**
 * Colonne latérale de la cartographie : un résumé HONNÊTE du réseau.
 *
 * Charte de crédibilité : la maquette de référence montrait un « résumé du
 * réseau » avec des totaux inventés (312 / 186 / 215 / 541) et un « pic
 * +45 mentions en 24 h » fabriqué. On rend ici la même intention visuelle avec
 * les seules données réelles : la répartition effective des acteurs par cercle,
 * et l'acteur réellement le plus mentionné sur 7 jours (mentions reliées et
 * traçables). Aucune magnitude simulée.
 */
export function ReseauResume({
  personnalites,
  mentions7j,
  stats,
  onActeurClick,
  onVoirRadar,
}: ReseauResumeProps) {
  const total = stats?.total ?? personnalites?.length ?? 0;
  const parCercle = stats?.parCercle ?? { 1: 0, 2: 0, 3: 0, 4: 0 };

  const plusMentionne = useMemo(() => {
    const compte = mentions7j ?? {};
    let meilleur: { acteur: Personnalite; n: number } | null = null;
    for (const acteur of personnalites ?? []) {
      const n = compte[acteur.id] ?? 0;
      if (n > 0 && (!meilleur || n > meilleur.n)) meilleur = { acteur, n };
    }
    return meilleur;
  }, [personnalites, mentions7j]);

  const cercles = ([1, 2, 3, 4] as CercleStrategique[]).filter(
    (c) => (parCercle[c] ?? 0) > 0,
  );

  return (
    <TooltipProvider delayDuration={150}>
      <aside className="space-y-4">
        {/* Répartition réelle par cercle */}
        <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <header className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Network className="h-4 w-4 text-muted-foreground" aria-hidden />
              Répartition par cercle
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="rounded p-0.5 text-muted-foreground/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Méthode de la répartition"
                >
                  <Info className="h-3.5 w-3.5" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs leading-relaxed">
                  Comptage brut des fiches acteur actives par cercle de proximité.
                  Aucune estimation : ce sont les acteurs réellement enregistrés.
                </p>
              </TooltipContent>
            </Tooltip>
          </header>

          {total === 0 ? (
            <p className="text-xs text-muted-foreground">
              Aucun acteur enregistré pour l’instant.
            </p>
          ) : (
            <ul className="space-y-3">
              {cercles.map((c) => {
                const n = parCercle[c] ?? 0;
                const pct = total > 0 ? Math.round((n / total) * 100) : 0;
                return (
                  <li key={c} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="flex items-center gap-2 font-medium text-foreground/90">
                        <span className={cn('h-2.5 w-2.5 rounded-full', CERCLE_COULEUR[c])} />
                        {CERCLE_LABELS[c].label}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {n} <span className="text-muted-foreground/60">· {pct}%</span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full', CERCLE_COULEUR[c])}
                        style={{ width: `${Math.max(pct, 4)}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {onVoirRadar && total > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 w-full justify-between text-xs"
              onClick={onVoirRadar}
            >
              <span className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" aria-hidden />
                Voir la cartographie radar
              </span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Button>
          )}
        </section>

        {/* Acteur réellement le plus mentionné (7 j) */}
        <section className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
          <header className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
              <Newspaper className="h-4 w-4 text-muted-foreground" aria-hidden />
              Le plus mentionné · 7 j
            </h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="rounded p-0.5 text-muted-foreground/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Méthode du classement"
                >
                  <Info className="h-3.5 w-3.5" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p className="text-xs leading-relaxed">
                  Acteur cité dans le plus grand nombre de contenus sourcés sur
                  7 jours (mentions reliées et traçables). Ce n’est pas un « pic »
                  ni un score : c’est un simple comptage de citations.
                </p>
              </TooltipContent>
            </Tooltip>
          </header>

          {plusMentionne ? (
            <button
              type="button"
              onClick={() => onActeurClick?.(plusMentionne.acteur)}
              className="group flex w-full items-center gap-3 rounded-xl border border-transparent p-2 text-left transition-colors hover:border-primary/20 hover:bg-accent/30"
            >
              <Avatar className="h-11 w-11 border border-border/60">
                {plusMentionne.acteur.photo_url && (
                  <AvatarImage
                    src={plusMentionne.acteur.photo_url}
                    alt={plusMentionne.acteur.nom}
                  />
                )}
                <AvatarFallback className="bg-muted text-sm font-bold text-foreground/80">
                  {`${plusMentionne.acteur.prenom?.[0] ?? ''}${plusMentionne.acteur.nom[0]}`.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                  {plusMentionne.acteur.prenom} {plusMentionne.acteur.nom}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {plusMentionne.acteur.fonction || plusMentionne.acteur.organisation || '—'}
                </p>
              </div>
              {/* Mentions = activité réelle confirmée → signal vert (charte couleur). */}
              <span className="shrink-0 rounded-lg bg-confirme-soft px-2 py-1 text-xs font-bold tabular-nums text-confirme">
                {plusMentionne.n} {plusMentionne.n > 1 ? 'mentions' : 'mention'}
              </span>
            </button>
          ) : (
            <div className="rounded-xl border border-dashed border-border/70 bg-muted/30 p-3">
              <p className="text-xs leading-relaxed text-muted-foreground">
                Aucune mention reliée cette semaine. Un acteur apparaîtra ici dès
                qu’un contenu sourcé le nommera.
              </p>
            </div>
          )}
        </section>
      </aside>
    </TooltipProvider>
  );
}
