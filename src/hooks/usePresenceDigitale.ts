import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { 
  MetriqueSPDI, 
  RecommandationSPDI, 
  EvolutionSPDI, 
  InterpretationSPDI,
  TypeRecommandationSPDI,
  PrioriteRecommandation,
  CanalCommunication,
  CercleStrategique,
  Tendance 
} from '@/types';

// Types Row générés par Supabase
type MetriquesRow = Database['public']['Tables']['presence_digitale_metrics']['Row'];
type RecommandationsRow = Database['public']['Tables']['presence_digitale_recommandations']['Row'];

// Mapper les données DB vers MetriqueSPDI (typé strictement)
const mapDbToMetrique = (row: MetriquesRow): MetriqueSPDI => ({
  id: row.id,
  personnalite_id: row.personnalite_id,
  date_mesure: row.date_mesure,
  axes: {
    visibilite: {
      score: Number(row.score_visibilite) || 0,
      nb_mentions: row.nb_mentions || 0,
      nb_sources: row.nb_sources_distinctes || 0,
      regularite: Number(row.regularite_mentions) || 0,
    },
    qualite: {
      score: Number(row.score_qualite) || 0,
      sentiment_moyen: Number(row.sentiment_moyen) || 0,
      themes_strategiques: Number(row.pct_themes_strategiques) || 0,
      controverses: row.nb_controverses || 0,
    },
    autorite: {
      score: Number(row.score_autorite) || 0,
      citations_directes: row.nb_citations_directes || 0,
      invitations_panels: row.nb_invitations_panels || 0,
      references_croisees: row.nb_references_croisees || 0,
    },
    presence: {
      score: Number(row.score_presence) || 0,
      activite_linkedin: row.activite_linkedin || 0,
      engagement: Number(row.engagement_linkedin) || 0,
      coherence: Number(row.coherence_message) || 0,
    },
  },
  score_final: Number(row.score_spdi) || 0,
  interpretation: (row.interpretation as InterpretationSPDI) || 'visibilite_faible',
  created_at: row.created_at ?? '',
});

// Mapper les données DB vers RecommandationSPDI (typé strictement)
const mapDbToRecommandation = (row: RecommandationsRow): RecommandationSPDI => ({
  id: row.id,
  personnalite_id: row.personnalite_id,
  type: row.type as TypeRecommandationSPDI,
  priorite: (row.priorite ?? 'normale') as PrioriteRecommandation,
  titre: row.titre,
  message: row.message,
  thematique: row.thematique ?? undefined,
  canal: row.canal as CanalCommunication | undefined,
  actif: row.actif ?? true,
  vue: row.vue ?? false,
  created_at: row.created_at ?? '',
  expire_at: row.expire_at ?? undefined,
});

// Calculer la tendance à partir de l'historique
const calculerTendance = (historique: { date: string; score: number }[]): Tendance => {
  if (historique.length < 2) return 'stable';
  const recent = historique.slice(-7);
  if (recent.length < 2) return 'stable';
  const debut = recent[0].score;
  const fin = recent[recent.length - 1].score;
  const variation = ((fin - debut) / debut) * 100;
  if (variation > 5) return 'up';
  if (variation < -5) return 'down';
  return 'stable';
};

// Hook pour récupérer les métriques SPDI d'une personnalité
export function useMetriquesSPDI(personnaliteId: string | undefined, periode: '7j' | '30j' | '90j' = '30j') {
  const jours = periode === '7j' ? 7 : periode === '30j' ? 30 : 90;
  
  return useQuery({
    queryKey: ['spdi-metriques', personnaliteId, periode],
    queryFn: async () => {
      if (!personnaliteId) return null;
      
      const dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - jours);
      
      const { data, error } = await supabase
        .from('presence_digitale_metrics')
        .select('*')
        .eq('personnalite_id', personnaliteId)
        .gte('date_mesure', dateDebut.toISOString().split('T')[0])
        .order('date_mesure', { ascending: true });
      
      if (error) throw error;
      return (data || []).map(mapDbToMetrique);
    },
    enabled: !!personnaliteId,
  });
}

// Hook pour récupérer la dernière métrique SPDI
export function useDerniereMetriqueSPDI(personnaliteId: string | undefined) {
  return useQuery({
    queryKey: ['spdi-derniere', personnaliteId],
    queryFn: async () => {
      if (!personnaliteId) return null;
      
      const { data, error } = await supabase
        .from('presence_digitale_metrics')
        .select('*')
        .eq('personnalite_id', personnaliteId)
        .order('date_mesure', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (error) throw error;
      return data ? mapDbToMetrique(data) : null;
    },
    enabled: !!personnaliteId,
  });
}

// Hook pour récupérer l'évolution historique
export function useEvolutionSPDI(personnaliteId: string | undefined, periode: '7j' | '30j' | '90j' = '30j') {
  const jours = periode === '7j' ? 7 : periode === '30j' ? 30 : 90;
  
  return useQuery({
    queryKey: ['spdi-evolution', personnaliteId, periode],
    queryFn: async (): Promise<EvolutionSPDI | null> => {
      if (!personnaliteId) return null;
      
      const dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - jours);
      
      const { data, error } = await supabase
        .from('presence_digitale_metrics')
        .select('date_mesure, score_spdi')
        .eq('personnalite_id', personnaliteId)
        .gte('date_mesure', dateDebut.toISOString().split('T')[0])
        .order('date_mesure', { ascending: true });
      
      if (error) throw error;
      
      const historique = (data || []).map(d => ({
        date: d.date_mesure,
        score: Number(d.score_spdi) || 0,
      }));
      
      const premierScore = historique[0]?.score || 0;
      const dernierScore = historique[historique.length - 1]?.score || 0;
      const variation = premierScore > 0 
        ? ((dernierScore - premierScore) / premierScore) * 100 
        : 0;
      
      return {
        periode,
        historique,
        variation: Math.round(variation * 10) / 10,
        tendance: calculerTendance(historique),
      };
    },
    enabled: !!personnaliteId,
  });
}

