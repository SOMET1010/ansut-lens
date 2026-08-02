/**
 * Référentiel des piliers stratégiques du MTNIT / de l'ANSUT.
 *
 * Il n'est pas inventé : il reprend la Feuille de route 2026-2028 présentée par
 * le Ministre (7 piliers de la Stratégie nationale du numérique) et la liste des
 * 40 projets structurants. Chaque pilier regroupe des projets ; les mots-clés
 * servent à rattacher une actualité collectée au pilier qu'elle impacte —
 * l'article devient alors une preuve rattachée à un objectif stratégique.
 *
 * `ansutPorteur` signale les piliers où l'ANSUT est entité porteuse d'au moins
 * un projet : P1 (projets 2, 3, 6) et P6 (projet 35, inclusion numérique).
 *
 * Cible (feuille de route, phase 2) : ce référentiel devient éditable en admin
 * et enrichi par l'ADN stratégique appris (publications ANSUT, site, documents).
 * Tant que la table `territoires_expression` n'est pas alignée dessus, cette
 * amorce codée sert de référentiel par défaut.
 */

export interface MissionStrategique {
  /** Identifiant stable (slug). */
  id: string;
  /** Code officiel du pilier (P1…P7). */
  code: string;
  /** Intitulé court du pilier. */
  nom: string;
  /** Orientation stratégique principale du pilier, en une phrase. */
  objectif: string;
  /** L'ANSUT porte-t-elle un projet structurant de ce pilier ? */
  ansutPorteur?: boolean;
  /** Projets structurants portés par l'ANSUT dans ce pilier (pour affichage). */
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
 * Vision, missions et valeurs du MTNIT (Feuille de route 2026-2028). Support de
 * l'ADN stratégique et d'une future synthèse d'accueil personnalisée.
 */
export const STRATEGIE_MTNIT = {
  vision:
    "Moteur de l'émergence d'une Côte d'Ivoire moderne et innovante, en déployant des services publics intelligents, inclusifs et accessibles à tous, au service d'une économie performante et compétitive.",
  objectifs: [
    "Positionner la Côte d'Ivoire comme référence du numérique en Afrique de l'Ouest",
    "Faire du numérique un levier d'accès aux services essentiels, d'emplois et de croissance",
    'Construire un environnement numérique de confiance, durable et souverain',
  ],
  valeurs: ['Leadership', 'Inclusion', 'Excellence', 'Innovation', 'Service'],
} as const;

export const MISSIONS_STRATEGIQUES: MissionStrategique[] = [
  {
    id: 'connectivite-acces',
    code: 'P1',
    nom: 'Connectivité, Accès & Accessibilité à l’Internet',
    objectif:
      "Démocratiser la connectivité, l'accès aux terminaux et aux données à l'échelle nationale.",
    ansutPorteur: true,
    projetsAnsut: [
      'Étendre la couverture numérique nationale par les technologies satellitaires (RNHD)',
      'Favoriser l’accessibilité aux équipements et contenus numériques',
      'Élaborer une politique nationale des infrastructures numériques',
    ],
    motsCles: [
      // Français
      'infrastructures numériques', 'couverture numérique', 'couverture mobile',
      'couverture réseau', 'connectivité', 'zone blanche', 'zones blanches',
      'localités connectées', 'localité connectée', 'rnhd', 'réseau national haut débit',
      'haut débit', 'fibre optique', 'fibre', 'satellite', 'technologies satellitaires',
      'starlink', 'ast spacemobile', 'direct-to-cell', 'terminaux', 'smartphone',
      'communications électroniques', 'télécommunications', 'télécoms', 'opérateurs',
      'régulation télécoms', 'spectre', 'centre de données', 'datacenter', 'data center',
      "point d'échange internet", 'orange', 'mtn', 'moov', 'mvno', 'pncr',
      'connectivité rurale', 'orbite basse', 'low earth orbit',
      // Anglais
      'digital infrastructure', 'network coverage', 'mobile coverage', 'connectivity',
      'broadband', 'fiber', 'fibre', 'satellite internet', 'unconnected',
      'rural connectivity', 'telecom operators', 'spectrum', 'data centre',
    ],
  },
  {
    id: 'transformation-administration',
    code: 'P2',
    nom: 'Transformation numérique de l’administration',
    objectif:
      'Numériser les services publics prioritaires et leurs registres de référence.',
    motsCles: [
      // Français
      'transformation numérique', 'gouvernement numérique', 'administration numérique',
      'e-gouvernement', 'services publics numériques', 'digitalisation', 'dématérialisation',
      'interopérabilité', 'registres de référence', 'état civil', 'identité numérique',
      'identifiant numérique', 'paiements électroniques', 'gateway de paiement',
      'guichet unique', 'patrimoine informationnel', 'données publiques',
      'gouvernance des données', 'zéro papier',
      // Anglais
      'digital transformation', 'e-government', 'digital government',
      'digital public services', 'digitalization', 'interoperability', 'digital identity',
      'civil registry', 'e-services', 'oneci',
    ],
  },
  {
    id: 'innovation',
    code: 'P3',
    nom: 'Écosystème de l’Innovation Technologique',
    objectif:
      "Positionner la Côte d'Ivoire comme hub de l'innovation en Afrique de l'Ouest.",
    motsCles: [
      // Français
      'innovation', 'startup', 'start-up', 'start-up act', 'entrepreneuriat', 'vitib',
      'technopole', 'technopôle', "cité de l'innovation", 'incubateur', 'accélérateur',
      "financement de l'innovation", "fonds de soutien à l'innovation", 'levée de fonds',
      "écosystème d'innovation",
      // Anglais
      'incubator', 'accelerator', 'venture capital', 'funding', 'fundraising',
      'technology park', 'tech ecosystem',
    ],
  },
  {
    id: 'intelligence-artificielle',
    code: 'P4',
    nom: 'Intelligence Artificielle Nationale',
    objectif:
      "Bâtir les fondations d'un écosystème local d'intelligence artificielle.",
    motsCles: [
      // Français
      'intelligence artificielle', 'ia', 'ia nationale', 'ia générative', "cas d'usage ia",
      "éthique de l'ia", 'souveraineté numérique', 'cloud souverain', 'apprentissage automatique',
      'données', 'calcul',
      // Anglais / acteurs
      'artificial intelligence', 'generative ai', 'machine learning',
      'large language model', 'openai', 'anthropic', 'nvidia', 'mistral', 'deepmind',
      'huawei',
    ],
  },
  {
    id: 'cybersecurite-confiance',
    code: 'P5',
    nom: 'Cybersécurité & Confiance Numérique',
    objectif:
      'Sécuriser le cyberespace national et développer la confiance numérique.',
    motsCles: [
      // Français
      'cybersécurité', 'cyberattaque', 'cybermenace', 'cybercriminalité', 'cyberespace',
      'confiance numérique', 'sécurité numérique', 'certification', 'signature électronique',
      'infrastructures critiques', 'anssi', 'cert', 'protection des données',
      // Anglais
      'cybersecurity', 'cyberattack', 'cyber threat', 'cybercrime', 'ransomware',
      'data breach', 'trust services', 'phishing',
    ],
  },
  {
    id: 'competences-inclusion',
    code: 'P6',
    nom: 'Compétences Numériques & Inclusion',
    objectif:
      'Développer un capital humain numérique et réduire la fracture numérique.',
    ansutPorteur: true,
    projetsAnsut: ["Mettre en œuvre un programme national d'inclusion numérique"],
    motsCles: [
      // Français
      'compétences numériques', 'formation numérique', 'inclusion numérique',
      'fracture numérique', 'illectronisme', 'formation en ligne', 'littératie numérique',
      'reconversion', 'montée en compétences', 'esatic', 'talents numériques',
      'inclusion financière',
      // Anglais
      'digital skills', 'digital literacy', 'digital inclusion', 'digital divide',
      'e-learning', 'upskilling', 'reskilling',
    ],
  },
  {
    id: 'ecommerce-poste',
    code: 'P7',
    nom: 'E-commerce & Transformation Postale',
    objectif:
      'Redynamiser La Poste et développer le commerce électronique.',
    motsCles: [
      // Français
      'e-commerce', 'commerce électronique', 'la poste', 'poste', 'services postaux',
      'corridors postaux', 'colis', 'courrier', 'logistique', 'paiement en ligne',
      // Anglais
      'e-commerce', 'postal services', 'parcel', 'logistics', 'last mile',
    ],
  },
];
