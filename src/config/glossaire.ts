/**
 * Glossaire des notions metier d'ANSUT Radar.
 *
 * L'audit d'experience a identifie le vocabulaire interne comme premiere cause
 * de desorientation : l'interface employait des termes comme « SPDI »,
 * « quadrant » ou « titrologie » sans jamais les definir. Ce fichier centralise
 * les definitions, exposees au survol via le composant `TermeMetier` et
 * consultables en entier depuis l'aide.
 *
 * Regle de redaction : une definition tient en une phrase comprehensible par
 * une personne qui decouvre la plateforme, sans employer d'autre terme du
 * glossaire dans cette premiere phrase.
 */
export interface TermeGlossaire {
  /** Cle courte utilisee dans le code. */
  cle: string;
  /** Terme tel qu'il apparait dans l'interface. */
  terme: string;
  /** Forme developpee, si le terme est un sigle. */
  sigle?: string;
  /** Definition courte, affichee au survol. */
  definition: string;
  /** Precision facultative, affichee dans la page d'aide. */
  precision?: string;
}

export const GLOSSAIRE: TermeGlossaire[] = [
  {
    cle: 'quadrant',
    terme: 'Quadrant',
    definition:
      'Grande famille de sujets dans laquelle un signal est classe : technologie, regulation, marche ou reputation.',
    precision:
      'Le classement par quadrant permet de repartir la veille entre les differentes directions concernees.',
  },
  {
    cle: 'cercle',
    terme: 'Cercle',
    definition:
      "Niveau de proximite d'un acteur avec l'ANSUT, du cercle 1 (interlocuteurs directs) au cercle 4 (acteurs peripheriques).",
  },
  {
    cle: 'signal',
    terme: 'Signal',
    definition:
      'Information detectee par la veille qui merite une attention particuliere, avec un niveau de criticite associe.',
  },
  {
    cle: 'signal-faible',
    terme: 'Signal faible',
    definition:
      'Information encore peu reprise mais qui presente les caracteristiques d’un sujet susceptible de prendre de l’ampleur.',
  },
  {
    cle: 'titrologie',
    terme: 'Titrologie',
    definition:
      'Revue des titres de la presse papier ivoirienne du jour, telle qu’elle se pratique devant les kiosques a journaux.',
  },
  {
    cle: 'ce-matin',
    terme: 'Ce matin',
    definition:
      'Note de synthese consultee chaque matin, rassemblant les faits marquants des dernieres vingt-quatre heures.',
  },
  {
    cle: 'recherche',
    terme: 'Recherche',
    definition:
      'Recherche approfondie sur un sujet unique, remontant jusqu’a trente jours et interrogeant toutes les sources disponibles.',
  },
  {
    cle: 'surveillance',
    terme: 'Surveillance',
    definition:
      'Suivi permanent configure sur un theme, un acteur ou un mot-cle, qui alimente la veille en continu.',
  },
  {
    cle: 'share-of-voice',
    terme: 'Part de voix',
    sigle: 'Share of voice',
    definition:
      "Proportion des mentions du secteur qui concernent l'ANSUT, comparee a celles de ses homologues.",
  },
  {
    cle: 'sentiment',
    terme: 'Sentiment',
    definition:
      'Tonalite generale d’un contenu a l’egard de son sujet : favorable, neutre ou defavorable.',
  },
  {
    cle: 'resonance',
    terme: 'Resonance',
    definition:
      'Ampleur de la reprise d’un sujet par d’autres sources apres sa premiere publication.',
  },
  {
    cle: 'shadow-tracker',
    terme: 'Veille discrete',
    sigle: 'Shadow tracker',
    definition:
      'Suivi de sujets sensibles conserve hors des diffusions courantes et reserve a un cercle restreint.',
  },
  {
    cle: 'coffre-contenu',
    terme: 'Coffre a contenus',
    definition:
      'Reserve de contenus rediges a l’avance, prets a etre publies lorsque le moment est opportun.',
  },
  {
    cle: 'fraicheur',
    terme: 'Fraicheur',
    definition:
      'Age maximal accepte pour qu’une information soit consideree comme encore pertinente.',
  },
];

/** Index par cle pour un acces direct depuis les composants. */
export const GLOSSAIRE_INDEX: Record<string, TermeGlossaire> = Object.fromEntries(
  GLOSSAIRE.map((terme) => [terme.cle, terme]),
);
