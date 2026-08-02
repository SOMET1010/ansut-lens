import {
  Activity,
  Bell,
  CalendarDays,
  ClipboardList,
  Clock,
  Database,
  Eye,
  FileCode,
  FileText,
  GraduationCap,
  Mail,
  Megaphone,
  Newspaper,
  Presentation,
  Radar,
  Radio,
  Shield,
  ShieldCheck,
  Sliders,
  Tag,
  UserPlus,
  Users,
  type LucideIcon,
} from 'lucide-react';

/**
 * Registre declaratif des entrees de reglages.
 *
 * L'ancienne page d'administration alignait vingt-cinq cartes dans quatre
 * sections, avec un vocabulaire heterogene (« Shadow Tracker VIP »,
 * « Coffre-fort Contenus », « Statut SPDI Batch ») et une repartition
 * discutable : la formation, la presentation et la documentation figuraient
 * sous « Communication ». Le tout etait code en dur dans le JSX, ce qui rendait
 * impossible toute recherche ou tout filtrage.
 *
 * Ce registre separe les donnees de leur affichage. La page peut ainsi proposer
 * une recherche, et chaque libelle a ete reecrit pour dire ce que l'ecran
 * permet de faire plutot que le nom de la fonctionnalite.
 */
export interface EntreeReglage {
  id: string;
  /** Libelle en francais courant, sans nom de code interne. */
  titre: string;
  /** Ce que l'administrateur peut faire ici. */
  description: string;
  path: string;
  icon: LucideIcon;
  permission: string;
  /** Mots supplementaires pris en compte par la recherche, dont les anciens noms. */
  synonymes?: string[];
  /** Cle de la statistique a afficher en pastille, si disponible. */
  statistique?:
    | 'usersActifs'
    | 'actionsAudit24h'
    | 'motsClesActifs'
    | 'sourcesActives'
    | 'alertesNonLues'
    | 'totalActeurs'
    | 'newslettersEnAttente'
    | 'derniereCollecte';
}

export interface GroupeReglages {
  id: string;
  titre: string;
  /** Question a laquelle le groupe repond. */
  question: string;
  icon: LucideIcon;
  entrees: EntreeReglage[];
}

