/**
 * Référentiel des axes stratégiques du MTNIT / de l'ANSUT.
 *
 * Ce référentiel n'est pas inventé : il est dérivé de la feuille de route
 * officielle « Transition Numérique et Innovation Technologique » et de la liste
 * des 40 projets structurants du Ministère (MTNIT). Chaque axe regroupe des
 * projets structurants ; les mots-clés servent à rattacher une actualité
 * collectée à l'axe qu'elle impacte. L'article devient alors une preuve
 * rattachée à un objectif stratégique, plutôt que le contenu principal.
 *
 * `ansutPorteur` signale les axes où l'ANSUT est entité porteuse d'au moins un
 * projet (projets 2, 3, 6 — infrastructures/connectivité — et 35 — inclusion).
 *
 * Cible (feuille de route, phase 2) : ce référentiel devient éditable en admin
 * et enrichi par l'ADN stratégique appris (publications ANSUT, site, documents).
 * Tant que la table `territoires_expression` n'est pas alignée dessus, cette
 * amorce codée sert de référentiel par défaut.
 */

export interface MissionStrategique {
  /** Identifiant stable (slug). */
  id: string;
  /** Intitulé court de l'axe. */
  nom: string;
  /** Objectif global de l'axe, en une phrase. */
  objectif: string;
  /** L'ANSUT porte-t-elle un projet structurant de cet axe ? */
  ansutPorteur?: boolean;
  /** Projets structurants portés par l'ANSUT dans cet axe (pour affichage). */
  projetsAnsut?: string[];
  /**
   * Signaux de rattachement : mots-clés, programmes et acteurs, bilingues (les
   * sources collectées sont souvent anglophones). L'appariement respecte les
   * frontières de mot (voir `src/lib/missions.ts`) pour éviter les faux
   * positifs de sous-chaîne.
   */
  motsCles: string[];
}

export const MISSIONS_STRATEGIQUES: MissionStrategique[] = [
  {
    id: 'infrastructures-connectivite',
    nom: 'Infrastructures & Connectivité',
    objectif:
      "Démocratiser la connectivité et l'accès aux terminaux sur tout le territoire.",
    ansutPorteur: true,
    projetsAnsut: [
      'Étendre la couverture numérique nationale par les technologies satellitaires (RNHD)',
      'Favoriser l’accessibilité aux équipements et contenus numériques',
      'Politique nationale des infrastructures numériques',
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
    nom: 'Transformation de l’administration',
    objectif:
      'Numériser les services publics prioritaires et leurs registres de référence.',
    motsCles: [
      // Français
      'transformation numérique', 'gouvernement numérique', 'administration numérique',
      'e-gouvernement', 'services publics numériques', 'digitalisation', 'dématérialisation',
      'interopérabilité', 'registres de référence', 'état civil', 'identité numérique',
      'paiements électroniques', 'gateway de paiement', 'guichet unique',
      'patrimoine informationnel', 'données publiques', 'gouvernance numérique', 'oneci',
      // Anglais
      'digital transformation', 'e-government', 'digital government',
      'digital public services', 'digitalization', 'interoperability', 'digital identity',
      'civil registry', 'e-services',
    ],
  },
  {
    id: 'innovation',
    nom: 'Innovation & Entrepreneuriat',
    objectif:
      "Soutenir l'écosystème local d'innovation et son financement.",
    motsCles: [
      // Français
      'innovation', 'startup', 'start-up', 'start-up act', 'entrepreneuriat', 'vitib',
      'technopole', "cité de l'innovation", 'incubateur', 'accélérateur',
      "financement de l'innovation", 'levée de fonds', "écosystème d'innovation",
      // Anglais
      'incubator', 'accelerator', 'venture capital', 'funding', 'fundraising',
      'technology park', 'tech ecosystem',
    ],
  },
  {
    id: 'intelligence-artificielle',
    nom: 'Intelligence Artificielle',
    objectif:
      "Bâtir les fondations d'un écosystème local d'intelligence artificielle.",
    motsCles: [
      // Français
      'intelligence artificielle', 'ia', 'ia générative', "cas d'usage ia",
      "éthique de l'ia", 'apprentissage automatique', 'données', 'calcul',
      // Anglais / acteurs
      'artificial intelligence', 'generative ai', 'machine learning',
      'large language model', 'openai', 'anthropic', 'nvidia', 'mistral', 'deepmind',
      'huawei',
    ],
  },
  {
    id: 'cybersecurite-confiance',
    nom: 'Cybersécurité & Confiance numérique',
    objectif:
      'Sécuriser le cyberespace national et développer la confiance numérique.',
    motsCles: [
      // Français
      'cybersécurité', 'cyberattaque', 'cyberespace', 'confiance numérique',
      'sécurité numérique', 'certification', 'signature électronique', 'menace',
      'anssi', 'cert', 'protection des données',
      // Anglais
      'cybersecurity', 'cyberattack', 'cyber threat', 'ransomware', 'data breach',
      'trust services', 'phishing',
    ],
  },
  {
    id: 'competences-inclusion',
    nom: 'Compétences numériques & Inclusion',
    objectif:
      'Développer un capital humain numérique et réduire la fracture numérique.',
    ansutPorteur: true,
    projetsAnsut: ["Mettre en œuvre un programme d'inclusion numérique"],
    motsCles: [
      // Français
      'compétences numériques', 'formation numérique', 'inclusion numérique',
      'fracture numérique', 'formation en ligne', 'littératie numérique',
      'reconversion', 'montée en compétences', 'esatic', 'talents numériques',
      // Anglais
      'digital skills', 'digital literacy', 'digital inclusion', 'digital divide',
      'e-learning', 'upskilling', 'reskilling',
    ],
  },
];
