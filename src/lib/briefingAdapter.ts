/**
 * Adaptateur temporaire — assemble un {@link Briefing} à partir des moteurs
 * DÉJÀ EN PLACE (sujets, récits IA, écho médiatique, signaux, publications).
 *
 * @deprecated Échafaudage du pilote « La Matinale ». Ce fichier n'a qu'un seul
 * rôle : prouver qu'un `Briefing` peut alimenter une interface éditoriale de
 * qualité, en attendant que le pipeline éditorial (Étages 3-4) PERSISTE ce même
 * objet. Il est délibérément isolé et SUPPRIMABLE : quand le Briefing persisté
 * arrivera, on remplace l'appel dans `useBriefing` et on supprime ce fichier —
 * la vue de La Matinale, elle, ne change pas d'une ligne.
 *
 * Règles respectées :
 *  - AUCUNE règle métier nouvelle : on ne fait que RÉ-AGENCER les sorties des
 *    moteurs existants (`construireSujets`, `calculerEchoMediatique`,
 *    `useRadarSignaux`…). Rien n'est recalculé ni réinventé ici.
 *  - Charte de crédibilité : chaque valeur est réelle et sourcée ; on dégrade
 *    (null) plutôt que de fabriquer une précision.
 */

import type { Sujet } from '@/lib/sujets';
import type { RecitSujet } from '@/hooks/useRecitsSujets';
import type { EchoMediatique } from '@/lib/insightsCommunication';
import type { PublicationAnsut } from '@/hooks/useAnsutPublications';
import type { Signal } from '@/types';
import { nettoyerTitre } from '@/lib/nettoyerExtrait';
import {
  documentsProbants,
  libellePlateforme,
  dateMsPublicationAnsut,
  type Preuve,
} from '@/lib/preuve';
import {
  ANCRES,
  type ActiviteBriefing,
  type Briefing,
  type ConseilBriefing,
  type EchoBriefing,
  type PointRetenir,
  type ProfondeurLecture,
  type SignalBriefing,
  type SujetBriefing,
} from '@/lib/briefing';

/** Nombre de sujets secondaires affichés sous la Une. */
const MAX_AUTRES_SUJETS = 6;
/** Preuves écosystème minimales pour parler d'un « terrain vacant » (conseiller). */
const SEUIL_OPPORTUNITE = 3;
/** Fraîcheur maximale d'un signal remonté « à examiner » (jours). */
const FRAICHEUR_SIGNAL_JOURS = 30;
/** Fraîcheur maximale d'une entrée du fil « Activités récentes » (jours). */
const FRAICHEUR_ACTIVITE_JOURS = 30;
/** Articles d'écho médiatique affichés comme preuves. */
const MAX_ARTICLES_ECHO = 8;

/** Données brutes issues des hooks existants — entrée de l'adaptateur. */
export interface SourceBriefing {
  sujets: Sujet[];
  /** Récits IA indexés par subject_id (vide si l'IA a échoué — dégradation prévue). */
  recits: Record<string, RecitSujet>;
  echo: EchoMediatique | null;
  signaux: Signal[];
  publicationsRecentes: PublicationAnsut[];
  presseRecente: { id: string; titre: string; source: string | null; url: string | null; dateMs: number | null }[];
  maintenantMs: number;
  derniereCollecteMs: number | null;
}

