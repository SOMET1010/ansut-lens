/**
 * Référentiel stratégique de l'ANSUT.
 *
 * Colonne vertébrale de la plateforme : le **Plan Stratégique ANSUT 2026-2030**
 * (« Connecter chaque Ivoirien, bâtir une nation numérique »), adopté dans le
 * cadre de la Loi n°2024-352 du 6 juin 2024 qui confie à l'ANSUT la mise en
 * œuvre du Service Universel des Télécommunications.
 *
 * Le plan est structuré en **4 piliers**. Ce sont EUX qui servent de référentiel
 * de pilotage : chaque actualité collectée est rattachée au pilier ANSUT qu'elle
 * impacte — l'article devient alors une preuve rattachée à un objectif propre de
 * l'agence, et non à une priorité ministérielle générale.
 *
 * La Feuille de route du Ministère (MTNIT) n'est pas la nôtre : elle est
 * conservée comme cadre d'**alignement national** (voir `PILIERS_MTNIT`), utile
 * pour situer une information, mais elle ne structure pas le pilotage de l'ANSUT.
 *
 * `ansutPorteur` vaut vrai pour les 4 piliers : ce sont tous des axes que
 * l'ANSUT porte directement. `projetsAnsut` liste les projets phares du plan.
 *
 * Cible (phase 2) : ce référentiel devient éditable en admin et enrichi par
 * l'ADN stratégique appris (publications ANSUT, site, documents). La table
 * `piliers_strategiques` en base doit rester alignée sur ces identifiants.
 */

export interface MissionStrategique {
  /** Identifiant stable (slug). Doit correspondre à `piliers_strategiques.id`. */
  id: string;
  /** Code du pilier ANSUT (P1…P4). */
  code: string;
  /** Intitulé court du pilier. */
  nom: string;
  /** Orientation stratégique principale du pilier, en une phrase. */
  objectif: string;
  /** L'ANSUT porte-t-elle ce pilier ? (vrai pour les 4 piliers propres.) */
  ansutPorteur?: boolean;
  /** Projets phares du plan rattachés à ce pilier (pour affichage). */
  projetsAnsut?: string[];
  /**
   * Signaux de rattachement : mots-clés, programmes et acteurs, bilingues (les
   * sources collectées sont souvent anglophones). L'appariement respecte les
   * frontières de mot (voir `src/lib/missions.ts`) pour éviter les faux
   * positifs de sous-chaîne.
   */
  motsCles: string[];
}

/**
 * Vision, mission et valeurs du Plan Stratégique ANSUT 2026-2030. Support de
 * l'ADN stratégique et d'une future synthèse d'accueil personnalisée.
 */
export const STRATEGIE_ANSUT = {
  vision:
    "Une Côte d'Ivoire où le numérique est accessible, abordable et utile pour tous.",
  devise: 'Connecter chaque Ivoirien, bâtir une nation numérique.',
  cadreLegal: 'Loi n°2024-352 du 6 juin 2024',
  mission:
    "Mettre en œuvre le Service Universel des Télécommunications pour le compte de l'État : déploiement d'infrastructures, e-services, usages et compétences numériques, financés notamment par la TDNTIC (2 % du chiffre d'affaires des opérateurs).",
  objectifs: [
    "Garantir l'accès de tous les Ivoiriens aux services essentiels de télécommunications, quelle que soit leur localisation",
    "Faire du Service Universel un instrument de politique publique au service de l'inclusion nationale",
    'Réduire la fracture numérique : accès + usages + compétences = impact social et économique réel',
  ],
  valeurs: [
    'Gestion axée sur les résultats',
    'Appropriation nationale',
    'Équité',
    'Développement durable',
  ],
} as const;

/** Rétro-compatibilité : ancien nom d'export, désormais aligné sur l'ANSUT. */
export const STRATEGIE_MTNIT = STRATEGIE_ANSUT;

