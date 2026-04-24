import { useState, useCallback, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, RefreshCw, LayoutDashboard, Newspaper, Sparkles, TrendingUp, Loader2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RelativeTime } from '@/components/ui/relative-time';
import { toast } from 'sonner';
import {
  useRadarKPIs,
  useRadarSignaux,
  useIntelligenceFeed,
  useLastCollecteTime,
  type PeriodFilter
} from '@/hooks/useRadarData';
import {
  DailyBriefing,
  IntelligenceFeed,
  CompactRadar,
  RadarKpiTiles,
  ShareOfVoiceWidget,
  RadarProximiteWidget,
  FocusBanner,
} from '@/components/radar';
import { useActualites, useTriggerCollecte, useEnrichActualite, useYesterdayArticles, useBatchSentiment } from '@/hooks/useActualites';
import { useArticleClusters } from '@/hooks/useArticleClusters';
import { useSidebarAnalytics } from '@/hooks/useSidebarAnalytics';
import { ArticleCluster } from '@/components/actualites/ArticleCluster';
import { SmartSidebar } from '@/components/actualites/SmartSidebar';
import { WatchHeader } from '@/components/actualites/WatchHeader';
import { BigSearchBar } from '@/components/actualites/BigSearchBar';
import { PourVousFeed } from '@/components/actualites/PourVousFeed';
import { TitrologieWidget } from '@/components/actualites/TitrologieWidget';

const periodLabels: Record<PeriodFilter, string> = {
  '24h': 'Dernières 24h',
  '7j': '7 jours',
  '30j': '30 jours',
};

const periodToMaxAge: Record<string, number | undefined> = {
  '24h': 24,
  '72h': 72,
  '7d': 168,
  '30d': 720,
  'all': undefined,
};

