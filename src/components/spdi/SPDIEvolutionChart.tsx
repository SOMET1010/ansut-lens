import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { EvolutionSPDI } from '@/types';

interface SPDIEvolutionChartProps {
  evolution: EvolutionSPDI;
  onPeriodeChange?: (periode: '7j' | '30j' | '90j') => void;
}

export function SPDIEvolutionChart({ evolution, onPeriodeChange }: SPDIEvolutionChartProps) {
  const { historique, periode, variation, tendance } = evolution;

  const data = historique.map(h => ({
    date: h.date,
    score: h.score,
    dateFormatted: format(parseISO(h.date), 'd MMM', { locale: fr }),
  }));

  const moyenneScore = data.length > 0 
    ? data.reduce((sum, d) => sum + d.score, 0) / data.length 
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Évolution du Score</CardTitle>
          {onPeriodeChange && (
            <Tabs value={periode} onValueChange={(v) => onPeriodeChange(v as '7j' | '30j' | '90j')}>
              <TabsList className="h-8">
                <TabsTrigger value="7j" className="text-xs px-2 py-1">7j</TabsTrigger>
                <TabsTrigger value="30j" className="text-xs px-2 py-1">30j</TabsTrigger>
                <TabsTrigger value="90j" className="text-xs px-2 py-1">90j</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
        
        {/* Résumé variation */}
        <div className="flex items-center gap-2 mt-2">
          <span className={`text-sm font-medium ${
            variation > 0 ? 'text-green-500' : variation < 0 ? 'text-red-500' : 'text-muted-foreground'
          }`}>
            {variation > 0 ? '+' : ''}{variation}%
          </span>
          <span className="text-xs text-muted-foreground">sur {periode}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="hsl(var(--border))" 
                vertical={false}
              />
              <XAxis 
                dataKey="dateFormatted" 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                domain={[0, 100]}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-popover border rounded-lg p-2 shadow-lg">
                        <p className="text-xs text-muted-foreground">
                          {format(parseISO(data.date), 'd MMMM yyyy', { locale: fr })}
                        </p>
                        <p className="text-primary font-bold">{data.score.toFixed(1)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine 
                y={moyenneScore} 
                stroke="hsl(var(--muted-foreground))" 
                strokeDasharray="5 5"
                label={{ 
                  value: `Moy: ${moyenneScore.toFixed(0)}`, 
                  position: 'right',
                  fill: 'hsl(var(--muted-foreground))',
                  fontSize: 10,
                }}
              />
              <Line
                type="monotone"
                dataKey="score"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
