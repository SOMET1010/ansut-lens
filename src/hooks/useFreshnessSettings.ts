import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FreshnessStats {
  total: number;
  ingested_24h: number;
  published_24h: number;
  published_48h: number;
  published_7d: number;
  no_pub_date: number;
  recent_ingest_old_pub: number;
  oldest_recent: string | null;
  newest_recent: string | null;
}

export interface FreshnessSettings {
  default_window_hours: number;
  publication_tolerance_hours: number;
  max_articles: number;
  drop_without_pub_date: boolean;
}

const SETTING_KEYS = {
  default_window_hours: 'freshness_default_window_hours',
  publication_tolerance_hours: 'freshness_publication_tolerance_hours',
  max_articles: 'freshness_max_articles',
  drop_without_pub_date: 'freshness_drop_without_pub_date',
} as const;

export function useFreshnessStats() {
  return useQuery({
    queryKey: ['freshness-stats'],
    queryFn: async (): Promise<FreshnessStats> => {
      const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const since48h = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
      const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

      const [total, ingested, pub24, pub48, pub7d, noPub, oldRecent, recentArticles] = await Promise.all([
        supabase.from('actualites').select('*', { count: 'exact', head: true }),
        supabase.from('actualites').select('*', { count: 'exact', head: true }).gte('created_at', since24h),
        supabase.from('actualites').select('*', { count: 'exact', head: true }).gte('date_publication', since24h),
        supabase.from('actualites').select('*', { count: 'exact', head: true }).gte('date_publication', since48h),
        supabase.from('actualites').select('*', { count: 'exact', head: true }).gte('date_publication', since7d),
        supabase.from('actualites').select('*', { count: 'exact', head: true }).is('date_publication', null),
        supabase.from('actualites').select('*', { count: 'exact', head: true })
          .gte('created_at', since24h)
          .lt('date_publication', since7d),
        supabase.from('actualites').select('date_publication')
          .gte('created_at', since24h)
          .not('date_publication', 'is', null)
          .order('date_publication', { ascending: true })
          .limit(1000),
      ]);

      const dates = (recentArticles.data || []).map(a => a.date_publication).filter(Boolean) as string[];
      const sorted = dates.sort();

      return {
        total: total.count ?? 0,
        ingested_24h: ingested.count ?? 0,
        published_24h: pub24.count ?? 0,
        published_48h: pub48.count ?? 0,
        published_7d: pub7d.count ?? 0,
        no_pub_date: noPub.count ?? 0,
        recent_ingest_old_pub: oldRecent.count ?? 0,
        oldest_recent: sorted[0] ?? null,
        newest_recent: sorted[sorted.length - 1] ?? null,
      };
    },
    refetchInterval: 60000,
  });
}

export function useFreshnessSettings() {
  return useQuery({
    queryKey: ['freshness-settings'],
    queryFn: async (): Promise<FreshnessSettings> => {
      const { data, error } = await supabase
        .from('config_seuils')
        .select('cle, valeur')
        .in('cle', Object.values(SETTING_KEYS));
      if (error) throw error;

      const map = new Map((data || []).map(r => [r.cle, r.valeur]));
      const num = (k: string, def: number) => {
        const v = map.get(k);
        return typeof v === 'number' ? v : def;
      };
      const bool = (k: string, def: boolean) => {
        const v = map.get(k);
        return typeof v === 'boolean' ? v : def;
      };

      return {
        default_window_hours: num(SETTING_KEYS.default_window_hours, 24),
        publication_tolerance_hours: num(SETTING_KEYS.publication_tolerance_hours, 24),
        max_articles: num(SETTING_KEYS.max_articles, 20),
        drop_without_pub_date: bool(SETTING_KEYS.drop_without_pub_date, false),
      };
    },
  });
}

export function useUpdateFreshnessSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: FreshnessSettings) => {
      const updates = [
        { cle: SETTING_KEYS.default_window_hours, valeur: settings.default_window_hours },
        { cle: SETTING_KEYS.publication_tolerance_hours, valeur: settings.publication_tolerance_hours },
        { cle: SETTING_KEYS.max_articles, valeur: settings.max_articles },
        { cle: SETTING_KEYS.drop_without_pub_date, valeur: settings.drop_without_pub_date },
      ];

      for (const u of updates) {
        const { error } = await supabase
          .from('config_seuils')
          .upsert({ cle: u.cle, valeur: u.valeur as any, updated_at: new Date().toISOString() }, { onConflict: 'cle' });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['freshness-settings'] });
      toast.success('Paramètres de fraîcheur enregistrés');
    },
    onError: (e: Error) => toast.error(`Erreur : ${e.message}`),
  });
}
