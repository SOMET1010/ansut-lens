import { NavLink, useLocation } from 'react-router-dom';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { MOBILE_SECTIONS } from '@/config/navigation';

/**
 * Barre de navigation basse, affichee uniquement sur mobile.
 *
 * Sur telephone, la barre laterale n'etait accessible qu'apres avoir ouvert un
 * tiroir : chaque changement de section demandait deux gestes et masquait le
 * contenu. Cette barre place les cinq destinations principales a portee de
 * pouce, selon la convention des applications mobiles.
 *
 * Les cibles tactiles respectent la hauteur minimale de 44 pixels et chaque
 * entree conserve son libelle textuel : une icone seule n'est pas
 * comprehensible par un utilisateur peu familier de l'outil.
 */
export function MobileNav() {
  const location = useLocation();
  const { hasPermission } = useUserPermissions();

  const sections = MOBILE_SECTIONS.filter((section) => hasPermission(section.permission));
  if (sections.length === 0) return null;

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(`${path}/`);

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
                className={`flex min-h-[3.5rem] flex-col items-center justify-center gap-0.5 px-1 py-2 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                  actif ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <section.icon className="h-5 w-5 shrink-0" aria-hidden />
                <span className="w-full truncate text-[10px] font-medium leading-tight">
                  {section.label}
                </span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
