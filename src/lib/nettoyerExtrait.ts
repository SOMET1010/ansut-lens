/**
 * Nettoyage des extraits d'articles avant affichage.
 *
 * Les resumes proviennent de la collecte automatique de sources heterogenes et
 * arrivent souvent charges de residus de balisage. La recette a releve un
 * extrait affiche tel quel sur la page Veille :
 *
 *   [Sujet Connexe — Transformation Digitale] [**Journee Mondiale des
 *   Telecommunications 2026 : :**\ « Des liens numeriques vitaux — ... ](https://...)
 *   # e-Services [![Image](https://.../170809465855.png)\ \ **Autorisations...
 *
 * Un tel texte est illisible, a plus forte raison pour un lecteur peu familier
 * des conventions du web. Ce module ramene l'extrait a de la prose simple : le
 * texte des liens est conserve, les URL, les images et les marqueurs de balisage
 * sont retires.
 *
 * Le nettoyage est volontairement fait a l'affichage plutot qu'a la collecte,
 * afin de ne pas alterer les donnees stockees et de rester efficace sur les
 * enregistrements deja presents en base.
 */

/** Longueur au-dela de laquelle l'extrait est coupe sur une frontiere de mot. */
const LONGUEUR_MAX = 320;

export function nettoyerExtrait(brut: string | null | undefined): string {
  if (!brut) return '';

  let texte = brut;

  // Images Markdown : supprimees, leur texte alternatif n'apporte rien au sens.
  texte = texte.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');

  // Liens Markdown : seul le libelle est conserve, l'URL est retiree.
  texte = texte.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');

  // URL nues laissees en clair par certaines sources.
  texte = texte.replace(/https?:\/\/\S+/g, ' ');

  // Marqueurs de titre, de gras, d'italique et de code.
  texte = texte.replace(/^#{1,6}\s*/gm, ' ');
  texte = texte.replace(/\*{1,3}([^*]*)\*{1,3}/g, '$1');
  texte = texte.replace(/`{1,3}([^`]*)`{1,3}/g, '$1');

  // Antislashs d'echappement et crochets orphelins.
  texte = texte.replace(/\\+/g, ' ');
  texte = texte.replace(/[[\]]/g, ' ');

  // Balises HTML residuelles.
  texte = texte.replace(/<[^>]+>/g, ' ');

  // Entites HTML les plus courantes.
  texte = texte
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Ponctuation dupliquee par la concatenation de fragments (« : : »).
  texte = texte.replace(/([:;,.!?])\s*\1+/g, '$1');

  // Espaces multiples et sauts de ligne ramenes a un espace simple.
  texte = texte.replace(/\s+/g, ' ').trim();

  if (texte.length <= LONGUEUR_MAX) return texte;

  // Coupe sur la derniere frontiere de mot pour ne pas tronquer en milieu de mot.
  const tronque = texte.slice(0, LONGUEUR_MAX);
  const dernierEspace = tronque.lastIndexOf(' ');
  return `${(dernierEspace > 200 ? tronque.slice(0, dernierEspace) : tronque).trimEnd()}…`;
}
