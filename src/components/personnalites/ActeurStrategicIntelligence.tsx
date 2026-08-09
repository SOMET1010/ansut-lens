import { useMemo } from 'react';
import { ArrowDown, ArrowUp, Minus, Target, Radio, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { useActeurDigitalDashboard } from '@/hooks/useActeurDigitalDashboard';
import type { Personnalite } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  personnalite: Personnalite;
}

function computeVigilance(p: Personnalite): { label: string; color: string; icon: typeof AlertTriangle } {
  // Reflet FIDÈLE du niveau d'alerte SAISI (champ manuel) — sans en inférer une
  // « hostilité » ou une « volatilité » que la donnée ne porte pas. Le niveau
  // d'alerte dit qu'on surveille l'acteur de près, pas qu'il est hostile.
  if (p.niveau_alerte === 'critique') {
    return { label: 'Vigilance haute', color: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40', icon: AlertTriangle };
  }
  if (p.niveau_alerte === 'eleve') {
    return { label: 'Vigilance élevée', color: 'text-attention bg-attention-soft border-attention-border', icon: AlertTriangle };
  }
  return { label: 'Standard', color: 'text-muted-foreground bg-muted/30 border-border', icon: Radio };
}

function computeDynamique(sparkline: number[]) {
  if (sparkline.length < 2) return { delta: 0, trend: 'stable' as const };
  const first = sparkline[0];
  const last = sparkline[sparkline.length - 1];
  if (first === 0) return { delta: 0, trend: 'stable' as const };
  const delta = Math.round(((last - first) / first) * 100);
  if (delta > 5) return { delta, trend: 'up' as const };
  if (delta < -5) return { delta, trend: 'down' as const };
  return { delta, trend: 'stable' as const };
}

function computeWhyStrategic(p: Personnalite): string[] {
  const reasons: string[] = [];
  if (p.cercle === 1) reasons.push('Décisionnaire direct sur l\'écosystème ANSUT');
  if (p.categorie === 'regulateur') reasons.push('Pilote la régulation télécom / numérique');
  if (p.categorie === 'politique') reasons.push('Influe sur les arbitrages gouvernementaux');
  if (p.categorie === 'bailleur') reasons.push('Capacité de financement de projets stratégiques');
  if (p.categorie === 'operateur' || p.categorie === 'fai') reasons.push('Acteur clé du déploiement FTTH / connectivité');
  if (p.categorie === 'media') reasons.push('Relais d\'opinion à forte audience');
  if (p.thematiques?.includes('IA') || p.thematiques?.some(t => t.toLowerCase().includes('innovation'))) {
    reasons.push('Voix forte sur l\'innovation / IA');
  }
  if (reasons.length === 0) reasons.push('Acteur identifié sur l\'écosystème télécom / numérique');
  return reasons.slice(0, 4);
}

export function ActeurStrategicIntelligence({ personnalite }: Props) {
  const dashboard = useActeurDigitalDashboard(
    personnalite.id,
    personnalite.cercle,
    '30j',
    `${personnalite.prenom ?? ''} ${personnalite.nom}`.trim()
  );

  const vigilance = useMemo(() => computeVigilance(personnalite), [personnalite]);
  const dynamique = useMemo(() => computeDynamique(dashboard.sparklineData), [dashboard.sparklineData]);
  const whyStrategic = useMemo(() => computeWhyStrategic(personnalite), [personnalite]);

  const VigilanceIcon = vigilance.icon;
  const TrendIcon = dynamique.trend === 'up' ? TrendingUp : dynamique.trend === 'down' ? TrendingDown : Minus;
  const trendColor = dynamique.trend === 'up' ? 'text-green-600' : dynamique.trend === 'down' ? 'text-red-600' : 'text-muted-foreground';

  return (
    <div className="space-y-5">
      {/* Bandeau Alignement + Dynamique */}
      <div className="grid grid-cols-2 gap-2">
        <div className={cn('p-3 rounded-lg border flex flex-col items-center gap-1', vigilance.color)}>
          <VigilanceIcon className="h-4 w-4" />
          <span className="text-xs uppercase tracking-wide font-semibold opacity-70">Niveau de vigilance</span>
          <span className="text-xs font-bold text-center">{vigilance.label}</span>
        </div>
        <div className={cn('p-3 rounded-lg border flex flex-col items-center gap-1 bg-muted/30', trendColor)}>
          <TrendIcon className="h-4 w-4" />
          <span className="text-xs uppercase tracking-wide font-semibold opacity-70">Dynamique 30j</span>
          <span className="text-xs font-bold">
            {dynamique.delta > 0 ? '+' : ''}{dynamique.delta}%
          </span>
        </div>
      </div>

      {/* Pourquoi stratégique */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <h4 className="text-xs font-bold uppercase tracking-wide text-primary mb-0.5 flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5" />
          Rôle dans l’écosystème
        </h4>
        <p className="text-xs text-muted-foreground mb-2">
          D’après la catégorie et le cercle enregistrés pour cet acteur.
        </p>
        <ul className="space-y-1">
          {whyStrategic.map((r, i) => (
            <li key={i} className="text-xs text-foreground/85 flex items-start gap-1.5">
              <span className="text-primary mt-0.5">›</span>
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* Chronologie / activité récente */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5" />
          Activité récente (30j)
        </h4>
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between p-2 rounded bg-muted/30">
            <span className="text-muted-foreground">Mentions</span>
            <span className="font-semibold">{dashboard.shareOfVoice.monScore}</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-muted/30">
            <span className="text-muted-foreground">Part de voix (cercle)</span>
            <span className="font-semibold">{dashboard.shareOfVoice.sharePercent}%</span>
          </div>
          <div className="flex items-center justify-between p-2 rounded bg-muted/30">
            <span className="text-muted-foreground">Tendance SPDI</span>
            <span className={cn('font-semibold flex items-center gap-1', trendColor)}>
              {dynamique.trend === 'up' && <ArrowUp className="h-3 w-3" />}
              {dynamique.trend === 'down' && <ArrowDown className="h-3 w-3" />}
              {dynamique.trend === 'stable' && <Minus className="h-3 w-3" />}
              {dynamique.delta > 0 ? '+' : ''}{dynamique.delta}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
