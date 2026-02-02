import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface SocialInsight {
  id: string;
  source_id: string | null;
  plateforme: 'linkedin' | 'twitter' | 'facebook';
  type_contenu: 'post' | 'mention' | 'hashtag' | 'trending';
  contenu: string | null;
  auteur: string | null;
  auteur_url: string | null;
  url_original: string | null;
  date_publication: string | null;
  engagement_score: number;
  sentiment: number | null;
  entites_detectees: string[] | null;
  hashtags: string[] | null;
  est_critique: boolean;
  traite: boolean;
  alerte_generee: boolean;
  created_at: string;
}

export interface SocialStats {
  total: number;
  byPlatform: Record<string, number>;
  critical: number;
  avgSentiment: number;
  avgEngagement: number;
}

export function useSocialInsights(limit = 20) {
  return useQuery({
    queryKey: ['social-insights', limit],
    queryFn: async (): Promise<SocialInsight[]> => {
      const { data, error } = await supabase
        .from('social_insights')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as SocialInsight[];
    },
  });
}

export function useSocialStats() {
  return useQuery({
    queryKey: ['social-stats'],
    queryFn: async (): Promise<SocialStats> => {
      const { data, error } = await supabase
        .from('social_insights')
        .select('plateforme, engagement_score, sentiment, est_critique')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const insights = data || [];
      const byPlatform: Record<string, number> = {};
      let totalSentiment = 0;
      let totalEngagement = 0;
      let sentimentCount = 0;
      let criticalCount = 0;

      for (const insight of insights) {
        byPlatform[insight.plateforme] = (byPlatform[insight.plateforme] || 0) + 1;
        if (insight.sentiment !== null) {
          totalSentiment += insight.sentiment;
          sentimentCount++;
        }
        totalEngagement += insight.engagement_score || 0;
        if (insight.est_critique) criticalCount++;
      }

      return {
        total: insights.length,
        byPlatform,
        critical: criticalCount,
        avgSentiment: sentimentCount > 0 ? totalSentiment / sentimentCount : 0,
        avgEngagement: insights.length > 0 ? totalEngagement / insights.length : 0,
      };
    },
  });
}

export function useCollectSocial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('collecte-social');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['social-insights'] });
      queryClient.invalidateQueries({ queryKey: ['social-stats'] });
      toast.success('Collecte terminée', {
        description: `${data.insights_collected} insights collectés depuis ${data.sources_scraped} sources`,
      });
    },
    onError: (error) => {
      toast.error('Erreur de collecte', {
        description: error instanceof Error ? error.message : 'Échec de la collecte sociale',
      });
    },
  });
}

export function useMarkInsightAsProcessed() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insightId: string) => {
      const { error } = await supabase
        .from('social_insights')
        .update({ traite: true })
        .eq('id', insightId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-insights'] });
    },
  });
}
