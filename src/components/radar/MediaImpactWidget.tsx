import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, TrendingDown, Minus, Target, MessageSquare, Newspaper, AlertTriangle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface MediaImpactData {
  totalArticles: number;
  mentionsAnsut: number;
  avgSentiment: number;
  sentimentTrend: 'up' | 'down' | 'stable';
  topArticle: { titre: string; source_nom: string | null } | null;
  criticalAlerts: number;
}

function useMediaImpact() {
  return useQuery({
    queryKey: ['media-impact-today'],
    queryFn: async (): Promise<MediaImpactData> => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // Last 24h articles
      const { data: articles } = await supabase
        .from('actualites')
        .select('titre, source_nom, sentiment, importance, impact_ansut')
        .gte('created_at', yesterday.toISOString())
        .order('importance', { ascending: false })
        .limit(100);

      // Previous 24h for trend
      const { data: prevArticles } = await supabase
        .from('actualites')
        .select('sentiment')
        .gte('created_at', twoDaysAgo.toISOString())
        .lt('created_at', yesterday.toISOString())
        .limit(100);

      // Critical alerts today
      const { count: alertCount } = await supabase
        .from('alertes')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString())
        .eq('niveau', 'critical');

      const items = articles ?? [];
      const totalArticles = items.length;
      const mentionsAnsut = items.filter(a => a.impact_ansut && a.impact_ansut.trim() !== '').length;

      const sentiments = items.filter(a => a.sentiment != null).map(a => Number(a.sentiment));
      const avgSentiment = sentiments.length > 0 ? sentiments.reduce((s, v) => s + v, 0) / sentiments.length : 0;

      const prevSentiments = (prevArticles ?? []).filter(a => a.sentiment != null).map(a => Number(a.sentiment));
      const prevAvg = prevSentiments.length > 0 ? prevSentiments.reduce((s, v) => s + v, 0) / prevSentiments.length : 0;

      const diff = avgSentiment - prevAvg;
      const sentimentTrend: 'up' | 'down' | 'stable' = diff > 0.05 ? 'up' : diff < -0.05 ? 'down' : 'stable';

      const topArticle = items.length > 0 ? { titre: items[0].titre, source_nom: items[0].source_nom } : null;

      return {
        totalArticles,
        mentionsAnsut,
        avgSentiment: Math.round(avgSentiment * 100) / 100,
        sentimentTrend,
        topArticle,
        criticalAlerts: alertCount ?? 0,
      };
    },
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 min
  });
}

function SentimentIndicator({ value, trend }: { value: number; trend: 'up' | 'down' | 'stable' }) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-destructive' : 'text-muted-foreground';
  const label = value >= 0.2 ? 'Positif' : value <= -0.2 ? 'Négatif' : 'Neutre';
  const labelColor = value >= 0.2 ? 'bg-emerald-500/15 text-emerald-600' : value <= -0.2 ? 'bg-destructive/15 text-destructive' : 'bg-muted text-muted-foreground';

  return (
    <div className="flex items-center gap-2">
      <Badge className={labelColor}>{label}</Badge>
      <TrendIcon className={`h-4 w-4 ${trendColor}`} />
    </div>
  );
}

export default function MediaImpactWidget() {
  const { data, isLoading } = useMediaImpact();

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-24 w-full" /></CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="glass border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-primary" />
          Mon impact média du jour
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold">{data.totalArticles}</p>
            <p className="text-xs text-muted-foreground">Articles 24h</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Target className="h-4 w-4 text-primary" />
              <p className="text-2xl font-bold">{data.mentionsAnsut}</p>
            </div>
            <p className="text-xs text-muted-foreground">Mentions ANSUT</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
              <SentimentIndicator value={data.avgSentiment} trend={data.sentimentTrend} />
            </div>
            <p className="text-xs text-muted-foreground">Sentiment</p>
          </div>
          <div className="text-center">
            {data.criticalAlerts > 0 ? (
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="h-4 w-4 text-destructive animate-pulse" />
                <p className="text-2xl font-bold text-destructive">{data.criticalAlerts}</p>
              </div>
            ) : (
              <p className="text-2xl font-bold text-emerald-500">0</p>
            )}
            <p className="text-xs text-muted-foreground">Alertes critiques</p>
          </div>
        </div>

        {/* Top article */}
        {data.topArticle && (
          <div className="rounded-md bg-muted/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">📰 Article prioritaire</p>
            <p className="text-sm font-medium line-clamp-2">{data.topArticle.titre}</p>
            {data.topArticle.source_nom && (
              <p className="text-xs text-muted-foreground mt-1">— {data.topArticle.source_nom}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
