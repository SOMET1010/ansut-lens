import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SourceReliabilityStats {
  source_nom: string;
  total_articles: number;
  valid_links_pct: number;
  avg_sentiment: number;
  avg_importance: number;
  impact_ansut_pct: number;
  reliability_score: number;
}

export function useSourceReliability() {
  return useQuery({
    queryKey: ['source-reliability'],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from('actualites')
        .select('source_nom, source_url, sentiment, importance, impact_ansut')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('source_nom', 'is', null);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const bySource = new Map<string, typeof data>();
      for (const row of data) {
        const key = row.source_nom ?? 'Inconnu';
        if (!bySource.has(key)) bySource.set(key, []);
        bySource.get(key)!.push(row);
      }

      const stats: SourceReliabilityStats[] = [];
      for (const [source_nom, articles] of bySource) {
        const total = articles.length;
        const validLinks = articles.filter(a => a.source_url && a.source_url.trim() !== '').length;
        const valid_links_pct = (validLinks / total) * 100;

        const sentiments = articles.filter(a => a.sentiment != null).map(a => Number(a.sentiment));
        const avg_sentiment = sentiments.length > 0 ? sentiments.reduce((s, v) => s + v, 0) / sentiments.length : 0;

        const importances = articles.filter(a => a.importance != null).map(a => a.importance!);
        const avg_importance = importances.length > 0 ? importances.reduce((s, v) => s + v, 0) / importances.length : 50;

        const withImpact = articles.filter(a => a.impact_ansut != null && a.impact_ansut.trim() !== '').length;
        const impact_ansut_pct = (withImpact / total) * 100;

        // Weighted score: valid links 40% + importance normalized 30% + positive sentiment 30%
        const sentimentScore = Math.min(100, Math.max(0, (avg_sentiment + 1) * 50)); // -1..1 → 0..100
        const importanceScore = Math.min(100, avg_importance);
        const reliability_score = Math.round(
          valid_links_pct * 0.4 + importanceScore * 0.3 + sentimentScore * 0.3
        );

        stats.push({
          source_nom,
          total_articles: total,
          valid_links_pct: Math.round(valid_links_pct),
          avg_sentiment: Math.round(avg_sentiment * 100) / 100,
          avg_importance: Math.round(avg_importance),
          impact_ansut_pct: Math.round(impact_ansut_pct),
          reliability_score,
        });
      }

      return stats.sort((a, b) => b.reliability_score - a.reliability_score);
    },
  });
}
