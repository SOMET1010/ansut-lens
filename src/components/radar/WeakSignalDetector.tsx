import { useState } from 'react';
import { Zap, Radar, ChevronDown, ChevronUp, Globe, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ClusterResult {
  signal_id: string;
  theme: string;
  description: string;
  quadrant: string;
  urgency: string;
  sources: string[];
  articles: string[];
}

const quadrantLabels: Record<string, string> = {
  tech: 'Technologie',
  regulation: 'Régulation',
  market: 'Marché',
  reputation: 'Réputation',
};

const urgencyStyles: Record<string, string> = {
  high: 'bg-signal-critical/10 text-signal-critical border-signal-critical/30',
  medium: 'bg-chart-5/10 text-chart-5 border-chart-5/30',
  low: 'bg-primary/10 text-primary border-primary/30',
};

export function WeakSignalDetector() {
  const [scanning, setScanning] = useState(false);
  const [clusters, setClusters] = useState<ClusterResult[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [hasScanned, setHasScanned] = useState(false);

  const runDetection = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('detecter-signaux-faibles', {
        body: { hours: 48, min_sources: 3 },
      });

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        return;
      }

      setClusters(data?.clusters || []);
      setHasScanned(true);

      if (data?.clusters?.length > 0) {
        toast.success(`${data.clusters.length} signal(x) faible(s) détecté(s)`);
      } else {
        toast.info('Aucun signal faible détecté dans les dernières 48h');
      }
    } catch (err) {
      console.error('Weak signal detection error:', err);
      toast.error('Erreur lors de la détection des signaux faibles');
    } finally {
      setScanning(false);
    }
  };

  return (
    <Card className="border-dashed border-chart-5/40 bg-chart-5/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="h-5 w-5 text-chart-5" />
            Détection de Signaux Faibles
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={runDetection}
            disabled={scanning}
            className="border-chart-5/40 text-chart-5 hover:bg-chart-5/10"
          >
            {scanning ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Radar className="h-4 w-4 mr-2" />
            )}
            {scanning ? 'Analyse en cours…' : 'Scanner (48h)'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Identifie les sujets émergents mentionnés par 3+ sources distinctes en 48h
        </p>
      </CardHeader>

      {hasScanned && (
        <CardContent className="pt-0 space-y-3">
          {clusters.length === 0 ? (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              Aucun signal faible détecté — le paysage médiatique est stable.
            </p>
          ) : (
            clusters.map((cluster) => (
              <div
                key={cluster.signal_id}
                className={cn(
                  "rounded-lg border p-4 transition-colors cursor-pointer",
                  urgencyStyles[cluster.urgency] || urgencyStyles.low
                )}
                onClick={() => setExpanded(expanded === cluster.signal_id ? null : cluster.signal_id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-bold text-sm">{cluster.theme}</span>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                        {quadrantLabels[cluster.quadrant] || cluster.quadrant}
                      </Badge>
                      {cluster.urgency === 'high' && (
                        <AlertTriangle className="h-3.5 w-3.5 text-signal-critical" />
                      )}
                    </div>
                    <p className="text-xs opacity-80 leading-relaxed">{cluster.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="flex items-center gap-1 text-xs font-semibold">
                      <Globe className="h-3 w-3" />
                      {cluster.sources.length}
                    </span>
                    {expanded === cluster.signal_id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </div>

                {expanded === cluster.signal_id && (
                  <div className="mt-3 pt-3 border-t border-current/10">
                    <p className="text-[10px] uppercase tracking-wider font-bold mb-2 opacity-60">
                      Sources convergentes
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {cluster.sources.map((src, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {src}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      )}
    </Card>
  );
}
