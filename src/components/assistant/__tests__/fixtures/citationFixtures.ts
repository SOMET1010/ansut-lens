/**
 * Shared content fixtures for citation export tests (PDF + DOCX).
 *
 * Each fixture is a Markdown-like document body that exercises one specific
 * scenario of the citation pipeline. They are reused across non-regression
 * suites so a single change to the contract is verified consistently in both
 * export formats.
 */

export interface CitationFixture {
  /** Stable id used as `it()` name */
  id: string;
  /** Short human description */
  description: string;
  /** Document content fed to `collectCitations` */
  content: string;
  /** Expected counts after `collectCitations` */
  expected: {
    actu: number;
    dossier: number;
    /** numeric refs WITH a resolved URL */
    numValid: number;
    /** numeric refs WITHOUT a URL (must stay non-clickable) */
    numBroken: number;
    /** explicit list of valid numeric refs (sorted) */
    validNums?: string[];
    /** explicit list of broken numeric refs (sorted) */
    brokenNums?: string[];
  };
}

export const FIXTURES: CitationFixture[] = [
  {
    id: 'mixed-actu-dossier-num',
    description: 'mix actu + dossier + [n] valide + [n] orphelin',
    content: [
      '# Briefing stratégique',
      '',
      'Voir [[ACTU:abc-1|Article ANSUT principal]] et [[DOSSIER:doss-9|Dossier interne].',
      'Référence orpheline [42] — pas de source listée.',
      'Référence valide [7] documentée plus bas.',
      '',
      'Sources :',
      '[7] https://example.com/seven',
    ].join('\n'),
    expected: {
      actu: 1,
      dossier: 0, // mal-formed bracket on purpose? keep clean below
      numValid: 1,
      numBroken: 1,
      validNums: ['7'],
      brokenNums: ['42'],
    },
  },
  {
    id: 'all-broken-numeric',
    description: 'aucune source listée — tous les [n] sont orphelins',
    content: 'Document avec [3] et [5] sans aucune source.',
    expected: { actu: 0, dossier: 0, numValid: 0, numBroken: 2, brokenNums: ['3', '5'] },
  },
  {
    id: 'all-valid-numeric',
    description: 'toutes les références numériques ont une URL',
    content: [
      'Premier [1], second [2].',
      '',
      '[1] https://a.example.com/one',
      '[2]: https://b.example.com/two',
    ].join('\n'),
    expected: { actu: 0, dossier: 0, numValid: 2, numBroken: 0, validNums: ['1', '2'] },
  },
  {
    id: 'only-actu-dossier',
    description: 'seulement des badges ACTU et DOSSIER (toujours résolus)',
    content: 'Cf. [[ACTU:news-1|Titre actu]] et [[DOSSIER:dos-2|Titre dossier]].',
    expected: { actu: 1, dossier: 1, numValid: 0, numBroken: 0 },
  },
  {
    id: 'duplicates-deduped',
    description: 'doublons dédupliqués (un seul badge par référence)',
    content: [
      'Répété [1] [1] [1] et [[ACTU:a|x]] [[ACTU:a|x]].',
      '',
      '[1] https://dedup.example.com',
    ].join('\n'),
    expected: { actu: 1, dossier: 0, numValid: 1, numBroken: 0, validNums: ['1'] },
  },
  {
    id: 'mixed-many-formats',
    description: 'formats variés (Réf n:, Voir [n], n. URL) + un orphelin',
    content: [
      'Voir [1] pour le contexte, cf [2] et la réf 3.',
      'Le point [9] reste sans source.',
      '',
      '[1] https://one.example.com',
      '2. https://two.example.com',
      'Réf 3: https://three.example.com',
    ].join('\n'),
    expected: {
      actu: 0,
      dossier: 0,
      numValid: 3,
      numBroken: 1,
      validNums: ['1', '2', '3'],
      brokenNums: ['9'],
    },
  },
];

// Sanity-correct the first fixture (closing bracket was malformed above for
// readability — set an explicit clean version here):
FIXTURES[0].content = [
  '# Briefing stratégique',
  '',
  'Voir [[ACTU:abc-1|Article ANSUT principal]] et [[DOSSIER:doss-9|Dossier interne]].',
  'Référence orpheline [42] — pas de source listée.',
  'Référence valide [7] documentée plus bas.',
  '',
  'Sources :',
  '[7] https://example.com/seven',
].join('\n');
FIXTURES[0].expected.dossier = 1;