export const GROUPES_REGLAGES: GroupeReglages[] = [
  {
    id: 'acces',
    titre: 'Personnes et acc\u00e8s',
    question: 'Qui peut utiliser la plateforme et avec quels droits ?',
    icon: Users,
    entrees: [
      {
        id: 'users',
        titre: 'Utilisateurs',
        description: 'Inviter des collaborateurs, suspendre ou r\u00e9activer un acc\u00e8s.',
        path: '/admin/users',
        icon: Users,
        permission: 'manage_users',
        statistique: 'usersActifs',
      },
      {
        id: 'roles',
        titre: 'R\u00f4les et permissions',
        description: 'D\u00e9finir ce que chaque r\u00f4le peut consulter, modifier ou supprimer.',
        path: '/admin/roles',
        icon: Shield,
        permission: 'manage_roles',
        synonymes: ['RBAC', 'droits', 'habilitations'],
      },
      {
        id: 'audit-logs',
        titre: 'Journal des actions',
        description: 'Consulter l\u2019historique des op\u00e9rations effectu\u00e9es sur la plateforme.',
        path: '/admin/audit-logs',
        icon: ClipboardList,
        permission: 'view_audit_logs',
        synonymes: ['audit', 'logs', 'tra\u00e7abilit\u00e9'],
        statistique: 'actionsAudit24h',
      },
      {
        id: 'import-acteurs',
        titre: 'Import d\u2019acteurs',
        description: 'Ajouter des acteurs en masse depuis un fichier ou une g\u00e9n\u00e9ration assist\u00e9e.',
        path: '/admin/import-acteurs',
        icon: UserPlus,
        permission: 'import_actors',
        statistique: 'totalActeurs',
      },
    ],
  },
  {
    id: 'collecte',
    titre: 'Ce que la plateforme surveille',
    question: 'Quelles sources et quels sujets sont collect\u00e9s ?',
    icon: Database,
    entrees: [
      {
        id: 'sources',
        titre: 'Sources et m\u00e9dias',
        description: 'G\u00e9rer les sites, flux RSS et comptes sociaux interrog\u00e9s.',
        path: '/admin/sources',
        icon: Database,
        permission: 'manage_sources',
        statistique: 'sourcesActives',
      },
      {
        id: 'mots-cles',
        titre: 'Mots-cl\u00e9s et th\u00e8mes',
        description: 'D\u00e9finir le vocabulaire qui d\u00e9clenche la d\u00e9tection des sujets.',
        path: '/admin/mots-cles',
        icon: Tag,
        permission: 'manage_keywords',
        statistique: 'motsClesActifs',
      },
      {
        id: 'evenements',
        titre: '\u00c9v\u00e9nements strat\u00e9giques',
        description:
          'Renseigner les salons et sommets pour intensifier la collecte sur ces p\u00e9riodes.',
        path: '/admin/evenements',
        icon: CalendarDays,
        permission: 'manage_keywords',
        synonymes: ['MWC', 'Gitex', 'boost', 'calendrier'],
      },
      {
        id: 'veille-semantique',
        titre: 'Veille s\u00e9mantique',
        description:
          'Param\u00e9trer l\u2019analyse des territoires d\u2019expression et la d\u00e9tection d\u2019influenceurs.',
        path: '/admin/veille-semantique',
        icon: Radar,
        permission: 'manage_keywords',
      },
      {
        id: 'titrologie',
        titre: 'Titrologie',
        description:
          'Choisir les journaux d\u00e9pouill\u00e9s chaque matin et les seuils d\u2019alerte associ\u00e9s.',
        path: '/admin/titrologie',
        icon: Newspaper,
        permission: 'manage_newsletters',
        synonymes: ['presse papier', 'kiosque'],
      },
      {
        id: 'alertes',
        titre: 'Alertes',
        description: 'R\u00e9gler la sensibilit\u00e9 de d\u00e9tection et consulter les alertes \u00e9mises.',
        path: '/alertes',
        icon: Bell,
        permission: 'access_admin',
        statistique: 'alertesNonLues',
      },
    ],
  },
  {
    id: 'traitement',
    titre: 'Comment l\u2019information est trait\u00e9e',
    question: 'Quelles r\u00e8gles s\u2019appliquent aux donn\u00e9es collect\u00e9es ?',
    icon: Sliders,
    entrees: [
      {
        id: 'scoring',
        titre: 'R\u00e8gles de notation',
        description:
          'Fixer les seuils de criticit\u00e9 et le niveau de pertinence minimal des livrables.',
        path: '/admin/scoring',
        icon: Sliders,
        permission: 'manage_newsletters',
        synonymes: ['scoring', 'seuils', 'rouge orange vert'],
      },
      {
        id: 'freshness',
        titre: 'Fra\u00eecheur des donn\u00e9es',
        description: 'D\u00e9finir l\u2019\u00e2ge au-del\u00e0 duquel une information n\u2019est plus retenue.',
        path: '/admin/freshness',
        icon: Clock,
        permission: 'manage_newsletters',
        synonymes: ['anciennet\u00e9', 'date de publication'],
      },
      {
        id: 'spdi-status',
        titre: '\u00c9tat du calcul des scores',
        description:
          'V\u00e9rifier que le calcul quotidien des scores de pr\u00e9sence digitale s\u2019est bien ex\u00e9cut\u00e9.',
        path: '/admin/spdi-status',
        icon: Activity,
        permission: 'manage_cron_jobs',
        synonymes: ['SPDI', 'batch'],
      },
      {
        id: 'credibilite',
        titre: 'Cr\u00e9dibilit\u00e9 des sources',
        description: 'Consulter la m\u00e9thode d\u2019\u00e9valuation de la fiabilit\u00e9 des sources.',
        path: '/admin/credibilite',
        icon: ShieldCheck,
        permission: 'access_admin',
      },
    ],
  },
  {
    id: 'diffusion',
    titre: 'Ce que la plateforme envoie',
    question: 'Quels documents partent, vers qui et quand ?',
    icon: Mail,
    entrees: [
      {
        id: 'newsletters',
        titre: 'Newsletters',
        description: 'Composer et programmer les lettres d\u2019information.',
        path: '/admin/newsletters',
        icon: Mail,
        permission: 'manage_newsletters',
        statistique: 'newslettersEnAttente',
      },
      {
        id: 'matinale',
        titre: 'Matinale',
        description: 'Configurer la note de synth\u00e8se diffus\u00e9e chaque matin aux d\u00e9cideurs.',
        path: '/admin/matinale',
        icon: Newspaper,
        permission: 'manage_newsletters',
        synonymes: ['briefing', 'flash info'],
      },
      {
        id: 'diffusion',
        titre: 'Canaux de diffusion',
        description: 'Choisir les canaux d\u2019envoi : courriel, SMS, Telegram.',
        path: '/admin/diffusion',
        icon: Radio,
        permission: 'manage_newsletters',
      },
      {
        id: 'coffre-contenu',
        titre: 'Coffre \u00e0 contenus',
        description: 'Constituer une r\u00e9serve de publications pr\u00eates \u00e0 diffuser.',
        path: '/admin/coffre-contenu',
        icon: FileText,
        permission: 'manage_newsletters',
        synonymes: ['coffre-fort', 'posts pr\u00e9-valid\u00e9s'],
      },
    ],
  },
  {
    id: 'visibilite',
    titre: 'Suivi de notre visibilit\u00e9',
    question: 'Comment l\u2019ANSUT et ses dirigeants sont-ils per\u00e7us ?',
    icon: Megaphone,
    entrees: [
      {
        id: 'auto-veille',
        titre: 'R\u00e9sonance de nos publications',
        description: 'Mesurer la reprise de nos communications et notre visibilit\u00e9 globale.',
        path: '/admin/auto-veille',
        icon: Megaphone,
        permission: 'manage_newsletters',
        synonymes: ['auto-veille', 'miroir', 'share of voice'],
      },
      {
        id: 'shadow-tracker',
        titre: 'Veille discr\u00e8te des dirigeants',
        description: 'Suivre les publications des directeurs sur les r\u00e9seaux sociaux.',
        path: '/admin/shadow-tracker',
        icon: Eye,
        permission: 'manage_newsletters',
        synonymes: ['shadow tracker', 'VIP'],
      },
      {
        id: 'connecteurs-sociaux',
        titre: 'Connecteurs sociaux',
        description:
          'V\u00e9rifier les autorisations d\u2019acc\u00e8s \u00e0 X, LinkedIn, Facebook, Telegram, YouTube et TikTok.',
        path: '/admin/connecteurs-sociaux',
        icon: ShieldCheck,
        permission: 'manage_cron_jobs',
        synonymes: ['API', 'secrets', 'jetons'],
      },
      {
        id: 'guide-com-api',
        titre: 'Guide des API sociales',
        description: 'Comprendre les limites et les co\u00fbts de chaque plateforme sociale.',
        path: '/admin/guide-com-api',
        icon: FileCode,
        permission: 'manage_cron_jobs',
      },
    ],
  },
  {
    id: 'technique',
    titre: 'Fonctionnement technique',
    question: 'La plateforme tourne-t-elle correctement ?',
    icon: Clock,
    entrees: [
      {
        id: 'cron-jobs',
        titre: 'T\u00e2ches programm\u00e9es',
        description: 'Superviser les collectes automatiques et leur planification.',
        path: '/admin/cron-jobs',
        icon: Clock,
        permission: 'manage_cron_jobs',
        synonymes: ['CRON', 'planification'],
        statistique: 'derniereCollecte',
      },
      {
        id: 'documentation',
        titre: 'Documentation technique',
        description: 'Consulter le manuel technique complet de la plateforme.',
        path: '/admin/documentation',
        icon: FileCode,
        permission: 'access_admin',
      },
    ],
  },
  {
    id: 'accompagnement',
    titre: 'Formation et pr\u00e9sentation',
    question: 'Comment expliquer la plateforme aux autres ?',
    icon: GraduationCap,
    entrees: [
      {
        id: 'formation',
        titre: 'Guides de formation',
        description: 'T\u00e9l\u00e9charger les guides d\u2019utilisation par profil.',
        path: '/admin/formation',
        icon: GraduationCap,
        permission: 'access_admin',
      },
      {
        id: 'presentation',
        titre: 'Support de pr\u00e9sentation',
        description: 'R\u00e9cup\u00e9rer les diapositives de pr\u00e9sentation du projet.',
        path: '/admin/presentation',
        icon: Presentation,
        permission: 'access_admin',
      },
    ],
  },
];

/** Nombre total d'entrees, pour l'affichage et les tests. */
export const NB_ENTREES_REGLAGES = GROUPES_REGLAGES.reduce(
  (total, groupe) => total + groupe.entrees.length,
  0,
);