export default function RadarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'synthese';
  const [tab, setTab] = useState(initialTab);

  // === Synthèse data ===
  const [period, setPeriod] = useState<PeriodFilter>('24h');
  const { data: kpis, isLoading: kpisLoading, isFetching: kpisFetching, isError: kpisError, refetch: refetchKpis } = useRadarKPIs(period);
  const { data: signaux, isLoading: signauxLoading, isError: signauxError, refetch: refetchSignaux } = useRadarSignaux();
  const { data: actualitesFeed, isLoading: actualitesFeedLoading, isError: actualitesError, refetch: refetchActualites } = useIntelligenceFeed(20);
  const { data: lastCollecte } = useLastCollecteTime();

  // === Flux complet data ===
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('72h');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);
  const maxAgeHours = periodToMaxAge[selectedPeriod];
  const { data: actualites, isLoading: actualitesLoading, refetch: refetchActus } = useActualites({ maxAgeHours });
  const { data: yesterdayArticles } = useYesterdayArticles();
  const triggerCollecte = useTriggerCollecte();
  const enrichActualite = useEnrichActualite();
  const batchSentiment = useBatchSentiment();

  const filteredActualites = actualites?.filter(actu => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const m = actu.titre.toLowerCase().includes(s)
        || actu.resume?.toLowerCase().includes(s)
        || actu.source_nom?.toLowerCase().includes(s)
        || actu.tags?.some(tag => tag.toLowerCase().includes(s));
      if (!m) return false;
    }
    if (activeFilters.length > 0) {
      const has = activeFilters.every(filter =>
        actu.tags?.some(tag => tag.toLowerCase() === filter.toLowerCase())
        || actu.source_nom?.toLowerCase() === filter.toLowerCase()
      );
      if (!has) return false;
    }
    return true;
  });

  const clusters = useArticleClusters(filteredActualites);
  const analytics = useSidebarAnalytics(filteredActualites, yesterdayArticles, activeFilters);

  const handleTabChange = (value: string) => {
    setTab(value);
    setSearchParams(value === 'synthese' ? {} : { tab: value }, { replace: true });
  };

  const handleRefresh = () => {
    triggerCollecte.mutate('critique', { onSuccess: () => refetchActus() });
  };
  const handleEnrich = async (id: string) => {
    setEnrichingId(id);
    try { await enrichActualite.mutateAsync(id); } finally { setEnrichingId(null); }
  };
  const handleFilterChange = useCallback((tag: string) => {
    setActiveFilters(prev => prev.includes(tag) ? prev.filter(f => f !== tag) : [...prev, tag]);
  }, []);
  const handleClearFilter = useCallback((filter: string) => {
    setActiveFilters(prev => prev.filter(f => f !== filter));
  }, []);

  // Auto-scroll vers le Briefing si on arrive depuis le Daily Briefing (Impact SU)
  const briefingRef = useRef<HTMLDivElement | null>(null);
  const focusParam = searchParams.get('focus');
  const fromParam = searchParams.get('from');
  useEffect(() => {
    if (!focusParam && !fromParam) return;
    const t = setTimeout(() => {
      briefingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
    return () => clearTimeout(t);
  }, [focusParam, fromParam]);

  return (
    <div className="w-full space-y-5 animate-fade-in">
      {/* Bandeau "Vu depuis Briefing" si on arrive via ?focus= ou ?from= */}
      {(searchParams.get('focus') || searchParams.get('from')) && (
        <FocusBanner
          query={searchParams.get('focus') || ''}
          itemLabel={searchParams.get('item') || undefined}
          origin={searchParams.get('from') || undefined}
          originLabel={!searchParams.get('from') ? 'Impact Service Universel' : undefined}
        />
      )}

      {/* Header global */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Accueil</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastCollecte && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Dernière collecte : </span>
              <RelativeTime date={lastCollecte} />
            </div>
          )}
          {kpisFetching && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {/* Tabs principaux */}
      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="synthese" className="gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Synthèse
          </TabsTrigger>
          <TabsTrigger value="flux" className="gap-2">
            <Newspaper className="h-4 w-4" />
            Flux complet
          </TabsTrigger>
          <TabsTrigger value="pour-vous" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Pour vous
          </TabsTrigger>
        </TabsList>

        {/* === Onglet Synthèse === */}
        <TabsContent value="synthese" className="space-y-5 mt-5">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
            <TabsList className="h-9">
              {Object.entries(periodLabels).map(([key, label]) => (
                <TabsTrigger key={key} value={key} className="text-sm">{label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <RadarKpiTiles
            mentions={kpis?.mentions ?? 0}
            articles={kpis?.articles ?? 0}
            alertesActives={kpis?.alertesActives ?? 0}
            scoreInfluence={kpis?.scoreInfluence ?? 0}
            periodLabel={periodLabels[period]}
            isLoading={kpisLoading}
            isError={kpisError}
            onRetry={() => refetchKpis()}
          />

          <ShareOfVoiceWidget />
          <RadarProximiteWidget />
          <div ref={briefingRef} className="scroll-mt-4">
            <DailyBriefing />
          </div>

          {/* Aperçu du flux (top 20) avec invitation à voir tout */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Aperçu du flux
              </h2>
              <Button variant="link" size="sm" onClick={() => handleTabChange('flux')}>
                Voir le flux complet →
              </Button>
            </div>
            <IntelligenceFeed
              actualites={actualitesFeed || []}
              isLoading={actualitesFeedLoading}
              isError={actualitesError}
              onRetry={() => refetchActualites()}
              lastUpdate={lastCollecte}
            />
          </div>

          <CompactRadar
            signaux={signaux || []}
            isLoading={signauxLoading}
            isError={signauxError}
            onRetry={() => refetchSignaux()}
          />
        </TabsContent>

        {/* === Onglet Flux complet === */}
        <TabsContent value="flux" className="mt-5">
          <div className="bg-muted/20 -mx-6 px-6 py-2">
            <WatchHeader
              newArticlesCount={actualites?.length ?? 0}
              selectedPeriod={selectedPeriod}
              onPeriodChange={setSelectedPeriod}
              onRefresh={handleRefresh}
              onExport={() => toast.info('Export en cours de développement')}
              isRefreshing={triggerCollecte.isPending}
              collectePhase={triggerCollecte.phase}
              onBatchSentiment={() => batchSentiment.mutate()}
              isBatchingSentiment={batchSentiment.isPending}
            />
            <BigSearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              activeFilters={activeFilters}
              onClearFilter={handleClearFilter}
            />
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mt-4">
              <main className="w-full lg:w-3/4 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {clusters.length} sujet{clusters.length > 1 ? 's' : ''} • Trié par pertinence
                  </span>
                </div>

                {actualitesLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <CardContent className="p-5">
                          <Skeleton className="h-6 w-3/4 mb-2" />
                          <Skeleton className="h-4 w-full mb-1" />
                          <Skeleton className="h-4 w-2/3" />
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
                          : "Aucune actualité disponible"}
                      </p>
                      <div className="flex gap-3 justify-center">
                        {(searchTerm || activeFilters.length > 0) && (
                          <Button variant="outline" onClick={() => { setSearchTerm(''); setActiveFilters([]); }}>
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
              </main>
              <aside className="hidden lg:block w-full lg:w-1/4 lg:sticky lg:top-6 self-start space-y-6">
                <TitrologieWidget />
                <SmartSidebar
                  analytics={analytics}
                  activeFilters={activeFilters}
                  onFilterChange={handleFilterChange}
                  onPersonClick={(name) => setSearchTerm(name)}
                  onSourceClick={(source) => handleFilterChange(source)}
                />
              </aside>
            </div>
          </div>
        </TabsContent>

        {/* === Onglet Pour vous === */}
        <TabsContent value="pour-vous" className="mt-5">
          <PourVousFeed />
        </TabsContent>
      </Tabs>
    </div>
  );
}
