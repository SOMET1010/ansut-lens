import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type DossierCategorie = 'sut' | 'ia' | 'acteurs' | 'general';
export type DossierStatut = 'brouillon' | 'publie' | 'archive';

export interface Dossier {
  id: string;
  titre: string;
  resume: string | null;
  contenu: string | null;
  categorie: DossierCategorie;
  statut: DossierStatut;
  auteur_id: string | null;
  created_at: string;
  updated_at: string;
}

export const CATEGORIE_LABELS: Record<DossierCategorie, { label: string; color: string; icon: string }> = {
  sut: { label: 'Service Universel', color: 'bg-blue-500', icon: '📡' },
  ia: { label: 'Intelligence Artificielle', color: 'bg-orange-500', icon: '🤖' },
  acteurs: { label: 'Acteurs Clés', color: 'bg-green-500', icon: '👥' },
  general: { label: 'Général', color: 'bg-gray-500', icon: '📋' },
};

export const STATUT_LABELS: Record<DossierStatut, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  brouillon: { label: 'Brouillon', variant: 'secondary' },
  publie: { label: 'Publié', variant: 'default' },
  archive: { label: 'Archivé', variant: 'outline' },
};

export function useDossiers(categorie?: DossierCategorie) {
  return useQuery({
    queryKey: ['dossiers', categorie],
    queryFn: async () => {
      let query = supabase
        .from('dossiers')
        .select('*')
        .order('updated_at', { ascending: false });

      if (categorie) {
        query = query.eq('categorie', categorie);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Dossier[];
    },
  });
}

export function useDossier(id?: string) {
  return useQuery({
    queryKey: ['dossier', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('dossiers')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as Dossier | null;
    },
    enabled: !!id,
  });
}

export function useCreateDossier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dossier: { titre: string; resume?: string; contenu?: string; categorie?: DossierCategorie; statut?: DossierStatut }) => {
      const { data, error } = await supabase
        .from('dossiers')
        .insert([dossier])
        .select()
        .single();

      if (error) throw error;
      return data as Dossier;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dossiers'] });
    },
  });
}

export function useUpdateDossier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Dossier> & { id: string }) => {
      const { data, error } = await supabase
        .from('dossiers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Dossier;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['dossiers'] });
      queryClient.invalidateQueries({ queryKey: ['dossier', data.id] });
    },
  });
}

export function useDeleteDossier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('dossiers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dossiers'] });
    },
  });
}
