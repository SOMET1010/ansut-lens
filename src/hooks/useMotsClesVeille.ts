import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CategorieVeille {
  id: string;
  nom: string;
  code: string;
  description: string | null;
  couleur: string;
  quadrant_default: 'tech' | 'regulation' | 'market' | 'reputation' | null;
  priorite: number;
  actif: boolean;
  created_at: string;
}

export interface MotCleVeille {
  id: string;
  mot_cle: string;
  variantes: string[];
  categorie_id: string | null;
  quadrant: 'tech' | 'regulation' | 'market' | 'reputation' | null;
  score_criticite: number;
  alerte_auto: boolean;
  actif: boolean;
  created_at: string;
  updated_at: string;
  categories_veille?: CategorieVeille | null;
}

export interface MatchResult {
  mot_cle: MotCleVeille;
  matches: string[];
  score: number;
}

// Hook pour récupérer les catégories
export function useCategoriesVeille() {
  return useQuery({
    queryKey: ['categories_veille'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories_veille')
        .select('*')
        .eq('actif', true)
        .order('priorite', { ascending: false });

      if (error) throw error;
      return data as CategorieVeille[];
    },
  });
}

// Hook pour récupérer les mots-clés
export function useMotsClesVeille(categorieId?: string) {
  return useQuery({
    queryKey: ['mots_cles_veille', categorieId],
    queryFn: async () => {
      let query = supabase
        .from('mots_cles_veille')
        .select('*, categories_veille(*)')
        .order('score_criticite', { ascending: false });

      if (categorieId) {
        query = query.eq('categorie_id', categorieId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as MotCleVeille[];
    },
  });
}

// Hook pour récupérer uniquement les mots-clés avec alerte auto
export function useMotsClesAlerte() {
  return useQuery({
    queryKey: ['mots_cles_alerte'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mots_cles_veille')
        .select('*, categories_veille(*)')
        .eq('alerte_auto', true)
        .eq('actif', true)
        .order('score_criticite', { ascending: false });

      if (error) throw error;
      return data as MotCleVeille[];
    },
  });
}

// Hook pour le matching de contenu
export function useMotsClesMatching() {
  const { data: motsCles } = useMotsClesVeille();

  const matchContent = (content: string): MatchResult[] => {
    if (!motsCles || !content) return [];

    const results: MatchResult[] = [];
    const contentLower = content.toLowerCase();

    for (const motCle of motsCles) {
      if (!motCle.actif) continue;

      const allTerms = [motCle.mot_cle, ...(motCle.variantes || [])];
      const matches: string[] = [];

      for (const term of allTerms) {
        const termLower = term.toLowerCase();
        if (contentLower.includes(termLower)) {
          matches.push(term);
        }
      }

      if (matches.length > 0) {
        results.push({
          mot_cle: motCle,
          matches,
          score: motCle.score_criticite * matches.length,
        });
      }
    }

    // Trier par score décroissant
    return results.sort((a, b) => b.score - a.score);
  };

  const calculateTotalScore = (results: MatchResult[]): number => {
    return results.reduce((sum, r) => sum + r.score, 0);
  };

  const hasAlertKeywords = (results: MatchResult[]): boolean => {
    return results.some((r) => r.mot_cle.alerte_auto);
  };

  const getQuadrantDistribution = (results: MatchResult[]) => {
    const distribution: Record<string, number> = {
      tech: 0,
      regulation: 0,
      market: 0,
      reputation: 0,
    };

    for (const result of results) {
      const quadrant = result.mot_cle.quadrant;
      if (quadrant) {
        distribution[quadrant] += result.score;
      }
    }

    return distribution;
  };

  return {
    matchContent,
    calculateTotalScore,
    hasAlertKeywords,
    getQuadrantDistribution,
    isReady: !!motsCles,
  };
}

// Hook pour mettre à jour un mot-clé
export function useUpdateMotCle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<MotCleVeille>;
    }) => {
      const { data, error } = await supabase
        .from('mots_cles_veille')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mots_cles_veille'] });
      queryClient.invalidateQueries({ queryKey: ['mots_cles_alerte'] });
      toast.success('Mot-clé mis à jour');
    },
    onError: (error) => {
      toast.error('Erreur lors de la mise à jour');
      console.error(error);
    },
  });
}

// Hook pour créer un mot-clé
export function useCreateMotCle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (motCle: {
      mot_cle: string;
      variantes?: string[];
      categorie_id?: string | null;
      quadrant?: 'tech' | 'regulation' | 'market' | 'reputation' | null;
      score_criticite?: number;
      alerte_auto?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('mots_cles_veille')
        .insert({
          mot_cle: motCle.mot_cle,
          variantes: motCle.variantes || [],
          categorie_id: motCle.categorie_id || null,
          quadrant: motCle.quadrant || null,
          score_criticite: motCle.score_criticite ?? 50,
          alerte_auto: motCle.alerte_auto ?? false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mots_cles_veille'] });
      toast.success('Mot-clé créé');
    },
    onError: (error) => {
      toast.error('Erreur lors de la création');
      console.error(error);
    },
  });
}

// Hook pour supprimer un mot-clé
export function useDeleteMotCle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mots_cles_veille')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mots_cles_veille'] });
      toast.success('Mot-clé supprimé');
    },
    onError: (error) => {
      toast.error('Erreur lors de la suppression');
      console.error(error);
    },
  });
}
