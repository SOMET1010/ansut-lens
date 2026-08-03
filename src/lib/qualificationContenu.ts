/**
 * Qualification COMMUNE des contenus — la source unique de vérité, en amont des
 * écrans.
 *
 * Problème résolu : chaque écran recréait ses propres règles de datation et de
 * pertinence, laissant remonter d'anciens contenus (GITEX recollecté) ou des
 * contenus hors axes (Digital Fanzone, félicitations sportives) comme s'ils
 * étaient de la communication stratégique récente.
 *
 * Principe : un contenu est qualifié UNE fois (date éditoriale, catégorie,
 * thèmes, caractère institutionnel/communautaire, éligibilités), puis chaque
 * écran consomme cette qualification selon sa mission — il ne réinvente pas les
 * règles.
 *
 * Règles verrouillées :
 *   - La fraîcheur éditoriale s'appuie EXCLUSIVEMENT sur la date de publication
 *     réelle (`published_at`). La date de COLLECTE ne rend jamais un contenu
 *     « récent ».
 *   - Une date de publication absente ou non vérifiable → le contenu n'entre
 *     dans AUCUNE fenêtre temporelle ; il reste consultable, marqué « date
 *     d'origine non vérifiée ».
 *   - « Hors stratégie » ≠ « hors sujet » : un contenu communautaire/sportif
 *     n'est pas supprimé ; il est classé, et il ne détermine simplement pas les
 *     thèmes institutionnels.
 */

import { piliersPourTexte } from '@/lib/missions';

