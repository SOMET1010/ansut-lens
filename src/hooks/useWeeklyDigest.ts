import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface WeeklyDigestConfig {
  id: string;
  actif: boolean;
  jour_envoi: number;
  heure_envoi: string;
  nb_top_stories: number;
  sentiment_alert_threshold: number;
  include_sentiment_chart: boolean;
  include_top_sources: boolean;
  recipients: string[];
  derniere_execution: string | null;
  created_at: string;
  updated_at: string;
}

export function useWeeklyDigestConfig() {
  return useQuery({
    queryKey: ['weekly-digest-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weekly_digest_config' as any)
        .select('*')
        .limit(1)
        .single();
      if (error) throw error;
      return data as unknown as WeeklyDigestConfig;
    },
  });
}

export function useUpdateWeeklyDigest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Partial<Omit<WeeklyDigestConfig, 'id' | 'created_at' | 'updated_at'>>) => {
      const { data: current, error: fetchErr } = await supabase
        .from('weekly_digest_config' as any)
        .select('id')
        .limit(1)
        .single();
      if (fetchErr) throw fetchErr;
      const { data, error } = await supabase
        .from('weekly_digest_config' as any)
        .update(updates)
        .eq('id', (current as any).id)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as WeeklyDigestConfig;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weekly-digest-config'] });
      toast.success('Configuration du digest sauvegardée');
    },
    onError: (e: Error) => toast.error(`Erreur: ${e.message}`),
  });
}

export function useSendWeeklyDigest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('weekly-digest', {
        body: {},
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      qc.invalidateQueries({ queryKey: ['weekly-digest-config'] });
      toast.success(`Digest envoyé à ${data.sent} destinataire(s)`);
    },
    onError: (e: Error) => toast.error(`Erreur: ${e.message}`),
  });
}
