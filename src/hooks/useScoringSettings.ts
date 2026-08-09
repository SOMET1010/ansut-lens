import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ScoringSettings {
  // Seuils niveaux de criticité (sur score d'impact 0-100)
  threshold_rouge: number;   // ≥ X => ROUGE
  threshold_orange: number;  // ≥ X => ORANGE
  threshold_vert: number;    // ≥ X => VERT (sinon BLEU)

  // Pertinence
  pertinence_min: number;    // score min pour qu'un signal soit retenu

  // Volumes minimaux pour la matinale
  min_signaux_total: number;
  min_actions_immediates: number;
  min_signaux_faibles: number;
  min_synthese_60s: number;
  min_impact_projets: number;

  // Pondérations indicateur qualité
  weight_press: number;
  weight_synthese: number;
  weight_pilier: number;
  weight_signaux_faibles: number;
}

export const DEFAULT_SCORING: ScoringSettings = {
  threshold_rouge: 80,
  threshold_orange: 60,
  threshold_vert: 40,
  pertinence_min: 30,
  min_signaux_total: 8,
  min_actions_immediates: 3,
  min_signaux_faibles: 3,
  min_synthese_60s: 2,
  min_impact_projets: 2,
  weight_press: 1,
  weight_synthese: 1,
  weight_pilier: 1,
  weight_signaux_faibles: 1,
};

const KEY_MAP: Record<keyof ScoringSettings, string> = {
  threshold_rouge: 'scoring_threshold_rouge',
  threshold_orange: 'scoring_threshold_orange',
  threshold_vert: 'scoring_threshold_vert',
  pertinence_min: 'scoring_pertinence_min',
  min_signaux_total: 'scoring_min_signaux_total',
  min_actions_immediates: 'scoring_min_actions_immediates',
  min_signaux_faibles: 'scoring_min_signaux_faibles',
  min_synthese_60s: 'scoring_min_synthese_60s',
  min_impact_projets: 'scoring_min_impact_projets',
  weight_press: 'scoring_weight_press',
  weight_synthese: 'scoring_weight_synthese',
  weight_pilier: 'scoring_weight_pilier',
  weight_signaux_faibles: 'scoring_weight_signaux_faibles',
};

export function useScoringSettings() {
  return useQuery({
    queryKey: ['scoring-settings'],
    queryFn: async (): Promise<ScoringSettings> => {
      const { data, error } = await supabase
        .from('config_seuils')
        .select('cle, valeur')
        .in('cle', Object.values(KEY_MAP));
      if (error) throw error;
      const map = new Map((data || []).map(r => [r.cle, r.valeur]));
      const result = { ...DEFAULT_SCORING };
      for (const [k, key] of Object.entries(KEY_MAP) as Array<[keyof ScoringSettings, string]>) {
        const v = map.get(key);
        if (typeof v === 'number') result[k] = v;
      }
      return result;
    },
  });
}

export function useUpdateScoringSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (settings: ScoringSettings) => {
      for (const [k, key] of Object.entries(KEY_MAP) as Array<[keyof ScoringSettings, string]>) {
        const { error } = await supabase
          .from('config_seuils')
          .upsert(
            { cle: key, valeur: settings[k], updated_at: new Date().toISOString() },
            { onConflict: 'cle' },
          );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scoring-settings'] });
      toast.success('Règles de scoring enregistrées');
    },
    onError: (e: Error) => toast.error(`Erreur : ${e.message}`),
  });
}
