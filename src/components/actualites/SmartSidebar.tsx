import { BarChart2, Hash, Globe, User, TrendingUp } from 'lucide-react';
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
      {/* Widget : Analyse de Sentiment */}
      <Card className="border-border/50">
        <CardContent className="p-5">
          <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
            <BarChart2 className="h-3.5 w-3.5" /> Tonalité du jour
          </h3>
          <div className="flex items-end gap-2 h-16 mb-2">
            {/* Barre Positive */}
            <div className="w-1/3 bg-signal-positive/20 rounded-t-md relative group h-full">
              <div 
                className="absolute bottom-0 w-full bg-signal-positive rounded-t-md transition-all group-hover:bg-signal-positive/90"
                style={{ height: `${sentimentDistribution.positive}%` }}
              />
              <span className="absolute -top-6 text-xs font-bold text-signal-positive w-full text-center">
                {sentimentDistribution.positive}%
              </span>
            </div>
            {/* Barre Neutre */}
            <div className="w-1/3 bg-muted-foreground/20 rounded-t-md relative group h-full">
              <div 
                className="absolute bottom-0 w-full bg-muted-foreground rounded-t-md"
                style={{ height: `${sentimentDistribution.neutral}%` }}
              />
              <span className="absolute -top-6 text-xs font-bold text-muted-foreground w-full text-center">
                {sentimentDistribution.neutral}%
              </span>
            </div>
            {/* Barre Négative */}
            <div className="w-1/3 bg-signal-critical/20 rounded-t-md relative group h-full">
              <div 
                className="absolute bottom-0 w-full bg-signal-critical rounded-t-md"
                style={{ height: `${sentimentDistribution.negative}%` }}
              />
              <span className="absolute -top-6 text-xs font-bold text-signal-critical w-full text-center">
                {sentimentDistribution.negative}%
              </span>
            </div>
          </div>
          <div className="flex justify-between text-xs text-muted-foreground px-1 pt-1">
            <span>Positif</span>
            <span>Neutre</span>
            <span>Négatif</span>
          </div>
        </CardContent>
      </Card>

      {/* Widget : Concepts Clés */}
      <Card className="border-border/50">
        <CardContent className="p-5">
          <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
            <Hash className="h-3.5 w-3.5" /> Concepts Clés
          </h3>
          <div className="flex flex-wrap gap-2">
            {topConcepts.slice(0, 8).map((concept) => (
              <Button
                key={concept.tag}
                variant="ghost"
                size="sm"
                onClick={() => onFilterChange(concept.tag)}
                className={cn(
                  "px-3 py-1.5 h-auto rounded-lg text-xs font-medium transition-colors border",
                  activeFilters.includes(concept.tag)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-muted/50 text-foreground border-border hover:border-primary/50 hover:text-primary"
                )}
              >
                {concept.tag}
                <span className="ml-1 opacity-60">({concept.count})</span>
              </Button>
            ))}
          </div>
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
