import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface FluxVeille {
  id: string;
  user_id: string;
  nom: string;
  description: string | null;
  mots_cles: string[];
  categories_ids: string[];
  quadrants: string[];
  importance_min: number;
  alerte_email: boolean;
  alerte_push: boolean;
  frequence_digest: string;
  actif: boolean;
  created_at: string;
  updated_at: string;
}

export interface FluxActualite {
  id: string;
  flux_id: string;
  actualite_id: string;
  score_match: number;
  notifie: boolean;
  created_at: string;
}

export interface FluxFormData {
  nom: string;
  description?: string;
  mots_cles: string[];
  categories_ids: string[];
  quadrants: string[];
  importance_min: number;
  alerte_email: boolean;
  alerte_push: boolean;
  frequence_digest: string;
  actif?: boolean;
}

// Fetch all user's flux
export function useFluxVeille() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['flux-veille', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('flux_veille')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FluxVeille[];
    },
    enabled: !!user,
  });
}

// Fetch a single flux by ID
export function useFluxById(fluxId: string | undefined) {
  return useQuery({
    queryKey: ['flux-veille', fluxId],
    queryFn: async () => {
      if (!fluxId) return null;

      const { data, error } = await supabase
        .from('flux_veille')
        .select('*')
        .eq('id', fluxId)
        .single();

      if (error) throw error;
      return data as FluxVeille;
    },
    enabled: !!fluxId,
  });
}

// Fetch actualites for a specific flux
export function useFluxActualites(fluxId: string | undefined) {
  return useQuery({
    queryKey: ['flux-actualites', fluxId],
    queryFn: async () => {
      if (!fluxId) return [];

      const { data, error } = await supabase
        .from('flux_actualites')
        .select(`
          id,
          flux_id,
          actualite_id,
          score_match,
          notifie,
          created_at,
          actualites (
            id,
            titre,
            resume,
            source_nom,
            source_url,
            date_publication,
            importance,
            categorie,
            tags
          )
        `)
        .eq('flux_id', fluxId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
    enabled: !!fluxId,
  });
}

// Get count of actualites per flux
export function useFluxActualitesCount(fluxIds: string[]) {
  return useQuery({
    queryKey: ['flux-actualites-count', fluxIds],
    queryFn: async () => {
      if (!fluxIds.length) return {};

      const counts: Record<string, number> = {};
      
      for (const fluxId of fluxIds) {
        const { count, error } = await supabase
          .from('flux_actualites')
          .select('*', { count: 'exact', head: true })
          .eq('flux_id', fluxId);
        
        if (!error && count !== null) {
          counts[fluxId] = count;
        }
      }
      
      return counts;
    },
    enabled: fluxIds.length > 0,
  });
}

// Create a new flux
export function useCreateFlux() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: FluxFormData) => {
      if (!user) throw new Error('Non authentifié');

      const { data: newFlux, error } = await supabase
        .from('flux_veille')
        .insert({
          user_id: user.id,
          nom: data.nom,
          description: data.description || null,
          mots_cles: data.mots_cles,
          categories_ids: data.categories_ids,
          quadrants: data.quadrants,
          importance_min: data.importance_min,
          alerte_email: data.alerte_email,
          alerte_push: data.alerte_push,
          frequence_digest: data.frequence_digest,
          actif: data.actif ?? true,
        })
        .select()
        .single();

      if (error) throw error;
      return newFlux;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flux-veille'] });
      toast.success('Flux créé avec succès');
    },
    onError: (error) => {
      toast.error('Erreur lors de la création du flux');
      console.error(error);
    },
  });
}

// Update a flux
export function useUpdateFlux() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<FluxFormData> }) => {
      const { data: updated, error } = await supabase
        .from('flux_veille')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flux-veille'] });
      toast.success('Flux mis à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    },
  });
}

// Delete a flux
export function useDeleteFlux() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('flux_veille')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flux-veille'] });
      toast.success('Flux supprimé');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    },
  });
}

// Toggle flux active state
export function useToggleFluxActive() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, actif }: { id: string; actif: boolean }) => {
      const { error } = await supabase
        .from('flux_veille')
        .update({ actif, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flux-veille'] });
    },
  });
}
