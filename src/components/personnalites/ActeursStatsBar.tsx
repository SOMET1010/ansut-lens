import { useMemo } from 'react';
import { Users, Newspaper, MessageSquareQuote, AlertTriangle, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import type { PersonnalitesStats } from '@/hooks/usePersonnalites';
import type { Personnalite } from '@/types';
import { cn } from '@/lib/utils';

interface ActeursStatsBarProps {
  personnalites?: Personnalite[];
  /** Compte de mentions réelles sur 7 j par acteur (job lier-mentions-acteurs). */
  mentions7j?: Record<string, number>;
  stats?: PersonnalitesStats;
  isLoading?: boolean;
}

interface Tuile {
  cle: string;
  libelle: string;
  valeur: number;
  lecture: string;
  methode: string;
  icon: typeof Users;
  alerte?: boolean;
  /** Aucune donnée réelle : la tuile reste présente mais s'affiche en creux. */
  vide?: boolean;
}

/**
 * Bandeau de repères chiffrés en tête de la cartographie des acteurs.
 *
 * Charte de crédibilité : chaque tuile expose une mesure RÉELLE, traçable à sa
 * méthode (icône ⓘ). Aucun chiffre fabriqué (« +42 cette semaine », « 18 en
 * progression », « 1 254 suivis ») — on n'affiche que ce que la base contient.
 * Quand une mesure vaut zéro, la tuile ne disparaît pas (sinon l'écran
 * « retombe » à vide) : elle reste, en creux, avec une lecture honnête.
 */
export function ActeursStatsBar({
  personnalites,
  mentions7j,
  stats,
  isLoading,
}: ActeursStatsBarProps) {
  const tuiles = useMemo<Tuile[]>(() => {
    const total = stats?.total ?? personnalites?.length ?? 0;

    // Acteurs nommés dans un contenu sourcé sur 7 j (mentions reliées > 0).
    const compte = mentions7j ?? {};
    const actifs = Object.values(compte).filter((n) => n > 0).length;
    const mentionsTotal = Object.values(compte).reduce((a, b) => a + b, 0);

    const aSurveiller = stats?.alertesElevees ?? 0;

    return [
      {
        cle: 'total',
        libelle: 'Acteurs suivis',
        valeur: total,
        lecture:
          total > 0
            ? 'Fiches actives dans la base'
            : 'Base à alimenter',
        methode:
          'Nombre de fiches acteur actives (non archivées). Compte brut de la base, sans estimation.',
        icon: Users,
        vide: total === 0,
      },
      {
        cle: 'actifs',
        libelle: 'Actifs médiatiquement · 7 j',
        valeur: actifs,
        lecture:
          actifs > 0
            ? `Nommés dans un contenu sur ${total || '—'}`
            : 'Aucun acteur nommé cette semaine',
        methode:
          'Acteurs cités dans au moins un contenu sourcé sur 7 jours, via le lien acteur↔contenu (job lier-mentions-acteurs). Une mention = l’acteur est nommé, pas une prise de parole.',
        icon: Newspaper,
        vide: actifs === 0,
      },
      {
        cle: 'mentions',
        libelle: 'Mentions reliées · 7 j',
        valeur: mentionsTotal,
        lecture:
          mentionsTotal > 0
            ? 'Citations rattachées à un acteur'
            : 'En attente de mentions reliées',
        methode:
          'Volume total de citations sourcées reliées à un acteur sur 7 jours. Chaque mention est traçable au contenu d’origine.',
        icon: MessageSquareQuote,
        vide: mentionsTotal === 0,
      },
      {
        cle: 'surveiller',
        libelle: 'À surveiller',
        valeur: aSurveiller,
        lecture:
          aSurveiller > 0
            ? 'Sensibilité élevée déclarée'
            : 'Aucun acteur signalé',
        methode:
          'Acteurs dont le niveau d’alerte a été fixé à « élevé » ou « critique » par un éditeur. Réglage humain, non calculé.',
        icon: AlertTriangle,
        alerte: aSurveiller > 0,
        vide: aSurveiller === 0,
      },
    ];
  }, [personnalites, mentions7j, stats]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2 rounded-2xl border bg-card p-4 shadow-sm">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tuiles.map((t) => {
          const Icon = t.icon;
          return (
            <div
              key={t.cle}
              className={cn(
                'flex min-h-[104px] flex-col gap-1.5 rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md',
                t.alerte
                  ? 'border-attention-border bg-attention-soft/40'
                  : 'border-border/60 bg-card',
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={cn(
                    'flex items-center gap-1.5 rounded-lg p-1.5',
                    t.alerte
                      ? 'bg-attention/15 text-attention'
                      : 'bg-primary/10 text-primary',
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="rounded p-0.5 text-muted-foreground/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Méthode : ${t.libelle}`}
                    >
                      <Info className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-xs leading-relaxed">{t.methode}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <span
                className={cn(
                  'text-2xl font-bold tabular-nums sm:text-3xl',
                  t.vide ? 'text-muted-foreground/70' : 'text-foreground',
                )}
              >
                {t.valeur}
              </span>
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.libelle}
                </p>
                <p className="text-xs leading-snug text-muted-foreground/90">{t.lecture}</p>
              </div>
            </div>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
