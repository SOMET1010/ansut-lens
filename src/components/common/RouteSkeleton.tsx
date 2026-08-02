import { Skeleton } from '@/components/ui/skeleton';
import { PageContainer } from './PageContainer';

/**
 * Squelette affiche pendant le chargement differe d'une route.
 *
 * Le decoupage de code introduit par la refonte fait qu'une page n'est
 * telechargee qu'au moment ou l'utilisateur y accede. Sans ce squelette,
 * l'utilisateur verrait un ecran blanc : la perception de lenteur serait
 * deplacee plutot que supprimee. La forme du squelette reprend celle d'un
 * en-tete de page suivi de contenu, pour que la transition soit sans a-coup.
 */
export function RouteSkeleton() {
  return (
    <PageContainer>
      <div role="status" aria-live="polite" className="space-y-6">
        <span className="sr-only">Chargement de la page</span>
        <div className="flex items-start gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 rounded-xl" />
          ))}
        </div>
      </div>
    </PageContainer>
  );
}
