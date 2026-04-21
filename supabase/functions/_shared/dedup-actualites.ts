/**
 * Mode "Fusionner intelligemment"
 *
 * Détecte les doublons d'actualités entre matinale, briefing DG et assistant IA,
 * puis consolide les faits en gardant une seule référence par source.
 *
 * Signaux de duplication:
 *   1. Même URL canonique (host + path, sans query/fragment)
 *   2. Similarité de titre Jaccard > 0.6 sur tokens normalisés (>= 4 chars)
 *   3. Au moins 2 entités communes (personnes ou entreprises) ET sim titre > 0.35
 */

export interface ActuLike {
  id?: string;
  titre: string;
  resume?: string | null;
  source_nom?: string | null;
  source_url?: string | null;
  importance?: number | null;
  sentiment?: number | null;
  date_publication?: string | null;
  impact_ansut?: string | null;
  entites_personnes?: string[] | null;
  entites_entreprises?: string[] | null;
  // Origine pour distinguer matinale/briefing/assistant si besoin
  origin?: 'db' | 'perplexity' | 'mention' | 'social' | string;
  [k: string]: unknown;
}

export interface ConsolidatedFact<T extends ActuLike = ActuLike> {
  /** Article principal (le plus riche / le plus important) */
  primary: T;
  /** Tous les articles fusionnés dans ce groupe (incluant primary) */
  members: T[];
  /** Références consolidées : une seule par source canonique */
  sources: Array<{
    source_nom: string;
    source_url: string | null;
    origin?: string;
  }>;
  /** Référence stable utilisable comme [N] dans le prompt */
  ref: number;
}

const STOP_WORDS = new Set([
  'le','la','les','un','une','des','de','du','et','en','au','aux','pour','par',
  'sur','dans','avec','sans','est','sont','a','ont','ce','cette','ces','son',
  'sa','ses','the','and','of','to','in','on','for','with','from','as','at','an',
]);

function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // diacritics
    .replace(/[^a-z0-9\s]/g, ' ')      // punct
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(s: string): Set<string> {
  return new Set(
    normalizeTitle(s)
      .split(' ')
      .filter(t => t.length >= 4 && !STOP_WORDS.has(t))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function canonicalUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, '').toLowerCase();
    const path = u.pathname.replace(/\/+$/, '');
    return `${host}${path}`;
  } catch {
    return null;
  }
}

function richnessScore(a: ActuLike): number {
  let s = (a.importance ?? 0);
  if (a.resume) s += 5;
  if (a.impact_ansut) s += 8;
  if (a.source_url) s += 3;
  if (a.entites_personnes?.length) s += a.entites_personnes.length;
  if (a.entites_entreprises?.length) s += a.entites_entreprises.length;
  return s;
}

function commonEntities(a: ActuLike, b: ActuLike): number {
  const ea = new Set([...(a.entites_personnes ?? []), ...(a.entites_entreprises ?? [])].map(x => x.toLowerCase()));
  const eb = new Set([...(b.entites_personnes ?? []), ...(b.entites_entreprises ?? [])].map(x => x.toLowerCase()));
  let n = 0;
  for (const e of ea) if (eb.has(e)) n++;
  return n;
}

/**
 * Regroupe les actualités similaires et renvoie une liste consolidée.
 * Aucune perte d'info : `members` contient tout, `primary` est l'article retenu.
 */
export function consolidateActualites<T extends ActuLike>(
  items: T[],
): ConsolidatedFact<T>[] {
  const groups: ConsolidatedFact<T>[] = [];
  const tokenCache = new Map<T, Set<string>>();
  const urlCache = new Map<T, string | null>();

  for (const item of items) {
    const tokens = tokenize(`${item.titre} ${item.resume ?? ''}`);
    const url = canonicalUrl(item.source_url);
    tokenCache.set(item, tokens);
    urlCache.set(item, url);

    let matchedGroup: ConsolidatedFact<T> | null = null;

    for (const g of groups) {
      const ref = g.primary;
      const refTokens = tokenCache.get(ref)!;
      const refUrl = urlCache.get(ref)!;

      // Rule 1: same canonical URL
      if (url && refUrl && url === refUrl) {
        matchedGroup = g;
        break;
      }
      // Rule 2: title similarity > 0.6
      const sim = jaccard(tokens, refTokens);
      if (sim > 0.6) {
        matchedGroup = g;
        break;
      }
      // Rule 3: shared entities + moderate title sim
      if (sim > 0.35 && commonEntities(item, ref) >= 2) {
        matchedGroup = g;
        break;
      }
    }

    if (matchedGroup) {
      matchedGroup.members.push(item);
      // promote new primary if richer
      if (richnessScore(item) > richnessScore(matchedGroup.primary)) {
        matchedGroup.primary = item;
      }
      // add source if new canonical URL
      const srcKey = url ?? `${item.source_nom ?? 'unknown'}::${item.titre}`;
      if (!matchedGroup.sources.some(s => (canonicalUrl(s.source_url) ?? `${s.source_nom}::`) === srcKey)) {
        matchedGroup.sources.push({
          source_nom: item.source_nom ?? 'Source inconnue',
          source_url: item.source_url ?? null,
          origin: item.origin,
        });
      }
    } else {
      groups.push({
        primary: item,
        members: [item],
        sources: [{
          source_nom: item.source_nom ?? 'Source inconnue',
          source_url: item.source_url ?? null,
          origin: item.origin,
        }],
        ref: groups.length + 1,
      });
    }
  }

  // Re-number refs after final ordering (highest richness first)
  groups.sort((a, b) => richnessScore(b.primary) - richnessScore(a.primary));
  groups.forEach((g, i) => { g.ref = i + 1; });

  return groups;
}

/**
 * Rend un bloc texte consolidé prêt à injecter dans un prompt IA.
 * Chaque groupe a une seule référence [N] avec toutes ses sources listées.
 */
export function formatConsolidatedForPrompt<T extends ActuLike>(
  groups: ConsolidatedFact<T>[],
): string {
  return groups.map(g => {
    const p = g.primary;
    const sourcesStr = g.sources
      .map(s => s.source_url ? `${s.source_nom} (${s.source_url})` : s.source_nom)
      .join(' ; ');
    const dupCount = g.members.length > 1 ? ` [fusionné ×${g.members.length}]` : '';
    return `[${g.ref}] ${p.titre}${dupCount}` +
      (p.resume ? ` — ${p.resume.substring(0, 200)}` : '') +
      ` (importance: ${p.importance ?? 50}/100, sentiment: ${p.sentiment ?? 'N/A'}` +
      (p.impact_ansut ? `, impact ANSUT: ${p.impact_ansut}` : '') +
      `, sources: ${sourcesStr})`;
  }).join('\n');
}

/**
 * Liste plate des sources uniques pour validation post-génération
 * (utilisée par la validation citations du briefing).
 */
export function buildSourcesMap<T extends ActuLike>(
  groups: ConsolidatedFact<T>[],
): Array<{ index: number; titre: string; source_nom: string; source_url: string | null }> {
  return groups.map(g => ({
    index: g.ref,
    titre: g.primary.titre,
    source_nom: g.sources[0]?.source_nom ?? 'Source inconnue',
    source_url: g.sources[0]?.source_url ?? null,
  }));
}
