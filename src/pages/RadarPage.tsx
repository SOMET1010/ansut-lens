import { Target, Newspaper, TrendingUp, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const kpis = [
  { label: 'Mentions', value: 127, change: 12, icon: Target, color: 'text-primary' },
  { label: 'Articles analysés', value: 48, change: 5, icon: Newspaper, color: 'text-secondary' },
  { label: 'Score influence', value: 72, change: 3, icon: TrendingUp, color: 'text-signal-positive' },
  { label: 'Alertes actives', value: 3, change: -1, icon: AlertTriangle, color: 'text-signal-warning' },
];

const signaux = [
  { id: 1, titre: 'Déploiement 5G Abidjan', quadrant: 'tech', niveau: 'info', tendance: 'up' },
  { id: 2, titre: 'Nouvelle réglementation ARTCI', quadrant: 'regulation', niveau: 'warning', tendance: 'stable' },
  { id: 3, titre: 'Concurrence satellite LEO', quadrant: 'market', niveau: 'critical', tendance: 'up' },
  { id: 4, titre: 'Couverture média positive', quadrant: 'reputation', niveau: 'info', tendance: 'up' },
];

const quadrantColors: Record<string, string> = {
  tech: 'bg-primary/20 text-primary border-primary/30',
  regulation: 'bg-secondary/20 text-secondary border-secondary/30',
  market: 'bg-signal-positive/20 text-signal-positive border-signal-positive/30',
  reputation: 'bg-chart-5/20 text-chart-5 border-chart-5/30',
};

const niveauColors: Record<string, string> = {
  info: 'bg-primary',
  warning: 'bg-signal-warning',
  critical: 'bg-signal-critical',
};

export default function RadarPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold">Centre de Commandement</h1>
        <p className="text-muted-foreground">Vue d'ensemble de la veille stratégique ANSUT</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="glass">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className={`text-xs ${kpi.change > 0 ? 'text-signal-positive' : 'text-signal-negative'}`}>
                {kpi.change > 0 ? '+' : ''}{kpi.change}% vs hier
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Radar Visuel */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Radar Stratégique</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {['tech', 'regulation', 'market', 'reputation'].map((quadrant) => (
              <div key={quadrant} className={`p-4 rounded-lg border ${quadrantColors[quadrant]}`}>
                <h3 className="font-semibold capitalize mb-3">{quadrant === 'tech' ? 'Technologie' : quadrant === 'regulation' ? 'Régulation' : quadrant === 'market' ? 'Marché' : 'Réputation'}</h3>
                <div className="space-y-2">
                  {signaux.filter(s => s.quadrant === quadrant).map((signal) => (
                    <div key={signal.id} className="flex items-center justify-between p-2 rounded bg-background/50">
                      <span className="text-sm">{signal.titre}</span>
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${niveauColors[signal.niveau]} animate-pulse`} />
                        <span className="text-xs">{signal.tendance === 'up' ? '↑' : signal.tendance === 'down' ? '↓' : '→'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Timeline Intelligence</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {['08:00 - Pic mentions Twitter sur service universel', '10:30 - Article RTI sur connectivité rurale', '14:00 - Déclaration DG Orange CI sur investissements'].map((event, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-sm">{event}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
