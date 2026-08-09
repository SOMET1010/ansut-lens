/**
 * Politiques éditoriales — dérivation VERSIONNÉE des éligibilités (Étage 3).
 *
 * Contrat : `docs/PIPELINE_EDITORIAL.md` · schéma :
 * `supabase/migrations/20260803120000_editorial_qualifications.sql`.
 *
 * Principe (Option B, validé) : l'ingestion persiste les FAITS éditoriaux STABLES
 * (date vérifiée, catégorie, thèmes, institutionnel, voix ANSUT). Les
 * ÉLIGIBILITÉS — dont la fraîcheur fenêtrée — sont **time-relative** : un booléen
 * « récent » figé en base deviendrait faux le lendemain (anti-Charte). Elles sont
 * donc DÉRIVÉES ici, à la lecture, à partir des faits + de l'instant courant, par
 * une fonction PURE et unique.
 *
 * Source unique : `qualifier()` (qualificationContenu.ts) délègue sa partie
 * éligibilités à ce module ; un écran qui lit la qualification persistée
 * (editorial_qualifications) appelle exactement les mêmes règles via
 * `faitsDepuisRow()` → aucune divergence possible entre « calculé » et « lu ».
 */

/** Version des règles de politique. À incrémenter à tout changement de seuils. */
export const VERSION_POLITIQUES = 1;

/** Faits stables nécessaires à la dérivation (sous-ensemble de la qualification). */
export interface FaitsEligibilite {
  /** Date éditoriale (publication réelle) en ms epoch, ou null si inconnue. */
  editorialDateMs: number | null;
  /** Le contenu porte un axe stratégique ET relève d'une catégorie institutionnelle. */
  estInstitutionnel: boolean;
  /** Prise de parole officielle de l'ANSUT. */
  estVoixAnsut: boolean;
}

export interface Eligibilites {
  /** La date de publication réelle est-elle vérifiée (présente et non future) ? */
  dateVerifiee: boolean;
  /** Âge en jours d'après la date éditoriale ; null si non vérifiée. */
  ageJours: number | null;
  /** Peut déterminer les thèmes institutionnels (institutionnel + daté). */
  eligibleProfilStrategique: boolean;
  /** Peut nourrir la veille externe (voix NON-ANSUT + datée). */
  eligibleVeilleExterne: boolean;
}

const JOUR_MS = 24 * 3600 * 1000;

/**
 * Dérive les éligibilités d'un contenu à partir de ses faits stables et de
 * l'instant courant. `maintenantMs` sert UNIQUEMENT à mesurer l'âge — jamais à
 * fabriquer une date.
 */
export function deriverEligibilites(faits: FaitsEligibilite, maintenantMs: number): Eligibilites {
  const ms = faits.editorialDateMs;
  const dateVerifiee = ms !== null && ms <= maintenantMs;
  const ageJours = dateVerifiee ? (maintenantMs - (ms as number)) / JOUR_MS : null;
  return {
    dateVerifiee,
    ageJours,
    eligibleProfilStrategique: faits.estInstitutionnel && dateVerifiee,
    eligibleVeilleExterne: !faits.estVoixAnsut && dateVerifiee,
  };
}

/** Vrai si le contenu (daté réellement) tombe dans la fenêtre glissante. */
export function dansFenetre(ageJours: number | null, fenetreJours: number): boolean {
  return ageJours !== null && ageJours >= 0 && ageJours <= fenetreJours;
}

/** Convertit une valeur de date (ISO ou null) en ms epoch, ou null si invalide. */
export function dateEnMs(date: string | null | undefined): number | null {
  if (!date) return null;
  const ms = new Date(date).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/**
 * Mappe une ligne persistée `editorial_qualifications` vers les faits d'éligibilité.
 * Permet à un écran de DÉRIVER les éligibilités depuis la qualification lue en
 * base, avec exactement les mêmes règles que `qualifier()`.
 */
export function faitsDepuisRow(row: {
  editorial_date: string | null;
  is_institutional: boolean;
  is_ansut_voice: boolean;
}): FaitsEligibilite {
  return {
    editorialDateMs: dateEnMs(row.editorial_date),
    estInstitutionnel: row.is_institutional,
    estVoixAnsut: row.is_ansut_voice,
  };
}
