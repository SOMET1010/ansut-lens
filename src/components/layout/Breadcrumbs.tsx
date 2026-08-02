import { ChevronRight, Home } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { findSection, NAV_SECTIONS } from '@/config/navigation';

/** Libelles lisibles pour les segments de route qui ne sont pas des sections. */
const SEGMENT_LABELS: Record<string, string> = {
  admin: 'R\u00e9glages',
  users: 'Utilisateurs',
  roles: 'R\u00f4les et permissions',
  'audit-logs': 'Journal des actions',
  'mots-cles': 'Mots-cl\u00e9s',
  sources: 'Sources',
  'import-acteurs': 'Import d\u2019acteurs',
  'cron-jobs': 'T\u00e2ches programm\u00e9es',
  'spdi-status': '\u00c9tat des scores',
  newsletters: 'Newsletters',
  diffusion: 'Diffusion',
  matinale: 'Matinale',
  freshness: 'Fra\u00eecheur',
  scoring: 'Calcul des scores',
  evenements: '\u00c9v\u00e9nements',
  'shadow-tracker': 'Veille discr\u00e8te',
  'coffre-contenu': 'Coffre \u00e0 contenus',
  'veille-semantique': 'Veille s\u00e9mantique',
  'auto-veille': 'Veille automatique',
  credibilite: 'Cr\u00e9dibilit\u00e9 des sources',
  'connecteurs-sociaux': 'Connecteurs sociaux',
  'guide-com-api': 'Guide des API sociales',
  titrologie: 'Titrologie',
  presentation: 'Pr\u00e9sentation',
  formation: 'Formation',
  documentation: 'Documentation technique',
  profile: 'Mon profil',
  alertes: 'Historique des alertes',
  aide: 'Aide et glossaire',
};

/** Libelles des onglets, pour que le fil d'Ariane suive aussi l'onglet actif. */
const TAB_LABELS: Record<string, string> = {
  cartographie: 'Cartographie',
  spdi: 'Scores de pr\u00e9sence',
  revue: 'Revue de stabilit\u00e9',
  cockpit: 'Vue d\u2019ensemble',
  social: 'R\u00e9seaux sociaux',
  notes: 'Notes',
  newsletters: 'Newsletters',
  destinataires: 'Destinataires',
  programmation: 'Programmation',
};

/**
 * Fil d'Ariane dynamique affiche dans l'en-tete de l'application.
 *
 * L'audit a identifie l'absence de tout repere de position comme une cause
 * majeure de desorientation : avec plus de quarante ecrans et jusqu'a trois
 * niveaux d'onglets, l'utilisateur ne savait plus ou il se trouvait ni comment
 * revenir. Ce composant reconstitue le chemin depuis l'accueil, y compris pour
 * les URL heritees et pour l'onglet actif d'une page.
 */
export function Breadcrumbs() {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const segments = location.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const section = findSection(location.pathname);
  const isSectionRoot = section && NAV_SECTIONS.some((s) => s.path === location.pathname);

  type Crumb = { label: string; to?: string };
  const crumbs: Crumb[] = [];

  if (section) {
    crumbs.push({ label: section.label, to: isSectionRoot ? undefined : section.path });
    // Segments restants apres le chemin de la section (routes imbriquees).
    const sectionSegments = section.path.split('/').filter(Boolean).length;
    segments.slice(sectionSegments).forEach((segment, index, rest) => {
      const isLast = index === rest.length - 1;
      const label = SEGMENT_LABELS[segment] ?? decodeURIComponent(segment);
      crumbs.push({
        label,
        to: isLast ? undefined : `/${segments.slice(0, sectionSegments + index + 1).join('/')}`,
      });
    });
  } else {
    segments.forEach((segment, index) => {
      const isLast = index === segments.length - 1;
      const label = SEGMENT_LABELS[segment] ?? decodeURIComponent(segment);
      crumbs.push({ label, to: isLast ? undefined : `/${segments.slice(0, index + 1).join('/')}` });
    });
  }

  // L'onglet actif fait partie du chemin mental de l'utilisateur.
  const tab = searchParams.get('tab');
  if (tab && TAB_LABELS[tab]) {
    crumbs[crumbs.length - 1] = { ...crumbs[crumbs.length - 1], to: location.pathname };
    crumbs.push({ label: TAB_LABELS[tab] });
  }

  return (
    <nav aria-label="Fil d\u2019Ariane" className="hidden min-w-0 items-center gap-1 text-sm md:flex">
      <Link
        to="/ce-matin"
        className="flex shrink-0 items-center gap-1 rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Home className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">Accueil</span>
      </Link>
      {crumbs.map((crumb, index) => (
        <span key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" aria-hidden />
          {crumb.to ? (
            <Link
              to={crumb.to}
              className="truncate rounded-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="truncate font-medium text-foreground" aria-current="page">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
