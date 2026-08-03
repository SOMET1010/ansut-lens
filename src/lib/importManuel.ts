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

/** Normalise un en-tête de colonne : minuscules, sans accents, séparateurs → « _ ». */
function normaliserCle(h: string): string {
  return (h ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Alias de colonnes acceptés (clés déjà normalisées). */
const ALIAS: Record<string, string[]> = {
  plateforme: ['plateforme', 'platform', 'reseau', 'reseau_social'],
  date: ['date', 'date_publication', 'date_publication_estimee', 'date_publiee', 'date_de_publication'],
  type: ['type', 'type_contenu', 'format'],
  // NB : on n'utilise PAS url_source_page (URL de flux commune) — elle collerait
  // la même clé de contenu à tous les posts. Seule l'URL propre du post compte.
  url: ['url', 'url_original', 'lien', 'permalien', 'lien_du_post'],
  texte: ['texte', 'contenu', 'content', 'text', 'message'],
  hashtags: ['hashtags', 'tags', 'mots_cles'],
  likes: ['likes', 'reactions', 'reactions_count', 'jaime', 'j_aime', 'likes_count'],
  comments: ['comments', 'commentaires', 'comments_count', 'commentaires_count'],
  shares: ['shares', 'partages', 'shares_count', 'republications'],
  vues: ['vues', 'views', 'vues_count', 'impressions'],
};

/** Détecte le séparateur (virgule ou point-virgule) d'après la ligne d'en-tête. */
function detecterSeparateur(texte: string): string {
  const premiere = texte.replace(/^\uFEFF/, '').split('\n')[0] ?? '';
  const pv = (premiere.match(/;/g) || []).length;
  const vg = (premiere.match(/,/g) || []).length;
  return pv > vg ? ';' : ',';
}

/**
 * Analyse un CSV en lignes de champs. Gère les guillemets, les guillemets
 * échappés (`""`), et les retours à la ligne à l'intérieur d'un champ cité.
 */
export function parseCSV(texte: string): string[][] {
  const s = (texte ?? '').replace(/^\uFEFF/, '');
  const delim = detecterSeparateur(s);
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = '';
  let cite = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (cite) {
      if (c === '"') {
        if (s[i + 1] === '"') { champ += '"'; i++; } else cite = false;
      } else champ += c;
    } else if (c === '"') {
      cite = true;
    } else if (c === delim) {
      ligne.push(champ); champ = '';
    } else if (c === '\r') {
      // ignorer
    } else if (c === '\n') {
      ligne.push(champ); lignes.push(ligne); ligne = []; champ = '';
    } else {
      champ += c;
    }
  }
  if (champ !== '' || ligne.length > 0) { ligne.push(champ); lignes.push(ligne); }
  return lignes.filter((l) => l.some((x) => x.trim() !== ''));
}

/** Normalise une date de cellule vers `YYYY-MM-DD` (ISO ou JJ/MM/AAAA). */
export function normaliserDate(v: string): string {
  const s = (v ?? '').trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const fr = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (fr) return `${fr[3]}-${fr[2]}-${fr[1]}`;
  return '';
}

function typeDepuis(brut: string): string {
  const t = (brut || '').toLowerCase();
  if (/image|carrousel|photo/.test(t)) return 'image';
  if (/video|vidéo/.test(t)) return 'video';
  if (/article|communiqu/.test(t)) return 'article';
  return 'post';
}

/**
 * Convertit un CSV (déposé par la com, ex. export de l'agent d'extraction) en
 * entrées manuelles validées. Mappe les colonnes par nom (alias tolérants).
 */
export function csvVersEntrees(texte: string): ResultatParse {
  const entrees: EntreeManuelle[] = [];
  const erreurs: string[] = [];
  const lignes = parseCSV(texte);
  if (lignes.length < 2) {
    erreurs.push('CSV vide ou sans ligne de données.');
    return { entrees, erreurs };
  }
  const entete = lignes[0].map(normaliserCle);
  const col = (champ: string) => {
    for (const a of ALIAS[champ]) {
      const i = entete.indexOf(a);
      if (i >= 0) return i;
    }
    return -1;
  };
  const iPlat = col('plateforme'), iDate = col('date'), iTexte = col('texte');
  if (iPlat < 0 || iDate < 0 || iTexte < 0) {
    erreurs.push('Colonnes requises introuvables : plateforme, date (ou date_publication_estimee), texte (ou contenu).');
    return { entrees, erreurs };
  }
  const iType = col('type'), iUrl = col('url'), iHash = col('hashtags');
  const iLikes = col('likes'), iCom = col('comments'), iSh = col('shares'), iVues = col('vues');

  for (let r = 1; r < lignes.length; r++) {
    const L = lignes[r];
    const g = (i: number) => (i >= 0 ? (L[i] ?? '').trim() : '');
    const n = r + 1;
    const plateforme = g(iPlat).toLowerCase();
    const date = normaliserDate(g(iDate));
    let texte = g(iTexte);
    const hash = g(iHash);
    if (hash && !texte.includes(hash)) texte = `${texte} ${hash}`.trim();

    if (!PLATEFORMES_IMPORT.some((p) => p.valeur === plateforme)) {
      erreurs.push(`Ligne ${n} : plateforme « ${g(iPlat)} » inconnue.`);
      continue;
    }
    if (!dateValide(date)) {
      erreurs.push(`Ligne ${n} : date « ${g(iDate)} » invalide (attendu AAAA-MM-JJ, non future).`);
      continue;
    }
    if (!texte) {
      erreurs.push(`Ligne ${n} : texte/contenu vide.`);
      continue;
    }
    entrees.push({
      plateforme, date, type: typeDepuis(g(iType)), url: g(iUrl), texte,
      likes: nombreOuNull(g(iLikes)), comments: nombreOuNull(g(iCom)),
      shares: nombreOuNull(g(iSh)), vues: nombreOuNull(g(iVues)),
    });
  }
  return { entrees, erreurs };
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
