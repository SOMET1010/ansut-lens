import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

const COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 71%, 45%)',   // green
  'hsl(38, 92%, 50%)',    // amber
  'hsl(280, 65%, 60%)',   // purple
  'hsl(190, 90%, 50%)',   // cyan
  'hsl(350, 80%, 55%)',   // rose
  'hsl(160, 60%, 45%)',   // teal
  'hsl(30, 80%, 55%)',    // orange
];

interface ActeurOption {
  id: string;
  nom: string;
  prenom: string | null;
  cercle: number | null;
}

export function SPDIComparaisonTemporelle() {
  const [periode, setPeriode] = useState<'7j' | '30j' | '90j'>('30j');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Fetch all SPDI-tracked actors
  const { data: acteurs } = useQuery({
    queryKey: ['spdi-acteurs-compare'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('personnalites')
        .select('id, nom, prenom, cercle')
        .eq('suivi_spdi_actif', true)
        .order('nom');
      if (error) throw error;
      return (data || []) as ActeurOption[];
    },
  });

  // Auto-select first 3 actors
  if (selectedIds.length === 0 && acteurs && acteurs.length > 0) {
    setSelectedIds(acteurs.slice(0, Math.min(3, acteurs.length)).map(a => a.id));
  }

  const jours = periode === '7j' ? 7 : periode === '30j' ? 30 : 90;

  // Fetch metrics for all selected actors
  const { data: chartData, isLoading } = useQuery({
    queryKey: ['spdi-compare-temporal', selectedIds, periode],
    queryFn: async () => {
      if (selectedIds.length === 0) return [];

      const dateDebut = new Date();
      dateDebut.setDate(dateDebut.getDate() - jours);
      const dateStr = dateDebut.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('presence_digitale_metrics')
        .select('personnalite_id, date_mesure, score_spdi')
        .in('personnalite_id', selectedIds)
        .gte('date_mesure', dateStr)
        .order('date_mesure', { ascending: true });

      if (error) throw error;

      // Group by date, pivot by actor
      const dateMap = new Map<string, Record<string, number>>();
      for (const row of data || []) {
        const d = row.date_mesure;
        if (!dateMap.has(d)) dateMap.set(d, {});
        dateMap.get(d)![row.personnalite_id] = Number(row.score_spdi) || 0;
      }

      return Array.from(dateMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, scores]) => ({
          date,
          dateFormatted: format(parseISO(date), 'd MMM', { locale: fr }),
          ...scores,
        }));
    },
    enabled: selectedIds.length > 0,
  });

  const toggleActor = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const getActorLabel = (id: string) => {
    const a = acteurs?.find(x => x.id === id);
    return a ? `${a.prenom || ''} ${a.nom}`.trim() : id.slice(0, 8);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Comparaison temporelle SPDI
          </CardTitle>
          <Tabs value={periode} onValueChange={(v) => setPeriode(v as '7j' | '30j' | '90j')}>
            <TabsList className="h-8">
              <TabsTrigger value="7j" className="text-xs px-2 py-1">7j</TabsTrigger>
              <TabsTrigger value="30j" className="text-xs px-2 py-1">30j</TabsTrigger>
              <TabsTrigger value="90j" className="text-xs px-2 py-1">90j</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {/* Actor selector */}
        <ScrollArea className="max-h-24 mb-4">
          <div className="flex flex-wrap gap-2">
            {acteurs?.map((a, i) => (
              <label
                key={a.id}
                className="flex items-center gap-1.5 text-xs cursor-pointer hover:bg-accent/50 rounded px-2 py-1 transition-colors"
              >
                <Checkbox
                  checked={selectedIds.includes(a.id)}
                  onCheckedChange={() => toggleActor(a.id)}
                  className="h-3.5 w-3.5"
                />
                <span className="truncate max-w-[120px]">{a.prenom} {a.nom}</span>
                <Badge variant="outline" className="text-[9px] px-1">C{a.cercle}</Badge>
              </label>
            ))}
          </div>
        </ScrollArea>

        {/* Chart */}
        {selectedIds.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            Sélectionnez au moins un acteur pour comparer
          </p>
        ) : isLoading ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
            Chargement…
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData || []} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
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
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="bg-popover border rounded-lg p-3 shadow-lg space-y-1">
                        <p className="text-xs text-muted-foreground font-medium">{label}</p>
                        {payload.map((p: any) => (
                          <div key={p.dataKey} className="flex items-center gap-2 text-xs">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.stroke }} />
                            <span className="truncate max-w-[120px]">{getActorLabel(p.dataKey)}</span>
                            <span className="font-bold ml-auto">{Number(p.value).toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }}
                />
                <Legend
                  formatter={(value: string) => (
                    <span className="text-xs">{getActorLabel(value)}</span>
                  )}
                />
                {selectedIds.map((id, i) => (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={id}
                    name={id}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
