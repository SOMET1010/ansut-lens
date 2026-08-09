import { Minus, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

interface ChiffreCleProps {
  /** Ce que le chiffre mesure, en francais courant. */
  libelle: string;
  valeur: number | string;
  /**
   * Phrase d'interpretation du chiffre.
   * L'audit a montre qu'un nombre brut ne dit rien a l'utilisateur : « 47 »
   * n'a de sens que replace dans une tendance et un jugement.
   */
  lecture: string;
  /** Variation en pourcentage par rapport a la periode precedente. */
  variation?: number | null;
  icon?: LucideIcon;
  /** Rend la tuile cliquable vers le detail correspondant. */
  to?: string;
  isLoading?: boolean;
  /** Signale un chiffre demandant une action (alertes non traitees). */
  alerte?: boolean;
}

/**
 * Tuile de chiffre cle accompagnee de son interpretation.
 *
 * La difference avec les tuiles precedentes est l'ajout systematique d'une
 * phrase de lecture : l'utilisateur n'a plus a interpreter lui-meme la valeur.
 */
export function ChiffreCle({
  libelle,
  valeur,
  lecture,
  variation,
  icon: Icon,
  to,
  isLoading,
  alerte,
}: ChiffreCleProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 rounded-xl border bg-card p-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-3 w-32" />
      </div>
    );
  }

  const TendanceIcon =
    variation == null || variation === 0 ? Minus : variation > 0 ? TrendingUp : TrendingDown;

  const tendanceClasse =
    variation == null || variation === 0
      ? 'text-muted-foreground'
      : variation > 0
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-attention';

  const contenu = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {libelle}
        </p>
        {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />}
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold tabular-nums sm:text-3xl">{valeur}</span>
        {variation != null && (
          <span className={`flex items-center gap-0.5 text-xs font-medium ${tendanceClasse}`}>
            <TendanceIcon className="h-3.5 w-3.5" aria-hidden />
            {variation > 0 ? '+' : ''}
            {variation}%
          </span>
        )}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{lecture}</p>
    </>
  );

  const classes = `flex min-h-11 flex-col gap-1.5 rounded-xl border p-4 transition-colors ${
    alerte ? 'border-destructive/40 bg-destructive/[0.04]' : 'bg-card'
  } ${to ? 'hover:border-primary/40 hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring' : ''}`;

  if (to) {
    return (
      <Link to={to} className={classes} aria-label={`${libelle} : ${valeur}. ${lecture}`}>
        {contenu}
      </Link>
    );
  }

  return <div className={classes}>{contenu}</div>;
}
