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
import { deriverEligibilites, dansFenetre, dateEnMs, faitsDepuisRow } from '@/lib/politiquesEditoriales';

function normaliser(s: string): string {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// djb2 \u2014 miroir EXACT de la version portable (supabase/functions/_shared/
// qualification.ts). Suffisant comme cl\u00e9 de d\u00e9doublonnage \u00e0 notre volume.
function hashTexte(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h.toString(16);
}

/**
 * Cl\u00e9 m\u00e9tier stable d'un contenu \u2014 miroir de `contentKey()` c\u00f4t\u00e9 edge (\u00e9tage 2).
 *
 * Un m\u00eame contenu pr\u00e9sent dans plusieurs tables (publications / actualit\u00e9s)
 * partage UNE cl\u00e9 : l'URL normalis\u00e9e (host + chemin) si elle est http(s), sinon
 * un hash du texte normalis\u00e9. Indispensable pour LIRE `editorial_qualifications`
 * depuis le front (\u00e9tage 3) avec exactement la cl\u00e9 \u00e9crite \u00e0 l'ingestion.
 *
 * La parit\u00e9 avec la version portable est garantie par
 * `qualificationParity.test.ts` \u2014 les deux DOIVENT rester identiques.
 */
export function cleContenu(url: string | null, texte: string | null): string {
  if (url && /^https?:\/\//i.test(url)) {
    try {
      const u = new URL(url);
      return (u.host + u.pathname).toLowerCase().replace(/\/+$/, '');
    } catch { /* repli hash */ }
  }
  return 'hash:' + hashTexte(normaliser(texte ?? ''));
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

/**
 * Qualifie un contenu. `maintenantMs` sert uniquement à calculer l'âge éditorial
 * (jamais à fabriquer une date).
 *
 * La partie FAITS (catégorie, thèmes, institutionnel) est déterministe ici ; la
 * partie ÉLIGIBILITÉS (datation, âge, éligibilités) est déléguée au service unique
 * de politiques (`politiquesEditoriales.ts`) — même code que le chemin de LECTURE
 * de la qualification persistée, donc aucune divergence calculé/lu.
 */
export function qualifier(c: ContenuBrut, maintenantMs: number): Qualification {
  const themes = piliersPourTexte(c.texte ?? '');
  const categorie = categoriserCommunication(c.texte);
  const estInstitutionnel = themes.length > 0 && CATEGORIES_INSTITUTIONNELLES.has(categorie);

  const elig = deriverEligibilites(
    {
      editorialDateMs: dateEnMs(c.published_at),
      estInstitutionnel,
      estVoixAnsut: c.source_officielle_ansut,
    },
    maintenantMs,
  );

  return {
    dateEditoriale: elig.dateVerifiee ? c.published_at : null,
    dateVerifiee: elig.dateVerifiee,
    ageJours: elig.ageJours,
    categorie,
    themes,
    estInstitutionnel,
    estVoixAnsut: c.source_officielle_ansut,
    eligibleProfilStrategique: elig.eligibleProfilStrategique,
    eligibleVeilleExterne: elig.eligibleVeilleExterne,
  };
}

/** Vrai si le contenu (daté réellement) tombe dans la fenêtre glissante. */
export function dansLaFenetre(q: Qualification, fenetreJours: number): boolean {
  return dansFenetre(q.ageJours, fenetreJours);
}

/**
 * Sous-ensemble d'une ligne `editorial_qualifications` nécessaire à la lecture.
 * (Étage 3 : les écrans LISENT ces faits persistés au lieu de les recalculer.)
 */
export interface LigneQualification {
  editorial_date: string | null;
  category: string;
  secondary_themes: string[];
  is_institutional: boolean;
  is_ansut_voice: boolean;
}

/**
 * Reconstruit une `Qualification` à partir d'une ligne PERSISTÉE + l'instant
 * courant : les faits stables (catégorie, thèmes, institutionnel, voix) sont lus
 * tels quels ; les éligibilités time-relative sont dérivées par le service unique
 * (`politiquesEditoriales.ts`) — donc STRICTEMENT identiques au chemin `qualifier()`.
 */
export function qualifierDepuisRow(row: LigneQualification, maintenantMs: number): Qualification {
  const elig = deriverEligibilites(faitsDepuisRow(row), maintenantMs);
  return {
    dateEditoriale: elig.dateVerifiee ? row.editorial_date : null,
    dateVerifiee: elig.dateVerifiee,
    ageJours: elig.ageJours,
    categorie: row.category as CategorieCommunication,
    // secondary_themes == piliersPourTexte(texte) (cf. test de parité étage 2).
    themes: row.secondary_themes,
    estInstitutionnel: row.is_institutional,
    estVoixAnsut: row.is_ansut_voice,
    eligibleProfilStrategique: elig.eligibleProfilStrategique,
    eligibleVeilleExterne: elig.eligibleVeilleExterne,
  };
}
