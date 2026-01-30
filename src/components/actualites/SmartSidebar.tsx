import { BarChart2, Hash, Globe, User, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

interface SmartSidebarProps {
  analytics: SidebarAnalytics;
  activeFilters: string[];
  onFilterChange: (tag: string) => void;
  onPersonClick?: (name: string) => void;
  onSourceClick?: (source: string) => void;
}

export function SmartSidebar({ 
  analytics, 
  activeFilters, 
  onFilterChange,
  onPersonClick,
  onSourceClick 
}: SmartSidebarProps) {
  const { sentimentDistribution, topConcepts, topSources, trendingPeople } = analytics;

  return (
    <div className="space-y-5">
      {/* Widget : Analyse de Sentiment (Structure corrigée) */}
      <Card className="border-border/50">
        <CardContent className="p-5">
          <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
            <BarChart2 className="h-3.5 w-3.5" /> Tonalité du jour
          </h3>
          
          {/* Zone des barres - hauteur fixe avec position relative */}
          <div className="flex items-end justify-between gap-3 h-24 px-2 mb-2">
            {/* Barre Positif */}
            <div className="flex-1 h-full relative group cursor-pointer">
              {/* Pourcentage au hover */}
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-signal-positive opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
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
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
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
              <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-signal-critical opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-10">
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

      {/* Widget : Concepts Clés (avec état vide) */}
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
