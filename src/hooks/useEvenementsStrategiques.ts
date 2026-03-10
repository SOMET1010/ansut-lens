import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EvenementStrategique {
  id: string;
  nom: string;
  description: string | null;
  lieu: string | null;
  date_debut: string;
  date_fin: string;
  mots_cles: string[];
  boost_actif: boolean;
  frequence_boost: string;
  categorie: string;
  importance: number;
  created_at: string;
  updated_at: string;
}

export function useEvenementsStrategiques() {
  return useQuery({
    queryKey: ['evenements-strategiques'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evenements_strategiques')
        .select('*')
        .order('date_debut', { ascending: true });
      if (error) throw error;
      return data as EvenementStrategique[];
    },
  });
}

export function useActiveBoostEvents() {
  return useQuery({
    queryKey: ['evenements-boost-actifs'],
    queryFn: async () => {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('evenements_strategiques')
        .select('*')
        .eq('boost_actif', true)
        .lte('date_debut', today)
        .gte('date_fin', today);
      if (error) throw error;
      return data as EvenementStrategique[];
    },
    refetchInterval: 60000,
  });
}

export function useCreateEvenement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (evt: Omit<EvenementStrategique, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('evenements_strategiques')
        .insert(evt)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evenements-strategiques'] });
      toast.success('Événement créé');
    },
    onError: (e) => toast.error('Erreur', { description: e.message }),
  });
}

export function useUpdateEvenement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<EvenementStrategique> & { id: string }) => {
      const { error } = await supabase
        .from('evenements_strategiques')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evenements-strategiques'] });
      toast.success('Événement mis à jour');
    },
    onError: (e) => toast.error('Erreur', { description: e.message }),
  });
}

export function useDeleteEvenement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('evenements_strategiques')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['evenements-strategiques'] });
      toast.success('Événement supprimé');
    },
    onError: (e) => toast.error('Erreur', { description: e.message }),
  });
}
