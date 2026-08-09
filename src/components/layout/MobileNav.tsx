import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import {
  MOBILE_SECTIONS,
  MOBILE_SECONDARY_SECTIONS,
  ADMIN_SECTION,
  type NavSection,
} from '@/config/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

/**
 * Barre de navigation basse, affichee uniquement sur mobile.
 *
 * Sur telephone, la barre laterale n'etait accessible qu'apres avoir ouvert un
 * tiroir : chaque changement de section demandait deux gestes et masquait le
 * contenu. Cette barre place les destinations principales a portee de pouce,
 * selon la convention des applications mobiles.
 *
 * Les cinq sections principales sont en acces direct ; toutes les AUTRES
 * sections autorisees (Communication, Insights, Publier, Surveillance,
 * Administration) sont regroupees derriere l'entree « Plus », pour qu'aucune
 * section a laquelle l'utilisateur a droit ne soit injoignable au telephone
 * (correctif audit UX Lot 7).
 *
 * Les cibles tactiles respectent la hauteur minimale de 44 pixels et chaque
 * entree conserve son libelle textuel : une icone seule n'est pas
 * comprehensible par un utilisateur peu familier de l'outil.
 */
export function MobileNav() {
  const location = useLocation();
  const { hasPermission } = useUserPermissions();
  const [plusOpen, setPlusOpen] = useState(false);

  const sections = MOBILE_SECTIONS.filter((section) => hasPermission(section.permission));

  // Sections secondaires du produit + Administration, filtrees par permission.
  const secondaires: NavSection[] = [
    ...MOBILE_SECONDARY_SECTIONS,
    ADMIN_SECTION,
  ].filter((section) => hasPermission(section.permission));

  if (sections.length === 0 && secondaires.length === 0) return null;

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

  // « Plus » est actif quand la route courante est une section secondaire.
  const plusActif = secondaires.some((section) => isActive(section.path));

  const itemClass = (actif: boolean) =>
    `flex min-h-[3.5rem] w-full flex-col items-center justify-center gap-0.5 px-1 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
      actif ? 'text-primary' : 'text-muted-foreground'
    }`;

  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur supports-[backdrop-filter]:bg-background/85 md:hidden"
    >
      <ul className="flex items-stretch justify-around">
        {sections.map((section) => {
          const actif = isActive(section.path);
          return (
            <li key={section.id} className="flex-1">
              <NavLink
                to={section.path}
                aria-current={actif ? 'page' : undefined}
                className={itemClass(actif)}
              >
                <section.icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="w-full truncate text-xs font-medium leading-tight">
                  {section.label}
                </span>
              </NavLink>
            </li>
          );
        })}

        {secondaires.length > 0 && (
          <li className="flex-1">
            <Sheet open={plusOpen} onOpenChange={setPlusOpen}>
              <SheetTrigger
                className={itemClass(plusActif)}
                aria-label="Plus de sections"
                aria-current={plusActif ? 'page' : undefined}
              >
                <Menu className="h-5 w-5 shrink-0" aria-hidden />
                <span className="w-full truncate text-xs font-medium leading-tight">Plus</span>
              </SheetTrigger>
              <SheetContent side="bottom" className="pb-[env(safe-area-inset-bottom)]">
                <SheetHeader className="text-left">
                  <SheetTitle>Toutes les sections</SheetTitle>
                </SheetHeader>
                <ul className="mt-4 grid grid-cols-2 gap-2">
                  {secondaires.map((section) => {
                    const actif = isActive(section.path);
                    return (
                      <li key={section.id}>
                        <NavLink
                          to={section.path}
                          onClick={() => setPlusOpen(false)}
                          aria-current={actif ? 'page' : undefined}
                          className={`flex min-h-[3.5rem] items-center gap-3 rounded-lg border border-border px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            actif ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                          }`}
                        >
                          <section.icon className="h-5 w-5 shrink-0" aria-hidden />
                          <span className="min-w-0 truncate text-sm font-medium">
                            {section.label}
                          </span>
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </SheetContent>
            </Sheet>
          </li>
        )}
      </ul>
    </nav>
  );
}
