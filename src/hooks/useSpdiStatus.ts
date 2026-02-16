import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useSpdiStatus() {
  const queryClient = useQueryClient();

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ['spdi-batch-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collectes_log')
        .select('*')
        .eq('type', 'calcul-spdi')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const { data: acteurs, isLoading: acteursLoading } = useQuery({
    queryKey: ['spdi-acteurs-suivis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personnalites')
        .select('id, nom, prenom, score_spdi_actuel, derniere_mesure_spdi, tendance_spdi')
        .eq('suivi_spdi_actif', true)
        .order('score_spdi_actuel', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const runBatch = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('calculer-spdi', {
        body: { batch: true },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Calcul SPDI batch lancé avec succès');
      queryClient.invalidateQueries({ queryKey: ['spdi-batch-logs'] });
      queryClient.invalidateQueries({ queryKey: ['spdi-acteurs-suivis'] });
    },
    onError: (err: Error) => {
      toast.error(`Erreur: ${err.message}`);
    },
  });

  const lastLog = logs?.[0] ?? null;

  const avgDuration = (() => {
    if (!logs || logs.length === 0) return null;
    const recent = logs.slice(0, 10).filter((l) => l.duree_ms != null);
    if (recent.length === 0) return null;
    return Math.round(recent.reduce((sum, l) => sum + (l.duree_ms ?? 0), 0) / recent.length);
  })();

  return {
    logs,
    acteurs,
    lastLog,
    avgDuration,
    isLoading: logsLoading || acteursLoading,
    runBatch,
  };
}
