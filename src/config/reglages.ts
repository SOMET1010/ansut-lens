import {
  Activity,
  AtSign,
  Cog,
  FilePlus2,
  BookOpen,
  CalendarDays,
  ClipboardList,
  Clock,
  Database,
  FileCode,
  Newspaper,
  Radar,
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

/**
 * Les trois espaces de RADAR (voir docs/ARCHITECTURE_NAVIGATION.md) :
 *   - `administration` : configuration, pour quelques administrateurs.
 *   - `console`        : exploitation technique (pipeline, collectes, diagnostics),
 *                        réservée aux profils techniques ; jamais le produit.
 *   - `aide`           : formation, présentation, documentation.
 *
 * (La zone « produit » a disparu : la valeur métier vit désormais dans les
 * écrans principaux, pas dans un sas d'administration.)
 */
export type ZoneReglages = 'administration' | 'console' | 'aide';

export const ZONES_REGLAGES: Record<
  ZoneReglages,
  { titre: string; description: string; ton: 'neutre' | 'technique' }
> = {
  administration: {
    titre: 'Administration',
    description: 'Configurer la plateforme : accès, sources, comptes, connecteurs.',
    ton: 'neutre',
  },
  console: {
    titre: 'Console technique',
    description:
      'Exploitation : pipeline, collectes, tâches programmées, diagnostics. Réservé aux profils techniques — hors du produit éditorial.',
    ton: 'technique',
  },
  aide: {
    titre: 'Aide & ressources',
    description: 'Formation, présentation et documentation.',
    ton: 'neutre',
  },
};

export interface GroupeReglages {
  id: string;
  titre: string;
  /** Question a laquelle le groupe repond. */
  question: string;
  icon: LucideIcon;
  /** Espace auquel appartient le groupe (produit vs config vs exploitation). */
  zone: ZoneReglages;
  entrees: EntreeReglage[];
}

export const GROUPES_REGLAGES: GroupeReglages[] = [
  // ————————————————————————— ADMINISTRATION —————————————————————————
  {
    id: 'acces',
    titre: 'Personnes et accès',
    question: 'Qui peut utiliser la plateforme et avec quels droits ?',
    icon: Users,
    zone: 'administration',
    entrees: [
      {
        id: 'users',
        titre: 'Utilisateurs',
        description: 'Inviter des collaborateurs, suspendre ou réactiver un accès.',
        path: '/admin/users',
        icon: Users,
        permission: 'manage_users',
        statistique: 'usersActifs',
      },
      {
        id: 'roles',
        titre: 'Rôles et permissions',
        description: 'Définir ce que chaque rôle peut consulter, modifier ou supprimer.',
        path: '/admin/roles',
        icon: Shield,
        permission: 'manage_roles',
        synonymes: ['RBAC', 'droits', 'habilitations'],
      },
      {
        id: 'import-acteurs',
        titre: 'Import d’acteurs',
        description: 'Ajouter des acteurs en masse depuis un fichier ou une génération assistée.',
        path: '/admin/import-acteurs',
        icon: UserPlus,
        permission: 'import_actors',
        statistique: 'totalActeurs',
      },
    ],
  },
  {
    id: 'referentiel',
    titre: 'Sources et référentiel',
    question: 'Que surveille la plateforme et selon quel vocabulaire ?',
    icon: Database,
    zone: 'administration',
    entrees: [
      {
        id: 'sources',
        titre: 'Sources et médias',
        description: 'Gérer les sites, flux RSS et comptes sociaux interrogés.',
        path: '/admin/sources',
        icon: Database,
        permission: 'manage_sources',
        statistique: 'sourcesActives',
      },
      {
        id: 'mots-cles',
        titre: 'Mots-clés et thèmes',
        description: 'Définir le vocabulaire qui déclenche la détection des sujets.',
        path: '/admin/mots-cles',
        icon: Tag,
        permission: 'manage_keywords',
        statistique: 'motsClesActifs',
      },
      {
        id: 'evenements',
        titre: 'Événements stratégiques',
        description:
          'Renseigner les salons et sommets pour intensifier la collecte sur ces périodes. La liste des temps forts en cours s’affiche dans « Ce matin ».',
        path: '/admin/evenements',
        icon: CalendarDays,
        permission: 'manage_keywords',
        synonymes: ['MWC', 'Gitex', 'boost', 'calendrier', 'temps forts'],
      },
      {
        id: 'veille-semantique',
        titre: 'Veille sémantique',
        description:
          'Paramétrer l’analyse des territoires d’expression et la détection d’influenceurs.',
        path: '/admin/veille-semantique',
        icon: Radar,
        permission: 'manage_keywords',
      },
      {
        id: 'titrologie',
        titre: 'Titrologie',
        description:
          'Choisir les journaux dépouillés chaque matin et les seuils d’alerte associés.',
        path: '/admin/titrologie',
        icon: Newspaper,
        permission: 'manage_newsletters',
        synonymes: ['presse papier', 'kiosque'],
      },
      {
        id: 'scoring',
        titre: 'Règles de notation',
        description:
          'Fixer les seuils de criticité et le niveau de pertinence minimal des livrables.',
        path: '/admin/scoring',
        icon: Sliders,
        permission: 'manage_newsletters',
        synonymes: ['scoring', 'seuils', 'rouge orange vert'],
      },
      {
        id: 'credibilite',
        titre: 'Crédibilité des sources',
        description: 'Consulter la méthode d’évaluation de la fiabilité des sources.',
        path: '/admin/credibilite',
        icon: ShieldCheck,
        permission: 'access_admin',
      },
      {
        id: 'connaissance',
        titre: 'Connaissance institutionnelle',
        description:
          'Revue (lecture seule) du plan stratégique extrait : axes, projets, objectifs, indicateurs et preuves. Rien n’est encore validé.',
        path: '/admin/connaissance',
        icon: BookOpen,
        permission: 'access_admin',
        synonymes: ['plan stratégique', 'adn', 'référentiel', 'piliers', 'revue', 'connaissance'],
      },
    ],
  },
  {
    id: 'comptes-connecteurs',
    titre: 'Comptes et connecteurs',
    question: 'Quels comptes suit-on et comment y accède-t-on ?',
    icon: AtSign,
    zone: 'administration',
    entrees: [
      {
        id: 'comptes-surveilles',
        titre: 'Comptes surveillés',
        description:
          'Ajouter un compte réseau social en collant son URL : RADAR en déduit les paramètres et le vérifie.',
        path: '/admin/comptes-surveilles',
        icon: AtSign,
        permission: 'manage_cron_jobs',
        synonymes: ['réseaux sociaux', 'comptes', 'ajouter un compte', 'profil', 'VIP'],
      },
      {
        id: 'connecteurs-sociaux',
        titre: 'Connecteurs sociaux',
        description:
          'Vérifier les autorisations d’accès à X, LinkedIn, Facebook, Telegram, YouTube et TikTok.',
        path: '/admin/connecteurs-sociaux',
        icon: ShieldCheck,
        permission: 'manage_cron_jobs',
        synonymes: ['API', 'secrets', 'jetons'],
      },
      {
        id: 'guide-com-api',
        titre: 'Guide des API sociales',
        description: 'Comprendre les limites et les coûts de chaque plateforme sociale.',
        path: '/admin/guide-com-api',
        icon: FileCode,
        permission: 'manage_cron_jobs',
      },
    ],
  },
  // ————————————————————————— CONSOLE TECHNIQUE —————————————————————————
  {
    id: 'exploitation',
    titre: 'Pipeline et exploitation',
    question: 'Faire tourner et diagnostiquer la plateforme.',
    icon: Cog,
    zone: 'console',
    entrees: [
      {
        id: 'moteur-editorial',
        titre: 'Moteur éditorial',
        description:
          'Lancer la collecte, diagnostiquer et enregistrer la qualification des contenus (pipeline).',
        path: '/admin/moteur-editorial',
        icon: Cog,
        permission: 'manage_cron_jobs',
        synonymes: ['pipeline', 'collecte', 'qualification', 'backfill'],
      },
      {
        id: 'import-manuel',
        titre: 'Import manuel de publications',
        description:
          'Saisir des publications réelles (date, texte, métriques) en attendant les connecteurs officiels.',
        path: '/admin/import-manuel',
        icon: FilePlus2,
        permission: 'manage_cron_jobs',
        synonymes: ['import', 'saisie', 'csv', 'publications'],
      },
      {
        id: 'cron-jobs',
        titre: 'Tâches programmées',
        description: 'Superviser les collectes automatiques et leur planification.',
        path: '/admin/cron-jobs',
        icon: Clock,
        permission: 'manage_cron_jobs',
        synonymes: ['CRON', 'planification'],
        statistique: 'derniereCollecte',
      },
      {
        id: 'spdi-status',
        titre: 'État du calcul des scores',
        description:
          'Vérifier que le calcul quotidien des scores de présence digitale s’est bien exécuté.',
        path: '/admin/spdi-status',
        icon: Activity,
        permission: 'manage_cron_jobs',
        synonymes: ['SPDI', 'batch'],
      },
      {
        id: 'freshness',
        titre: 'Fraîcheur des données',
        description: 'Définir l’âge au-delà duquel une information n’est plus retenue.',
        path: '/admin/freshness',
        icon: Clock,
        permission: 'manage_newsletters',
        synonymes: ['ancienneté', 'date de publication'],
      },
      {
        id: 'audit-logs',
        titre: 'Journal des actions',
        description: 'Consulter l’historique des opérations effectuées sur la plateforme.',
        path: '/admin/audit-logs',
        icon: ClipboardList,
        permission: 'view_audit_logs',
        synonymes: ['audit', 'logs', 'traçabilité'],
        statistique: 'actionsAudit24h',
      },
    ],
  },
  // La zone « À intégrer au produit » a été retirée : sa valeur vit désormais
  // dans le PRODUIT (règle de navigation). Newsletters et Coffre à contenus sont
  // des onglets de « Publier » ; Matinale et Canaux de diffusion y sont accessibles
  // via l'encart « Produire & diffuser » ; les Alertes via la cloche de
  // notifications. L'écho médiatique réel est dans Insights ; l'ancien écran
  // « Auto-veille » (métriques estimées par IA) est retiré du menu en attendant
  // son assainissement (charte de crédibilité), pour ne pas remonter de fausse
  // précision dans le produit.
  // ————————————————————————— AIDE & RESSOURCES —————————————————————————
  // Le groupe « Formation et présentation » (guides, diapositives, doc technique)
  // est RETIRÉ du menu tant que son contenu n'est pas refait : ces supports
  // décrivent l'ancienne plateforme (Personnalités, Suivi SPDI, cockpit
  // Surveillance, table presence_digitale_metrics…) — tout ce que la refonte
  // crédibilité + navigation a supprimé ou renommé. Mieux vaut ne pas proposer
  // de formation trompeuse que d'en afficher une périmée (charte de crédibilité).
  // Les routes /admin/formation|presentation|documentation subsistent mais ne
  // sont plus liées ; à réactiver une fois les supports réécrits pour RADAR.
  // La zone « aide » n'ayant plus de groupe, elle disparaît automatiquement du
  // rendu (AdminPage filtre les zones sans groupe visible).
];

/** Ordre d'affichage des espaces. */
export const ORDRE_ZONES: ZoneReglages[] = ['administration', 'console', 'aide'];

/** Nombre total d'entrees, pour l'affichage et les tests. */
export const NB_ENTREES_REGLAGES = GROUPES_REGLAGES.reduce(
  (total, groupe) => total + groupe.entrees.length,
  0,
);
