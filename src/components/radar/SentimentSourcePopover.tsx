import { ReactNode, useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExternalLink, MessageSquare, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type PeriodKey = '24h' | '7j' | '30j';

const PERIOD_HOURS: Record<PeriodKey, number> = {
  '24h': 24,
  '7j': 24 * 7,
  '30j': 24 * 30,
};

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
}> {
  let q = supabase
    .from('actualites')
    .select('id, titre, source_nom, source_url, sentiment, importance, date_publication, created_at')
    .not('sentiment', 'is', null)
    .order('importance', { ascending: false })
    .limit(limit);

  if (sinceISO) q = q.gte('created_at', sinceISO);

  const { data } = await q;
  const items = data ?? [];

  const articles: SentimentArticle[] = items.map((a) => ({
    id: a.id,
    titre: a.titre,
    source_nom: a.source_nom,
    source_url: a.source_url,
    sentiment: Number(a.sentiment ?? 0),
    importance: a.importance ?? 50,
    date: a.date_publication ?? a.created_at,
  }));

  const totalWeight = articles.reduce((s, a) => s + a.importance, 0);
  const weightedSum = articles.reduce((s, a) => s + a.sentiment * a.importance, 0);
  const avg = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return { articles, avgSentiment: Math.round(avg * 100) / 100, totalAnalyzed: articles.length };
}

export function SentimentSourcePopover({
  children,
  defaultPeriod = '24h',
  limit = 10,
  title = 'Détail du sentiment moyen',
}: SentimentSourcePopoverProps) {
  const [period, setPeriod] = useState<PeriodKey>(defaultPeriod);
  const sinceISO = new Date(Date.now() - PERIOD_HOURS[period] * 3600 * 1000).toISOString();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className="cursor-pointer">{children}</div>
      </PopoverTrigger>
      <PopoverContent className="w-[440px] p-0" side="top" align="start">
        <SentimentContent
          sinceISO={sinceISO}
          limit={limit}
          title={title}
          period={period}
          onPeriodChange={setPeriod}
        />
      </PopoverContent>
    </Popover>
  );
}

function SentimentContent({
  sinceISO,
  limit,
  title,
  period,
  onPeriodChange,
}: {
  sinceISO: string;
  limit: number;
  title: string;
  period: PeriodKey;
  onPeriodChange: (p: PeriodKey) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['sentiment-sources', sinceISO, limit],
    queryFn: () => fetchSentimentSources(sinceISO, limit),
    staleTime: 60_000,
  });

  return (
    <div className="space-y-2">
      <div className="border-b px-3 py-2 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-3.5 w-3.5 text-primary" />
            <p className="text-sm font-semibold">{title}</p>
          </div>
          <Tabs value={period} onValueChange={(v) => onPeriodChange(v as PeriodKey)}>
            <TabsList className="h-7">
              <TabsTrigger value="24h" className="text-[10px] px-2 py-0.5 h-6">24h</TabsTrigger>
              <TabsTrigger value="7j" className="text-[10px] px-2 py-0.5 h-6">7j</TabsTrigger>
              <TabsTrigger value="30j" className="text-[10px] px-2 py-0.5 h-6">30j</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {data && (
          <div className="space-y-0.5">
            <p className="text-xs text-muted-foreground">
              Calculé sur {data.totalAnalyzed} article{data.totalAnalyzed > 1 ? 's' : ''} analysé{data.totalAnalyzed > 1 ? 's' : ''}
              {' · '}Moyenne pondérée : <span className="font-semibold text-foreground">{data.avgSentiment.toFixed(2)}</span>
            </p>
            <p className="text-[10px] text-muted-foreground font-mono bg-muted/50 px-1.5 py-0.5 rounded inline-block">
              Σ(sentiment × importance) ÷ Σ(importance)
            </p>
          </div>
        )}
      </div>

      <div className="px-3 pb-3 space-y-2 max-h-80 overflow-y-auto">
        {isLoading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : !data || data.articles.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Aucun article avec sentiment analysé sur cette période.
          </p>
        ) : (
          data.articles.map((article) => {
            const s = sentimentLabel(article.sentiment);
            // Score normalisé sur barre 0-100 (sentiment va de -1 à +1)
            const sentimentPct = Math.round(((article.sentiment + 1) / 2) * 100);

            return (
              <div key={article.id} className="rounded-md border bg-muted/30 p-2 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <s.Icon className={`h-3 w-3 ${s.color}`} />
                    <Badge variant="outline" className={`text-[10px] ${s.color}`}>
                      {s.label} {article.sentiment > 0 ? '+' : ''}{article.sentiment.toFixed(2)}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] font-mono" title="Poids dans la moyenne pondérée">
                      Poids {article.importance}
                    </Badge>
                  </div>
                  {article.source_url && (
                    <a
                      href={article.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:text-primary/80 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                <p className="text-xs font-medium line-clamp-2 leading-snug">{article.titre}</p>

                <Progress value={sentimentPct} className="h-1" />

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="truncate">
                    {article.source_nom ?? 'Source inconnue'}
                    {' · '}Contribution : <span className="font-mono">{(article.sentiment * article.importance).toFixed(1)}</span>
                  </span>
                  {article.date && (
                    <span className="shrink-0 ml-2">
                      {new Date(article.date).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}

        {data && data.articles.length > 0 && (
          <p className="text-[10px] text-muted-foreground text-center pt-1 border-t">
            Le sentiment moyen est calculé en moyennant les scores individuels des articles analysés par l'IA.
          </p>
        )}
      </div>
    </div>
  );
}
