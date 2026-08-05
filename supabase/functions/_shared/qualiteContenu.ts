/**
 * QUALITÉ DE COLLECTE — filtre d'entrée commun à toutes les fonctions de collecte.
 *
 * Constat client : « RADAR affiche les mêmes informations et n'apporte rien ».
 * Trois causes mesurées en base :
 *   1. des « articles » qui n'en sont pas (vidéos YouTube, posts sociaux, pages
 *      d'accueil, pages de rubrique) — impossibles à citer comme preuve ;
 *   2. le même sujet réinséré chaque cycle sous un titre légèrement différent ;
 *   3. des scores de pertinence codés en dur (90) qui écrasent tout classement.
 *
 * Module PUR (aucune dépendance) : mêmes règles pour collecte-veille,
 * collecte-institutionnelle et collecte-social-api.
 */

/** Hôtes qui ne fournissent jamais un article de presse citable. */
const HOTES_NON_ARTICLE = [
  'youtube.com', 'youtu.be', 'm.youtube.com', 'music.youtube.com',
  'facebook.com', 'fb.watch', 'm.facebook.com',
  'twitter.com', 'x.com', 't.co',
  'instagram.com', 'tiktok.com', 'threads.net',
  'linkedin.com', 'lnkd.in',
  'pinterest.com', 'reddit.com', 'telegram.me', 't.me', 'whatsapp.com',
  'dailymotion.com', 'vimeo.com', 'soundcloud.com', 'spotify.com',
  'google.com', 'news.google.com', 'bing.com', 'duckduckgo.com',
];

/** Segments de chemin typiques d'une page de navigation, pas d'un article. */
const CHEMINS_NAVIGATION = new Set([
  'actualites', 'actualite', 'news', 'articles', 'category', 'categorie',
  'tag', 'tags', 'rubrique', 'rubriques', 'search', 'recherche', 'page',
  'accueil', 'home', 'index', 'feed', 'rss', 'sitemap', 'contact', 'apropos',
]);

/** Titres vides de sens renvoyés par les scrapers. */
const TITRES_PLACEHOLDER = [
  'sans titre', 'untitled', 'accueil', 'home', 'page d accueil', 'actualites',
  'news', 'article', 'video', 'vidéo', 'connexion', 'login', 'erreur 404',
  'page not found', 'access denied', 'just a moment',
];

/** Hôte normalisé (sans `www.`) d'une URL, ou null si l'URL est invalide. */
export function hoteDe(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

/** L'URL pointe-t-elle vers une plateforme vidéo/sociale (jamais un article) ? */
export function estUrlNonArticle(url: string | null | undefined): boolean {
  const h = hoteDe(url);
  if (!h) return true;
  return HOTES_NON_ARTICLE.some((d) => h === d || h.endsWith(`.${d}`));
}

/** L'URL a-t-elle un chemin d'article réel (pas une home ni une rubrique) ? */
export function estUrlArticle(url: string | null | undefined): boolean {
  if (!url) return false;
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return false;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
  const segments = u.pathname.split('/').filter(Boolean);
  if (segments.length === 0) return false; // page d'accueil
  const dernier = segments[segments.length - 1]
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (/\.(pdf|jpe?g|png|gif|webp|mp4|mp3|zip)$/i.test(dernier)) return false;
  // Une rubrique (« /actualites », « /tag/telecom ») n'est pas un article :
  // il faut un slug propre au contenu.
  const sansExt = dernier.replace(/\.(html?|php|aspx?)$/i, '');
  if (CHEMINS_NAVIGATION.has(sansExt)) return false;
  if (/^\d{1,4}$/.test(sansExt) && segments.length < 3) return false;
  // Slug d'article : soit plusieurs segments, soit un slug descriptif.
  return segments.length >= 2 || sansExt.length >= 12;
}

/** Titre normalisé (minuscules, sans accents ni ponctuation). */
export function titreNormalise(t: string | null | undefined): string {
  return (t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const MOTS_VIDES = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'et', 'en', 'au', 'aux',
  'pour', 'par', 'sur', 'dans', 'avec', 'sans', 'est', 'sont', 'ont', 'ce',
  'cette', 'ces', 'son', 'sa', 'ses', 'the', 'and', 'of', 'to', 'in', 'on',
  'for', 'with', 'from', 'as', 'at', 'an', 'plus', 'apres', 'chez', 'entre',
]);

/** Jetons significatifs d'un titre (>= 4 caractères, hors mots vides). */
export function jetonsTitre(t: string | null | undefined): Set<string> {
  return new Set(
    titreNormalise(t)
      .split(' ')
      .filter((j) => j.length >= 4 && !MOTS_VIDES.has(j)),
  );
}

/** Similarité de Jaccard entre deux titres (0 → 1). */
export function similariteTitres(a: string | null | undefined, b: string | null | undefined): number {
  const ja = jetonsTitre(a);
  const jb = jetonsTitre(b);
  if (ja.size === 0 || jb.size === 0) return 0;
  let inter = 0;
  for (const j of ja) if (jb.has(j)) inter++;
  return inter / (ja.size + jb.size - inter);
}

/** Au-delà : c'est le MÊME sujet → on regroupe dans le même cluster. */
export const SEUIL_MEME_SUJET = 0.5;
/** Au-delà : c'est le MÊME article reformulé → on ne réinsère pas. */
export const SEUIL_MEME_ARTICLE = 0.8;

/** Le titre est-il un placeholder / une page technique ? */
export function estTitrePlaceholder(titre: string | null | undefined): boolean {
  const n = titreNormalise(titre);
  if (n.length < 15) return true;
  return TITRES_PLACEHOLDER.some((p) => n === p || n.startsWith(`${p} `));
}

/**
 * Motif de rejet d'un contenu candidat, ou `null` s'il est exploitable.
 * Une seule porte d'entrée pour toutes les collectes.
 */
export function motifRejet(
  titre: string | null | undefined,
  url: string | null | undefined,
): string | null {
  if (!titre || !titre.trim()) return 'titre_absent';
  if (estTitrePlaceholder(titre)) return 'titre_non_informatif';
  if (!url) return 'url_absente';
  if (estUrlNonArticle(url)) return 'url_video_ou_social';
  if (!estUrlArticle(url)) return 'url_non_article';
  return null;
}
