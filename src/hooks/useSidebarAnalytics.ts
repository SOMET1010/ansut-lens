import { useMemo } from 'react';
import { Actualite } from '@/hooks/useActualites';

interface ExtendedActualite extends Actualite {
  entites_personnes?: string[];
  entites_entreprises?: string[];
}

interface TrendInfo {
  delta: number;
  direction: 'up' | 'down' | 'stable';
}

interface SidebarAnalytics {
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  sentimentTrends: {
    positive: TrendInfo;
    neutral: TrendInfo;
    negative: TrendInfo;
  };
  topConcepts: Array<{ tag: string; count: number; active: boolean }>;
  topSources: Array<{ name: string; count: number }>;
  trendingPeople: Array<{ name: string; mentions: number }>;
}

export function useSidebarAnalytics(
  articles: ExtendedActualite[] | undefined,
  yesterdayArticles: { id: string; sentiment: number | null }[] | undefined,
  activeFilters: string[] = []
): SidebarAnalytics {
  return useMemo(() => {
    // Valeurs par défaut
    const defaultTrend: TrendInfo = { delta: 0, direction: 'stable' };
    
    if (!articles || articles.length === 0) {
      return {
        sentimentDistribution: { positive: 33, neutral: 34, negative: 33 },
        sentimentTrends: {
          positive: defaultTrend,
          neutral: defaultTrend,
          negative: defaultTrend
        },
        topConcepts: [],
        topSources: [],
        trendingPeople: []
      };
    }

    // === Analyse de sentiment aujourd'hui ===
    let positiveCount = 0;
    let neutralCount = 0;
    let negativeCount = 0;

    articles.forEach(article => {
      const sentiment = article.sentiment ?? 0;
      if (sentiment > 0.2) positiveCount++;
      else if (sentiment < -0.2) negativeCount++;
      else neutralCount++;
    });

    const total = articles.length;
    const sentimentDistribution = {
      positive: Math.round((positiveCount / total) * 100) || 33,
      neutral: Math.round((neutralCount / total) * 100) || 34,
      negative: Math.round((negativeCount / total) * 100) || 33
    };

    // S'assurer que la somme = 100%
    const sum = sentimentDistribution.positive + sentimentDistribution.neutral + sentimentDistribution.negative;
    if (sum !== 100) {
      sentimentDistribution.neutral += (100 - sum);
    }

    // === Analyse de sentiment hier ===
    let yesterdayDistribution = { positive: 33, neutral: 34, negative: 33 };

    if (yesterdayArticles && yesterdayArticles.length > 0) {
      let yPositive = 0, yNeutral = 0, yNegative = 0;

      yesterdayArticles.forEach(article => {
        const sentiment = article.sentiment ?? 0;
        if (sentiment > 0.2) yPositive++;
        else if (sentiment < -0.2) yNegative++;
        else yNeutral++;
      });

      const yTotal = yesterdayArticles.length;
      yesterdayDistribution = {
        positive: Math.round((yPositive / yTotal) * 100) || 33,
        neutral: Math.round((yNeutral / yTotal) * 100) || 34,
        negative: Math.round((yNegative / yTotal) * 100) || 33
      };
    }

    // === Calcul des tendances ===
    const calculateTrend = (today: number, yesterday: number): TrendInfo => {
      const delta = today - yesterday;
      return {
        delta: Math.abs(delta),
        direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'stable'
      };
    };

    const sentimentTrends = {
      positive: calculateTrend(sentimentDistribution.positive, yesterdayDistribution.positive),
      neutral: calculateTrend(sentimentDistribution.neutral, yesterdayDistribution.neutral),
      negative: calculateTrend(sentimentDistribution.negative, yesterdayDistribution.negative)
    };

    // === Top Concepts (tags) ===
    const tagCounts = new Map<string, number>();
    articles.forEach(article => {
      article.tags?.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    const topConcepts = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({
        tag,
        count,
        active: activeFilters.includes(tag)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // === Top Sources ===
    const sourceCounts = new Map<string, number>();
    articles.forEach(article => {
      const source = article.source_nom || 'Source inconnue';
      sourceCounts.set(source, (sourceCounts.get(source) || 0) + 1);
    });

    const topSources = Array.from(sourceCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // === Personnalités tendance ===
    const peopleCounts = new Map<string, number>();
    articles.forEach(article => {
      article.entites_personnes?.forEach(person => {
        peopleCounts.set(person, (peopleCounts.get(person) || 0) + 1);
      });
    });

    const trendingPeople = Array.from(peopleCounts.entries())
      .map(([name, mentions]) => ({ name, mentions }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 5);

    return {
      sentimentDistribution,
      sentimentTrends,
      topConcepts,
      topSources,
      trendingPeople
    };
  }, [articles, yesterdayArticles, activeFilters]);
}
