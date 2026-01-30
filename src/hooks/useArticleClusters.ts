import { useMemo } from 'react';
import { Actualite } from '@/hooks/useActualites';

interface ExtendedActualite extends Actualite {
  entites_personnes?: string[];
  entites_entreprises?: string[];
  score_pertinence?: number;
}

export interface ArticleCluster {
  mainArticle: ExtendedActualite;
  relatedArticles: ExtendedActualite[];
  relevanceScore: number;
  entities: {
    people: string[];
    companies: string[];
  };
}

// Normaliser le texte pour la comparaison
const normalize = (str: string): string => 
  str.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim();

// Calculer la similarité entre deux titres (Jaccard simplifié)
const calculateSimilarity = (title1: string, title2: string): number => {
  const words1 = new Set(normalize(title1).split(/\s+/).filter(w => w.length > 3));
  const words2 = new Set(normalize(title2).split(/\s+/).filter(w => w.length > 3));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  
  return intersection.size / union.size;
};

// Calculer le chevauchement des tags
const calculateTagOverlap = (tags1: string[] = [], tags2: string[] = []): number => {
  if (tags1.length === 0 || tags2.length === 0) return 0;
  
  const set1 = new Set(tags1.map(t => t.toLowerCase()));
  const set2 = new Set(tags2.map(t => t.toLowerCase()));
  
  const intersection = [...set1].filter(x => set2.has(x)).length;
  const minLength = Math.min(set1.size, set2.size);
  
  return intersection / minLength;
};

// Critères de regroupement
const shouldCluster = (article1: Actualite, article2: Actualite): boolean => {
  // Similarité de titre > 40%
  const titleSimilarity = calculateSimilarity(article1.titre, article2.titre);
  if (titleSimilarity > 0.4) return true;
  
  // Chevauchement de tags > 60%
  const tagOverlap = calculateTagOverlap(article1.tags ?? [], article2.tags ?? []);
  if (tagOverlap > 0.6) return true;
  
  // Même catégorie + titre partiellement similaire
  if (article1.categorie && article1.categorie === article2.categorie && titleSimilarity > 0.25) {
    return true;
  }
  
  return false;
};

// Calculer le score d'un article pour le classement
const getArticleScore = (article: ExtendedActualite): number => {
  const importance = article.importance ?? 50;
  const pertinence = article.score_pertinence ?? 50;
  
  // Bonus pour la fraîcheur
  let freshnessBonus = 0;
  if (article.date_publication) {
    const ageHours = (Date.now() - new Date(article.date_publication).getTime()) / (1000 * 60 * 60);
    if (ageHours < 24) freshnessBonus = 20;
    else if (ageHours < 72) freshnessBonus = 10;
  }
  
  // Bonus si enrichi (entités extraites)
  const enrichmentBonus = (article.entites_personnes?.length || article.entites_entreprises?.length) ? 10 : 0;
  
  return importance * 0.4 + pertinence * 0.4 + freshnessBonus + enrichmentBonus;
};

// Extraire toutes les entités d'un cluster
const extractClusterEntities = (articles: ExtendedActualite[]): { people: string[]; companies: string[] } => {
  const peopleSet = new Set<string>();
  const companiesSet = new Set<string>();
  
  articles.forEach(article => {
    article.entites_personnes?.forEach(p => peopleSet.add(p));
    article.entites_entreprises?.forEach(c => companiesSet.add(c));
  });
  
  return {
    people: Array.from(peopleSet),
    companies: Array.from(companiesSet)
  };
};

export function useArticleClusters(articles: ExtendedActualite[] | undefined): ArticleCluster[] {
  return useMemo(() => {
    if (!articles || articles.length === 0) return [];
    
    const used = new Set<string>();
    const clusters: ArticleCluster[] = [];
    
    // Trier par score décroissant pour que les meilleurs articles soient "maîtres"
    const sortedArticles = [...articles].sort((a, b) => getArticleScore(b) - getArticleScore(a));
    
    for (const article of sortedArticles) {
      if (used.has(article.id)) continue;
      
      // Trouver les articles similaires non encore utilisés
      const related: ExtendedActualite[] = [];
      
      for (const candidate of sortedArticles) {
        if (candidate.id === article.id || used.has(candidate.id)) continue;
        
        if (shouldCluster(article, candidate)) {
          related.push(candidate);
          used.add(candidate.id);
        }
      }
      
      used.add(article.id);
      
      const allClusterArticles = [article, ...related];
      const entities = extractClusterEntities(allClusterArticles);
      
      clusters.push({
        mainArticle: article,
        relatedArticles: related,
        relevanceScore: getArticleScore(article),
        entities
      });
    }
    
    return clusters;
  }, [articles]);
}
