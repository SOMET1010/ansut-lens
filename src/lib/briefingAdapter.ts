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
import type { Actualite, Signal } from '@/types';
import { MISSIONS_STRATEGIQUES } from '@/config/missions';
import { nettoyerTitre, nettoyerExtrait } from '@/lib/nettoyerExtrait';
import {
  ANCRES,
  type ActiviteBriefing,
  type Briefing,
  type ConfianceBriefing,
  type ConseilBriefing,
  type EchoBriefing,
  type Preuve,
  type PointRetenir,
  type ProfondeurLecture,
  type RepartitionPreuves,
  type SignalBriefing,
  type SujetBriefing,
} from '@/lib/briefing';

/** Nombre de sujets secondaires affichés sous la Une (3 cartes, pas une liste). */
const MAX_AUTRES_SUJETS = 3;
/** Preuves écosystème minimales pour parler d'un « terrain vacant » (conseiller). */
const SEUIL_OPPORTUNITE = 3;
/** Fraîcheur maximale d'un signal remonté « à examiner » (jours). */
const FRAICHEUR_SIGNAL_JOURS = 30;
/** Articles d'écho médiatique affichés comme preuves. */
const MAX_ARTICLES_ECHO = 8;

/** Plateformes considérées comme « réseaux sociaux » côté veille externe. */
const RESEAUX_SOCIAUX = new Set([
  'twitter',
  'x',
  'facebook',
  'linkedin',
  'instagram',
  'tiktok',
  'youtube',
  'threads',
  'social',
  'reseaux',
]);

/** Correspondance id de pilier → thème court affichable. */
const THEME_PAR_PILIER: Record<string, string> = Object.fromEntries(
  MISSIONS_STRATEGIQUES.map((m) => [m.id, m.nomCourt]),
);

/** Un article externe est-il une prise de parole « réseaux sociaux » ? */
function estReseauSocial(a: Actualite): boolean {
  const t = (a.source_type ?? '').toLowerCase();
  return RESEAUX_SOCIAUX.has(t);
}

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

function libellePlateforme(p: string | null | undefined): string {
  const cle = (p ?? '').toLowerCase();
  const table: Record<string, string> = {
    linkedin: 'LinkedIn',
    facebook: 'Facebook',
    x: 'X',
    twitter: 'X',
    youtube: 'YouTube',
    instagram: 'Instagram',
    tiktok: 'TikTok',
    website: 'Site',
    web: 'Site',
    site: 'Site',
  };
  if (table[cle]) return table[cle];
  return p ? p.charAt(0).toUpperCase() + p.slice(1) : 'Source';
}

