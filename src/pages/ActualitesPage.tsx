import { useState, useCallback } from 'react';
import { TrendingUp, Loader2, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useActualites, useTriggerCollecte, useEnrichActualite, useYesterdayArticles, useBatchSentiment } from '@/hooks/useActualites';
import { useArticleClusters } from '@/hooks/useArticleClusters';
import { useSidebarAnalytics } from '@/hooks/useSidebarAnalytics';
import { ArticleCluster } from '@/components/actualites/ArticleCluster';
import { SmartSidebar } from '@/components/actualites/SmartSidebar';
import { WatchHeader } from '@/components/actualites/WatchHeader';
import { BigSearchBar } from '@/components/actualites/BigSearchBar';
import { toast } from 'sonner';

// Map période vers maxAgeHours
const periodToMaxAge: Record<string, number | undefined> = {
  '24h': 24,
  '72h': 72,
  '7d': 168,
  '30d': 720,
  'all': undefined
};

export default function ActualitesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('72h');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  const maxAgeHours = periodToMaxAge[selectedPeriod];

  const { data: actualites, isLoading, refetch } = useActualites({
    maxAgeHours,
  });

  const { data: yesterdayArticles } = useYesterdayArticles();

  const triggerCollecte = useTriggerCollecte();
  const enrichActualite = useEnrichActualite();
  const batchSentiment = useBatchSentiment();

  // Filtrer par recherche et tags actifs
  const filteredActualites = actualites?.filter(actu => {
    // Filtre recherche texte
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        actu.titre.toLowerCase().includes(searchLower) ||
        actu.resume?.toLowerCase().includes(searchLower) ||
        actu.source_nom?.toLowerCase().includes(searchLower) ||
        actu.tags?.some(tag => tag.toLowerCase().includes(searchLower));
      
      if (!matchesSearch) return false;
    }

    // Filtre par tags actifs
    if (activeFilters.length > 0) {
      const hasTags = activeFilters.every(filter => 
        actu.tags?.some(tag => tag.toLowerCase() === filter.toLowerCase()) ||
        actu.source_nom?.toLowerCase() === filter.toLowerCase()
      );
      if (!hasTags) return false;
    }

    return true;
  });

  // Clustering des articles
  const clusters = useArticleClusters(filteredActualites);
  
  // Analytics pour la sidebar (avec données d'hier pour les tendances)
  const analytics = useSidebarAnalytics(filteredActualites, yesterdayArticles, activeFilters);

  const handleRefresh = () => {
    triggerCollecte.mutate('critique', {
      onSuccess: () => refetch()
    });
  };

  const handleEnrich = async (id: string) => {
    setEnrichingId(id);
    try {
      await enrichActualite.mutateAsync(id);
    } finally {
      setEnrichingId(null);
    }
  };

  const handleFilterChange = useCallback((tag: string) => {
    setActiveFilters(prev => 
      prev.includes(tag) 
        ? prev.filter(f => f !== tag)
        : [...prev, tag]
    );
  }, []);

  const handleClearFilter = useCallback((filter: string) => {
    setActiveFilters(prev => prev.filter(f => f !== filter));
  }, []);

  const handleExport = () => {
    toast.info('Export en cours de développement');
  };

  const handlePersonClick = (name: string) => {
    setSearchTerm(name);
  };

  const handleSourceClick = (source: string) => {
    handleFilterChange(source);
  };

  return (
    <div className="min-h-screen bg-muted/20 animate-fade-in">
      {/* En-tête */}
      <WatchHeader
        newArticlesCount={actualites?.length ?? 0}
        selectedPeriod={selectedPeriod}
        onPeriodChange={setSelectedPeriod}
        onRefresh={handleRefresh}
        onExport={handleExport}
        isRefreshing={triggerCollecte.isPending}
        collectePhase={triggerCollecte.phase}
        onBatchSentiment={() => batchSentiment.mutate()}
        isBatchingSentiment={batchSentiment.isPending}
      />

      {/* Barre de recherche principale */}
      <BigSearchBar
        value={searchTerm}
        onChange={setSearchTerm}
        activeFilters={activeFilters}
        onClearFilter={handleClearFilter}
      />

      {/* Layout 2 colonnes */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        {/* Colonne principale (70%) - Flux d'articles */}
        <main className="w-full lg:w-3/4 space-y-4">
          {/* Label de section */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Les immanquables
            </h2>
            <span className="text-xs text-muted-foreground">
              {clusters.length} sujet{clusters.length > 1 ? 's' : ''} • Trié par pertinence
            </span>
          </div>

          {/* États de chargement */}
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardContent className="p-5">
                    <div className="flex justify-between mb-3">
                      <Skeleton className="h-5 w-24" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="h-6 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-full mb-1" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex gap-2 mt-4">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : clusters.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  {searchTerm || activeFilters.length > 0 
                    ? "Aucun article ne correspond à vos critères" 
                    : "Aucune actualité disponible"
                  }
                </p>
                <div className="flex gap-3 justify-center">
                  {(searchTerm || activeFilters.length > 0) && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm('');
                        setActiveFilters([]);
                      }}
                    >
                      Réinitialiser les filtres
                    </Button>
                  )}
                  <Button onClick={handleRefresh} disabled={triggerCollecte.isPending}>
                    {triggerCollecte.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Lancer une collecte
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            clusters.map(cluster => (
              <ArticleCluster
                key={cluster.mainArticle.id}
                mainArticle={cluster.mainArticle}
                relatedArticles={cluster.relatedArticles}
                onEnrich={handleEnrich}
                isEnriching={enrichingId === cluster.mainArticle.id}
              />
            ))
          )}

          {/* Indicateur de fin */}
          {!isLoading && clusters.length > 0 && (
            <p className="text-center text-xs text-muted-foreground py-4">
              {clusters.length} sujet{clusters.length > 1 ? 's' : ''} affiché{clusters.length > 1 ? 's' : ''}
            </p>
          )}
        </main>

        {/* Sidebar (30%) - Analytics */}
        <aside className="hidden lg:block w-full lg:w-1/4 lg:sticky lg:top-6 self-start">
          <SmartSidebar
            analytics={analytics}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
            onPersonClick={handlePersonClick}
            onSourceClick={handleSourceClick}
          />
        </aside>
      </div>
    </div>
  );
}
