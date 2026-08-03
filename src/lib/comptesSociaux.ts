/**
 * Analyse d'URL de compte réseau social → paramètres RADAR.
 *
 * Problème résolu : la Communication sait copier l'URL d'un compte depuis son
 * navigateur, mais pas fournir les « paramètres » techniques que RADAR stocke
 * (`plateforme`, `identifiant`, `url_profil`). Cette fonction est DÉTERMINISTE :
 * elle traduit une URL collée en paramètres exploitables, sans réseau ni
 * devinette. La vérification « en ligne » (nom affiché réel) est faite à part
 * par l'edge function `resoudre-compte-social`.
 */

export type PlateformeSociale =
  | 'facebook' | 'linkedin' | 'x' | 'youtube'
  | 'instagram' | 'tiktok' | 'telegram' | 'website';

export const LIBELLE_PLATEFORME: Record<PlateformeSociale, string> = {
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  x: 'X (Twitter)',
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  telegram: 'Telegram',
  website: 'Site web',
};

export interface CompteAnalyse {
  /** L'URL a-t-elle pu être interprétée en un compte exploitable ? */
  valide: boolean;
  plateforme: PlateformeSociale;
  /** Handle / slug du compte (sans « @ »). */
  identifiant: string;
  /** URL de profil canonique (celle que la collecte utilisera). */
  urlProfil: string;
  /** Explication quand l'analyse est incertaine ou invalide. */
  raison?: string;
}

/** Nettoie un segment de chemin : enlève « @ », espaces, slash final. */
function segment(s: string | undefined): string {
  return (s ?? '').replace(/^@/, '').trim();
}

function hoteSansWww(host: string): string {
  return host.toLowerCase().replace(/^www\./, '');
}

/**
 * Interprète une URL de profil. Renvoie toujours un résultat (jamais d'exception) :
 * `valide = false` avec une `raison` si l'URL n'est pas exploitable.
 */
export function analyserUrlCompte(entree: string): CompteAnalyse {
  const brut = (entree ?? '').trim();
  if (!brut) return invalide('website', 'Aucune URL fournie.');

  // Tolère une saisie sans schéma (« facebook.com/ANSUT »).
  const avecSchema = /^https?:\/\//i.test(brut) ? brut : `https://${brut}`;

  let u: URL;
  try {
    u = new URL(avecSchema);
  } catch {
    return invalide('website', 'URL non reconnue — copiez l’adresse complète du profil.');
  }

  const host = hoteSansWww(u.hostname);
  const segs = u.pathname.split('/').filter(Boolean);

  // Facebook
  if (host.endsWith('facebook.com') || host === 'fb.com' || host === 'm.facebook.com') {
    if (segs[0] === 'profile.php') {
      const id = u.searchParams.get('id') ?? '';
      if (!id) return invalide('facebook', 'Profil Facebook sans identifiant lisible.');
      return ok('facebook', id, `https://www.facebook.com/profile.php?id=${id}`);
    }
    const id = segment(segs[0]);
    if (!id) return invalide('facebook', 'URL Facebook sans nom de page.');
    return ok('facebook', id, `https://www.facebook.com/${id}`);
  }

  // LinkedIn (company / school / showcase / in)
  if (host.endsWith('linkedin.com')) {
    const type = segs[0];
    const slug = segment(segs[1]);
    if (['company', 'school', 'showcase', 'in'].includes(type) && slug) {
      return ok('linkedin', slug, `https://www.linkedin.com/${type}/${slug}`);
    }
    return invalide('linkedin', 'Utilisez l’URL de la page (…/company/… ou …/in/…).');
  }

  // X / Twitter
  if (host === 'x.com' || host.endsWith('twitter.com')) {
    const id = segment(segs[0]);
    if (!id || ['i', 'home', 'search'].includes(id)) {
      return invalide('x', 'URL X sans nom de compte.');
    }
    return ok('x', id, `https://x.com/${id}`);
  }

  // YouTube
  if (host.endsWith('youtube.com')) {
    const first = segs[0] ?? '';
    if (first.startsWith('@')) {
      const id = segment(first);
      return ok('youtube', id, `https://www.youtube.com/@${id}`);
    }
    if (['channel', 'c', 'user'].includes(first) && segs[1]) {
      const id = segment(segs[1]);
      return ok('youtube', id, `https://www.youtube.com/${first}/${id}`);
    }
    return invalide('youtube', 'Utilisez l’URL de la chaîne (…/@handle ou …/channel/…).');
  }

  // Instagram
  if (host.endsWith('instagram.com')) {
    const id = segment(segs[0]);
    if (!id) return invalide('instagram', 'URL Instagram sans nom de compte.');
    return ok('instagram', id, `https://www.instagram.com/${id}`);
  }

  // TikTok
  if (host.endsWith('tiktok.com')) {
    const id = segment(segs[0]);
    if (!id) return invalide('tiktok', 'URL TikTok sans nom de compte (…/@handle).');
    return ok('tiktok', id, `https://www.tiktok.com/@${id}`);
  }

  // Telegram
  if (host === 't.me' || host.endsWith('telegram.me') || host.endsWith('telegram.org')) {
    const id = segment(segs[0]);
    if (!id) return invalide('telegram', 'URL Telegram sans nom de canal.');
    return ok('telegram', id, `https://t.me/${id}`);
  }

  // Site web générique — reste exploitable comme source.
  return {
    valide: true,
    plateforme: 'website',
    identifiant: host,
    urlProfil: `${u.protocol}//${host}${u.pathname === '/' ? '' : u.pathname}`.replace(/\/$/, ''),
    raison: 'Réseau non reconnu — traité comme un site web.',
  };
}

function ok(plateforme: PlateformeSociale, identifiant: string, urlProfil: string): CompteAnalyse {
  return { valide: true, plateforme, identifiant, urlProfil };
}
function invalide(plateforme: PlateformeSociale, raison: string): CompteAnalyse {
  return { valide: false, plateforme, identifiant: '', urlProfil: '', raison };
}

/** Nettoie un titre de page scrappé pour en extraire un nom d'affichage propre. */
export function nettoyerNomAffiche(titre: string | null | undefined): string {
  const t = (titre ?? '').trim();
  if (!t) return '';
  // Retire les suffixes de plateforme usuels.
  return t
    .replace(/\s*[|\-–—]\s*(Facebook|LinkedIn|X|Twitter|YouTube|Instagram|TikTok|Telegram).*$/i, '')
    .replace(/\s*\(@[^)]+\)\s*(•|·|\|).*$/i, '')
    .replace(/\s*•\s*Instagram.*$/i, '')
    .trim();
}
