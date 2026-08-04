import { useMemo } from 'react';
import { useInsightsCommunication, usePresseAnsut } from '@/hooks/useInsightsCommunication';
import { calculerInsights, calculerEchoMediatique } from '@/lib/insightsCommunication';
import { dedupParUrl } from '@/lib/dedup';
import { assemblerCommunication } from '@/lib/communicationAdapter';
import type { Communication } from '@/lib/communication';

/**
 * useCommunication — produit l'objet {@link Communication} de l'écran
 * « Notre communication ».
 *
 * Orchestration seule : rassemble les mêmes moteurs réels que la page Insights,
 * DÉDUPLIQUE la presse par URL canonique avant l'écho médiatique (correction du
 * ratio contaminé relevé par l'audit), puis délègue l'assemblage à l'adaptateur.
 * Aucune règle métier ici.
 */
export function useCommunication(fenetreJours: number): {
  communication: Communication;
  isLoading: boolean;
} {
  const maintenantMs = Date.now();

  const { data: publications, isLoading } = useInsightsCommunication(500);
  const { data: presse } = usePresseAnsut(500);

  // Dédup des articles de presse AVANT tout comptage (URL canonique + titre).
  const presseUniques = useMemo(
    () => dedupParUrl(presse ?? [], (a) => a.url, (a) => a.titre).uniques,
    [presse],
  );

  const insights = useMemo(
    () => calculerInsights(publications ?? [], fenetreJours, maintenantMs),
    [publications, fenetreJours, maintenantMs],
  );
  const echo = useMemo(
    () => calculerEchoMediatique(presseUniques, insights.totalDatees, fenetreJours, maintenantMs),
    [presseUniques, insights.totalDatees, fenetreJours, maintenantMs],
  );
  const communication = useMemo(
    () => assemblerCommunication({ insights, echo, maintenantMs }),
    [insights, echo, maintenantMs],
  );

  return { communication, isLoading };
}
