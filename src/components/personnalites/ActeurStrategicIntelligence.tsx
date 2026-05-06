import { useMemo } from 'react';
import { Activity, ArrowDown, ArrowUp, Minus, ShieldAlert, Target, Sparkles, Flame, Snowflake, Radio, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useActeurDigitalDashboard } from '@/hooks/useActeurDigitalDashboard';
import { useDerniereMetriqueSPDI } from '@/hooks/usePresenceDigitale';
import type { Personnalite } from '@/types';
import { cn } from '@/lib/utils';

interface Props {
  personnalite: Personnalite;
}

// Dérive 7 sous-scores stratégiques à partir des données existantes
function computeSousScores(p: Personnalite, metrique: any, dashboard: ReturnType<typeof useActeurDigitalDashboard>) {
  const cat = p.categorie || 'autre';
  const cercle = p.cercle ?? 4;
  const inf = p.score_influence ?? 50;
  const spdi = p.score_spdi_actuel ?? 0;
  const linkedinAct = Number(metrique?.activite_linkedin ?? 0);
  const citations = Number(metrique?.nb_citations_directes ?? 0);
  const panels = Number(metrique?.nb_invitations_panels ?? 0);
  const mentions = Number(metrique?.nb_mentions ?? 0);

  // Pondération par cercle (proximité décisionnelle)
  const cercleBoost = cercle === 1 ? 1.2 : cercle === 2 ? 1.0 : cercle === 3 ? 0.85 : 0.7;

  // Institutionnelle : poids cercle + catégorie régulateur/politique/bailleur
  const instBase = ['regulateur', 'politique', 'bailleur'].includes(cat) ? 75 : 45;
  const institutionnelle = Math.min(100, Math.round(instBase * cercleBoost + (inf * 0.2)));

  // Politique : régulateur/politique + influence
  const polBase = ['politique', 'regulateur'].includes(cat) ? 70 : ['bailleur'].includes(cat) ? 55 : 30;
  const politique = Math.min(100, Math.round(polBase + inf * 0.3));

  // Médiatique : citations presse + panels
  const mediatique = Math.min(100, Math.round((citations * 8) + (panels * 6) + (cat === 'media' ? 40 : 0) + 15));

  // Numérique : activité LinkedIn + SPDI
  const numerique = Math.min(100, Math.round(linkedinAct * 4 + spdi * 0.4));

  // Sectorielle : catégorie télécom/numérique
  const secBase = ['operateur', 'fai', 'fintech', 'expert'].includes(cat) ? 75 : 40;
  const sectorielle = Math.min(100, Math.round(secBase + inf * 0.2));

  // Accessibilité : inverse du cercle (C1 = très accessible si interne, mais public C1 = moins)
  const accessibilite = Math.max(15, Math.min(100, Math.round(100 - cercle * 18 + (linkedinAct > 5 ? 10 : 0))));

  return {
    institutionnelle,
    politique,
    mediatique,
    numerique,
    sectorielle,
    accessibilite,
  };
}

