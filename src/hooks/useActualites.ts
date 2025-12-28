import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Actualite {
  id: string;
  titre: string;
  resume: string | null;
  contenu: string | null;
  source_nom: string | null;
  source_url: string | null;
  date_publication: string | null;
  importance: number | null;
  sentiment: number | null;
  categorie: string | null;
  tags: string[] | null;
  analyse_ia: string | null;
  created_at: string;
}

export interface CollecteLog {
  id: string;
  type: string | null;
  statut: string | null;
  nb_resultats: number | null;
  mots_cles_utilises: string[] | null;
  duree_ms: number | null;
  erreur: string | null;
  created_at: string;
}

export interface FreshnessInfo {
  ageHours: number;
  level: 'fresh' | 'recent' | 'old';
  color: string;
  label: string;
}

export const calculateFreshness = (dateStr: string | null): FreshnessInfo => {
  if (!dateStr) {
    return { ageHours: 999, level: 'old', color: 'text-destructive', label: 'Date inconnue' };
  }

  const date = new Date(dateStr);
  const now = new Date();
  const ageMs = now.getTime() - date.getTime();
  const ageHours = Math.floor(ageMs / (1000 * 60 * 60));

  if (ageHours < 24) {
    return { 
      ageHours, 
      level: 'fresh', 
      color: 'text-signal-positive', 
      label: ageHours < 1 ? 'À l\'instant' : `Il y a ${ageHours}h` 
    };
  } else if (ageHours < 72) {
    const ageDays = Math.floor(ageHours / 24);
    return { 
      ageHours, 
      level: 'recent', 
      color: 'text-signal-warning', 
      label: `Il y a ${ageDays}j` 
    };
  } else {
    const ageDays = Math.floor(ageHours / 24);
    return { 
      ageHours, 
      level: 'old', 
      color: 'text-muted-foreground', 
      label: `Il y a ${ageDays}j` 
    };
  }
};

export const useActualites = (filters?: {
  categorie?: string;
  quadrant?: string;
  minImportance?: number;
  maxAgeHours?: number;
}) => {
  return useQuery({
    queryKey: ['actualites', filters],
    queryFn: async () => {
      let query = supabase
        .from('actualites')
        .select('*')
        .order('date_publication', { ascending: false });

      if (filters?.categorie) {
        query = query.eq('categorie', filters.categorie);
      }

      if (filters?.minImportance) {
        query = query.gte('importance', filters.minImportance);
      }

      if (filters?.maxAgeHours) {
        const cutoffDate = new Date();
        cutoffDate.setHours(cutoffDate.getHours() - filters.maxAgeHours);
        query = query.gte('date_publication', cutoffDate.toISOString());
      }

      const { data, error } = await query.limit(50);

      if (error) throw error;
      return data as Actualite[];
    },
  });
};

// Note: Ces hooks seront activés après création de la table collectes_log
export const useLastCollecte = () => {
  return useQuery({
    queryKey: ['last-collecte'],
    queryFn: async (): Promise<CollecteLog | null> => {
      // La table collectes_log n'existe pas encore - retourner null
      // Sera activé après la migration
      return null;
    },
    refetchInterval: 60000,
  });
};

export const useCollectesHistory = () => {
  return useQuery({
    queryKey: ['collectes-history'],
    queryFn: async (): Promise<CollecteLog[]> => {
      // La table collectes_log n'existe pas encore - retourner tableau vide
      // Sera activé après la migration
      return [];
    },
  });
};

export const useTriggerCollecte = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (type: 'critique' | 'quotidienne' | 'hebdo' = 'critique') => {
      const { data, error } = await supabase.functions.invoke('collecte-veille', {
        body: { type, recency: type === 'critique' ? 24 : type === 'quotidienne' ? 72 : 168 }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['actualites'] });
      queryClient.invalidateQueries({ queryKey: ['last-collecte'] });
      queryClient.invalidateQueries({ queryKey: ['collectes-history'] });
      toast.success(`Collecte terminée : ${data.nb_resultats} nouvelles actualités`);
    },
    onError: (error) => {
      console.error('Erreur collecte:', error);
      toast.error('Erreur lors de la collecte');
    },
  });
};

export const useEnrichActualite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actualiteId: string) => {
      const { data, error } = await supabase.functions.invoke('enrichir-actualite', {
        body: { actualite_id: actualiteId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actualites'] });
      toast.success('Actualité enrichie');
    },
    onError: (error) => {
      console.error('Erreur enrichissement:', error);
      toast.error('Erreur lors de l\'enrichissement');
    },
  });
};

export const usePreviewEnrichment = () => {
  return useMutation({
    mutationFn: async ({ titre, resume, content }: { titre?: string; resume?: string; content?: string }) => {
      const { data, error } = await supabase.functions.invoke('enrichir-actualite', {
        body: { titre, resume, content }
      });

      if (error) throw error;
      return data;
    },
  });
};
