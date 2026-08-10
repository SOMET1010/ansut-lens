import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Squelette de chargement pour une SECTION de contenu (pas une route entière —
 * pour ça, voir `RouteSkeleton`). Troisième état éditorial partagé, aux côtés de
 * `SectionEmptyState` (vide / erreur) : il évite qu'un écran hésite entre le blanc
 * et le contenu, et remplace les squelettes réécrits à la main dans chaque page.
 *
 * Charte couleur : gris neutre uniquement (contexte), aucune couleur de signal.
 */

type Variant = 'cards' | 'list' | 'lines';

interface SectionSkeletonProps {
  variant?: Variant;
  /** Nombre d'éléments simulés. */
  count?: number;
  /** Classes de grille pour la variante `cards` (défaut : 1 → 2 → 3 colonnes). */
  gridClassName?: string;
  className?: string;
  'aria-label'?: string;
}

function CardSkeleton() {
  return (
    <div className="p-5 rounded-2xl border bg-card">
      <div className="flex items-start gap-4">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="mt-4 pt-4 border-t flex justify-between items-center">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

function RowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border bg-card">
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
      <Skeleton className="h-4 w-16 shrink-0" />
    </div>
  );
}

export function SectionSkeleton({
  variant = 'cards',
  count = 6,
  gridClassName = 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3',
  className,
  'aria-label': ariaLabel = 'Chargement',
}: SectionSkeletonProps) {
  const items = Array.from({ length: Math.max(1, count) });

  if (variant === 'lines') {
    return (
      <div className={cn('space-y-3', className)} role="status" aria-live="polite">
        <span className="sr-only">{ariaLabel}</span>
        {items.map((_, i) => (
          <Skeleton key={i} className="h-4" style={{ width: `${90 - (i % 4) * 12}%` }} />
        ))}
      </div>
    );
  }

  if (variant === 'list') {
    return (
      <div className={cn('space-y-3', className)} role="status" aria-live="polite">
        <span className="sr-only">{ariaLabel}</span>
        {items.map((_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn(gridClassName, className)} role="status" aria-live="polite">
      <span className="sr-only">{ariaLabel}</span>
      {items.map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}