function computeAlignement(p: Personnalite): { label: string; color: string; icon: typeof Flame } {
  // Heuristique : niveau_alerte + cercle
  if (p.niveau_alerte === 'critique') return { label: 'Hostile / Volatile', color: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40', icon: Flame };
  if (p.niveau_alerte === 'eleve') return { label: 'Sensible', color: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/40', icon: AlertTriangle };
  if (p.cercle === 1) return { label: 'Aligné', color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/40', icon: Sparkles };
  return { label: 'Neutre', color: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950/40', icon: Snowflake };
}

function computeRisques(p: Personnalite, sentiment: { positif: number; neutre: number; negatif: number }) {
  const total = sentiment.positif + sentiment.neutre + sentiment.negatif;
  const pctNeg = total > 0 ? (sentiment.negatif / total) * 100 : 0;
  const inf = p.score_influence ?? 50;

  const reputation = Math.round(pctNeg * 0.7 + (p.niveau_alerte === 'critique' ? 30 : 0));
  const politiqueRisk = ['politique', 'regulateur'].includes(p.categorie || '') ? Math.round(inf * 0.4 + (p.niveau_alerte === 'critique' ? 40 : 0)) : 20;
  const mediatique = Math.round(pctNeg * 0.5 + (inf > 70 ? 20 : 0));
  const concurrence = ['operateur', 'fai', 'fintech'].includes(p.categorie || '') ? Math.round(inf * 0.5) : 15;

  const sensibilite = Math.max(reputation, politiqueRisk, mediatique, concurrence);

  return { reputation, politique: politiqueRisk, mediatique, concurrence, sensibilite };
}

function getRiskLevel(score: number) {
  if (score >= 65) return { label: 'Élevé', cls: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-300' };
  if (score >= 35) return { label: 'Modéré', cls: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300' };
  return { label: 'Faible', cls: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-950/40 dark:text-green-300' };
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

function computeWhyStrategic(p: Personnalite, sousScores: ReturnType<typeof computeSousScores>): string[] {
  const reasons: string[] = [];
  if (p.cercle === 1) reasons.push('Décisionnaire direct sur l\'écosystème ANSUT');
  if (p.categorie === 'regulateur') reasons.push('Pilote la régulation télécom / numérique');
  if (p.categorie === 'politique') reasons.push('Influe sur les arbitrages gouvernementaux');
  if (p.categorie === 'bailleur') reasons.push('Capacité de financement de projets stratégiques');
  if (p.categorie === 'operateur' || p.categorie === 'fai') reasons.push('Acteur clé du déploiement FTTH / connectivité');
  if (p.categorie === 'media') reasons.push('Relais d\'opinion à forte audience');
  if (sousScores.numerique >= 70) reasons.push('Forte portée numérique exploitable en relais');
  if (sousScores.mediatique >= 70) reasons.push('Visibilité presse récurrente');
  if (p.thematiques?.includes('IA') || p.thematiques?.some(t => t.toLowerCase().includes('innovation'))) {
    reasons.push('Voix forte sur l\'innovation / IA');
  }
  if (reasons.length === 0) reasons.push('Acteur identifié sur l\'écosystème télécom / numérique');
  return reasons.slice(0, 4);
}

const SousScoreRow = ({ label, value, color }: { label: string; value: number; color: string }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-bold', color)}>{value}</span>
    </div>
    <Progress value={value} className="h-1.5" />
  </div>
);

const RiskBadge = ({ label, score }: { label: string; score: number }) => {
  const lvl = getRiskLevel(score);
  return (
    <div className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/30 border border-border/40">
      <span className="text-xs text-foreground/80">{label}</span>
      <Badge variant="outline" className={cn('text-[10px] font-semibold', lvl.cls)}>
        {lvl.label} · {score}
      </Badge>
    </div>
  );
};

export function ActeurStrategicIntelligence({ personnalite }: Props) {
  const { data: metrique } = useDerniereMetriqueSPDI(
    personnalite.suivi_spdi_actif ? personnalite.id : undefined
  );
  const dashboard = useActeurDigitalDashboard(
    personnalite.id,
    personnalite.cercle,
    '30j',
    `${personnalite.prenom ?? ''} ${personnalite.nom}`.trim()
  );

  const sousScores = useMemo(
    () => computeSousScores(personnalite, metrique, dashboard),
    [personnalite, metrique, dashboard]
  );
  const alignement = useMemo(() => computeAlignement(personnalite), [personnalite]);
  const risques = useMemo(
    () => computeRisques(personnalite, dashboard.sentimentDistribution),
    [personnalite, dashboard.sentimentDistribution]
  );
  const dynamique = useMemo(() => computeDynamique(dashboard.sparklineData), [dashboard.sparklineData]);
  const whyStrategic = useMemo(() => computeWhyStrategic(personnalite, sousScores), [personnalite, sousScores]);

  const AlignementIcon = alignement.icon;
  const TrendIcon = dynamique.trend === 'up' ? TrendingUp : dynamique.trend === 'down' ? TrendingDown : Minus;
  const trendColor = dynamique.trend === 'up' ? 'text-green-600' : dynamique.trend === 'down' ? 'text-red-600' : 'text-muted-foreground';

  return (
    <div className="space-y-5">
      {/* Bandeau Alignement + Sensibilité + Dynamique */}
      <div className="grid grid-cols-3 gap-2">
        <div className={cn('p-3 rounded-lg border flex flex-col items-center gap-1', alignement.color)}>
          <AlignementIcon className="h-4 w-4" />
          <span className="text-[10px] uppercase tracking-wide font-semibold opacity-70">Alignement</span>
          <span className="text-xs font-bold text-center">{alignement.label}</span>
        </div>
        <div className={cn('p-3 rounded-lg border flex flex-col items-center gap-1', getRiskLevel(risques.sensibilite).cls)}>
          <ShieldAlert className="h-4 w-4" />
          <span className="text-[10px] uppercase tracking-wide font-semibold opacity-70">Sensibilité</span>
          <span className="text-xs font-bold">{getRiskLevel(risques.sensibilite).label}</span>
        </div>
        <div className={cn('p-3 rounded-lg border flex flex-col items-center gap-1 bg-muted/30', trendColor)}>
          <TrendIcon className="h-4 w-4" />
          <span className="text-[10px] uppercase tracking-wide font-semibold opacity-70">Dynamique 30j</span>
          <span className="text-xs font-bold">
            {dynamique.delta > 0 ? '+' : ''}{dynamique.delta}%
          </span>
        </div>
      </div>

      {/* Pourquoi stratégique */}
      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
        <h4 className="text-xs font-bold uppercase tracking-wide text-primary mb-2 flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5" />
          Pourquoi cet acteur est stratégique
        </h4>
        <ul className="space-y-1">
          {whyStrategic.map((r, i) => (
            <li key={i} className="text-xs text-foreground/85 flex items-start gap-1.5">
              <span className="text-primary mt-0.5">›</span>
              {r}
            </li>
          ))}
        </ul>
      </div>

      {/* Sous-scores d'influence */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
          <Activity className="h-3.5 w-3.5" />
          Décomposition de l'influence
        </h4>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          <SousScoreRow label="Institutionnelle" value={sousScores.institutionnelle} color="text-blue-600 dark:text-blue-400" />
          <SousScoreRow label="Politique" value={sousScores.politique} color="text-orange-600 dark:text-orange-400" />
          <SousScoreRow label="Médiatique" value={sousScores.mediatique} color="text-pink-600 dark:text-pink-400" />
          <SousScoreRow label="Numérique" value={sousScores.numerique} color="text-cyan-600 dark:text-cyan-400" />
          <SousScoreRow label="Sectorielle" value={sousScores.sectorielle} color="text-purple-600 dark:text-purple-400" />
          <SousScoreRow label="Accessibilité" value={sousScores.accessibilite} color="text-emerald-600 dark:text-emerald-400" />
        </div>
      </div>

      {/* Cartographie des risques */}
      <div>
        <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5" />
          Cartographie des risques
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <RiskBadge label="Réputation" score={risques.reputation} />
          <RiskBadge label="Politique" score={risques.politique} />
          <RiskBadge label="Médiatique" score={risques.mediatique} />
          <RiskBadge label="Concurrence" score={risques.concurrence} />
        </div>
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
