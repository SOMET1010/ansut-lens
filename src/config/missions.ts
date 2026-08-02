/**
 * Référentiel des missions stratégiques de l'ANSUT.
 *
 * C'est l'amorce du « moteur de compréhension de l'ANSUT » : chaque actualité
 * collectée est rattachée à une ou plusieurs missions selon les signaux
 * (mots-clés, acteurs, programmes) ci-dessous. La page « Ce matin » s'organise
 * autour de ces objectifs, l'article devenant une preuve rattachée à une mission
 * plutôt que le contenu principal.
 *
 * Ce fichier est une amorce codée, volontairement simple à lire et à corriger.
 * La cible (feuille de route, phase 2) est un référentiel éditable en admin,
 * auto-amorcé depuis l'ADN stratégique (publications ANSUT, site, documents) :
 * ces mots-clés seront alors complétés et validés par la Direction, puis lus
 * depuis `territoires_expression` en base. Tant que cette table est vide, cette
 * amorce sert de référentiel par défaut.
 */

export interface MissionStrategique {
  /** Identifiant stable (slug). */
  id: string;
  /** Intitulé court affiché. */
  nom: string;
  /** Ce que la mission cherche à accomplir, en une phrase. */
  objectif: string;
  /**
   * Signaux de rattachement : mots-clés, programmes et acteurs. L'appariement
   * respecte les frontières de mot (voir `src/lib/missions.ts`).
   */
  motsCles: string[];
}

export const MISSIONS_STRATEGIQUES: MissionStrategique[] = [
  {
    id: 'service-universel',
    nom: 'Service Universel',
    objectif: 'Connecter les zones non ou mal desservies du territoire.',
    motsCles: [
      // Français
      'service universel', 'couverture mobile', 'couverture réseau', 'zone blanche',
      'zones blanches', 'localités connectées', 'localité connectée', 'connectivité rurale',
      'couverture rurale', 'fibre', 'fibre optique', 'satellite', 'starlink',
      'ast spacemobile', 'direct-to-cell', 'orange', 'mtn', 'moov', 'rnhd',
      "programme d'urgence", 'zones rurales',
      // Anglais (les sources collectées sont souvent anglophones)
      'universal service', 'mobile coverage', 'network coverage', 'rural coverage',
      'rural connectivity', 'unconnected', 'connectivity', 'fiber', 'fibre',
      'broadband', 'satellite internet',
    ],
  },
  {
    id: 'transformation-numerique',
    nom: 'Transformation numérique',
    objectif: 'Accélérer la numérisation des services et des usages.',
    motsCles: [
      // Français
      'transformation numérique', 'transformation digitale', 'intelligence artificielle',
      'ia', 'cloud', 'datacenter', 'data center', 'centre de données',
      'gouvernement numérique', 'e-gouvernement', 'administration numérique',
      'identité numérique', 'inclusion numérique', 'cybersécurité', 'cyberattaque',
      'services publics numériques',
      // Anglais (jeton 'ai' volontairement exclu : apparierait « j'ai »)
      'digital transformation', 'artificial intelligence', 'digital government',
      'e-government', 'digital identity', 'digital inclusion', 'cybersecurity',
      'cyberattack', 'ransomware', 'data centre',
    ],
  },
  {
    id: 'innovation',
    nom: 'Innovation',
    objectif: 'Anticiper les ruptures technologiques et le financement.',
    motsCles: [
      'innovation', 'openai', 'nvidia', 'huawei', 'startup', 'start-up', 'financement',
      'levée de fonds', 'intelligence artificielle générative', 'gsma', 'uit', 'itu',
      'technologie émergente',
      // Anglais
      'funding', 'fundraising', 'venture', 'emerging technology', 'generative ai',
    ],
  },
  {
    id: 'relations-institutionnelles',
    nom: 'Relations institutionnelles',
    objectif: 'Entretenir les partenariats et engagements internationaux.',
    motsCles: [
      'ministère', 'smart africa', 'uit', 'itu', 'gsma', 'coopération', 'partenariat',
      'accord', 'convention', 'banque mondiale', 'union africaine', 'cedeao',
      // Anglais
      'ministry', 'cooperation', 'partnership', 'world bank', 'african union', 'ecowas',
    ],
  },
];
