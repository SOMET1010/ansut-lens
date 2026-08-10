/**
 * Gardes du Conseiller éditorial (Étage 4) — logique PURE et PORTABLE.
 *
 * Module sans dépendance runtime (ni Deno, ni DOM) : il est importé à la fois par
 * la fonction edge `conseiller-editorial` (Deno) et par un test vitest côté front
 * (`src/lib/__tests__/conseillerGuard.test.ts`), comme le module `qualification.ts`.
 *
 * Deux gardes de la Charte de crédibilité, appliquées CÔTÉ SERVEUR sur la sortie
 * de l'IA :
 *   1. Liste blanche d'identifiants — l'IA ne peut « prouver » que par des
 *      contenus réellement fournis en entrée ; tout id inventé est retiré.
 *   2. Anti-injonction — le conseiller EXPLIQUE, il ne DÉCIDE pas. Toute
 *      formulation impérative (« il faut », « vous devriez »…) invalide le
 *      conseil, qui retombe alors sur la version déterministe et sourcée.
 */

/** Sortie brute (avant validation) telle que renvoyée par le modèle. */
export interface ConseilBrutIA {
  texte?: unknown;
  evidence_ids?: unknown;
  limitations?: unknown;
}

/** Conseil validé : texte non-injonctif + preuves réellement fournies. */
export interface ConseilValideIA {
  texte: string;
  evidence_ids: string[];
  limitations: string;
}

/** minuscules + suppression des diacritiques (mêmes règles que la qualification). */
function normaliser(t: string): string {
  return (t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

/**
 * Marqueurs d'injonction (forme normalisée, sans accent). Le conseiller doit
 * DÉCRIRE une opportunité, jamais prescrire une action. La liste est volontairement
 * stricte : un faux positif ne fait que revenir au conseil déterministe (sûr),
 * tandis qu'une injonction qui passe violerait le contrat « l'IA conseille, elle
 * ne décide pas ».
 */
export const MARQUEURS_INJONCTION: readonly string[] = [
  'il faut',
  'il faudrait',
  'il faudra',
  'il est imperatif',
  'il est necessaire',
  'il est conseille',
  'il est recommande',
  'il est urgent',
  'il est temps de',
  'il serait judicieux',
  'il conviendrait',
  'il convient de',
  'vous devez',
  'vous devriez',
  'tu dois',
  'nous recommandons',
  'nous conseillons',
  'je recommande',
  'je conseille',
  'on recommande',
  'devrait publier',
  'doit publier',
  'devrait communiquer',
  'doit communiquer',
  'devrait prendre la parole',
  'doit prendre la parole',
  'ansut devrait',
  'ansut doit',
  'publiez',
  'communiquez',
  'prenez la parole',
  'positionnez-vous',
  'emparez-vous',
  'saisissez',
  'reagissez',
];

/** Vrai si le texte contient une formulation impérative/prescriptive. */
export function contientInjonction(texte: string): boolean {
  const n = normaliser(texte);
  return MARQUEURS_INJONCTION.some((m) => n.includes(m));
}

/** Ne conserve que les identifiants réellement présents dans l'ensemble fourni. */
export function filtrerIds(arr: unknown, ref: Set<string>): string[] {
  return Array.isArray(arr) ? (arr as unknown[]).map(String).filter((x) => ref.has(x)) : [];
}

/**
 * Valide la sortie brute du modèle contre le contrat de l'Étage 4.
 *
 * Renvoie `null` (→ repli déterministe côté front) si :
 *   - le texte est vide ;
 *   - le texte contient une injonction ;
 *   - aucune preuve valide ne subsiste (un conseil sans preuve n'est pas traçable).
 */
export function validerConseil(brut: ConseilBrutIA, idsAutorises: Set<string>): ConseilValideIA | null {
  const texte = String(brut?.texte ?? '').trim();
  if (!texte) return null;
  if (contientInjonction(texte)) return null;

  const evidence_ids = filtrerIds(brut?.evidence_ids, idsAutorises);
  if (evidence_ids.length === 0) return null;

  return {
    texte,
    evidence_ids,
    limitations: String(brut?.limitations ?? '').trim(),
  };
}
