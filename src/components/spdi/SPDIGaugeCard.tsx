import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { INTERPRETATION_LABELS, getInterpretationFromScore } from '@/hooks/usePresenceDigitale';
import type { Tendance } from '@/types';

interface SPDIGaugeCardProps {
  score: number;
  variation?: number;
  tendance?: Tendance;
  compact?: boolean;
}

export function SPDIGaugeCard({ score, variation = 0, tendance = 'stable', compact = false }: SPDIGaugeCardProps) {
  const interpretation = getInterpretationFromScore(score);
  const interpretationInfo = INTERPRETATION_LABELS[interpretation];
  
  // Calcul de l'angle pour la jauge (180 degrés max)
  const angle = (score / 100) * 180;
  
  // Couleur basée sur le score
  const getScoreColor = () => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-blue-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };
  
  const getGradient = () => {
    if (score >= 80) return 'from-green-500 to-green-400';
    if (score >= 60) return 'from-blue-500 to-blue-400';
    if (score >= 40) return 'from-orange-500 to-orange-400';
    return 'from-red-500 to-red-400';
  };

  const TrendIcon = tendance === 'up' ? TrendingUp : tendance === 'down' ? TrendingDown : Minus;
  const trendColor = tendance === 'up' ? 'text-green-500' : tendance === 'down' ? 'text-red-500' : 'text-muted-foreground';

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className={cn('text-2xl font-bold', getScoreColor())}>
          {Math.round(score)}
        </div>
        <div className="flex items-center gap-1">
          <TrendIcon className={cn('h-4 w-4', trendColor)} />
          <span className={cn('text-sm', trendColor)}>
            {variation > 0 ? '+' : ''}{variation}%
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="text-center">
          <h3 className="text-sm font-medium text-muted-foreground mb-4">
            Score de Présence Digitale
          </h3>
          
          {/* Jauge semi-circulaire */}
          <div className="relative w-40 h-20 mx-auto mb-4">
            {/* Background arc */}
            <div className="absolute inset-0">
              <svg viewBox="0 0 160 80" className="w-full h-full">
                <path
                  d="M 10 70 A 60 60 0 0 1 150 70"
                  fill="none"
                  stroke="hsl(var(--muted))"
                  strokeWidth="12"
                  strokeLinecap="round"
                />
                <path
                  d="M 10 70 A 60 60 0 0 1 150 70"
                  fill="none"
                  stroke={`url(#gradient-${interpretation})`}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeDasharray={`${(score / 100) * 220} 220`}
                  className="transition-all duration-1000"
                />
                <defs>
                  <linearGradient id={`gradient-${interpretation}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" className={cn('stop-color-current', getScoreColor().replace('text-', 'fill-'))} />
                    <stop offset="100%" className={cn('stop-color-current', getScoreColor().replace('text-', 'fill-'))} style={{ stopOpacity: 0.7 }} />
                  </linearGradient>
                </defs>
              </svg>
            </div>
            
            {/* Score central */}
            <div className="absolute inset-0 flex items-end justify-center pb-1">
              <span className={cn('text-4xl font-bold', getScoreColor())}>
                {Math.round(score)}
              </span>
            </div>
          </div>
          
          {/* Variation */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <TrendIcon className={cn('h-4 w-4', trendColor)} />
            <span className={cn('text-sm font-medium', trendColor)}>
              {variation > 0 ? '+' : ''}{variation}% sur 30 jours
            </span>
          </div>
          
          {/* Interprétation */}
          <div className={cn('text-sm font-medium', interpretationInfo.color)}>
            {interpretationInfo.label}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {interpretationInfo.description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
