/**
 * Fondation crédibilité — DÉDUPLICATION par URL canonique.
 *
 * Point #1 de l'audit : « 51 preuves », « 29 articles », le ratio d'écho, les
 * sujets dominants, « 259 articles pertinents », « 412 total »… tous contaminés
 * par le même document répété. La règle est unique et centrale : on ne compte
 * jamais deux fois la même URL, ni un titre strictement équivalent.
 *
 * Module PUR (aucune dépendance) : c'est la brique la plus basse, réutilisée par
 * tous les écrans reconstruits (La Matinale, Veille, Notre communication…).
 */

/**
 * Forme canonique d'une URL pour la comparaison : hôte sans `www`, chemin sans
 * barre finale, requête et fragment ignorés. `null` si l'URL est invalide.
 */
export function urlCanonique(u: string | null | undefined): string | null {
  if (!u) return null;
  try {
    const url = new URL(u);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const path = url.pathname.replace(/\/+$/, '');
    return `${host}${path}`;
  } catch {
    return null;
  }
}

/**
 * Une URL pointe-t-elle vers un ARTICLE (chemin réel) et non une simple page
 * d'accueil ? Un lien vers `telecom.gouv.ci` ou la home d'un média n'est pas une
 * preuve : il ne mène pas au contenu cité.
 */
export function estPageArticle(u: string | null | undefined): boolean {
  const canon = urlCanonique(u);
  if (!canon) return false;
  const i = canon.indexOf('/');
  // Il faut un chemin au-delà de « / » (host seul ou host+"/" ⇒ page d'accueil).
  return i >= 0 && canon.length - i > 1;
}

/** Titre normalisé (sans casse, accents ni ponctuation) pour la dédup de secours. */
export function titreNormalise(t: string | null | undefined): string {
  return (t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Résultat d'une déduplication : les uniques, et le nombre de reprises écartées. */
export interface ResultatDedup<T> {
  uniques: T[];
  nbReprises: number;
}

/**
 * Déduplique une liste par URL canonique, à défaut par titre normalisé.
 * Conserve le PREMIER exemplaire rencontré (ordre d'entrée) et compte les
 * reprises pour affichage transparent (« N reprises écartées »).
 */
export function dedupParUrl<T>(
  items: T[],
  getUrl: (x: T) => string | null | undefined,
  getTitre?: (x: T) => string | null | undefined,
): ResultatDedup<T> {
  const vus = new Set<string>();
  const uniques: T[] = [];
  let nbReprises = 0;

  for (const item of items) {
    const canon = urlCanonique(getUrl(item));
    const cleUrl = canon ? `u:${canon}` : null;
    const norm = getTitre ? titreNormalise(getTitre(item)) : '';
    const cleTitre = norm ? `t:${norm}` : null;

    if ((cleUrl && vus.has(cleUrl)) || (cleTitre && vus.has(cleTitre))) {
      nbReprises += 1;
      continue;
    }
    if (cleUrl) vus.add(cleUrl);
    if (cleTitre) vus.add(cleTitre);
    uniques.push(item);
  }

  return { uniques, nbReprises };
}
