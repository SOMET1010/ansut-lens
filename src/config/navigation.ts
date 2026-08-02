import {
  Bot,
  FileText,
  Home,
  Megaphone,
  Newspaper,
  Radio,
  Search,
  Settings,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Registre central de la navigation.
 *
 * Source unique de verite pour la barre laterale, le fil d'Ariane, la recherche
 * globale et la navigation mobile. Toute nouvelle section doit etre declaree ici
 * et nulle part ailleurs, afin que les quatre surfaces restent synchronisees.
 *
 * Regle de nommage : chaque libelle repond a une question que se pose
 * l'utilisateur, en francais courant, sans jargon interne. Le `question` sert
 * de sous-titre explicatif et d'infobulle.
 */
export interface NavSection {
  /** Identifiant stable, utilise comme cle React et dans les preferences. */
  id: string;
  /** Libelle court affiche dans la navigation. */
  label: string;
  /** Question metier a laquelle la section repond, affichee en sous-titre. */
  question: string;
  /** Chemin de la route. */
  path: string;
  icon: LucideIcon;
  /** Permission requise pour voir l'entree. */
  permission: string;
  /** Affiche dans la barre de navigation mobile (5 entrees maximum). */
  mobile?: boolean;
  /** Anciens chemins rediriges vers cette section, pour les liens partages. */
  legacyPaths?: string[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    id: 'ce-matin',
    label: 'Ce matin',
    question: 'Que dois-je savoir maintenant ?',
    path: '/ce-matin',
    icon: Home,
    permission: 'view_radar',
    mobile: true,
    legacyPaths: ['/radar'],
  },
  {
    id: 'veille',
    label: 'Veille',
    question: 'Que dit la presse aujourd’hui ?',
    path: '/veille',
    icon: Newspaper,
    permission: 'view_radar',
    mobile: true,
    legacyPaths: ['/actualites', '/medias'],
  },
  {
    id: 'recherche',
    label: 'Recherche',
    question: 'Tout ce qui existe sur un sujet',
    path: '/recherche',
    icon: Search,
    permission: 'view_radar',
    mobile: true,
    legacyPaths: ['/balayage'],
  },
  {
    id: 'acteurs',
    label: 'Acteurs',
    question: 'Qui parle, qui compte dans le secteur ?',
    path: '/acteurs',
    icon: Users,
    permission: 'view_personnalites',
    mobile: true,
    legacyPaths: ['/personnalites', '/presence-digitale', '/spdi-review'],
  },
  {
    id: 'surveillance',
    label: 'Surveillance',
    question: 'Qu’est-ce que je surveille en continu ?',
    path: '/surveillance',
    icon: Radio,
    permission: 'create_flux',
    legacyPaths: ['/flux'],
  },
  {
    id: 'communication',
    label: 'Notre communication',
    question: 'Comment l’ANSUT est-elle visible ?',
    path: '/communication',
    icon: Megaphone,
    permission: 'use_assistant',
    legacyPaths: ['/reseaux-sociaux'],
  },
  {
    id: 'publier',
    label: 'Publier',
    question: 'Que dois-je produire et envoyer ?',
    path: '/publier',
    icon: FileText,
    permission: 'view_dossiers',
    legacyPaths: ['/dossiers'],
  },
  {
    id: 'assistant',
    label: 'Assistant',
    question: 'Aide-moi à analyser et rédiger',
    path: '/assistant',
    icon: Bot,
    permission: 'use_assistant',
    mobile: true,
  },
];

export const ADMIN_SECTION: NavSection = {
  id: 'reglages',
  label: 'Réglages',
  question: 'Configurer la plateforme',
  path: '/admin',
  icon: Settings,
  permission: 'access_admin',
};

/** Sections affichees dans la barre de navigation mobile basse. */
export const MOBILE_SECTIONS = NAV_SECTIONS.filter((section) => section.mobile);

/**
 * Table de correspondance chemin -> section, incluant les anciens chemins.
 * Permet au fil d'Ariane de rester juste meme sur une URL heritee.
 */
export const PATH_TO_SECTION: Record<string, NavSection> = (() => {
  const map: Record<string, NavSection> = {};
  for (const section of [...NAV_SECTIONS, ADMIN_SECTION]) {
    map[section.path] = section;
    for (const legacy of section.legacyPaths ?? []) {
      map[legacy] = section;
    }
  }
  return map;
})();

/** Retourne la section correspondant a un pathname, ou undefined. */
export function findSection(pathname: string): NavSection | undefined {
  if (PATH_TO_SECTION[pathname]) return PATH_TO_SECTION[pathname];
  // Correspondance par prefixe pour les routes imbriquees (/surveillance/:id).
  const match = Object.keys(PATH_TO_SECTION)
    .filter((path) => path !== '/' && pathname.startsWith(`${path}/`))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PATH_TO_SECTION[match] : undefined;
}
