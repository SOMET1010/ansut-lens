import { useMemo } from 'react';
import { useInsightsCommunication, usePresseAnsut } from '@/hooks/useInsightsCommunication';
import { calculerInsights, calculerEchoMediatique, type ResoudreQualif } from '@/lib/insightsCommunication';
import { dedupParUrl } from '@/lib/dedup';
import { assemblerCommunication } from '@/lib/communicationAdapter';
import { useQualification } from '@/hooks/useQualification';
import { cleContenu } from '@/lib/qualificationContenu';
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

  // Étage 3 — les publications sont qualifiées par LECTURE de la qualification
  // persistée (editorial_qualifications) via la content_key reconstruite ; repli
  // sur un recalcul honnête tant qu'une ligne manque. Comportement identique à
  // l'ancien tant que la table n'est pas peuplée (garanti par le test de parité).
  const clesQualif = useMemo(
    () => (publications ?? []).map((p) => cleContenu(p.url_original, p.contenu)),
    [publications],
  );
  const { data: qualif } = useQualification(clesQualif, maintenantMs);
  const resoudreQualif = useMemo<ResoudreQualif | undefined>(() => {
    if (!qualif) return undefined; // pas encore chargé → recalcul par défaut
    return (p) =>
      qualif.qualificationDe(cleContenu(p.url_original, p.contenu), {
        texte: p.contenu,
        published_at: p.date_publication,
        collected_at: p.collecte_le,
        source_officielle_ansut: true,
      });
  }, [qualif]);

  const insights = useMemo(
    () => calculerInsights(publications ?? [], fenetreJours, maintenantMs, resoudreQualif),
    [publications, fenetreJours, maintenantMs, resoudreQualif],
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
