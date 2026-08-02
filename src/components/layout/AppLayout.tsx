import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { AppHeader } from './AppHeader';
import { MobileNav } from './MobileNav';
import { AssistantFlottant } from './AssistantFlottant';
import { RouteSkeleton } from '@/components/common';

/**
 * Ossature de l'application authentifiee.
 *
 * Les evolutions par rapport a la version precedente sont les suivantes.
 *
 * Un `Suspense` de route accompagne le chargement differe des pages introduit
 * par le decoupage de code : l'utilisateur voit un squelette structure plutot
 * qu'un ecran blanc.
 *
 * Le padding fixe `p-6`, qui gaspillait l'espace sur telephone et laissait le
 * contenu s'etaler sans limite sur grand ecran, est retire. Chaque page gere
 * desormais son propre conteneur via `PageContainer`.
 *
 * Une barre de navigation basse apparait sur mobile, et l'assistant devient un
 * bouton flottant permanent plutot qu'une entree perdue dans le menu.
 */
export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <SidebarInset className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          {/* La marge basse reserve la place de la navigation mobile. */}
          <main className="flex-1 pb-20 md:pb-0">
            <Suspense fallback={<RouteSkeleton />}>
              <Outlet />
            </Suspense>
          </main>
        </SidebarInset>
      </div>
      <MobileNav />
      <AssistantFlottant />
    </SidebarProvider>
  );
}