// Hook pour récupérer les recommandations actives
export function useRecommandationsSPDI(personnaliteId: string | undefined) {
  return useQuery({
    queryKey: ['spdi-recommandations', personnaliteId],
    queryFn: async () => {
      if (!personnaliteId) return [];
      
      const { data, error } = await supabase
        .from('presence_digitale_recommandations')
        .select('*')
        .eq('personnalite_id', personnaliteId)
        .eq('actif', true)
        .order('priorite', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return (data || []).map(mapDbToRecommandation);
    },
    enabled: !!personnaliteId,
  });
}

// Hook pour comparer avec les pairs institutionnels
export function useComparaisonPairs(personnaliteId: string | undefined, cercle: CercleStrategique) {
  return useQuery({
    queryKey: ['spdi-comparaison', personnaliteId, cercle],
    queryFn: async () => {
      if (!personnaliteId) return null;
      
      // Récupérer tous les acteurs du même cercle avec SPDI actif
      const { data: personnalites, error: errPersonnalites } = await supabase
        .from('personnalites')
        .select('id, score_spdi_actuel')
        .eq('cercle', cercle)
        .eq('suivi_spdi_actif', true);
      
      if (errPersonnalites) throw errPersonnalites;
      
      const scores = (personnalites || [])
        .map(p => Number(p.score_spdi_actuel) || 0)
        .filter(s => s > 0);
      
      if (scores.length === 0) return null;
      
      const monScore = personnalites?.find(p => p.id === personnaliteId)?.score_spdi_actuel || 0;
      const moyenne = scores.reduce((a, b) => a + b, 0) / scores.length;
      const max = Math.max(...scores);
      const min = Math.min(...scores);
      const rang = scores.filter(s => s > Number(monScore)).length + 1;
      
      return {
        monScore: Number(monScore),
        moyenne: Math.round(moyenne * 10) / 10,
        max,
        min,
        rang,
        total: scores.length,
      };
    },
    enabled: !!personnaliteId,
  });
}

// Hook pour activer/désactiver le suivi SPDI
export function useToggleSuiviSPDI() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ personnaliteId, actif }: { personnaliteId: string; actif: boolean }) => {
      const { error } = await supabase
        .from('personnalites')
        .update({ suivi_spdi_actif: actif })
        .eq('id', personnaliteId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['personnalites'] });
      queryClient.invalidateQueries({ queryKey: ['personnalite', variables.personnaliteId] });
    },
  });
}

// Hook pour marquer une recommandation comme vue
export function useMarquerRecommandationVue() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (recommandationId: string) => {
      const { error } = await supabase
        .from('presence_digitale_recommandations')
        .update({ vue: true })
        .eq('id', recommandationId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['spdi-recommandations'] });
    },
  });
}

// Hook pour récupérer les acteurs avec suivi SPDI actif
export function useActeursSPDI() {
  return useQuery({
    queryKey: ['acteurs-spdi'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personnalites')
        .select('id, nom, prenom, fonction, organisation, cercle, score_spdi_actuel, tendance_spdi, derniere_mesure_spdi')
        .eq('suivi_spdi_actif', true)
        .order('score_spdi_actuel', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
}

// Constantes pour les interprétations
export const INTERPRETATION_LABELS: Record<InterpretationSPDI, { label: string; color: string; description: string }> = {
  presence_forte: {
    label: 'Présence forte',
    color: 'text-green-500',
    description: 'Visibilité et impact institutionnel excellents',
  },
  presence_solide: {
    label: 'Présence solide',
    color: 'text-blue-500',
    description: 'Bonne visibilité avec marge d\'amélioration',
  },
  visibilite_faible: {
    label: 'Visibilité faible',
    color: 'text-orange-500',
    description: 'Présence digitale insuffisante',
  },
  risque_invisibilite: {
    label: 'Risque d\'invisibilité',
    color: 'text-red-500',
    description: 'Action urgente recommandée',
  },
};

// Fonction utilitaire pour obtenir l'interprétation depuis le score
export function getInterpretationFromScore(score: number): InterpretationSPDI {
  if (score >= 80) return 'presence_forte';
  if (score >= 60) return 'presence_solide';
  if (score >= 40) return 'visibilite_faible';
  return 'risque_invisibilite';
}
