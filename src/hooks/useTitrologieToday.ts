import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TitrologieUneRow {
  journal: string;
  titre_une: string;
  resume?: string;
  sujet: string | null;
  ton: string | null;
  risque_ansut: string;
  lien_ansut: string | null;
  themes: string[] | null;
  source_url: string | null;
  image_url: string | null;
  analyse_ia: any;
}

/**
 * Live feed of today's titrologie unes.
 * - Polls every 15s while a collection is running.
 * - Subscribes to realtime inserts so new unes appear immediately.
 */
export function useTitrologieToday(enabled = true) {
  const qc = useQueryClient();
  const today = new Date().toISOString().slice(0, 10);

  const query = useQuery({
    queryKey: ['titrologie_today', today],
    enabled,
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('titrologie_unes')
        .select('journal,titre_une,sujet,ton,risque_ansut,lien_ansut,themes,source_url,image_url,analyse_ia,collected_at')
        .eq('date_parution', today)
        .order('collected_at', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as (TitrologieUneRow & { collected_at: string })[];
    },
  });

  useEffect(() => {
    if (!enabled) return;
    const channel = supabase
      .channel('titrologie_today_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'titrologie_unes', filter: `date_parution=eq.${today}` },
        () => {
          qc.invalidateQueries({ queryKey: ['titrologie_today', today] });
          qc.invalidateQueries({ queryKey: ['titrologie_runs'] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, today, qc]);

  return query;
}
