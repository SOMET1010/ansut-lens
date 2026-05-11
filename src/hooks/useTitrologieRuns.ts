import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TitrologieRunSourceStat {
  source: string;
  url: string;
  nombre_images_detectees: number;
  nombre_images_traitees: number;
  nombre_erreurs_ocr: number;
  dernier_scan: string;
  statut: 'success' | 'partial' | 'error';
  error?: string | null;
}

export interface TitrologieRun {
  id: string;
  run_date: string;
  status: string;
  unes_collected: number;
  unes_analyzed: number;
  duration_ms: number | null;
  error: string | null;
  started_at: string;
  finished_at: string | null;
  metadata: { sources?: TitrologieRunSourceStat[] } | null;
}

export function useTitrologieRuns(limit = 20) {
  return useQuery({
    queryKey: ['titrologie_runs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('titrologie_runs' as any)
        .select('*')
        .order('started_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data || []) as unknown as TitrologieRun[];
    },
    refetchInterval: 30_000,
  });
}
