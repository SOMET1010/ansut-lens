import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DiffusionProgrammation {
  id: string;
  canal: string;
  actif: boolean;
  frequence: string;
  heure_envoi: string;
  jours_envoi: number[] | null;
  destinataires: any[];
  contenu_type: string;
  dernier_envoi: string | null;
  prochain_envoi: string | null;
  created_at: string;
  updated_at: string;
}

export interface DiffusionLog {
  id: string;
  canal: string;
  contenu_type: string;
  message: string | null;
  destinataires_count: number;
  succes_count: number;
  echec_count: number;
  details: any;
  created_at: string;
}

export function useDiffusionProgrammations() {
  return useQuery({
    queryKey: ['diffusion-programmation'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diffusion_programmation')
        .select('*')
        .order('canal');
      if (error) throw error;
      return data as unknown as DiffusionProgrammation[];
    },
  });
}

export function useDiffusionLogs(limit = 20) {
  return useQuery({
    queryKey: ['diffusion-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diffusion_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data as unknown as DiffusionLog[];
    },
  });
}

export function useUpdateDiffusionConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<DiffusionProgrammation> }) => {
      const { error } = await supabase
        .from('diffusion_programmation')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['diffusion-programmation'] });
      toast.success('Configuration mise à jour');
    },
    onError: (err: Error) => {
      toast.error(`Erreur: ${err.message}`);
    },
  });
}

export function useDiffuserResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ canal, message }: { canal: string; message?: string }) => {
      const { data, error } = await supabase.functions.invoke('diffuser-resume', {
        body: { canal, contenu_type: 'briefing', message },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['diffusion-logs'] });
      queryClient.invalidateQueries({ queryKey: ['diffusion-programmation'] });
      toast.success(`Envoi terminé : ${data.stats?.envoyes || 0} succès, ${data.stats?.echecs || 0} échecs`);
    },
    onError: (err: Error) => {
      toast.error(`Erreur d'envoi: ${err.message}`);
    },
  });
}