function dateMsSignal(s: Signal): number | null {
  if (!s.date_detection) return null;
  const t = new Date(s.date_detection).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Réduit un récit à un chapô court (2 phrases maximum), lisible en moins de 30 s. */
function condenser(texte: string, maxPhrases = 2): string {
  const propre = (texte ?? '').trim();
  if (!propre) return '';
  const phrases = propre.split(/(?<=[.!?])\s+/);
  return phrases.slice(0, maxPhrases).join(' ');
}

/** Projette un `Sujet` (moteur existant) sur un `SujetBriefing` (contrat de vue). */
function versSujetBriefing(s: Sujet, recit: RecitSujet | undefined): SujetBriefing {
  const recitParIA = !!(recit && recit.narrative && recit.narrative.trim());
  // Fondation partagée : documents dédupliqués et vérifiables, organisations à part.
  const { documents, organisations, nbReprises } = documentsProbants({
    publications: s.publications,
    articles: s.articles,
    organisations: s.partenaires,
  });
  return {
    id: s.id,
    rubrique: s.nomCourt,
    titre: recit?.headline ? nettoyerTitre(recit.headline) : s.nom,
    chapo: recitParIA ? condenser(recit!.narrative) : s.resumeFactuel,
    recitParIA,
    // Les acteurs cités ne sont pas des thèmes : ils vont dans `organisations`.
    tags: [],
    preuves: documents,
    nbPreuves: documents.length,
    organisations,
    nbReprises,
    limites: recit?.limitations?.trim() ? recit.limitations.trim() : null,
  };
}

/** Écho médiatique → contrat de vue, méthode exposée en clair. */
function versEcho(echo: EchoMediatique | null): EchoBriefing | null {
  if (!echo) return null;
  const articles: Preuve[] = echo.articles.slice(0, MAX_ARTICLES_ECHO).map((a) => ({
    id: a.id,
    source: a.source ?? 'Presse',
    type: 'presse',
    titre: nettoyerTitre(a.titre),
    url: a.url ?? null,
    dateMs: a.dateMs,
  }));
  return {
    // Une seule décimale : deux décimales suggéreraient une précision que six
    // publications ne portent pas.
    ratio: echo.ratio == null ? null : Math.round(echo.ratio * 10) / 10,
    earned: echo.earned,
    owned: echo.owned,
    fenetreJours: echo.fenetreJours,
    methode: `Presse citant « ANSUT » ÷ publications ANSUT sur ${echo.fenetreJours} jours — deux comptages réels de volumes, sans lien de causalité ni estimation.`,
    articles,
  };
}

/** Premier signal récent (non confirmé) → « À examiner ». */
function versSignal(signaux: Signal[], maintenantMs: number): SignalBriefing | null {
  const limite = maintenantMs - FRAICHEUR_SIGNAL_JOURS * 24 * 3600 * 1000;
  const signal = signaux.find((s) => {
    if (s.niveau !== 'critical' && s.niveau !== 'warning') return false;
    const d = dateMsSignal(s);
    return d === null || d >= limite;
  });
  if (!signal) return null;
  return {
    titre: nettoyerTitre(signal.titre),
    corps:
      signal.description?.trim() ||
      'Signal détecté, non confirmé. À qualifier avant toute réaction — l’outil ne tranche pas à votre place.',
    sources: signal.source_type ? `Source : ${signal.source_type}` : 'Signal détecté',
    detecteLeMs: dateMsSignal(signal),
    confirme: false,
  };
}

/**
 * Le conseiller — terrain éditorial vacant, DÉTERMINISTE et sourcé.
 *
 * On repère le sujet où l'écosystème parle (≥ seuil d'articles) et où l'ANSUT
 * n'a rien publié (0 publication). Ce n'est pas un jugement d'IA : c'est un
 * comptage réel exposé (`fondement`). La vue y ajoute le libellé invariant
 * « une opportunité, jamais une injonction ».
 */
function versConseil(sujets: Sujet[]): { conseil: ConseilBriefing | null; nbOpportunites: number; rubrique: string | null } {
  const vacants = sujets
    .filter((s) => s.nbPublications === 0 && s.nbArticles >= SEUIL_OPPORTUNITE)
    .sort((a, b) => b.nbArticles - a.nbArticles);
  if (vacants.length === 0) return { conseil: null, nbOpportunites: 0, rubrique: null };
  const top = vacants[0];
  const preuves: Preuve[] = documentsProbants({
    publications: [],
    articles: top.articles,
    organisations: [],
  }).documents.slice(0, 5);
  return {
    conseil: {
      texte: `L’écosystème parle de « ${top.nomCourt} » (${top.nbArticles} contenus) ; l’ANSUT n’a pas publié sur ce thème. Une prise de parole occuperait un terrain aujourd’hui vacant.`,
      fondement: `${top.nbArticles} contenus écosystème · 0 publication ANSUT sur ce thème / ${top.periodeJours} j`,
      preuves,
    },
    nbOpportunites: vacants.length,
    rubrique: top.nomCourt,
  };
}

/**
 * Fil « Activités récentes » — le plus frais de chaque nature, mais seulement
 * s'il est réellement RÉCENT. Un signal daté d'il y a plusieurs mois n'a rien à
 * faire entre une activité de 6 h et une de 5 j : au-delà de la fenêtre, on
 * l'écarte du fil (il reste consultable dans son écran dédié).
 */
function versActivites(src: SourceBriefing): ActiviteBriefing[] {
  const limite = src.maintenantMs - FRAICHEUR_ACTIVITE_JOURS * 24 * 3600 * 1000;
  const recent = (ms: number | null): ms is number => ms !== null && ms >= limite;
  const acts: ActiviteBriefing[] = [];

  const pub = src.publicationsRecentes[0];
  const pubMs = pub ? dateMsPublicationAnsut(pub) : null;
  if (pub && recent(pubMs)) {
    acts.push({
      type: 'publication',
      intitule: 'Nouvelle publication ANSUT',
      detail: libellePlateforme(pub.plateforme),
      quandMs: pubMs,
    });
  }

  const sig = src.signaux[0];
  const sigMs = sig ? dateMsSignal(sig) : null;
  if (sig && recent(sigMs)) {
    acts.push({
      type: 'signal',
      intitule: 'Signal à examiner détecté',
      detail: nettoyerTitre(sig.titre),
      quandMs: sigMs,
    });
  }

  const art = src.presseRecente.find((a) => recent(a.dateMs));
  if (art) {
    acts.push({
      type: 'presse',
      intitule: 'Article de presse ajouté',
      detail: art.source ?? 'Presse',
      quandMs: art.dateMs,
    });
  }

  return acts;
}

/** Fenêtre réellement couverte par les preuves datées du briefing. */
function calculerPeriode(
  sujets: SujetBriefing[],
  derniereCollecteMs: number | null,
): { debutMs: number | null; finMs: number | null } {
  const dates = sujets
    .flatMap((s) => s.preuves.map((p) => p.dateMs))
    .filter((d): d is number => d !== null);
  if (dates.length === 0) {
    return { debutMs: null, finMs: derniereCollecteMs };
  }
  return {
    debutMs: Math.min(...dates),
    finMs: derniereCollecteMs ?? Math.max(...dates),
  };
}

/**
 * Assemble le Briefing. `profondeur` est PRÉPARÉ mais pas développé : le pilote
 * produit toujours la lecture « dircom ». La lecture « dg » (condensée) viendra
 * plus tard sans casser ce contrat.
 */
export function assemblerBriefing(
  src: SourceBriefing,
  profondeur: ProfondeurLecture = 'dircom',
): Briefing {
  // TODO(mode-dg) : lorsque 'dg' sera développé, condenser ici (moins de sujets,
  // récit plus court). Pour l'instant les deux profondeurs sont identiques.

  const sujetUneSrc = src.sujets[0] ?? null;
  const sujetUne = sujetUneSrc
    ? versSujetBriefing(sujetUneSrc, src.recits[sujetUneSrc.id])
    : null;
  const autresSujets = src.sujets
    .slice(1, 1 + MAX_AUTRES_SUJETS)
    .map((s) => versSujetBriefing(s, src.recits[s.id]));

  const echo = versEcho(src.echo);
  const aExaminer = versSignal(src.signaux, src.maintenantMs);
  const { conseil, nbOpportunites, rubrique } = versConseil(src.sujets);

  const aRetenir: PointRetenir[] = [];
  if (sujetUne) {
    aRetenir.push({
      intitule: '1 sujet dominant',
      detail: sujetUne.titre,
      ancre: `#${ANCRES.sujetUne}`,
      ton: 'neutre',
    });
  }
  if (aExaminer) {
    aRetenir.push({
      intitule: '1 signal à examiner',
      detail: aExaminer.titre,
      ancre: `#${ANCRES.aExaminer}`,
      ton: 'attention',
    });
  }
  if (conseil && nbOpportunites > 0) {
    aRetenir.push({
      intitule: `${nbOpportunites} ${nbOpportunites > 1 ? 'opportunités' : 'opportunité'}`,
      detail: rubrique ? `Terrain vacant : ${rubrique}` : 'Terrain éditorial vacant',
      ancre: `#${ANCRES.conseil}`,
      ton: 'positif',
    });
  }

  const tousSujets = sujetUne ? [sujetUne, ...autresSujets] : autresSujets;

  return {
    genereLeMs: src.maintenantMs,
    periodeCouverte: calculerPeriode(tousSujets, src.derniereCollecteMs),
    derniereCollecteMs: src.derniereCollecteMs,
    profondeur,
    aRetenir,
    sujetUne,
    autresSujets,
    echo,
    aExaminer,
    conseil,
    activitesRecentes: versActivites(src),
  };
}
