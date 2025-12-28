import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { AxesSPDI } from '@/types';

interface SPDIAxesRadarProps {
  axes: AxesSPDI;
  showCard?: boolean;
}

const AXES_LABELS = {
  visibilite: { label: 'Visibilité', poids: '30%' },
  qualite: { label: 'Qualité', poids: '25%' },
  autorite: { label: 'Autorité', poids: '25%' },
  presence: { label: 'Présence', poids: '20%' },
};

export function SPDIAxesRadar({ axes, showCard = true }: SPDIAxesRadarProps) {
  const data = [
    { 
      axe: 'Visibilité', 
      score: axes.visibilite.score, 
      fullMark: 100,
      detail: `${axes.visibilite.nb_mentions} mentions, ${axes.visibilite.nb_sources} sources`
    },
    { 
      axe: 'Qualité', 
      score: axes.qualite.score, 
      fullMark: 100,
      detail: `Sentiment: ${(axes.qualite.sentiment_moyen * 100).toFixed(0)}%`
    },
    { 
      axe: 'Autorité', 
      score: axes.autorite.score, 
      fullMark: 100,
      detail: `${axes.autorite.citations_directes} citations directes`
    },
    { 
      axe: 'Présence', 
      score: axes.presence.score, 
      fullMark: 100,
      detail: `LinkedIn: ${axes.presence.activite_linkedin} posts`
    },
  ];

  const content = (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
          <PolarGrid 
            gridType="polygon" 
            stroke="hsl(var(--border))"
          />
          <PolarAngleAxis 
            dataKey="axe" 
            tick={{ 
              fill: 'hsl(var(--muted-foreground))', 
              fontSize: 12 
            }}
          />
          <PolarRadiusAxis 
            angle={30} 
            domain={[0, 100]} 
            tick={{ 
              fill: 'hsl(var(--muted-foreground))', 
              fontSize: 10 
            }}
          />
          <Radar
            name="Score"
            dataKey="score"
            stroke="hsl(var(--primary))"
            fill="hsl(var(--primary))"
            fillOpacity={0.3}
            strokeWidth={2}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <div className="bg-popover border rounded-lg p-2 shadow-lg">
                    <p className="font-medium text-sm">{data.axe}</p>
                    <p className="text-primary font-bold">{data.score.toFixed(0)}%</p>
                    <p className="text-xs text-muted-foreground">{data.detail}</p>
                  </div>
                );
              }
              return null;
            }}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );

  if (!showCard) return content;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Axes du Score SPDI</CardTitle>
      </CardHeader>
      <CardContent>
        {content}
        
        {/* Légende des axes */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          {Object.entries(AXES_LABELS).map(([key, { label, poids }]) => {
            const axeData = axes[key as keyof AxesSPDI];
            return (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{label} ({poids})</span>
                <span className="font-medium">{axeData.score.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
