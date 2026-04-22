import { ReactNode, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, MessageSquare, TrendingUp, TrendingDown, Minus, ArrowUpDown, Sparkles } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type PeriodKey = '24h' | '7j' | '30j';
type SentimentFilter = 'all' | 'positive' | 'neutral' | 'negative';
type SortKey = 'impact_then_date' | 'weight_desc' | 'weight_asc' | 'sentiment_desc' | 'sentiment_asc' | 'date_desc';

const SORT_LABELS: Record<SortKey, string> = {
  impact_then_date: 'Impact (poids ↓) puis date ↓',
  weight_desc: 'Poids ↓ (contributions majeures)',
  weight_asc: 'Poids ↑',
  sentiment_desc: 'Sentiment ↓ (positif d\'abord)',
  sentiment_asc: 'Sentiment ↑ (négatif d\'abord)',
  date_desc: 'Date (plus récent)',
};

const PERIOD_HOURS: Record<PeriodKey, number> = {
  '24h': 24,
  '7j': 24 * 7,
  '30j': 24 * 30,
};

const PERIOD_LABELS: Record<PeriodKey, string> = {
  '24h': '24 dernières heures',
  '7j': '7 derniers jours',
  '30j': '30 derniers jours',
};

function classifySentiment(value: number): Exclude<SentimentFilter, 'all'> {
  if (value > 0.2) return 'positive';
  if (value < -0.2) return 'negative';
  return 'neutral';
}

interface SentimentSourcePopoverProps {
  children: ReactNode;
  /** Période initiale sélectionnée (défaut: 24h) */
  defaultPeriod?: PeriodKey;
  limit?: number;
  title?: string;
}

interface SentimentArticle {
  id: string;
  titre: string;
  source_nom: string | null;
  source_url: string | null;
  sentiment: number;
  importance: number;
  hasWeight: boolean;
  date: string | null;
}

function sentimentLabel(value: number): { label: string; color: string; Icon: typeof TrendingUp } {
  if (value > 0.2) return { label: 'Positif', color: 'text-emerald-500', Icon: TrendingUp };
  if (value < -0.2) return { label: 'Négatif', color: 'text-destructive', Icon: TrendingDown };
  return { label: 'Neutre', color: 'text-muted-foreground', Icon: Minus };
}