function dateMsPublication(p: PublicationAnsut): number | null {
  const brut = p.date_publication ?? p.collecte_le;
  if (!brut) return null;
  const t = new Date(brut).getTime();
  return Number.isNaN(t) ? null : t;
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

/** Preuves d'un sujet : voix ANSUT, reprise presse, écho réseaux, partenaires. */
function preuvesDuSujet(s: Sujet): Preuve[] {
  const ansut: Preuve[] = s.publications.map((p) => ({
    id: p.id,
    source: libellePlateforme(p.plateforme),
    type: 'ansut',
    titre: (nettoyerExtrait(p.contenu ?? '') || 'Publication ANSUT').slice(0, 120),
    url: p.url_original ?? null,
    dateMs: dateMsPublication(p),
  }));
  const externes: Preuve[] = s.articles.map((a) => ({
    id: a.id,
    source: a.source_nom ?? 'Source',
    type: estReseauSocial(a) ? 'reseaux' : 'presse',
    titre: nettoyerTitre(a.titre),
    url: a.source_url ?? null,
    dateMs: a.date_publication ? new Date(a.date_publication).getTime() : null,
  }));
  const partenaires: Preuve[] = s.partenaires.map((nom) => ({
    id: `part:${s.id}:${nom}`,
    source: 'Mention',
    type: 'partenaire',
    titre: nom,
    url: null,
    dateMs: null,
  }));
  return [...ansut, ...externes, ...partenaires];
}

/** Répartition des preuves par nature. */
function repartitionDes(preuves: Preuve[]): RepartitionPreuves {
  return {
    presse: preuves.filter((p) => p.type === 'presse').length,
    reseaux: preuves.filter((p) => p.type === 'reseaux').length,
    ansut: preuves.filter((p) => p.type === 'ansut').length,
    partenaires: preuves.filter((p) => p.type === 'partenaire').length,
  };
}

/**
 * Thèmes du sujet = piliers stratégiques réellement touchés par ses articles
 * (jamais des acteurs). Le pilier du sujet vient en premier.
 */
function themesDuSujet(s: Sujet): string[] {
  const themes: string[] = [];
  const ajouter = (nom: string | undefined | null) => {
    if (nom && !themes.includes(nom)) themes.push(nom);
  };
  ajouter(s.nomCourt);
  for (const a of s.articles) {
    const ids = a.piliers && a.piliers.length ? a.piliers : a.pilier_id ? [a.pilier_id] : [];
    for (const id of ids) ajouter(THEME_PAR_PILIER[id]);
  }
  return themes.slice(0, 3);
}

/**
 * Confiance fondée sur la QUALITÉ DES PREUVES (jamais une confiance d'IA) :
 *  - volume de preuves,
 *  - diversité des origines (nombre de natures présentes),
 *  - nombre de sources distinctes.
 * Reproductible et exposé ; volontairement qualitatif (pas de pourcentage).
 */
function confianceDe(preuves: Preuve[], repartition: RepartitionPreuves): ConfianceBriefing {
  const nb = preuves.length;
  const diversite = [repartition.presse, repartition.reseaux, repartition.ansut, repartition.partenaires].filter(
    (n) => n > 0,
  ).length;
  const sourcesDistinctes = new Set(preuves.map((p) => p.source.toLowerCase())).size;

  const niveau = nb >= 12 && diversite >= 3 ? 'élevé' : nb >= 5 && diversite >= 2 ? 'solide' : 'émergent';
  const justification = `${nb} ${nb > 1 ? 'preuves' : 'preuve'} · ${diversite} ${
    diversite > 1 ? 'types de sources' : 'type de source'
  } · ${sourcesDistinctes} ${sourcesDistinctes > 1 ? 'sources distinctes' : 'source'}`;
  return { niveau, justification };
}

/** Projette un `Sujet` (moteur existant) sur un `SujetBriefing` (contrat de vue). */
function versSujetBriefing(s: Sujet, recit: RecitSujet | undefined): SujetBriefing {
  const recitParIA = !!(recit && recit.narrative && recit.narrative.trim());
  const preuves = preuvesDuSujet(s);
  const repartition = repartitionDes(preuves);
  return {
    id: s.id,
    rubrique: s.nomCourt,
    titre: recit?.headline ? nettoyerTitre(recit.headline) : s.nom,
    chapo: recitParIA ? condenser(recit!.narrative, 3) : condenser(s.resumeFactuel, 3),
    recitParIA,
    tags: themesDuSujet(s),
    preuves,
    nbPreuves: preuves.length,
    repartition,
    confiance: confianceDe(preuves, repartition),
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
    ratio: echo.ratio,
    earned: echo.earned,
    owned: echo.owned,
    fenetreJours: echo.fenetreJours,
    methode: `Presse citant « ANSUT » ÷ publications ANSUT sur ${echo.fenetreJours} jours — deux comptages réels, aucune estimation.`,
    articles,
  };
}

/**
 * « À examiner » — quelque chose de non confirmé qui mérite une qualification
 * humaine. Priorité au signal détecté (table `signaux`) ; à défaut, on remonte
 * le sujet le plus ÉMERGENT non encore adressé par l'ANSUT (fait réel tiré des
 * compteurs du sujet, pas une invention).
 */
function versSignal(signaux: Signal[], sujets: Sujet[], maintenantMs: number): SignalBriefing | null {
  const limite = maintenantMs - FRAICHEUR_SIGNAL_JOURS * 24 * 3600 * 1000;
  const signal = signaux.find((s) => {
    if (s.niveau !== 'critical' && s.niveau !== 'warning') return false;
    const d = dateMsSignal(s);
    return d === null || d >= limite;
  });
  if (signal) {
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

  // Repli : un sujet émergent (en hausse marquée sur 24 h) que l'ANSUT n'a pas
  // encore adressé — à examiner avant toute prise de parole.
  const emergent = sujets.find(
    (s) => s.mouvement === 'emergent' && s.nbArticles24h >= 2 && s.nbPublications === 0,
  );
  if (!emergent) return null;
  return {
    titre: emergent.nom,
    corps: `Sujet émergent dans l’écosystème (${emergent.nbArticles24h} contenus sur 24 h), pas encore adressé par l’ANSUT. À examiner avant toute prise de parole.`,
    sources: `${emergent.nbArticles24h} contenus sur 24 h`,
    detecteLeMs: null,
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
  // Terrain strictement vacant : l'écosystème parle, l'ANSUT n'a rien publié.
  const vacantsStricts = sujets
    .filter((s) => s.nbPublications === 0 && s.nbArticles >= SEUIL_OPPORTUNITE)
    .sort((a, b) => b.nbArticles - a.nbArticles);
  // Terrain sous-couvert : l'écosystème parle beaucoup plus que l'ANSUT.
  const sousCouverts = sujets
    .filter((s) => s.nbPublications >= 1 && s.nbArticles >= 4 && s.nbArticles >= s.nbPublications * 4)
    .sort((a, b) => b.nbArticles - a.nbArticles);
  const vacants = vacantsStricts.length > 0 ? vacantsStricts : sousCouverts;
  if (vacants.length === 0) return { conseil: null, nbOpportunites: 0, rubrique: null };
  const top = vacants[0];
  const strict = top.nbPublications === 0;
  const preuves: Preuve[] = top.articles.slice(0, 5).map((a) => ({
    id: a.id,
    source: a.source_nom ?? 'Source',
    type: 'presse',
    titre: nettoyerTitre(a.titre),
    url: a.source_url ?? null,
    dateMs: a.date_publication ? new Date(a.date_publication).getTime() : null,
  }));
  return {
    conseil: {
      texte: strict
        ? `L’écosystème parle de « ${top.nomCourt} » (${top.nbArticles} contenus) ; l’ANSUT n’a pas publié sur ce thème. Une prise de parole occuperait un terrain aujourd’hui vacant.`
        : `Sur « ${top.nomCourt} », l’écosystème est nettement plus actif que l’ANSUT (${top.nbArticles} contenus pour ${top.nbPublications} publication${top.nbPublications > 1 ? 's' : ''}). Une prise de parole rééquilibrerait la présence.`,
      fondement: strict
        ? `${top.nbArticles} contenus écosystème · 0 publication ANSUT sur ce thème / ${top.periodeJours} j`
        : `${top.nbArticles} contenus écosystème · ${top.nbPublications} publication${top.nbPublications > 1 ? 's' : ''} ANSUT sur ce thème / ${top.periodeJours} j`,
      preuves,
    },
    nbOpportunites: vacants.length,
    rubrique: top.nomCourt,
  };
}

/** Fil « Activités récentes » — le plus frais de chaque nature. */
function versActivites(src: SourceBriefing): ActiviteBriefing[] {
  const acts: ActiviteBriefing[] = [];
  const pub = src.publicationsRecentes[0];
  if (pub) {
    acts.push({
      type: 'publication',
      intitule: 'Nouvelle publication ANSUT',
      detail: libellePlateforme(pub.plateforme),
      quandMs: dateMsPublication(pub),
    });
  }
  const sig = src.signaux[0];
  if (sig) {
    acts.push({
      type: 'signal',
      intitule: 'Signal à examiner détecté',
      detail: nettoyerTitre(sig.titre),
      quandMs: dateMsSignal(sig),
    });
  }
  const art = src.presseRecente.find((a) => a.dateMs !== null);
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
  const aExaminer = versSignal(src.signaux, src.sujets, src.maintenantMs);
  const { conseil, nbOpportunites, rubrique } = versConseil(src.sujets);

  // Les 3 portes d'entrée sont TOUJOURS présentes — une catégorie vide s'affiche
  // dans un état « calme » honnête plutôt que de disparaître (sinon la zone
  // paraît inachevée). Jamais de porte fabriquée : juste l'état réel exposé.
  const aRetenir: PointRetenir[] = [
    {
      intitule: '1 sujet dominant',
      detail: sujetUne ? sujetUne.titre : 'Aucun sujet dominant ce matin',
      ancre: `#${ANCRES.sujetUne}`,
      ton: sujetUne ? 'neutre' : 'calme',
    },
    {
      intitule: aExaminer ? '1 signal à examiner' : 'Aucun signal à examiner',
      detail: aExaminer ? aExaminer.titre : 'La surveillance reste active',
      ancre: `#${ANCRES.aExaminer}`,
      ton: aExaminer ? 'attention' : 'calme',
    },
    {
      intitule:
        conseil && nbOpportunites > 0
          ? `${nbOpportunites} ${nbOpportunites > 1 ? 'opportunités' : 'opportunité'}`
          : 'Aucune opportunité franche',
      detail:
        conseil && rubrique ? `Terrain à occuper : ${rubrique}` : 'Couverture alignée avec l’écosystème',
      ancre: `#${ANCRES.conseil}`,
      ton: conseil && nbOpportunites > 0 ? 'positif' : 'calme',
    },
  ];

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
