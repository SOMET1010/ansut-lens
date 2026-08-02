/**
 * Extracts numeric reference URLs from a document body.
 *
 * Handles a wide variety of citation formats so that every `[n]` token in the
 * body can be associated with its source URL during PDF/DOCX export and in the
 * citations preview.
 *
 * Supported formats (case-insensitive, anywhere in the line):
 *   [1] https://...
 *   [1]: https://...
 *   [1] — https://...
 *   1. https://...
 *   1) https://...
 *   Réf 1: https://...           / Ref. 1 — https://...
 *   Référence 1 https://...
 *   Source 1 : https://...
 *   Voir [1] https://...
 *   Cf. [1] https://...
 *   - [1] Titre — https://...
 *   [1] Titre de l'article. https://...   (URL n'importe où après le numéro)
 *
 * Heuristic: once a `[n]` (or `n.` / `n)` / `Réf n`) marker is found at a
 * sensible anchor position, we look for the **first** http(s) URL on the same
 * line and bind it to that number. The first URL found for a given number wins.
 */
export function extractNumericReferenceUrls(content: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!content) return map;

  const urlRe = /https?:\/\/\S+/i;
  // Anchored markers: line start (optionally with bullet/quote) OR after a
  // citation cue word like "voir", "cf", "source", "réf", "référence".
  const anchorRe =
    /(?:^|[\s>(\-*•])(?:(?:voir|cf\.?|source|sources?|r[ée]f(?:[ée]rences?)?\.?|n[°o]\.?)\s*)?(?:\[(\d{1,3})\]|\(?\b(\d{1,3})\)?[.):\-—–])(?=\s|$)/gi;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    let m: RegExpExecArray | null;
    anchorRe.lastIndex = 0;
    while ((m = anchorRe.exec(line)) !== null) {
      const num = m[1] || m[2];
      if (!num || map[num]) continue;
      // Look for a URL on the rest of the line after the marker
      const rest = line.slice(m.index + m[0].length);
      const u = rest.match(urlRe);
      if (u) {
        map[num] = u[0].replace(/[.,;)\]]+$/, '');
      }
    }

    // Fallback: line containing exactly one URL and a single [n] anywhere
    // (catches "Titre [1] https://...")
    const bracketed = line.match(/\[(\d{1,3})\]/g);
    if (bracketed && bracketed.length === 1) {
      const n = bracketed[0].slice(1, -1);
      if (!map[n]) {
        const u = line.match(urlRe);
        if (u) map[n] = u[0].replace(/[.,;)\]]+$/, '');
      }
    }
  }

  return map;
}

export type CitationRef =
  | { kind: 'actu' | 'dossier'; id: string; label: string; url: string }
  | { kind: 'num'; num: string; label: string; url: string | null };

const APP_BASE = 'https://ansut-lens.lovable.app';

/**
 * Returns the unique set of citation badges referenced in the document body,
 * with their resolved URL (or `null` for numeric refs without an associated
 * source URL). Used by the export pipeline to render a "Liens manquants"
 * section and by the in-app preview.
 */
export function collectCitations(content: string): CitationRef[] {
  if (!content) return [];
  const numUrls = extractNumericReferenceUrls(content);
  const out: CitationRef[] = [];
  const seen = new Set<string>();
  const re = /(\[\[(ACTU|DOSSIER):([^|\]]+)\|([^\]]+)\]\])|(\[(\d{1,3})\])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m[1]) {
      const isActu = m[2] === 'ACTU';
      const id = m[3];
      const label = m[4];
      const key = `${m[2]}:${id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        kind: isActu ? 'actu' : 'dossier',
        id,
        label,
        url: isActu
          ? `${APP_BASE}/veille?article=${encodeURIComponent(id)}`
          : `${APP_BASE}/publier?id=${encodeURIComponent(id)}`,
      });
    } else if (m[5]) {
      const num = m[6];
      const key = `NUM:${num}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // Try to recover a label for [n]: snippet after the numeric anchor in the
      // references section, e.g. "[1] Titre de la source — https://..."
      let label = `Référence ${num}`;
      const labelRe = new RegExp(
        `(?:^|\\n)\\s*\\[${num}\\]:?\\s*([^\\n]+)`,
        'i',
      );
      const lm = content.match(labelRe);
      if (lm && lm[1]) {
        label = lm[1].replace(/https?:\/\/\S+/gi, '').replace(/[—\-–:]+\s*$/, '').trim() || label;
        if (label.length > 90) label = label.slice(0, 89) + '…';
      }
      out.push({ kind: 'num', num, label, url: numUrls[num] || null });
    }
  }
  return out;
}

