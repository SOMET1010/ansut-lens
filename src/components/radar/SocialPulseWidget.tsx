import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Newspaper, 
  MessagesSquare, 
  Globe, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Hash,
  ExternalLink,
  Loader2,
  Radio
} from 'lucide-react';
import { useSocialInsights, useSocialStats, useCollectSocial, SocialInsight, WebPlateforme } from '@/hooks/useSocialInsights';
import { cn } from '@/lib/utils';

const PLATFORM_CONFIG: Record<WebPlateforme, { icon: typeof Newspaper; color: string; bgColor: string; label: string }> = {
  blog: {
    icon: Newspaper,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10',
    label: 'Blogs',
  },
  forum: {
    icon: MessagesSquare,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10',
    label: 'Forums',
  },
  news: {
    icon: Globe,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10',
    label: 'Actualités',
  },
  // Garder les anciens types pour compatibilité avec les données existantes
  linkedin: {
    icon: Globe,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10',
    label: 'LinkedIn',
  },
  twitter: {
    icon: Globe,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    label: 'Twitter',
  },
  facebook: {
    icon: Globe,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-500/10',
    label: 'Facebook',
  },
};

function PlatformIcon({ platform }: { platform: WebPlateforme }) {
  const config = PLATFORM_CONFIG[platform] || PLATFORM_CONFIG.blog;
  const Icon = config.icon;
  return (
    <div className={cn('p-1.5 rounded-lg', config.bgColor)}>
      <Icon className={cn('h-4 w-4', config.color)} />
    </div>
  );
}

function InsightCard({ insight }: { insight: SocialInsight }) {
  const config = PLATFORM_CONFIG[insight.plateforme] || PLATFORM_CONFIG.blog;
  const sentimentValue = insight.sentiment ?? 0;
  
  return (
    <div className={cn(
      'p-3 rounded-lg border transition-all duration-200',
      insight.est_critique 
        ? 'border-destructive/50 bg-destructive/5' 
        : 'border-border hover:border-primary/30 hover:bg-muted/50'
    )}>
      <div className="flex items-start gap-3">
        <PlatformIcon platform={insight.plateforme} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className={cn('text-xs px-1.5 py-0', config.color)}>
              {config.label}
            </Badge>
            {insight.est_critique && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Critique
              </Badge>
            )}
            {sentimentValue !== 0 && (
              <Badge 
                variant="outline" 
                className={cn(
                  'text-xs px-1.5 py-0',
                  sentimentValue > 0 ? 'text-green-600 border-green-300' : 'text-red-600 border-red-300'
                )}
              >
                {sentimentValue > 0 ? (
                  <TrendingUp className="h-3 w-3 mr-1" />
                ) : (
                  <TrendingDown className="h-3 w-3 mr-1" />
                )}
                {sentimentValue > 0 ? '+' : ''}{(sentimentValue * 100).toFixed(0)}%
              </Badge>
            )}
          </div>
          <p className="text-sm line-clamp-2 text-foreground/90">
            {insight.contenu}
          </p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {insight.hashtags && insight.hashtags.length > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Hash className="h-3 w-3" />
                {insight.hashtags.slice(0, 2).join(' ')}
              </div>
            )}
            {insight.url_original && (
              <a 
                href={insight.url_original} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Source
              </a>
            )}
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <Radio className="h-3 w-3" />
              {insight.engagement_score}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SocialPulseWidget() {
  const { data: insights, isLoading: insightsLoading } = useSocialInsights(10);
  const { data: stats, isLoading: statsLoading } = useSocialStats();
  const collectMutation = useCollectSocial();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const filteredInsights = activeFilter
    ? insights?.filter(i => i.plateforme === activeFilter)
    : insights;

  const isLoading = insightsLoading || statsLoading;

  // Plateformes actives (nouvelles sources web)
  const activePlatforms: WebPlateforme[] = ['blog', 'forum', 'news'];

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-green-500/20">
              <Radio className="h-5 w-5 text-primary" />
            </div>
            Veille Web
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => collectMutation.mutate()}
            disabled={collectMutation.isPending}
            className="gap-2"
          >
            {collectMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Actualiser
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats rapides */}
        {isLoading ? (
          <div className="grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        ) : stats && (
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => setActiveFilter(null)}
              className={cn(
                'p-3 rounded-lg text-center transition-all',
                activeFilter === null 
                  ? 'bg-primary/20 ring-2 ring-primary/50' 
                  : 'bg-muted/50 hover:bg-muted'
              )}
            >
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </button>
            {activePlatforms.map((key) => {
              const config = PLATFORM_CONFIG[key];
              const count = stats.byPlatform[key] || 0;
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setActiveFilter(activeFilter === key ? null : key)}
                  className={cn(
                    'p-3 rounded-lg text-center transition-all',
                    activeFilter === key 
                      ? 'bg-primary/20 ring-2 ring-primary/50' 
                      : 'bg-muted/50 hover:bg-muted'
                  )}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Icon className={cn('h-4 w-4', config.color)} />
                    <span className="text-xl font-bold">{count}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">{config.label}</div>
                </button>
              );
            })}
          </div>
        )}

        {/* Indicateurs critiques */}
        {stats && stats.critical > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <span className="text-sm font-medium">
              {stats.critical} insight{stats.critical > 1 ? 's' : ''} critique{stats.critical > 1 ? 's' : ''} à traiter
            </span>
          </div>
        )}

        {/* Liste des insights */}
        <ScrollArea className="h-[280px] pr-2">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : filteredInsights && filteredInsights.length > 0 ? (
            <div className="space-y-3">
              {filteredInsights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Radio className="h-10 w-10 mb-2 opacity-50" />
              <p className="text-sm">Aucun insight web</p>
              <p className="text-xs">Cliquez sur Actualiser pour collecter</p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
