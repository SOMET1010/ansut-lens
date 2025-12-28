import { useState } from 'react';
import { Target, Newspaper, TrendingUp, AlertTriangle, Clock, RefreshCw, Wifi, WifiOff, Radio, Brain, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { RelativeTime, FreshnessBadge } from '@/components/ui/relative-time';
import { useRadarKPIs, useRadarSignaux, useRadarTimeline, useLastCollecteTime, type PeriodFilter } from '@/hooks/useRadarData';

const quadrantColors: Record<string, string> = {
  tech: 'bg-primary/20 text-primary border-primary/30',
  regulation: 'bg-secondary/20 text-secondary border-secondary/30',
  market: 'bg-signal-positive/20 text-signal-positive border-signal-positive/30',
  reputation: 'bg-chart-5/20 text-chart-5 border-chart-5/30',
};

const quadrantLabels: Record<string, string> = {
  tech: 'Technologie',
  regulation: 'Régulation',
  market: 'Marché',
  reputation: 'Réputation',
};

const niveauColors: Record<string, string> = {
  info: 'bg-primary',
  warning: 'bg-signal-warning',
  critical: 'bg-signal-critical',
};

const periodLabels: Record<PeriodFilter, string> = {
  '24h': 'Dernières 24h',
  '7j': '7 jours',
  '30j': '30 jours',
};

export default function RadarPage() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<PeriodFilter>('24h');
  
  const { data: kpis, isLoading: kpisLoading, isFetching: kpisFetching } = useRadarKPIs(period);
  const { data: signaux, isLoading: signauxLoading } = useRadarSignaux();
  const { data: timeline, isLoading: timelineLoading } = useRadarTimeline();
  const { data: lastCollecte } = useLastCollecteTime();

  const isConnected = !kpisLoading && kpis !== undefined;

  const kpiItems = [
    { label: 'Mentions', value: kpis?.mentions ?? 0, icon: Target, color: 'text-primary' },
    { label: 'Articles analysés', value: kpis?.articles ?? 0, icon: Newspaper, color: 'text-secondary' },
    { label: 'Score influence moy.', value: kpis?.scoreInfluence ?? 0, icon: TrendingUp, color: 'text-signal-positive' },
    { label: 'Alertes actives', value: kpis?.alertesActives ?? 0, icon: AlertTriangle, color: 'text-signal-warning' },
  ];

  // Group signals by quadrant
  const signalsByQuadrant = (signaux || []).reduce((acc, signal) => {
    const quadrant = signal.quadrant || 'tech';
    if (!acc[quadrant]) acc[quadrant] = [];
    acc[quadrant].push(signal);
    return acc;
  }, {} as Record<string, typeof signaux>);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with date and status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Centre de Commandement</h1>
          <p className="text-muted-foreground">
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
            <span>{isConnected ? 'Connecté' : 'Hors ligne'}</span>
          </div>
          
          {lastCollecte && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Dernière collecte : </span>
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
        <TabsList>
          {Object.entries(periodLabels).map(([key, label]) => (
            <TabsTrigger key={key} value={key}>{label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiItems.map((kpi) => (
          <Card key={kpi.label} className="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              {kpisLoading ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{kpi.value}</div>
                  <p className="text-xs text-muted-foreground">
                    {periodLabels[period]}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mégatendances SUT & IA */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="glass border-blue-500/30 bg-blue-500/5 cursor-pointer hover:bg-blue-500/10 transition-colors" onClick={() => navigate('/dossiers?cat=sut')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Radio className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <span className="text-blue-500">Service Universel des Télécommunications</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">Socle de l'inclusion numérique</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Connectivité rurale, accès universel au numérique, réduction des fractures territoriales et sociales.
            </p>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-blue-500 border-blue-500/30">Axe prioritaire</Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-orange-500/30 bg-orange-500/5 cursor-pointer hover:bg-orange-500/10 transition-colors" onClick={() => navigate('/dossiers?cat=ia')}>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Brain className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <span className="text-orange-500">Intelligence Artificielle</span>
                <p className="text-xs font-normal text-muted-foreground mt-0.5">Accélérateur des services publics</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              IA souveraine, éthique, régulation et démocratisation pour éviter l'exclusion numérique.
            </p>
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-orange-500 border-orange-500/30">Axe prioritaire</Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Radar Visuel */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Radar Stratégique
            <Badge variant="outline" className="font-normal">
              {(signaux || []).length} signaux actifs
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {signauxLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-40" />
              ))}
            </div>
          ) : Object.keys(signalsByQuadrant).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucun signal de veille actif pour le moment</p>
              <p className="text-sm mt-2">Les signaux apparaîtront ici lors des prochaines collectes</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {['tech', 'regulation', 'market', 'reputation'].map((quadrant) => (
                <div key={quadrant} className={`p-4 rounded-lg border ${quadrantColors[quadrant]}`}>
                  <h3 className="font-semibold mb-3">{quadrantLabels[quadrant]}</h3>
                  <div className="space-y-2">
                    {(signalsByQuadrant[quadrant] || []).slice(0, 3).map((signal) => (
                      <div key={signal.id} className="flex items-center justify-between p-2 rounded bg-background/50">
                        <div className="flex-1 min-w-0">
                          <span className="text-sm truncate block">{signal.titre}</span>
                          {signal.date_detection && (
                            <RelativeTime 
                              date={signal.date_detection} 
                              className="text-xs"
                            />
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-2">
                          {signal.date_detection && (
                            <FreshnessBadge date={signal.date_detection} />
                          )}
                          <span className={`h-2 w-2 rounded-full ${niveauColors[signal.niveau] || niveauColors.info}`} />
                          <span className="text-xs">
                            {signal.tendance === 'up' ? '↑' : signal.tendance === 'down' ? '↓' : '→'}
                          </span>
                        </div>
                      </div>
                    ))}
                    {(!signalsByQuadrant[quadrant] || signalsByQuadrant[quadrant].length === 0) && (
                      <p className="text-sm text-muted-foreground py-2">Aucun signal</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Timeline Intelligence
            <Badge variant="outline" className="font-normal">
              {(timeline || []).length} événements
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timelineLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12" />
              ))}
            </div>
          ) : (timeline || []).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Newspaper className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p>Aucune actualité récente</p>
              <p className="text-sm mt-1">Les événements apparaîtront après la prochaine collecte</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(timeline || []).map((event) => (
                <div 
                  key={event.id} 
                  className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex flex-col items-center gap-1">
                    {event.date_publication && (
                      <FreshnessBadge date={event.date_publication} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{event.titre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {event.date_publication && (
                        <RelativeTime 
                          date={event.date_publication} 
                          showExact 
                          className="text-xs"
                        />
                      )}
                      {event.source_nom && (
                        <span className="text-xs text-muted-foreground">• {event.source_nom}</span>
                      )}
                      {event.categorie && (
                        <Badge variant="outline" className="text-xs py-0">
                          {event.categorie}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {event.importance && event.importance > 70 && (
                    <Badge variant="destructive" className="shrink-0">Important</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
