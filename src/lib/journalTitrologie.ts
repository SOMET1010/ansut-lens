/**
 * journalTitrologie — libellé honnête du nom de journal d'une une de titrologie.
 *
 * Les images de titrologie d'Abidjan.net sont nommées par identifiant technique
 * (ex. « 6a70335773d47 146268 »). Quand l'OCR ne parvient pas à lire le
 * bandeau-titre (masthead), cet identifiant se retrouve stocké dans la colonne
 * `journal` de `titrologie_unes`. L'afficher tel quel revient à présenter un
 * faux nom de journal — interdit par la charte de crédibilité (docs/CHARTE_CREDIBILITE.md) :
 * mieux vaut avouer « Journal non identifié » qu'afficher un numéro.
 *
 * Miroir de `looksLikeId` dans l'edge function collecte-titrologie/index.ts, pour
 * que l'écran soit robuste même sur des lignes déjà en base (ou une version de la
 * collecte antérieure au garde-fou).
 */

const LIBELLE_NON_IDENTIFIE = 'Journal non identifié';

/** Vrai quand la chaîne ressemble à un identifiant technique plutôt qu'à un nom de journal. */
export function ressembleAIdentifiant(nom: string | null | undefined): boolean {
  const s = (nom || '').trim();
  if (!s || s.toLowerCase() === 'journal') return true;
  if (!/[a-zà-ÿ]{3,}/i.test(s)) return true;          // aucun vrai mot de 3+ lettres
  if (/[0-9a-f]{8,}/i.test(s)) return true;           // long jeton hexadécimal / id
  const chiffres = (s.match(/\d/g) || []).length;
  return chiffres >= s.replace(/\s/g, '').length / 2; // moitié ou plus de chiffres
}

/**
 * Libellé de source à afficher : le nom du journal s'il est réel, sinon un aveu
 * honnête. `identifie` permet à l'appelant d'adapter le style (ex. italique/grisé).
 */
export function libelleJournal(nom: string | null | undefined): { texte: string; identifie: boolean } {
  return ressembleAIdentifiant(nom)
    ? { texte: LIBELLE_NON_IDENTIFIE, identifie: false }
    : { texte: (nom as string).trim(), identifie: true };
}
