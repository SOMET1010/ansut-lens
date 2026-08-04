/**
 * Fondation crédibilité — modèle de PREUVE partagé.
 *
 * Source unique de vérité pour « qu'est-ce qu'une preuve ? » dans toute
 * l'application. Une preuve est un DOCUMENT vérifiable : une publication ANSUT
 * ou une reprise presse, attribuable (source nommée), pointant vers un article
 * stable (jamais une page d'accueil), et dédupliquée. Une organisation citée
 * (Orange, MTN…) n'est PAS une preuve : elle est renvoyée à part.
 *
 * Chaque écran reconstruit (La Matinale, Veille, Notre communication…) construit
 * ses preuves via ce module — jamais en réinventant les règles localement.
 */

import type { Actualite } from '@/types';
import type { PublicationAnsut } from '@/hooks/useAnsutPublications';
import { nettoyerTitre, nettoyerExtrait } from '@/lib/nettoyerExtrait';
import { dedupParUrl, estPageArticle } from '@/lib/dedup';

/** Une preuve cliquable : un document, sa source, sa date. */
export interface Preuve {
  id: string;
  /** Origine affichée (« LinkedIn », « Fratmat », « Site »…). */
  source: string;
  /** Nature du document (les entités citées ne sont pas des preuves). */
  type: 'ansut' | 'presse';
  titre: string;
  url: string | null;
  dateMs: number | null;
}

/** Documents probants d'un ensemble de contenus, plus les organisations citées. */
export interface Documents {
  documents: Preuve[];
  organisations: string[];
  /** Reprises (mêmes URL/titre) écartées à la déduplication — exposé en clair. */
  nbReprises: number;
}

/** Libellé lisible d'une plateforme de publication ANSUT. */
export function libellePlateforme(p: string | null | undefined): string {
  const cle = (p ?? '').toLowerCase();
  const table: Record<string, string> = {
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    x: 'X',
    twitter: 'X',
    youtube: 'YouTube',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    website: 'Site',
    web: 'Site',
    site: 'Site',
  };
  if (table[cle]) return table[cle];
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Source';
}

/** Horodatage d'une publication ANSUT : date de publication, sinon de collecte. */
export function dateMsPublicationAnsut(p: PublicationAnsut): number | null {
  const brut = p.date_publication ?? p.collecte_le;
  if (!brut) return null;
  const t = new Date(brut).getTime();
  return Number.isNaN(t) ? null : t;
}

function preuveDepuisPublication(p: PublicationAnsut): Preuve {
  return {
    id: p.id,
    source: libellePlateforme(p.plateforme),
    type: 'ansut',
    titre: (nettoyerExtrait(p.contenu ?? '') || 'Publication ANSUT').slice(0, 120),
    url: p.url_original ?? null,
    dateMs: dateMsPublicationAnsut(p),
  };
}

function preuveDepuisArticle(a: Actualite): Preuve {
  return {
    id: a.id,
    source: a.source_nom ?? 'Source',
    type: 'presse',
    titre: nettoyerTitre(a.titre),
    url: a.source_url ?? null,
    dateMs: a.date_publication ? new Date(a.date_publication).getTime() : null,
  };
}

/**
 * Construit les documents probants (Charte de crédibilité) :
 *  - publications ANSUT : voix propre, conservée telle quelle ;
 *  - reprises presse : ATTRIBUABLES (source nommée) et pointant vers un article
 *    stable (pages d'accueil rejetées), puis DÉDUPLIQUÉES par URL/titre ;
 *  - organisations : listées à part, jamais comptées comme preuves.
 */
export function documentsProbants(opts: {
  publications: PublicationAnsut[];
  articles: Actualite[];
  organisations?: string[];
}): Documents {
  const ansut = opts.publications.map(preuveDepuisPublication);

  const attribuables = opts.articles.filter(
    (a) => !!a.source_nom && (a.source_url ? estPageArticle(a.source_url) : true),
  );
  const { uniques, nbReprises } = dedupParUrl(
    attribuables,
    (a) => a.source_url,
    (a) => nettoyerTitre(a.titre),
  );
  const presse = uniques.map(preuveDepuisArticle);

  return {
    documents: [...ansut, ...presse],
    organisations: (opts.organisations ?? []).slice(),
    nbReprises,
  };
}
