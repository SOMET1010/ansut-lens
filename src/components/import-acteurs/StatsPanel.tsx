import { Users, Target, TrendingUp, Layers } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ActeurGenere {
  cercle: number;
  suivi_spdi_actif: boolean;
  score_influence: number;
  selected?: boolean;
}

interface StatsPanelProps {
  acteurs: ActeurGenere[];
  doublonsCount: number;
}

const CERCLE_LABELS: Record<number, string> = {
  1: 'Tutelle & Régulation',
  2: 'Opérateurs & Acteurs',
  3: 'Partenaires',
  4: 'Observateurs',
};

const CERCLE_COLORS: Record<number, string> = {
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-blue-500',
  4: 'bg-green-500',
};

export function StatsPanel({ acteurs, doublonsCount }: StatsPanelProps) {
  const selected = acteurs.filter(a => a.selected);
  const spdiActif = selected.filter(a => a.suivi_spdi_actif);
  
  // Stats par cercle
  const parCercle = [1, 2, 3, 4].map(cercle => ({
    cercle,
    label: CERCLE_LABELS[cercle],
    count: selected.filter(a => a.cercle === cercle).length,
    color: CERCLE_COLORS[cercle]
  }));

  // Score moyen
  const scoreMoyen = selected.length > 0 
    ? Math.round(selected.reduce((acc, a) => acc + a.score_influence, 0) / selected.length)
    : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Sélectionnés</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{selected.length}</span>
            <span className="text-xs text-muted-foreground">/ {acteurs.length}</span>
          </div>
          {doublonsCount > 0 && (
            <Badge variant="secondary" className="mt-2 text-xs bg-yellow-500/20 text-yellow-400">
              {doublonsCount} doublon{doublonsCount > 1 ? 's' : ''}
            </Badge>
          )}
        </CardContent>
      </Card>

      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-medium">SPDI Actif</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-500">{spdiActif.length}</span>
            <span className="text-xs text-muted-foreground">acteurs suivis</span>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium">Score moyen</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-500">{scoreMoyen}</span>
            <span className="text-xs text-muted-foreground">/ 100</span>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Par cercle</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {parCercle.filter(c => c.count > 0).map(c => (
              <Badge 
                key={c.cercle} 
                variant="outline" 
                className="text-xs px-1.5"
                title={c.label}
              >
                <span className={`w-2 h-2 rounded-full ${c.color} mr-1`} />
                C{c.cercle}: {c.count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
