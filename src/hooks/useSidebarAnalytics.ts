import { useMemo } from 'react';
import { Actualite } from '@/hooks/useActualites';

interface ExtendedActualite extends Actualite {
  entites_personnes?: string[];
  entites_entreprises?: string[];
}

interface SidebarAnalytics {
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topConcepts: Array<{ tag: string; count: number; active: boolean }>;
  topSources: Array<{ name: string; count: number }>;
  trendingPeople: Array<{ name: string; mentions: number }>;
}

export function useSidebarAnalytics(
  articles: ExtendedActualite[] | undefined,
  activeFilters: string[] = []
): SidebarAnalytics {
  return useMemo(() => {
    if (!articles || articles.length === 0) {
      return {
        sentimentDistribution: { positive: 33, neutral: 34, negative: 33 },
        topConcepts: [],
        topSources: [],
        trendingPeople: []
      };
    }

    // === Analyse de sentiment ===
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
      topConcepts,
      topSources,
      trendingPeople
    };
  }, [articles, activeFilters]);
}
