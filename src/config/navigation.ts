import {
  BarChart3,
  Bot,
  Megaphone,
  Newspaper,
  PenLine,
  Radio,
  Search,
  Settings,
  Sunrise,
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
/**
 * Groupes de la barre laterale, organises selon la JOURNEE DE TRAVAIL de la
 * DIRCOM plutot que par technologie : « La redaction » (le produit editorial
 * du quotidien) puis « Outils » (ce qui sert ponctuellement). L'administration
 * reste a part (ADMIN_SECTION).
 */
export type NavGroupId = 'redaction' | 'outils';

export const NAV_GROUPS: { id: NavGroupId; label: string }[] = [
  { id: 'redaction', label: 'La rédaction' },
  { id: 'outils', label: 'Outils' },
];

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
  /** Groupe de la barre laterale. Par defaut « redaction ». */
  group?: NavGroupId;
  /** Route accessible et tracee au fil d'Ariane, mais masquee du menu. */
  hidden?: boolean;
  /** Affiche dans la barre de navigation mobile (5 entrees maximum). */
  mobile?: boolean;
  /** Anciens chemins rediriges vers cette section, pour les liens partages. */
  legacyPaths?: string[];
}

// L'ordre suit la journee de la DIRCOM : Ce matin → Veille → Recherche →
// Acteurs → Notre communication → Insights → Publier → Assistant, puis les
// Outils. « Pige presse » n'est plus une entree de menu (c'est une methode de
// collecte, pas un produit) : la route reste accessible et sera repliee dans
// un onglet de Veille.
export const NAV_SECTIONS: NavSection[] = [
  {
    // « La Matinale » n'est plus un pilote isolé : elle EST « Ce matin ».
    // L'édition éditoriale du matin devient l'unique porte d'entrée ; l'ancien
    // tableau de bord et l'ancienne adresse /la-matinale y sont redirigés.
    id: 'ce-matin',
    label: 'Ce matin',
    question: 'Que dois-je savoir maintenant ?',
    path: '/ce-matin',
    icon: Sunrise,
    permission: 'view_radar',
    group: 'redaction',
    mobile: true,
    legacyPaths: ['/radar', '/la-matinale'],
  },
  {
    id: 'veille',
    label: 'Veille',
    question: 'Que se passe-t-il aujourd’hui ?',
    path: '/veille',
    icon: Newspaper,
    permission: 'view_radar',
    group: 'redaction',
    mobile: true,
    legacyPaths: ['/actualites', '/medias', '/pige'],
  },
  {
    id: 'recherche',
    label: 'Recherche',
    question: 'Tout ce qui existe sur un sujet',
    path: '/recherche',
    icon: Search,
    permission: 'view_radar',
    group: 'redaction',
    mobile: true,
    legacyPaths: ['/balayage'],
  },
  {
    id: 'acteurs',
    label: 'Acteurs',
    question: 'Qui influence le débat ?',
    path: '/acteurs',
    icon: Users,
    permission: 'view_personnalites',
    group: 'redaction',
    mobile: true,
    legacyPaths: ['/personnalites', '/presence-digitale', '/spdi-review'],
  },
  {
    id: 'communication',
    label: 'Notre communication',
    question: 'Que faisons-nous entendre ?',
    path: '/communication',
    icon: Megaphone,
    permission: 'use_assistant',
    group: 'redaction',
    legacyPaths: ['/reseaux-sociaux'],
  },
  {
    id: 'insights',
    label: 'Insights',
    question: 'Sommes-nous performants ?',
    path: '/insights',
    icon: BarChart3,
    permission: 'view_radar',
    group: 'redaction',
  },
  {
    id: 'publier',
    label: 'Publier',
    question: 'Que dois-je produire et envoyer ?',
    path: '/publier',
    icon: PenLine,
    permission: 'view_dossiers',
    group: 'redaction',
    legacyPaths: ['/dossiers'],
  },
  {
    id: 'assistant',
    label: 'Assistant',
    question: 'Aide-moi à analyser et rédiger',
    path: '/assistant',
    icon: Bot,
    permission: 'use_assistant',
    group: 'redaction',
    mobile: true,
  },
  {
    id: 'surveillance',
    label: 'Surveillance',
    question: 'Qu’est-ce que je surveille en continu ?',
    path: '/surveillance',
    icon: Radio,
    permission: 'create_flux',
    group: 'outils',
    legacyPaths: ['/flux'],
  },
];

export const ADMIN_SECTION: NavSection = {
  id: 'reglages',
  label: 'Administration',
  question: 'Configurer et exploiter la plateforme',
  path: '/admin',
  icon: Settings,
  permission: 'access_admin',
};

/** Sections affichees dans la barre de navigation mobile basse. */
export const MOBILE_SECTIONS = NAV_SECTIONS.filter((section) => section.mobile && !section.hidden);

/**
 * Sections du produit ABSENTES de la barre basse (Communication, Insights,
 * Publier, Surveillance…). Regroupees derriere l'entree « Plus » du mobile,
 * pour qu'aucune section autorisee ne soit injoignable au telephone.
 */
export const MOBILE_SECONDARY_SECTIONS = NAV_SECTIONS.filter(
  (section) => !section.mobile && !section.hidden,
);

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