export const MISSIONS_STRATEGIQUES: MissionStrategique[] = [
  {
    id: 'connectivite-universelle',
    code: 'P1',
    nom: 'Connectivité Numérique Universelle',
    objectif:
      "Renforcer la connectivité sur l'ensemble du territoire : backbone, dernier kilomètre, centres de données et couverture des zones non desservies.",
    ansutPorteur: true,
    projetsAnsut: [
      'BUS — Backbone Universel de Services (RNHD, RIA, last mile, allumage national)',
      'PU Rurale — Programme Universel de connectivité des zones isolées',
      'ConnectMyZone — connectivité ciblée des zones blanches',
    ],
    motsCles: [
      // Français — infrastructures & connectivité
      'connectivité', 'connectivité rurale', 'connectivité universelle', 'couverture réseau',
      'couverture mobile', 'zone blanche', 'zones blanches', 'zone non couverte',
      'rnhd', 'réseau national haut débit', 'ria', 'backbone', 'dorsale', 'haut débit',
      'très haut débit', 'fibre optique', 'fibre', 'last mile', 'dernier kilomètre',
      'allumage', 'infrastructures numériques', 'infrastructures critiques',
      'centre de données', 'datacenter', 'data center', 'point d’échange internet',
      'couverture 4g', 'couverture 5g', '4g', '5g', 'connectivité satellitaire',
      'satellite', 'starlink', 'ast spacemobile', 'direct-to-cell', 'orbite basse',
      'télécommunications', 'télécoms', 'opérateurs', 'spectre', 'localités connectées',
      'bus', 'connectmyzone', 'programme universel',
      // Anglais
      'connectivity', 'rural connectivity', 'network coverage', 'mobile coverage',
      'broadband', 'backbone', 'fiber', 'fibre', 'last mile', 'data center', 'data centre',
      'satellite internet', 'unconnected', 'telecom operators', 'spectrum', 'digital infrastructure',
    ],
  },
  {
    id: 'services-inclusion',
    code: 'P2',
    nom: 'Services Numériques & Inclusion',
    objectif:
      "Déployer des e-services publics et un écosystème numérique inclusif : dématérialisation, identité numérique, points d'accès et inclusion sociale et financière.",
    ansutPorteur: true,
    projetsAnsut: [
      'E-Conseil — dématérialisation des conseils des ministres et processus gouvernementaux',
      'N’Zassa Girl — inclusion numérique des femmes et des jeunes filles',
      'Abris BUS — espaces numériques connectés de proximité',
    ],
    motsCles: [
      // Français — e-services & inclusion
      'e-service', 'e-services', 'services numériques', 'services publics numériques',
      'e-gouvernement', 'e-gouvernance', 'administration numérique', 'dématérialisation',
      'démarches en ligne', 'guichet unique', 'identité numérique', 'identifiant numérique',
      'interopérabilité', 'e-conseil', 'conseil des ministres', 'e-santé', 'e-éducation',
      'e-administration', 'e-agriculture', 'point d’accès universel', 'points d’accès universels',
      'inclusion numérique', 'inclusion sociale', 'inclusion financière', 'fracture numérique',
      'entrepreneuriat', 'entrepreneuriat digital', 'start-up', 'startup', 'contenus locaux',
      'innovation', 'n’zassa', 'nzassa', 'abris bus', 'femmes', 'jeunes filles',
      // Anglais
      'e-services', 'digital services', 'digital public services', 'e-government', 'digital government',
      'digitalization', 'one-stop shop', 'digital identity', 'digital inclusion',
      'financial inclusion', 'digital divide', 'startups', 'entrepreneurship', 'e-health', 'e-education',
    ],
  },
  {
    id: 'usages-competences',
    code: 'P3',
    nom: 'Usages Digitaux & Compétences',
    objectif:
      "Développer la maîtrise et l'usage du numérique : culture numérique, formation, sensibilisation et accès aux terminaux.",
    ansutPorteur: true,
    projetsAnsut: [
      'Devices — programme d’accès aux smartphones et équipements (crédit, subvention)',
      'CICN — Centres d’Innovation et de Culture Numérique',
    ],
    motsCles: [
      // Français — compétences & usages
      'compétences numériques', 'culture numérique', 'usages numériques', 'usages digitaux',
      'formation numérique', 'formation en ligne', 'digital literacy', 'alphabétisation numérique',
      'littératie numérique', 'illectronisme', 'sensibilisation numérique', 'reconversion',
      'montée en compétences', 'talents numériques', 'métiers du numérique', 'esatic',
      'accès aux terminaux', 'terminaux', 'smartphone', 'smartphones', 'tablette', 'tablettes',
      'équipements numériques', 'devices', 'cicn', "centre d'innovation", 'inclusion des jeunes',
      // Anglais
      'digital skills', 'digital literacy', 'digital culture', 'e-learning', 'upskilling',
      'reskilling', 'training', 'devices', 'smartphones', 'tablets', 'digital talents',
    ],
  },
  {
    id: 'excellence-operationnelle',
    code: 'P4',
    nom: 'Excellence Opérationnelle',
    objectif:
      "Assurer une gouvernance efficace de l'ANSUT, un financement diversifié et un rayonnement régional : pilotage, audit, mobilisation des ressources et communication.",
    ansutPorteur: true,
    projetsAnsut: [
      'e-CA — gestion digitale et sécurisée du Conseil d’Administration',
      'Cockpit — tableau de bord stratégique de pilotage en temps réel',
    ],
    motsCles: [
      // Français — gouvernance, financement, rayonnement
      'gouvernance', 'gouvernance numérique', 'pilotage stratégique', 'suivi-évaluation',
      'audit', 'maîtrise des risques', 'tableau de bord', 'cockpit', 'salle de supervision',
      'noc', 'reddition de comptes', 'redevabilité', 'performance',
      'financement', 'tdntic', 'redevance', 'fonds verts', 'partenariat public-privé', 'ppp',
      'bailleurs', 'partenaires techniques et financiers', 'bad', 'banque mondiale', 'afd', 'kfw', 'uit',
      'mobilisation des ressources', 'rse', 'communication institutionnelle', 'notoriété',
      'rayonnement', 'rayonnement régional', 'e-ca', 'conseil d’administration',
      // Anglais
      'governance', 'monitoring', 'evaluation', 'audit', 'risk management', 'dashboard',
      'funding', 'financing', 'public-private partnership', 'green funds', 'world bank',
      'african development bank', 'resource mobilization', 'institutional communication',
    ],
  },
];

