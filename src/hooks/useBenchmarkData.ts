import { useMemo } from 'react';
import { useActeurDigitalDashboard, type Periode, type ActeurDigitalDashboard } from './useActeurDigitalDashboard';
import type { Personnalite } from '@/types';

export interface BenchmarkVerdict {
  lines: string[];
  winner: 'A' | 'B' | 'draw';
}

export interface BenchmarkData {
  dashA: ActeurDigitalDashboard;
  dashB: ActeurDigitalDashboard;
  mergedSparkline: { index: number; a: number; b: number }[];
  verdict: BenchmarkVerdict;
  isLoading: boolean;
}

function generateVerdict(
  a: { name: string; dash: ActeurDigitalDashboard; score: number },
  b: { name: string; dash: ActeurDigitalDashboard; score: number },
): BenchmarkVerdict {
  const lines: string[] = [];
  let aPoints = 0;
  let bPoints = 0;

  // Score SPDI
  const scoreDelta = Math.abs(a.score - b.score);
  if (scoreDelta > 10) {
    const leader = a.score > b.score ? a : b;
    const other = a.score > b.score ? b : a;
    lines.push(`${leader.name} domine avec un score SPDI de ${Math.round(leader.score)} contre ${Math.round(other.score)}.`);
    if (a.score > b.score) aPoints++; else bPoints++;
  } else if (scoreDelta > 0) {
    lines.push(`Les scores SPDI sont proches (${Math.round(a.score)} vs ${Math.round(b.score)}).`);
  }

  // Sentiment
  const totalA = a.dash.sentimentDistribution.positif + a.dash.sentimentDistribution.neutre + a.dash.sentimentDistribution.negatif || 1;
  const totalB = b.dash.sentimentDistribution.positif + b.dash.sentimentDistribution.neutre + b.dash.sentimentDistribution.negatif || 1;
  const pctPosA = Math.round((a.dash.sentimentDistribution.positif / totalA) * 100);
  const pctPosB = Math.round((b.dash.sentimentDistribution.positif / totalB) * 100);
  const sentDelta = Math.abs(pctPosA - pctPosB);
  if (sentDelta > 15) {
    const better = pctPosA > pctPosB ? a : b;
    lines.push(`${better.name} bénéficie d'un sentiment nettement plus positif (+${sentDelta} pts).`);
    if (pctPosA > pctPosB) aPoints++; else bPoints++;
  }

  // Share of Voice
  if (a.dash.shareOfVoice.sharePercent > b.dash.shareOfVoice.sharePercent + 5) {
    lines.push(`${a.name} a une plus grande part de voix (${a.dash.shareOfVoice.sharePercent}% vs ${b.dash.shareOfVoice.sharePercent}%).`);
    aPoints++;
  } else if (b.dash.shareOfVoice.sharePercent > a.dash.shareOfVoice.sharePercent + 5) {
    lines.push(`${b.name} a une plus grande part de voix (${b.dash.shareOfVoice.sharePercent}% vs ${a.dash.shareOfVoice.sharePercent}%).`);
    bPoints++;
  }

  // Thematiques
  const commonThemes = a.dash.topThematiques.filter(t => b.dash.topThematiques.includes(t));
  if (commonThemes.length > 0) {
    lines.push(`Thématiques communes : ${commonThemes.slice(0, 3).map(t => `#${t}`).join(', ')}.`);
  }

  if (lines.length === 0) {
    lines.push('Les deux acteurs ont des profils d\'influence comparables sur cette période.');
  }

  const winner = aPoints > bPoints ? 'A' as const : bPoints > aPoints ? 'B' as const : 'draw' as const;
  return { lines, winner };
}

export function useBenchmarkData(
  acteurA: Personnalite | null,
  acteurB: Personnalite | null,
  periode: Periode = '30j',
): BenchmarkData {
  const dashA = useActeurDigitalDashboard(
    acteurA?.suivi_spdi_actif ? acteurA.id : undefined,
    acteurA?.cercle,
    periode,
  );
  const dashB = useActeurDigitalDashboard(
    acteurB?.suivi_spdi_actif ? acteurB.id : undefined,
    acteurB?.cercle,
    periode,
  );

  const mergedSparkline = useMemo(() => {
    const maxLen = Math.max(dashA.sparklineData.length, dashB.sparklineData.length);
    if (maxLen === 0) return [];
    return Array.from({ length: maxLen }, (_, i) => ({
      index: i,
      a: dashA.sparklineData[i] ?? 0,
      b: dashB.sparklineData[i] ?? 0,
    }));
  }, [dashA.sparklineData, dashB.sparklineData]);

  const verdict = useMemo(() => {
    if (!acteurA || !acteurB) return { lines: [], winner: 'draw' as const };
    return generateVerdict(
      { name: `${acteurA.prenom ?? ''} ${acteurA.nom}`.trim(), dash: dashA, score: acteurA.score_spdi_actuel ?? 0 },
      { name: `${acteurB.prenom ?? ''} ${acteurB.nom}`.trim(), dash: dashB, score: acteurB.score_spdi_actuel ?? 0 },
    );
  }, [acteurA, acteurB, dashA, dashB]);

  return {
    dashA,
    dashB,
    mergedSparkline,
    verdict,
    isLoading: dashA.isLoading || dashB.isLoading,
  };
}
