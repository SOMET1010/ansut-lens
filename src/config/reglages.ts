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
    titre: 'Personnes et accès',
    question: 'Qui peut utiliser la plateforme et avec quels droits ?',
    icon: Users,
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
        id: 'audit-logs',
        titre: 'Journal des actions',
        description: 'Consulter l’historique des opérations effectuées sur la plateforme.',
        path: '/admin/audit-logs',
        icon: ClipboardList,
        permission: 'view_audit_logs',
        synonymes: ['audit', 'logs', 'traçabilité'],
        statistique: 'actionsAudit24h',
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
    id: 'collecte',
    titre: 'Ce que la plateforme surveille',
    question: 'Quelles sources et quels sujets sont collectés ?',
    icon: Database,
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
          'Renseigner les salons et sommets pour intensifier la collecte sur ces périodes.',
        path: '/admin/evenements',
        icon: CalendarDays,
        permission: 'manage_keywords',
        synonymes: ['MWC', 'Gitex', 'boost', 'calendrier'],
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
        id: 'alertes',
        titre: 'Alertes',
        description: 'Régler la sensibilité de détection et consulter les alertes émises.',
        path: '/alertes',
        icon: Bell,
        permission: 'access_admin',
        statistique: 'alertesNonLues',
      },
    ],
  },
  {
    id: 'traitement',
    titre: 'Comment l’information est traitée',
    question: 'Quelles règles s’appliquent aux données collectées ?',
    icon: Sliders,
    entrees: [
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
        id: 'freshness',
        titre: 'Fraîcheur des données',
        description: 'Définir l’âge au-delà duquel une information n’est plus retenue.',
        path: '/admin/freshness',
        icon: Clock,
        permission: 'manage_newsletters',
        synonymes: ['ancienneté', 'date de publication'],
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
        id: 'credibilite',
        titre: 'Crédibilité des sources',
        description: 'Consulter la méthode d’évaluation de la fiabilité des sources.',
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
        description: 'Composer et programmer les lettres d’information.',
        path: '/admin/newsletters',
        icon: Mail,
        permission: 'manage_newsletters',
        statistique: 'newslettersEnAttente',
      },
      {
        id: 'matinale',
        titre: 'Matinale',
        description: 'Configurer la note de synthèse diffusée chaque matin aux décideurs.',
        path: '/admin/matinale',
        icon: Newspaper,
        permission: 'manage_newsletters',
        synonymes: ['briefing', 'flash info'],
      },
      {
        id: 'diffusion',
        titre: 'Canaux de diffusion',
        description: 'Choisir les canaux d’envoi : courriel, SMS, Telegram.',
        path: '/admin/diffusion',
        icon: Radio,
        permission: 'manage_newsletters',
      },
      {
        id: 'coffre-contenu',
        titre: 'Coffre à contenus',
        description: 'Constituer une réserve de publications prêtes à diffuser.',
        path: '/admin/coffre-contenu',
        icon: FileText,
        permission: 'manage_newsletters',
        synonymes: ['coffre-fort', 'posts pré-validés'],
      },
    ],
  },
  {
    id: 'visibilite',
    titre: 'Suivi de notre visibilité',
    question: 'Comment l’ANSUT et ses dirigeants sont-ils perçus ?',
    icon: Megaphone,
    entrees: [
      {
        id: 'auto-veille',
        titre: 'Résonance de nos publications',
        description: 'Mesurer la reprise de nos communications et notre visibilité globale.',
        path: '/admin/auto-veille',
        icon: Megaphone,
        permission: 'manage_newsletters',
        synonymes: ['auto-veille', 'miroir', 'share of voice'],
      },
      {
        id: 'shadow-tracker',
        titre: 'Veille discrète des dirigeants',
        description: 'Suivre les publications des directeurs sur les réseaux sociaux.',
        path: '/admin/shadow-tracker',
        icon: Eye,
        permission: 'manage_newsletters',
        synonymes: ['shadow tracker', 'VIP'],
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
  {
    id: 'technique',
    titre: 'Fonctionnement technique',
    question: 'La plateforme tourne-t-elle correctement ?',
    icon: Clock,
    entrees: [
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
    titre: 'Formation et présentation',
    question: 'Comment expliquer la plateforme aux autres ?',
    icon: GraduationCap,
    entrees: [
      {
        id: 'formation',
        titre: 'Guides de formation',
        description: 'Télécharger les guides d’utilisation par profil.',
        path: '/admin/formation',
        icon: GraduationCap,
        permission: 'access_admin',
      },
      {
        id: 'presentation',
        titre: 'Support de présentation',
        description: 'Récupérer les diapositives de présentation du projet.',
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
