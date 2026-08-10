import { useMemo } from 'react';
import {
  useIntelligenceFeed,
  useLastCollecteTime,
  useRadarSignaux,
} from '@/hooks/useRadarData';
import { useAnsutPublications } from '@/hooks/useAnsutPublications';
import { useRecitsSujets } from '@/hooks/useRecitsSujets';
import { useInsightsCommunication, usePresseAnsut } from '@/hooks/useInsightsCommunication';
import { calculerInsights, calculerEchoMediatique, type ResoudreQualif } from '@/lib/insightsCommunication';
import { construireSujets, sujetSuffisant, type ResoudreQualifPublication } from '@/lib/sujets';
import { estVoixAnsut } from '@/lib/missions';
import { assemblerBriefing, detecterOpportunite } from '@/lib/briefingAdapter';
import { useConseiller } from '@/hooks/useConseiller';
import { useQualification } from '@/hooks/useQualification';
import { cleContenu } from '@/lib/qualificationContenu';
import type { Briefing } from '@/lib/briefing';

/**
 * useBriefing — produit l'objet {@link Briefing} de « La Matinale ».
 *
 * Ce hook est le SEUL point d'orchestration : il rassemble les sorties des
 * moteurs existants (mêmes fenêtres et mêmes règles que « Ce matin » et
 * « Insights »), puis délègue l'assemblage à `assemblerBriefing`
 * (l'adaptateur temporaire). Aucune règle métier ne vit ici.
 *
 * Bascule future : quand le pipeline persistera le Briefing (Étages 3-4), on
 * remplace le corps de ce hook par une simple lecture du Briefing persisté et
 * on supprime l'adaptateur. La vue, elle, ne bouge pas.
 */

/** Fenêtres — reprises telles quelles de « Ce matin » / « Insights ». */
const TAILLE_VIVIER_SUJET = 150;
const FENETRE_SUJET_JOURS = 7;
const FENETRE_PUBLICATIONS_JOURS = 90;
const FENETRE_ECHO_JOURS = 30;

export interface ResultatBriefing {
  briefing: Briefing;
  /** Le briefing s'affiche dès que les sujets sont chargés. */
  isLoading: boolean;
  /** Le récit IA est une couche d'enrichissement chargée à part. */
  recitLoading: boolean;
}

export function useBriefing(): ResultatBriefing {
  const maintenantMs = Date.now();

  // Vivier de veille dédié au(x) sujet(s), sur 7 jours (fenêtre « Ce matin »).
  const { data: sujetFeed, isLoading: feedLoading } = useIntelligenceFeed(
    TAILLE_VIVIER_SUJET,
    FENETRE_SUJET_JOURS * 24,
  );
  const { data: publications, isLoading: pubLoading } = useAnsutPublications(
    100,
    FENETRE_PUBLICATIONS_JOURS * 24,
  );

  const externesSujet = useMemo(
    () => (sujetFeed ?? []).filter((a) => !estVoixAnsut(a)),
    [sujetFeed],
  );

  // Étage 3 — les publications ANSUT sont qualifiées par LECTURE de la
  // qualification persistée (fallback recalcul si la ligne manque).
  const clesQualif = useMemo(
    () => (publications ?? []).map((p) => cleContenu(p.url_original, p.contenu)),
    [publications],
  );
  const { data: qualif } = useQualification(clesQualif, maintenantMs);
  const resoudreQualif = useMemo<ResoudreQualifPublication | undefined>(() => {
    if (!qualif) return undefined;
    return (p) =>
      qualif.qualificationDe(cleContenu(p.url_original, p.contenu), {
        texte: p.contenu,
        published_at: p.date_publication,
        collected_at: p.collecte_le,
        source_officielle_ansut: true,
      });
  }, [qualif]);

  const sujets = useMemo(
    () => construireSujets(externesSujet, publications ?? [], maintenantMs, FENETRE_SUJET_JOURS, resoudreQualif),
    [externesSujet, publications, maintenantMs, resoudreQualif],
  );

  const sujetDuJour = sujets[0];
  const sujetPret = !!sujetDuJour && sujetSuffisant(sujetDuJour);
  const { data: recits, isLoading: recitsLoading } = useRecitsSujets(
    sujetDuJour ? [sujetDuJour] : [],
    sujetPret,
  );

  // Étage 4 — Conseiller IA sur contenu qualifié. L'opportunité (« terrain
  // vacant ») est détectée de façon déterministe sur les sujets qualifiés ; l'IA
  // n'enrichit que sa formulation, sous garde charte serveur. Échec silencieux →
  // repli sur le conseil déterministe.
  const opportunite = useMemo(() => detecterOpportunite(sujets).opportunite, [sujets]);
  const { data: conseilIA } = useConseiller(opportunite, !!opportunite);

  const { data: signaux } = useRadarSignaux();
  const { data: derniereCollecte } = useLastCollecteTime();

  // Écho médiatique — exactement le même calcul que la page Insights.
  const { data: insPubs } = useInsightsCommunication(500);
  const { data: presse } = usePresseAnsut(500);

  // Étage 3 — l'écho lit la même qualification persistée (jeu de publications
  // distinct des sujets : PubInsights), avec repli honnête si la ligne manque.
  const clesQualifIns = useMemo(
    () => (insPubs ?? []).map((p) => cleContenu(p.url_original, p.contenu)),
    [insPubs],
  );
  const { data: qualifIns } = useQualification(clesQualifIns, maintenantMs);
  const resoudreQualifIns = useMemo<ResoudreQualif | undefined>(() => {
    if (!qualifIns) return undefined;
    return (p) =>
      qualifIns.qualificationDe(cleContenu(p.url_original, p.contenu), {
        texte: p.contenu,
        published_at: p.date_publication,
        collected_at: p.collecte_le,
        source_officielle_ansut: true,
      });
  }, [qualifIns]);

  const ins = useMemo(
    () => calculerInsights(insPubs ?? [], FENETRE_ECHO_JOURS, maintenantMs, resoudreQualifIns),
    [insPubs, maintenantMs, resoudreQualifIns],
  );
  const echo = useMemo(
    () => calculerEchoMediatique(presse ?? [], ins.totalDatees, FENETRE_ECHO_JOURS, maintenantMs),
    [presse, ins.totalDatees, maintenantMs],
  );

  const briefing = useMemo(
    () =>
      assemblerBriefing({
        sujets,
        recits: recits ?? {},
        echo,
        signaux: signaux ?? [],
        publicationsRecentes: publications ?? [],
        presseRecente: presse ?? [],
        conseilIA: conseilIA ?? null,
        maintenantMs,
        derniereCollecteMs: derniereCollecte ? new Date(derniereCollecte).getTime() : null,
      }),
    [sujets, recits, echo, signaux, publications, presse, conseilIA, maintenantMs, derniereCollecte],
  );

  return {
    briefing,
    isLoading: feedLoading || pubLoading,
    recitLoading: sujetPret && recitsLoading,
  };
}
