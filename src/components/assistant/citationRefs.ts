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