/**
 * Cadre d'alignement national — Feuille de route du Ministère (MTNIT) et
 * stratégies nationales. Ce n'est PAS le référentiel de pilotage de l'ANSUT :
 * c'est le cadre plus large sur lequel le plan ANSUT s'aligne, conservé comme
 * information de contexte (les 7 piliers de la Feuille de route 2026-2028).
 */
export interface PilierNational {
  code: string;
  nom: string;
  objectif: string;
}

export const PILIERS_MTNIT: PilierNational[] = [
  { code: 'P1', nom: 'Connectivité, Accès & Accessibilité à l’Internet', objectif: "Démocratiser la connectivité, l'accès aux terminaux et aux données." },
  { code: 'P2', nom: 'Transformation numérique de l’administration', objectif: 'Numériser les services publics prioritaires et leurs registres.' },
  { code: 'P3', nom: 'Écosystème de l’Innovation Technologique', objectif: "Positionner la Côte d'Ivoire comme hub de l'innovation ouest-africain." },
  { code: 'P4', nom: 'Intelligence Artificielle Nationale', objectif: "Bâtir les fondations d'un écosystème local d'IA." },
  { code: 'P5', nom: 'Cybersécurité & Confiance Numérique', objectif: 'Sécuriser le cyberespace national et développer la confiance numérique.' },
  { code: 'P6', nom: 'Compétences Numériques & Inclusion', objectif: 'Développer le capital humain numérique et réduire la fracture numérique.' },
  { code: 'P7', nom: 'E-commerce & Transformation Postale', objectif: 'Redynamiser La Poste et développer le commerce électronique.' },
];

/** Cadres stratégiques nationaux et internationaux d'alignement (contexte). */
export const ALIGNEMENT_NATIONAL = [
  'PND 2026-2030',
  'Stratégie Nationale du Numérique 2025-2035',
  'Stratégie Nationale Gouvernance des Données & IA 2030',
  'Agenda 2063 (Union Africaine)',
  'Objectifs de Développement Durable (ODD)',
] as const;
