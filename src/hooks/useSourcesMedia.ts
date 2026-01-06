import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SourceMedia {
  id: string;
  nom: string;
  type: string;
  url: string | null;
  actif: boolean | null;
  frequence_scan: string | null;
  derniere_collecte: string | null;
  created_at: string;
}

export type SourceMediaInsert = Omit<SourceMedia, 'id' | 'created_at' | 'derniere_collecte'>;
export type SourceMediaUpdate = Partial<SourceMediaInsert> & { id: string };

export function useSourcesMedia() {
  return useQuery({
    queryKey: ['sources-media'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sources_media')
        .select('*')
        .order('nom', { ascending: true });

      if (error) throw error;
      return data as SourceMedia[];
    },
  });
}

export function useCreateSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (source: SourceMediaInsert) => {
      const { data, error } = await supabase
        .from('sources_media')
        .insert(source)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources-media'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Source créée', { description: 'La source a été ajoutée avec succès.' });
    },
    onError: (error) => {
      toast.error('Erreur', { description: `Impossible de créer la source: ${error.message}` });
    },
  });
}

export function useUpdateSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SourceMediaUpdate) => {
      const { data, error } = await supabase
        .from('sources_media')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources-media'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Source mise à jour', { description: 'Les modifications ont été enregistrées.' });
    },
    onError: (error) => {
      toast.error('Erreur', { description: `Impossible de mettre à jour la source: ${error.message}` });
    },
  });
}

export function useDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('sources_media')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sources-media'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      toast.success('Source supprimée', { description: 'La source a été supprimée avec succès.' });
    },
    onError: (error) => {
      toast.error('Erreur', { description: `Impossible de supprimer la source: ${error.message}` });
    },
  });
}