async function fetchSentimentSources(sinceISO?: string, limit = 10): Promise<{
  articles: SentimentArticle[];
  avgSentiment: number;
  totalAnalyzed: number;
  totalWeighted: number;
  totalUnweighted: number;
  sumWeight: number;
  sumWeightedSentiment: number;
}> {
  let q = supabase
    .from('actualites')
    .select('id, titre, source_nom, source_url, sentiment, importance, date_publication, created_at')
    .not('sentiment', 'is', null)
    .order('importance', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (sinceISO) q = q.gte('created_at', sinceISO);

  const { data } = await q;
  const items = data ?? [];

  const articles: SentimentArticle[] = items.map((a) => {
    const rawImp = a.importance;
    const hasWeight = rawImp != null && Number(rawImp) > 0;
    return {
      id: a.id,
      titre: a.titre,
      source_nom: a.source_nom,
      source_url: a.source_url,
      sentiment: Number(a.sentiment ?? 0),
      importance: hasWeight ? Number(rawImp) : 0,
      hasWeight,
      date: a.date_publication ?? a.created_at,
    };
  });

  // Calcul pondéré uniquement sur les articles avec importance valide
  const weighted = articles.filter((a) => a.hasWeight);
  const totalWeight = weighted.reduce((s, a) => s + a.importance, 0);
  const weightedSum = weighted.reduce((s, a) => s + a.sentiment * a.importance, 0);
  const avg = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return {
    articles,
    avgSentiment: Math.round(avg * 100) / 100,
    totalAnalyzed: articles.length,
    totalWeighted: weighted.length,
    totalUnweighted: articles.length - weighted.length,
    sumWeight: totalWeight,
    sumWeightedSentiment: weightedSum,
  };
}

export function SentimentSourcePopover({
  children,
  defaultPeriod = '24h',
  limit = 10,
  title = 'Détail du sentiment moyen',
}: SentimentSourcePopoverProps) {
  const [period, setPeriod] = useState<PeriodKey>(defaultPeriod);
  const [filter, setFilter] = useState<SentimentFilter>('all');
  const [sort, setSort] = useState<SortKey>('impact_then_date');
  const [displayedLimit, setDisplayedLimit] = useState<number>(limit);
  const sinceISO = new Date(Date.now() - PERIOD_HOURS[period] * 3600 * 1000).toISOString();

  // Reset pagination quand la période change
  const handlePeriodChange = (p: PeriodKey) => {
    setPeriod(p);
    setDisplayedLimit(limit);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="cursor-pointer">{children}</div>
      </PopoverTrigger>
      <PopoverContent className="w-[440px] p-0" side="top" align="start">
        <SentimentContent
          sinceISO={sinceISO}
          limit={displayedLimit}
          baseLimit={limit}
          title={title}
          period={period}
          onPeriodChange={handlePeriodChange}
          filter={filter}
          onFilterChange={setFilter}
          sort={sort}
          onSortChange={setSort}
          onLoadMore={() => setDisplayedLimit((n) => n + 10)}
        />
      </PopoverContent>
    </Popover>
  );
}

function SentimentContent({
  sinceISO,
  limit,
  baseLimit,
  title,
  period,
  onPeriodChange,
  filter,
  onFilterChange,
  sort,
  onSortChange,
  onLoadMore,
}: {
  sinceISO: string;
  limit: number;
  baseLimit: number;
  title: string;
  period: PeriodKey;
  onPeriodChange: (p: PeriodKey) => void;
  filter: SentimentFilter;
  onFilterChange: (f: SentimentFilter) => void;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
  onLoadMore: () => void;
}) {
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['sentiment-sources', sinceISO, limit],
    queryFn: () => fetchSentimentSources(sinceISO, limit),
    staleTime: 60_000,
  });

  // Recalcul en cours = nouvelle période non encore mise en cache OU premier chargement
  const isRecomputing = isLoading || (isFetching && !data);

  const filteredArticles = (data?.articles.filter((a) =>
    filter === 'all' ? true : classifySentiment(a.sentiment) === filter
  ) ?? []).slice().sort((a, b) => {
    const dateOf = (x: typeof a) => (x.date ? new Date(x.date).getTime() : 0);
    switch (sort) {
      case 'impact_then_date': {
        // Tri composite : poids ↓ d'abord, puis date ↓ en cas d'égalité de poids
        if (b.importance !== a.importance) return b.importance - a.importance;
        return dateOf(b) - dateOf(a);
      }
      case 'weight_desc': return b.importance - a.importance;
      case 'weight_asc': return a.importance - b.importance;
      case 'sentiment_desc': return b.sentiment - a.sentiment;
      case 'sentiment_asc': return a.sentiment - b.sentiment;
      case 'date_desc': return dateOf(b) - dateOf(a);
    }
  });

  // Counts par catégorie pour les badges
  const counts = {
    all: data?.articles.length ?? 0,
    positive: data?.articles.filter((a) => classifySentiment(a.sentiment) === 'positive').length ?? 0,
    neutral: data?.articles.filter((a) => classifySentiment(a.sentiment) === 'neutral').length ?? 0,
    negative: data?.articles.filter((a) => classifySentiment(a.sentiment) === 'negative').length ?? 0,
  };

  // Recalcul de la moyenne pondérée restreinte au filtre de sentiment courant
  const scopedArticles = (data?.articles ?? []).filter((a) =>
    filter === 'all' ? true : classifySentiment(a.sentiment) === filter
  );
  const scopedWeighted = scopedArticles.filter((a) => a.hasWeight);
  const scopedSumWeight = scopedWeighted.reduce((s, a) => s + a.importance, 0);
  const scopedSumWeightedSentiment = scopedWeighted.reduce((s, a) => s + a.sentiment * a.importance, 0);
  const scopedAvg = scopedSumWeight > 0
    ? Math.round((scopedSumWeightedSentiment / scopedSumWeight) * 100) / 100
    : 0;
  const scopedUnweighted = scopedArticles.length - scopedWeighted.length;
  const isScoped = filter !== 'all';

  // Valeurs affichées (scopées si un filtre est actif, sinon globales)
  const dispWeightedCount = isScoped ? scopedWeighted.length : (data?.totalWeighted ?? 0);
  const dispAvg = isScoped ? scopedAvg : (data?.avgSentiment ?? 0);
  const dispSumWeight = isScoped ? scopedSumWeight : (data?.sumWeight ?? 0);
  const dispSumWeightedSentiment = isScoped ? scopedSumWeightedSentiment : (data?.sumWeightedSentiment ?? 0);
  const dispUnweighted = isScoped ? scopedUnweighted : (data?.totalUnweighted ?? 0);

  const FILTER_LABEL: Record<SentimentFilter, string> = {
    all: 'tous',
    positive: 'positifs',
    neutral: 'neutres',
    negative: 'négatifs',
  };

  return (
    <div className="space-y-2">
      <div className="border-b px-3 py-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="h-3.5 w-3.5 text-primary shrink-0" />
            <p className="text-sm font-semibold truncate">
              {title}
              <Badge
                variant="secondary"
                className="ml-1.5 text-[10px] font-mono bg-primary/10 text-primary border border-primary/20"
                title={`Période active : ${PERIOD_LABELS[period]}`}
              >
                {period}
              </Badge>
            </p>
          </div>
          <Tabs value={period} onValueChange={(v) => onPeriodChange(v as PeriodKey)}>
            <TabsList className="h-7">
              <TabsTrigger
                value="24h"
                className="text-[10px] px-2 py-0.5 h-6 data-[state=active]:font-bold data-[state=active]:underline data-[state=active]:underline-offset-4 data-[state=active]:decoration-2 data-[state=active]:decoration-primary"
              >
                24h
              </TabsTrigger>
              <TabsTrigger
                value="7j"
                className="text-[10px] px-2 py-0.5 h-6 data-[state=active]:font-bold data-[state=active]:underline data-[state=active]:underline-offset-4 data-[state=active]:decoration-2 data-[state=active]:decoration-primary"
              >
                7j
              </TabsTrigger>
              <TabsTrigger
                value="30j"
                className="text-[10px] px-2 py-0.5 h-6 data-[state=active]:font-bold data-[state=active]:underline data-[state=active]:underline-offset-4 data-[state=active]:decoration-2 data-[state=active]:decoration-primary"
              >
                30j
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {isRecomputing ? (
          <div className="space-y-1.5" aria-busy="true" aria-label={`Recalcul du sentiment pour ${period}`}>
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-12" />
            </div>
            <p className="text-[10px] text-muted-foreground italic">Recalcul en cours pour la période {period}…</p>
          </div>
        ) : data && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Calculé sur <span className="font-semibold text-foreground">{dispWeightedCount}</span> article{dispWeightedCount > 1 ? 's' : ''} pondéré{dispWeightedCount > 1 ? 's' : ''}
              {isScoped && (
                <> (filtre <span className="font-semibold text-foreground">{FILTER_LABEL[filter]}</span>)</>
              )}
              {' · '}Moyenne : <span className="font-semibold text-foreground">{dispAvg.toFixed(2)}</span>
              {isScoped && (
                <Badge
                  variant="outline"
                  className="ml-1.5 text-[9px] px-1 py-0 h-4 border-primary/40 text-primary"
                  title={`Moyenne pondérée recalculée sur les articles ${FILTER_LABEL[filter]} uniquement`}
                >
                  filtré : {FILTER_LABEL[filter]}
                </Badge>
              )}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded inline-block">
              Σ(sentiment × importance) ÷ Σ(importance)
              {isScoped && <span className="ml-1 text-primary">· articles {FILTER_LABEL[filter]} uniquement</span>}
            </p>
            <div className="flex flex-wrap gap-1.5 text-[10px] font-mono">
              <span className="bg-muted/50 px-1.5 py-0.5 rounded" title={isScoped ? `Σ poids — articles ${FILTER_LABEL[filter]} uniquement` : 'Somme des poids (importance) des articles inclus'}>
                Σ(importance) = <span className="font-semibold text-foreground">{dispSumWeight.toFixed(0)}</span>
              </span>
              <span className="bg-muted/50 px-1.5 py-0.5 rounded" title={isScoped ? `Σ contributions — articles ${FILTER_LABEL[filter]} uniquement` : 'Somme des contributions (sentiment × importance)'}>
                Σ(sentiment × importance) = <span className="font-semibold text-foreground">{dispSumWeightedSentiment.toFixed(2)}</span>
              </span>
              <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded" title="Vérification : Σ pondérée ÷ Σ poids">
                = {dispAvg.toFixed(2)}
              </span>
            </div>
            <details className="text-[10px] text-muted-foreground">
              <summary className="cursor-pointer hover:text-foreground select-none">
                ℹ️ Comment lire ce calcul ?
              </summary>
              <div className="mt-1 space-y-1 pl-3 border-l border-muted">
                <p>
                  <span className="font-semibold text-foreground">Importance (poids) :</span> note brute 0–100 attribuée par l'IA lors de l'ingestion (pertinence stratégique, source, fraîcheur). Aucune normalisation : la valeur est utilisée telle quelle comme coefficient. Un article à 90 pèse ainsi 3× plus qu'un article à 30.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Sentiment :</span> score IA borné entre <span className="font-mono">−1</span> (très négatif) et <span className="font-mono">+1</span> (très positif). Le seuil de classification est ±0,2 (zone neutre entre les deux).
                </p>
                <p>
                  <span className="font-semibold text-foreground">Filtre actif :</span> sélectionner un onglet (Positif/Neutre/Négatif) restreint la moyenne pondérée aux seuls articles de cette catégorie.
                </p>
                <p>
                  <span className="font-semibold text-foreground">Signe du sentiment pondéré :</span>
                </p>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  <li><span className="text-emerald-600 dark:text-emerald-500 font-semibold">+ (positif)</span> : la couverture penche favorablement, surtout sur les articles à fort poids.</li>
                  <li><span className="text-muted-foreground font-semibold">≈ 0 (neutre)</span> : équilibre ou absence de polarité marquée.</li>
                  <li><span className="text-destructive font-semibold">− (négatif)</span> : couverture critique dominante, à surveiller.</li>
                </ul>
              </div>
            </details>
            {dispUnweighted > 0 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-1 flex items-start gap-1">
                <span className="font-semibold">⚠</span>
                <span>
                  {dispUnweighted} article{dispUnweighted > 1 ? 's' : ''} sans importance défini{dispUnweighted > 1 ? 's' : 'e'}{isScoped ? ` (parmi les ${FILTER_LABEL[filter]})` : ''} — exclu{dispUnweighted > 1 ? 's' : ''} du calcul pondéré.
                </span>
              </p>
            )}
            {isScoped && scopedWeighted.length === 0 && (
              <p className="text-[10px] text-amber-600 dark:text-amber-500 bg-amber-500/10 border border-amber-500/30 rounded px-1.5 py-1">
                Aucun article {FILTER_LABEL[filter]} pondéré sur cette période — la moyenne ne peut pas être calculée.
              </p>
            )}
          </div>
        )}

        {/* Filtre par sentiment */}
        <Tabs value={filter} onValueChange={(v) => onFilterChange(v as SentimentFilter)}>
          <TabsList className="h-7 w-full grid grid-cols-4">
            <TabsTrigger value="all" className="text-[10px] px-1 h-6">
              Tous ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="positive" className="text-[10px] px-1 h-6 data-[state=active]:text-signal-positive">
              <TrendingUp className="h-3 w-3 mr-0.5" />
              {counts.positive}
            </TabsTrigger>
            <TabsTrigger value="neutral" className="text-[10px] px-1 h-6">
              <Minus className="h-3 w-3 mr-0.5" />
              {counts.neutral}
            </TabsTrigger>
            <TabsTrigger value="negative" className="text-[10px] px-1 h-6 data-[state=active]:text-destructive">
              <TrendingDown className="h-3 w-3 mr-0.5" />
              {counts.negative}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Sélecteur de tri */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
          <Select value={sort} onValueChange={(v) => onSortChange(v as SortKey)}>
            <SelectTrigger className="h-7 text-[10px] flex-1">
              <SelectValue placeholder="Trier par…" />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {SORT_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="px-3 pb-3 space-y-2 max-h-80 overflow-y-auto">
        {isRecomputing ? (
          <div aria-busy="true" aria-label={`Chargement des contributeurs (${period})`} className="space-y-2">
            <p className="text-[10px] text-muted-foreground italic text-center">
              Chargement des contributeurs sur la période <span className="font-semibold">{period}</span>…
            </p>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !data || data.articles.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucun article avec sentiment analysé sur cette période.
          </p>
        ) : filteredArticles.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucun article {filter === 'positive' ? 'positif' : filter === 'negative' ? 'négatif' : 'neutre'} sur cette période.
          </p>
        ) : (
          (() => {
            // Top 1-2 contributions par valeur absolue (sentiment × importance)
            const ranked = filteredArticles
              .filter((a) => a.hasWeight)
              .map((a) => ({ id: a.id, contrib: Math.abs(a.sentiment * a.importance) }))
              .filter((x) => x.contrib > 0)
              .sort((a, b) => b.contrib - a.contrib);
            const topThreshold = ranked.length >= 5 ? 2 : ranked.length >= 2 ? 1 : ranked.length;
            const topIds = new Set(ranked.slice(0, topThreshold).map((x) => x.id));

            return filteredArticles.map((article) => {
              const s = sentimentLabel(article.sentiment);
              const sentimentPct = Math.round(((article.sentiment + 1) / 2) * 100);
              const hasSource = Boolean(article.source_url) && Boolean(article.source_nom);
              const isTop = topIds.has(article.id);
              return (
                <div
                  key={article.id}
                  className={`rounded-md border p-2 space-y-1.5 transition-colors ${
                    isTop
                      ? 'bg-primary/5 border-primary/40 ring-1 ring-primary/20'
                      : article.hasWeight
                        ? 'bg-muted/30'
                        : 'bg-muted/20 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                      {isTop && (
                        <Badge className="text-[9px] px-1.5 py-0 h-4 bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20 gap-0.5">
                          <Sparkles className="h-2.5 w-2.5" />
                          Top contribution
                        </Badge>
                      )}
                      <s.Icon className={`h-3 w-3 ${s.color}`} />
                      <Badge variant="outline" className={`text-[10px] ${s.color}`}>
                        {s.label} {article.sentiment > 0 ? '+' : ''}{article.sentiment.toFixed(2)}
                      </Badge>
                      {article.hasWeight ? (
                        <Badge variant="secondary" className="text-[10px] font-mono" title="Poids dans la moyenne pondérée">
                          Poids {article.importance}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-[10px] font-mono border-dashed text-amber-600 dark:text-amber-500 border-amber-500/40"
                          title="Importance manquante — exclu du calcul pondéré"
                        >
                          Poids — (exclu)
                        </Badge>
                      )}
                    </div>
                  {hasSource ? (
                    <a
                      href={article.source_url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1 py-0 h-4 border-dashed text-muted-foreground shrink-0"
                      title="Aucun lien source disponible pour cet article"
                    >
                      Source indisponible
                    </Badge>
                  )}
                </div>

                <p className="text-xs font-medium line-clamp-2 leading-snug">{article.titre}</p>

                <Progress value={sentimentPct} className="h-1" />

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="truncate">
                    {article.source_nom ? (
                      article.source_nom
                    ) : (
                      <span className="italic text-muted-foreground/70">Source inconnue</span>
                    )}
                    {' · '}Contribution : <span className="font-mono">{article.hasWeight ? (article.sentiment * article.importance).toFixed(1) : 'n/a'}</span>
                  </span>
                  {article.date && (
                    <span className="shrink-0 ml-2">
                      {new Date(article.date).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>
              );
            });
          })()
        )}

        {/* Voir plus / Pagination */}
        {data && data.articles.length > 0 && (
          <div className="space-y-1.5 pt-1 border-t">
            {data.articles.length >= limit ? (
              <Button
                size="sm"
                variant="outline"
                className="w-full h-7 text-[11px]"
                onClick={onLoadMore}
                disabled={isFetching}
              >
                {isFetching ? 'Chargement…' : `Voir plus (+10) — actuellement ${data.articles.length} affichés`}
              </Button>
            ) : (
              limit > baseLimit && (
                <p className="text-[10px] text-muted-foreground text-center italic">
                  Tous les articles disponibles sont affichés ({data.articles.length}).
                </p>
              )
            )}
            <p className="text-[10px] text-muted-foreground text-center">
              La moyenne pondérée se met à jour automatiquement avec chaque article chargé.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