function normaliser(s: string): string {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function echapper(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function contient(texteNorm: string, terme: string): boolean {
  const t = normaliser(terme).trim();
  if (!t) return false;
  return new RegExp(`(^|[^a-z0-9])${echapper(t)}([^a-z0-9]|$)`).test(texteNorm);
}

/** Catégories de communication (une communication a toujours une catégorie). */
export type CategorieCommunication =
  | 'institutionnelle'
  | 'programme'
  | 'evenementielle'
  | 'communautaire'
  | 'promotionnelle'
  | 'protocolaire'
  | 'sportive'
  | 'autre';

export const LIBELLE_CATEGORIE: Record<CategorieCommunication, string> = {
  institutionnelle: 'Institutionnelle',
  programme: 'Programme / projet',
  evenementielle: 'Événementielle',
  communautaire: 'Communautaire',
  promotionnelle: 'Promotionnelle',
  protocolaire: 'Protocolaire',
  sportive: 'Sportive',
  autre: 'Autre',
};

/**
 * Catégories dites « institutionnelles » : les seules qui peuvent DÉTERMINER les
 * thèmes stratégiques portés par l'ANSUT. Les autres (sportive, promotionnelle,
 * protocolaire, communautaire) restent de vraies communications mais ne pèsent
 * pas dans les axes.
 */
const CATEGORIES_INSTITUTIONNELLES = new Set<CategorieCommunication>([
  'institutionnelle',
  'programme',
  'evenementielle',
]);

// Marqueurs par catégorie. L'ordre d'évaluation privilégie les catégories les
// plus spécifiques (sport, promo, protocole) pour éviter qu'un mot institutionnel
// isolé ne requalifie une communication communautaire.
export const MARQUEURS: { categorie: CategorieCommunication; mots: string[] }[] = [
  {
    categorie: 'sportive',
    mots: [
      'football', 'foot', 'match', 'champion', 'championne', 'championnat', 'fanzone',
      'fan zone', 'coupe', 'trophée', 'sportif', 'sportive', 'éléphants', 'elephants',
      'can 2', 'sélection', 'selection', 'stade', 'supporters', 'victoire', 'équipe nationale',
    ],
  },
  {
    categorie: 'promotionnelle',
    mots: ['téléchargez', 'telechargez', 'télécharger', 'application', 'appli', 'jeu concours', 'concours', 'promo', 'disponible sur'],
  },
  {
    categorie: 'protocolaire',
    mots: ['félicitations', 'felicitations', 'hommage', 'condoléances', 'condoleances', 'anniversaire', 'meilleurs vœux', 'meilleurs voeux', 'bonne fête', 'bonne fete', 'joyeux'],
  },
  {
    categorie: 'evenementielle',
    mots: ['gitex', 'salon', 'forum', 'séminaire', 'seminaire', 'conférence', 'conference', 'cérémonie', 'ceremonie', 'sommet', 'atelier', 'panel', 'table ronde', 'édition', 'edition', 'webinaire', 'participe', 'prend part', 'journée'],
  },
  {
    categorie: 'programme',
    mots: ['projet', 'programme', 'déploiement', 'deploiement', 'chantier', 'infrastructure', 'fibre', 'ftth', 'localités', 'localites', 'raccordement', 'couverture'],
  },
  {
    categorie: 'institutionnelle',
    mots: ['communiqué', 'communique', 'partenariat', 'convention', 'signature', 'signé', 'signe', 'accord', 'protocole', 'inauguration', 'inaugure', 'lancement', 'officiel', 'officielle', 'engagement'],
  },
  {
    categorie: 'communautaire',
    mots: ['communauté', 'communaute', 'grand public', 'citoyens', 'citoyennes', 'ensemble', 'mobilisation', 'sensibilisation'],
  },
];

/** Détermine la catégorie de communication d'un texte (défaut : « autre »). */
export function categoriserCommunication(texte: string | null): CategorieCommunication {
  const t = normaliser(texte ?? '');
  for (const { categorie, mots } of MARQUEURS) {
    if (mots.some((m) => contient(t, m))) return categorie;
  }
  return 'autre';
}

/** Contenu brut à qualifier, normalisé quelle que soit sa table d'origine. */
export interface ContenuBrut {
  /** Texte éditorial (contenu d'un post, ou titre + résumé d'un article). */
  texte: string | null;
  /** Date de publication réelle (jamais la date de collecte). */
  published_at: string | null;
  /** Date de collecte (informative — ne sert jamais à la fraîcheur). */
  collected_at: string | null;
  /** Le contenu est-il une prise de parole officielle de l'ANSUT ? */
  source_officielle_ansut: boolean;
}

export interface Qualification {
  /** Date éditoriale utilisable, ou null si la date réelle est inconnue. */
  dateEditoriale: string | null;
  /** La date de publication réelle est-elle vérifiée (présente) ? */
  dateVerifiee: boolean;
  /** Âge en jours d'après la date éditoriale ; null si non vérifiée. */
  ageJours: number | null;
  categorie: CategorieCommunication;
  /** Piliers stratégiques rattachés (par appariement à frontière de mot). */
  themes: string[];
  /** Porte un axe stratégique ET relève d'une catégorie institutionnelle. */
  estInstitutionnel: boolean;
  estVoixAnsut: boolean;
  /** Peut déterminer les thèmes institutionnels (institutionnel + daté). */
  eligibleProfilStrategique: boolean;
  /** Peut nourrir la veille externe (voix externe, datée). */
  eligibleVeilleExterne: boolean;
}

function dateEditorialeMs(published_at: string | null): number | null {
  if (!published_at) return null;
  const ms = new Date(published_at).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Qualifie un contenu. `maintenantMs` sert uniquement à calculer l'âge éditorial
 * (jamais à fabriquer une date).
 */
export function qualifier(c: ContenuBrut, maintenantMs: number): Qualification {
  const ms = dateEditorialeMs(c.published_at);
  const dateVerifiee = ms !== null && ms <= maintenantMs;
  const dateEditoriale = dateVerifiee ? c.published_at : null;
  const ageJours = dateVerifiee ? (maintenantMs - (ms as number)) / (24 * 3600 * 1000) : null;

  const themes = piliersPourTexte(c.texte ?? '');
  const categorie = categoriserCommunication(c.texte);
  const estInstitutionnel = themes.length > 0 && CATEGORIES_INSTITUTIONNELLES.has(categorie);

  return {
    dateEditoriale,
    dateVerifiee,
    ageJours,
    categorie,
    themes,
    estInstitutionnel,
    estVoixAnsut: c.source_officielle_ansut,
    // Un contenu ne détermine les thèmes que s'il est institutionnel ET daté.
    eligibleProfilStrategique: estInstitutionnel && dateVerifiee,
    // La veille externe = voix NON-ANSUT et datée.
    eligibleVeilleExterne: !c.source_officielle_ansut && dateVerifiee,
  };
}

/** Vrai si le contenu (daté réellement) tombe dans la fenêtre glissante. */
export function dansLaFenetre(q: Qualification, fenetreJours: number): boolean {
  return q.ageJours !== null && q.ageJours >= 0 && q.ageJours <= fenetreJours;
}
