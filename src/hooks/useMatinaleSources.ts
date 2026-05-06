import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { MatinaleData, MatinaleSectionKey } from '@/types/matinale';

function norm(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function tokens(s: string): string[] {
  return norm(s)
    .split(/[^a-z0-9]+/g)
    .filter((w) => w.length > 4);
}

function uniq(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

/**
 * Extracts the keyword pool used to look up real source articles
 * (table `actualites`) per Matinale section. Mirrors the mapping
 * applied in MatinaleSections drill-down payloads.
 */
export function extractSectionKeywords(
  data: MatinaleData,
  section: MatinaleSectionKey,
): string[] {
  switch (section) {
    case 'priorite_executive': {
      const p = data.priorite_executive;
      if (!p) return [];
      return uniq([...tokens(p.titre || ''), ...(p.impacts || []).flatMap(tokens)]);
    }
    case 'synthese_60s':
      return uniq((data.synthese_60s || []).flatMap((s) => tokens(s.sujet || '')));
    case 'veille_par_pilier':
      return uniq(
        Object.values(data.veille_par_pilier || {})
          .flat()
          .flatMap((it: any) => tokens(it?.titre || '')),
      );
    case 'lecture_strategique':
      return uniq((data.lecture_strategique || []).flatMap((s) => tokens(s.sujet || '')));
    case 'impact_projets_ansut':
      return uniq((data.impact_projets_ansut || []).flatMap((p) => tokens(p.domaine || '')));
    case 'actions_immediates':
      return uniq((data.actions_immediates || []).flatMap((a) => tokens(a.action || '')));
    case 'reputation_ansut':
      return ['ansut', 'service universel'];
    case 'signaux_faibles':
      return uniq((data.signaux_faibles || []).flatMap(tokens));
    case 'revue_de_presse':
      return uniq((data.revue_de_presse || []).flatMap((r) => tokens(r.titre || '')));
    case 'activite_ansut':
      return ['ansut'];
    default:
      return [];
  }
}

/**
 * Returns the real number of `actualites` rows in Supabase that match
 * any of the given keywords within the freshness window. Used as a
 * "live evidence" badge next to each Matinale section.
 */
export function useMatinaleSectionSourceCount(
  keywords: string[],
  freshnessHours: number,
  enabled: boolean,
) {
  const kw = keywords.slice(0, 8); // cap to keep the OR clause small
  return useQuery({
    queryKey: ['matinale-section-sources', freshnessHours, kw],
    enabled: enabled && kw.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - freshnessHours * 3600_000).toISOString();
      const orClause = kw
        .map((k) => `titre.ilike.%${k}%,resume.ilike.%${k}%`)
        .join(',');
      const { count, error } = await supabase
        .from('actualites')
        .select('id', { head: true, count: 'exact' })
        .gte('date_publication', since)
        .or(orClause);
      if (error) throw error;
      return count ?? 0;
    },
  });
}
