import { useState } from 'react';
import { Wifi, WifiOff, Clock, RefreshCw } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RelativeTime } from '@/components/ui/relative-time';
import { 
  useRadarKPIs, 
  useRadarSignaux, 
  useIntelligenceFeed, 
  useLastCollecteTime, 
  type PeriodFilter 
} from '@/hooks/useRadarData';
import {
  DailyBriefing,
  CriticalAlertBanner,
  IntelligenceFeed,
  CompactRadar,
  SocialPulseWidget,
  RadarKpiTiles,
  RealtimeAlertFeed,
} from '@/components/radar';

const periodLabels: Record<PeriodFilter, string> = {
  '24h': 'Dernières 24h',
  '7j': '7 jours',
  '30j': '30 jours',
};

export default function RadarPage() {
  const [period, setPeriod] = useState<PeriodFilter>('24h');
  
  const { data: kpis, isLoading: kpisLoading, isFetching: kpisFetching } = useRadarKPIs(period);
  const { data: signaux, isLoading: signauxLoading } = useRadarSignaux();
  const { data: actualites, isLoading: actualitesLoading } = useIntelligenceFeed(50);
  const { data: lastCollecte } = useLastCollecteTime();

  const isConnected = !kpisLoading && kpis !== undefined;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header with date and status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Centre de Veille Stratégique</h1>
          <p className="text-sm text-muted-foreground">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-signal-positive" />
            ) : (
              <WifiOff className="h-4 w-4 text-signal-critical" />
            )}
            <span className="hidden sm:inline">{isConnected ? 'Connecté' : 'Hors ligne'}</span>
          </div>
          
          {lastCollecte && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Dernière collecte : </span>
              <RelativeTime date={lastCollecte} />
            </div>
          )}
          
          {kpisFetching && (
            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Period selector */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodFilter)}>
        <TabsList className="h-9">
          {Object.entries(periodLabels).map(([key, label]) => (
            <TabsTrigger key={key} value={key} className="text-sm">{label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* KPI Tiles */}
      <RadarKpiTiles
        mentions={kpis?.mentions ?? 0}
        articles={kpis?.articles ?? 0}
        alertesActives={kpis?.alertesActives ?? 0}
        scoreInfluence={kpis?.scoreInfluence ?? 0}
        periodLabel={periodLabels[period]}
        isLoading={kpisLoading}
      />

      {/* Daily Briefing */}
      <DailyBriefing />

      {/* Critical Alert Banner */}
      <CriticalAlertBanner 
        signals={signaux || []}
        onViewDetails={() => {
          // TODO: implement signal detail view
        }}
      />

      {/* Realtime Alert Feed */}
      <RealtimeAlertFeed />

      {/* Social Pulse Widget */}
      <SocialPulseWidget />

      {/* Main Intelligence Feed */}
      <IntelligenceFeed 
        actualites={actualites || []}
        isLoading={actualitesLoading}
        lastUpdate={lastCollecte}
      />

      {/* Compact Radar at bottom */}
      <CompactRadar 
        signaux={signaux || []}
        isLoading={signauxLoading}
      />
    </div>
  );
}
