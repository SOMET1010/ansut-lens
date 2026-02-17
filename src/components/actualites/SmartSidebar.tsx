import { BarChart2, Hash, Globe, User, TrendingUp, TrendingDown, Minus, AlertCircle, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface TrendInfo {
  delta: number;
  direction: 'up' | 'down' | 'stable';
}

interface CategorySentiment {
  category: string;
  avgSentiment: number;
  count: number;
  alert: boolean;
}

interface SentimentHealth {
  overallAvg: number;
  pendingCount: number;
  enrichedCount: number;
  alertActive: boolean;
  byCategory: CategorySentiment[];
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
  sentimentHealth: SentimentHealth;
  topConcepts: Array<{ tag: string; count: number; active: boolean }>;
  topSources: Array<{ name: string; count: number }>;
  trendingPeople: Array<{ name: string; mentions: number }>;
}

interface SmartSidebarProps {
  analytics: SidebarAnalytics;
  activeFilters: string[];
  onFilterChange: (tag: string) => void;
  onPersonClick?: (name: string) => void;
  onSourceClick?: (source: string) => void;
}

// Composant pour afficher l'indicateur de tendance
const TrendIndicator = ({ 
  trend, 
  type 
}: { 
  trend: TrendInfo; 
  type: 'positive' | 'neutral' | 'negative';
}) => {
  const { delta, direction } = trend;
  
  // Si stable ou delta = 0
  if (direction === 'stable' || delta === 0) {
    return (
      <span className="flex items-center gap-0.5 text-muted-foreground text-[10px]">
        <Minus className="h-2.5 w-2.5" />
        <span>0%</span>
      </span>
    );
  }

  // Logique de couleur inversée pour "negative" (baisse = bien, hausse = mal)
  let colorClass: string;
  if (type === 'neutral') {
    colorClass = 'text-muted-foreground';
  } else if (type === 'positive') {
    colorClass = direction === 'up' ? 'text-signal-positive' : 'text-signal-critical';
  } else {
    // negative: down = amélioration (vert), up = dégradation (rouge)
    colorClass = direction === 'down' ? 'text-signal-positive' : 'text-signal-critical';
  }
  
  const Icon = direction === 'up' ? TrendingUp : TrendingDown;
  
  return (
    <span className={cn("flex items-center gap-0.5 text-[10px] font-medium", colorClass)}>
      <Icon className="h-2.5 w-2.5" />
      <span>{direction === 'up' ? '+' : '-'}{delta}%</span>
    </span>
  );
};

export function SmartSidebar({ 
  analytics, 
  activeFilters, 
  onFilterChange,
  onPersonClick,
  onSourceClick 
}: SmartSidebarProps) {
  const { sentimentDistribution, sentimentTrends, sentimentHealth, topConcepts, topSources, trendingPeople } = analytics;

  return (
    <div className="space-y-5">
      {/* Widget : Analyse de Sentiment avec tendances */}
      <Card className="border-border/50">
        <CardContent className="p-5">
          <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
            <BarChart2 className="h-3.5 w-3.5" /> Tonalité du jour
          </h3>
          
          {/* Zone des barres avec indicateurs de tendance */}
          <div className="flex items-end justify-between gap-3 h-28 px-2 mb-2">
            {/* Barre Positif */}
            <div className="flex-1 h-full relative group cursor-pointer">
              {/* Indicateur de tendance (toujours visible) */}
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
                <TrendIndicator trend={sentimentTrends.positive} type="positive" />
              </div>
              {/* Pourcentage au hover */}
              <span className="absolute -top-12 left-1/2 -translate-x-1/2 text-xs font-bold text-signal-positive opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                {sentimentDistribution.positive}%
              </span>
              {/* Conteneur de la barre */}
              <div className="absolute inset-0 bg-signal-positive/20 rounded-lg overflow-hidden">
                <div 
                  className="absolute bottom-0 w-full bg-signal-positive rounded-lg transition-all duration-500 group-hover:brightness-110"
                  style={{ height: `${Math.max(sentimentDistribution.positive, 5)}%` }}
                />
              </div>
            </div>

            {/* Barre Neutre */}
            <div className="flex-1 h-full relative group cursor-pointer">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
                <TrendIndicator trend={sentimentTrends.neutral} type="neutral" />
              </div>
              <span className="absolute -top-12 left-1/2 -translate-x-1/2 text-xs font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                {sentimentDistribution.neutral}%
              </span>
              <div className="absolute inset-0 bg-muted-foreground/20 rounded-lg overflow-hidden">
                <div 
                  className="absolute bottom-0 w-full bg-muted-foreground rounded-lg transition-all duration-500 group-hover:brightness-110"
                  style={{ height: `${Math.max(sentimentDistribution.neutral, 5)}%` }}
                />
              </div>
            </div>

            {/* Barre Négatif */}
            <div className="flex-1 h-full relative group cursor-pointer">
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 z-10">
                <TrendIndicator trend={sentimentTrends.negative} type="negative" />
              </div>
              <span className="absolute -top-12 left-1/2 -translate-x-1/2 text-xs font-bold text-signal-critical opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
                {sentimentDistribution.negative}%
              </span>
              <div className="absolute inset-0 bg-signal-critical/20 rounded-lg overflow-hidden">
                <div 
                  className="absolute bottom-0 w-full bg-signal-critical rounded-lg transition-all duration-500 group-hover:brightness-110"
                  style={{ height: `${Math.max(sentimentDistribution.negative, 5)}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Labels séparés en bas */}
          <div className="flex justify-between px-2">
            <span className="flex-1 text-center text-xs text-muted-foreground font-medium">Positif</span>
            <span className="flex-1 text-center text-xs text-muted-foreground font-medium">Neutre</span>
            <span className="flex-1 text-center text-xs text-muted-foreground font-medium">Négatif</span>
          </div>
        </CardContent>
      </Card>

      {/* Widget : Sentiment Health Monitor */}
      <Card className={cn(
        "border-border/50 transition-colors",
        sentimentHealth.alertActive && "border-destructive/50 bg-destructive/5"
      )}>
        <CardContent className="p-5">
          <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" /> Moniteur Sentiment
            {sentimentHealth.alertActive && (
              <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-destructive normal-case">
                <AlertTriangle className="h-3 w-3" /> Seuil critique
              </span>
            )}
          </h3>

          {/* Overall score + enrichment progress */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-2xl font-black",
                sentimentHealth.overallAvg > 0.1 ? "text-green-600 dark:text-green-400" :
                sentimentHealth.overallAvg < -0.1 ? "text-red-600 dark:text-red-400" :
                "text-muted-foreground"
              )}>
                {sentimentHealth.overallAvg > 0 ? '+' : ''}{sentimentHealth.overallAvg.toFixed(2)}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                Score<br/>global
              </span>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-xs">
                  {sentimentHealth.pendingCount > 0 ? (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      {sentimentHealth.pendingCount} en attente
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3" />
                      100% enrichi
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {sentimentHealth.enrichedCount} analysés / {sentimentHealth.enrichedCount + sentimentHealth.pendingCount} total
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Enrichment progress bar */}
          {sentimentHealth.pendingCount > 0 && (
            <div className="mb-4">
              <Progress 
                value={(sentimentHealth.enrichedCount / (sentimentHealth.enrichedCount + sentimentHealth.pendingCount)) * 100} 
                className="h-1.5"
              />
            </div>
          )}

          {/* Per-category breakdown */}
          {sentimentHealth.byCategory.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Par catégorie</p>
              {sentimentHealth.byCategory.map(cat => (
                <div key={cat.category} className="flex items-center gap-2 text-xs">
                  <span className={cn(
                    "w-3 h-3 rounded-sm shrink-0",
                    cat.alert ? "bg-red-500/80" :
                    cat.avgSentiment > 0.1 ? "bg-green-500/60" :
                    "bg-muted-foreground/40"
                  )} />
                  <span className="truncate flex-1 text-foreground">{cat.category}</span>
                  <span className="text-muted-foreground">({cat.count})</span>
                  <span className={cn(
                    "font-semibold w-10 text-right",
                    cat.alert ? "text-red-600 dark:text-red-400" :
                    cat.avgSentiment > 0.1 ? "text-green-600 dark:text-green-400" :
                    "text-muted-foreground"
                  )}>
                    {cat.avgSentiment > 0 ? '+' : ''}{cat.avgSentiment.toFixed(1)}
                  </span>
                  {cat.alert && <AlertTriangle className="h-3 w-3 text-red-500 shrink-0" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardContent className="p-5 min-h-[140px]">
          <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
            <Hash className="h-3.5 w-3.5" /> Concepts Clés
          </h3>
          
          {topConcepts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-20 text-muted-foreground/50">
              <AlertCircle className="h-5 w-5 mb-1 opacity-50" />
              <span className="text-xs">En attente d'analyse...</span>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topConcepts.slice(0, 8).map((concept) => (
                <Button
                  key={concept.tag}
                  variant="ghost"
                  size="sm"
                  onClick={() => onFilterChange(concept.tag)}
                  className={cn(
                    "px-2.5 py-1 h-auto rounded-md text-xs font-medium transition-colors border",
                    activeFilters.includes(concept.tag)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/30 text-foreground border-border/50 hover:border-primary/50 hover:text-primary"
                  )}
                >
                  #{concept.tag}
                  <span className="ml-1 opacity-60">({concept.count})</span>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Widget : Top Sources */}
      <Card className="border-border/50">
        <CardContent className="p-5">
          <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
            <Globe className="h-3.5 w-3.5" /> Top Sources (24h)
          </h3>
          <ul className="space-y-2.5">
            {topSources.slice(0, 5).map((source, i) => (
              <li 
                key={source.name} 
                className="flex justify-between items-center text-sm group cursor-pointer"
                onClick={() => onSourceClick?.(source.name)}
              >
                <span className="text-foreground group-hover:text-primary transition-colors truncate">
                  {source.name}
                </span>
                <span className={cn(
                  "font-bold bg-muted px-2 py-0.5 rounded text-xs",
                  i === 0 ? "text-primary" : "text-muted-foreground"
                )}>
                  {source.count}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Widget : Personnalités Tendance */}
      {trendingPeople.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="p-5">
            <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5" /> Personnalités citées
            </h3>
            <ul className="space-y-2.5">
              {trendingPeople.slice(0, 5).map((person, i) => (
                <li 
                  key={person.name} 
                  className="flex justify-between items-center text-sm group cursor-pointer"
                  onClick={() => onPersonClick?.(person.name)}
                >
                  <span className="flex items-center gap-2 text-foreground group-hover:text-primary transition-colors">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="truncate">{person.name}</span>
                  </span>
                  <span className={cn(
                    "font-bold bg-muted px-2 py-0.5 rounded text-xs",
                    i === 0 ? "text-primary" : "text-muted-foreground"
                  )}>
                    {person.mentions}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
