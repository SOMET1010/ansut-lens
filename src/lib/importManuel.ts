/**
 * Import manuel de publications — filet provisoire pendant la mise en place des
 * connecteurs officiels (LinkedIn/Facebook). La com saisit des publications
 * réelles (date, texte, métriques) ; elles alimentent le même pipeline que les
 * connecteurs, avec une date honnête (celle indiquée) et une provenance claire.
 *
 * Discipline Charte : rien n'est fabriqué. La date fournie est traitée comme une
 * date absolue vérifiée (`absolute_source`) ; les métriques ne sont écrites que
 * si elles sont renseignées.
 */

export interface EntreeManuelle {
  plateforme: string;
  /** Date de publication réelle, format YYYY-MM-DD. */
  date: string;
  type: string;
  url: string;
  texte: string;
  auteur?: string;
  likes?: number | null;
  comments?: number | null;
  shares?: number | null;
  vues?: number | null;
}

export const PLATEFORMES_IMPORT = [
  { valeur: 'facebook', libelle: 'Facebook' },
  { valeur: 'linkedin', libelle: 'LinkedIn' },
  { valeur: 'x', libelle: 'X (Twitter)' },
  { valeur: 'youtube', libelle: 'YouTube' },
  { valeur: 'instagram', libelle: 'Instagram' },
  { valeur: 'website', libelle: 'Site web' },
] as const;

const TYPES = ['post', 'article', 'video', 'image', 'communique'];

function nombreOuNull(v: string | undefined): number | null {
  if (v == null || v.trim() === '') return null;
  const n = Number(v.replace(/\s/g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Vrai si la chaîne est une date ISO YYYY-MM-DD valide et non future. */
export function dateValide(d: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const t = new Date(`${d}T12:00:00Z`).getTime();
  if (Number.isNaN(t)) return false;
  return t <= Date.now() + 24 * 3600 * 1000;
}

/** Extrait les hashtags réels du texte (sans en fabriquer). */
export function hashtagsDeTexte(texte: string): string[] {
  const out = new Set<string>();
  for (const m of (texte || '').matchAll(/#([\p{L}\p{N}_]+)/gu)) out.add(m[1]);
  return [...out];
}

/**
 * Construit la charge d'insertion `publications_institutionnelles` à partir d'une
 * entrée manuelle validée.
 */
export function versPublication(e: EntreeManuelle) {
  const dateOk = dateValide(e.date);
  return {
    plateforme: e.plateforme,
    type_contenu: e.type || 'post',
    contenu: e.texte,
    url_original: e.url?.trim() || null,
    date_publication: dateOk ? new Date(`${e.date}T12:00:00Z`).toISOString() : null,
    publication_date_source: dateOk ? 'absolute_source' : 'unknown',
    publication_date_verified: dateOk,
    auteur: e.auteur?.trim() || 'ANSUT',
    est_officiel: true,
    hashtags: hashtagsDeTexte(e.texte),
    likes_count: e.likes ?? null,
    comments_count: e.comments ?? null,
    shares_count: e.shares ?? null,
    vues_count: e.vues ?? null,
  };
}

export interface ResultatParse {
  entrees: EntreeManuelle[];
  erreurs: string[];
}

/**
 * Analyse un collage « en vrac », une publication par ligne, champs séparés par
 * des barres verticales :
 *   plateforme | date(YYYY-MM-DD) | type | url | texte | likes | comments | shares | vues
 * Les 5 premiers champs sont requis ; les métriques sont facultatives.
 */
export function parseBulk(texte: string): ResultatParse {
  const entrees: EntreeManuelle[] = [];
  const erreurs: string[] = [];
  const lignes = (texte || '').split('\n').map((l) => l.trim()).filter(Boolean);

  lignes.forEach((ligne, i) => {
    const n = i + 1;
    const c = ligne.split('|').map((x) => x.trim());
    if (c.length < 5) {
      erreurs.push(`Ligne ${n} : au moins 5 champs requis (plateforme | date | type | url | texte).`);
      return;
    }
    const [plateforme, date, type, url, texte, likes, comments, shares, vues] = c;
    if (!PLATEFORMES_IMPORT.some((p) => p.valeur === plateforme)) {
      erreurs.push(`Ligne ${n} : plateforme « ${plateforme} » inconnue.`);
      return;
    }
    if (!dateValide(date)) {
      erreurs.push(`Ligne ${n} : date « ${date} » invalide (attendu AAAA-MM-JJ, non future).`);
      return;
    }
    if (!texte) {
      erreurs.push(`Ligne ${n} : le texte est vide.`);
      return;
    }
    entrees.push({
      plateforme,
      date,
      type: TYPES.includes(type) ? type : 'post',
      url,
      texte,
      likes: nombreOuNull(likes),
      comments: nombreOuNull(comments),
      shares: nombreOuNull(shares),
      vues: nombreOuNull(vues),
    });
  });

  return { entrees, erreurs };
}
