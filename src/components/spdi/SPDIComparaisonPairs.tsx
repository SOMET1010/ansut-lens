import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, TrendingDown, Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ComparaisonData {
  monScore: number;
  moyenne: number;
  max: number;
  min: number;
  rang: number;
  total: number;
}

interface SPDIComparaisonPairsProps {
  comparaison: ComparaisonData;
  cercleLabel?: string;
}

export function SPDIComparaisonPairs({ comparaison, cercleLabel = 'du cercle' }: SPDIComparaisonPairsProps) {
  const { monScore, moyenne, max, min, rang, total } = comparaison;
  
  const ecartMoyenne = monScore - moyenne;
  const percentile = ((total - rang) / total) * 100;
  
  const getPositionColor = () => {
    if (percentile >= 75) return 'text-green-500';
    if (percentile >= 50) return 'text-blue-500';
    if (percentile >= 25) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Comparaison avec les pairs {cercleLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Position dans le classement */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Trophy className={cn('h-5 w-5', getPositionColor())} />
            <span className="text-sm font-medium">Votre position</span>
          </div>
          <div className="text-right">
            <span className={cn('text-lg font-bold', getPositionColor())}>
              {rang}/{total}
            </span>
            <p className="text-xs text-muted-foreground">
              Top {(100 - percentile).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Barres de comparaison */}
        <div className="space-y-3">
          {/* Mon score */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">Vous</span>
              <span className="font-bold text-primary">{monScore.toFixed(0)}</span>
            </div>
            <Progress value={monScore} className="h-2" />
          </div>
          
          {/* Moyenne */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Moyenne</span>
              <span className="text-muted-foreground">{moyenne.toFixed(0)}</span>
            </div>
            <div className="relative h-2 bg-muted rounded-full">
              <div 
                className="absolute h-full bg-muted-foreground/50 rounded-full" 
                style={{ width: `${moyenne}%` }}
              />
            </div>
          </div>
          
          {/* Max du cercle */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Maximum</span>
              <span className="text-muted-foreground">{max.toFixed(0)}</span>
            </div>
            <div className="relative h-2 bg-muted rounded-full">
              <div 
                className="absolute h-full bg-green-500/50 rounded-full" 
                style={{ width: `${max}%` }}
              />
            </div>
          </div>
        </div>

        {/* Écart à la moyenne */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">Écart à la moyenne</span>
          <Badge 
            variant={ecartMoyenne >= 0 ? 'default' : 'destructive'}
            className="gap-1"
          >
            {ecartMoyenne >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {ecartMoyenne >= 0 ? '+' : ''}{ecartMoyenne.toFixed(1)} pts
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
