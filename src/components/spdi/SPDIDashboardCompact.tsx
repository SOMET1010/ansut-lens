import { useState } from 'react';
import { Activity, TrendingUp, TrendingDown, Lightbulb, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import type { RecommandationSPDI } from '@/types';
import { MiniSparkline } from './MiniSparkline';
import { SentimentBar } from './SentimentBar';
import { PresenceCanaux } from './PresenceCanaux';
import { ShareOfVoiceDonut } from './ShareOfVoiceDonut';
import { SPDIRecommandations } from './SPDIRecommandations';
import { useActeurDigitalDashboard, type Periode } from '@/hooks/useActeurDigitalDashboard';
import { cn } from '@/lib/utils';
import type { Personnalite, Tendance } from '@/types';

interface SPDIDashboardCompactProps {
  personnalite: Personnalite;
  suiviActif: boolean;
  scoreSPDI: number;
  tendance: Tendance;
  onToggleSuivi: () => void;
  toggleLoading: boolean;
  recommandations?: RecommandationSPDI[];
  onLancerCalcul?: () => void;
  calculLoading?: boolean;
  hasMetrique: boolean;
}

const getSPDIColor = (score: number) => {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 60) return 'text-blue-600 dark:text-blue-400';
  if (score >= 40) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

const PERIODES: { value: Periode; label: string }[] = [
  { value: '7j', label: '7j' },
  { value: '30j', label: '30j' },
  { value: '1an', label: '1an' },
];

export function SPDIDashboardCompact({
  personnalite,
  suiviActif,
  scoreSPDI,
  tendance,
  onToggleSuivi,
  toggleLoading,
  recommandations,
  onLancerCalcul,
  calculLoading,
  hasMetrique,
}: SPDIDashboardCompactProps) {
  const [periode, setPeriode] = useState<Periode>('30j');

  const dashboard = useActeurDigitalDashboard(
    suiviActif ? personnalite.id : undefined,
    personnalite.cercle,
    periode
  );

  const variation = dashboard.sparklineData.length >= 2
    ? ((dashboard.sparklineData[dashboard.sparklineData.length - 1] - dashboard.sparklineData[0]) / (dashboard.sparklineData[0] || 1) * 100)
    : 0;

  const thematiques = [
    ...(personnalite.thematiques ?? []),
    ...dashboard.topThematiques,
  ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 6);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Activity className="h-4 w-4" />
          Présence Digitale Institutionnelle
        </h3>
        {suiviActif && hasMetrique && (
          <div className="flex rounded-md border border-border overflow-hidden">
            {PERIODES.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriode(p.value)}
                className={cn(
                  'px-2 py-0.5 text-[10px] font-medium transition-colors',
                  periode === p.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg mb-3">
        <div>
          <Label className="text-sm font-medium">Suivi SPDI</Label>
          <p className="text-xs text-muted-foreground">Activer le suivi de présence digitale</p>
        </div>
        <Switch checked={suiviActif} onCheckedChange={onToggleSuivi} disabled={toggleLoading} />
      </div>

      {suiviActif && hasMetrique && (
        <div className="space-y-3">
          {/* Bloc A: Vitalité Digitale */}
          <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Vitalité Digitale</span>
              {dashboard.sparklineData.length >= 2 && (
                <div className={cn('flex items-center gap-0.5 text-[11px] font-bold', variation >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                  {variation >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {variation >= 0 ? '+' : ''}{variation.toFixed(1)}%
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className={cn('text-2xl font-black', getSPDIColor(scoreSPDI))}>
                {Math.round(scoreSPDI)}
              </span>
              {dashboard.isLoading ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <MiniSparkline data={dashboard.sparklineData} width={100} height={28} />
              )}
            </div>
          </div>

          {/* Bloc B: Sentiment */}
          <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Sentiment</span>
            {dashboard.isLoading ? (
              <Skeleton className="h-4 w-full" />
            ) : (
              <SentimentBar {...dashboard.sentimentDistribution} />
            )}
          </div>

          {/* Bloc C + D: Canaux & Share of Voice */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Canaux</span>
              {dashboard.isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <PresenceCanaux {...dashboard.canauxPresence} />
              )}
            </div>
            <div className="p-3 bg-muted/20 rounded-lg border border-border/50">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">Part de Voix</span>
              {dashboard.isLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <ShareOfVoiceDonut {...dashboard.shareOfVoice} />
              )}
            </div>
          </div>

          {/* Bloc E: Thématiques */}
          {thematiques.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {thematiques.map((t) => (
                <Badge key={t} variant="outline" className="text-[10px] px-2 py-0.5">
                  #{t}
                </Badge>
              ))}
            </div>
          )}

          {/* Bloc F: IA Insights */}
          {recommandations && recommandations.length > 0 && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">IA Insights</span>
              </div>
              <SPDIRecommandations recommandations={recommandations.slice(0, 2)} compact />
            </div>
          )}
        </div>
      )}

      {suiviActif && !hasMetrique && (
        <div className="text-center py-4 space-y-2">
          <p className="text-xs text-muted-foreground">Aucune métrique disponible.</p>
          {onLancerCalcul && (
            <Button variant="outline" size="sm" className="gap-1.5" disabled={calculLoading} onClick={onLancerCalcul}>
              <Zap className="h-3.5 w-3.5" />
              {calculLoading ? 'Calcul en cours…' : 'Lancer le premier calcul'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
