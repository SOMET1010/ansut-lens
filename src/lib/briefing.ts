/**
 * Briefing — objet métier de « La Matinale ».
 *
 * C'est le CONTRAT que la vue consomme, et rien d'autre : seulement la forme,
 * aucune logique de collecte ni de qualification. La vue de La Matinale est
 * 100 % passive — elle ne fait que rendre ce `Briefing`.
 *
 * Chaîne actuelle (pilote) :
 *
 *     Données existantes → Adaptateur temporaire → Briefing → La Matinale
 *                          (src/lib/briefingAdapter.ts)
 *
 * Chaîne cible (plus tard, Étages 3-4 du pipeline éditorial) :
 *
 *     Pipeline éditorial → Briefing persisté → La Matinale
 *
 * INVARIANT : lors de cette bascule, la vue ne doit RIEN changer. Seul le
 * producteur du `Briefing` change (l'adaptateur disparaît). C'est toute la
 * raison d'être de cet objet.
 *
 * Discipline Charte de crédibilité : chaque affirmation portée par le Briefing
 * expose ses preuves (origine connue, méthode explicable, traçable). Les champs
 * optionnels valent `null` quand la donnée n'existe pas — la vue dégrade alors
 * honnêtement plutôt que de fabriquer une précision.
 */

/** Une preuve cliquable : d'où vient l'information. */
export interface Preuve {
  id: string;
  /** Origine de la preuve, pour l'affichage (« LinkedIn », « Fratmat », « Site »…). */
  source: string;
  /** Nature de la preuve — détermine le regroupement dans « Pourquoi ce sujet ? ». */
  type: 'ansut' | 'presse' | 'partenaire';
  titre: string;
  url: string | null;
  dateMs: number | null;
}

/** Un sujet du briefing (l'unité de lecture : 1 carte = 1 sujet, l'article est une preuve). */
export interface SujetBriefing {
  id: string;
  /** Pilier / thème stratégique affiché en surtitre. */
  rubrique: string;
  titre: string;
  /**
   * Chapô court (moins de 30 s de lecture). Vient du récit IA quand il existe,
   * sinon du résumé factuel déterministe du sujet.
   */
  chapo: string;
  /** true si le chapô provient d'un récit IA, false s'il s'agit du résumé factuel. */
  recitParIA: boolean;
  /** Étiquettes réelles (partenaires cités), jamais décoratives. */
  tags: string[];
  preuves: Preuve[];
  nbPreuves: number;
  /** Limites du récit exposées par l'IA, le cas échéant (traçabilité). */
  limites: string | null;
}

/** Une des trois « portes d'entrée » de « À retenir ce matin ». */
export interface PointRetenir {
  intitule: string; // « 1 sujet dominant »
  detail: string; // « La fibre du Nord entre dans sa phase active »
  ancre: string; // ancre vers la section correspondante
  ton: 'neutre' | 'attention' | 'positif';
}

/** Écho médiatique — rapport earned/owned, entièrement traçable (aucune estimation). */
export interface EchoBriefing {
  ratio: number | null; // earned / owned ; null si owned = 0
  earned: number; // articles de presse citant l'ANSUT, datés dans la fenêtre
  owned: number; // publications ANSUT datées dans la fenêtre
  fenetreJours: number;
  /** Phrase de méthode, affichée en clair (pas seulement au survol). */
  methode: string;
  articles: Preuve[]; // les articles comptés — preuves cliquables
}

/** Signal à examiner (non confirmé) ou à arbitrer (étayé). */
export interface SignalBriefing {
  titre: string;
  corps: string;
  sources: string; // « 3 posts », « détecté sur X »…
  detecteLeMs: number | null;
  /** false ⇒ « À examiner » ; true ⇒ « À arbitrer » (réservé au signal suffisamment étayé). */
  confirme: boolean;
}

/**
 * Le conseiller — une OPPORTUNITÉ, jamais une injonction.
 *
 * Dans le pilote, elle est déterministe et sourcée (terrain éditorial vacant :
 * l'écosystème parle d'un thème, l'ANSUT n'y a pas publié). Le libellé
 * « une opportunité, jamais une injonction » est rendu par la vue, invariant.
 */
export interface ConseilBriefing {
  texte: string;
  fondement: string; // « 8 contenus écosystème · 0 publication ANSUT / 30 j »
  preuves: Preuve[];
}

/** Une entrée du fil « Activités récentes ». */
export interface ActiviteBriefing {
  type: 'publication' | 'signal' | 'presse';
  intitule: string;
  detail: string;
  quandMs: number | null;
}

/**
 * Profondeur de lecture — PRÉPARÉ, PAS DÉVELOPPÉ dans le pilote.
 *
 * Le même `Briefing` produira demain deux lectures : « dircom » (détaillée) et
 * « dg » (condensée). Le pilote n'expose que 'dircom'. Le champ existe pour que
 * la bascule future ne casse pas le contrat.
 */
export type ProfondeurLecture = 'dircom' | 'dg';

/** L'objet métier complet consommé par la vue La Matinale. */
export interface Briefing {
  genereLeMs: number;
  /** Fenêtre réellement couverte par les preuves du briefing (null si indatable). */
  periodeCouverte: { debutMs: number | null; finMs: number | null };
  /** Horodatage de la dernière collecte (« Mise à jour »). */
  derniereCollecteMs: number | null;
  /** Profondeur de lecture (pilote : toujours 'dircom'). */
  profondeur: ProfondeurLecture;
  /** Les 3 portes d'entrée — comprendre la journée sans lire le récit. */
  aRetenir: PointRetenir[];
  /** Le sujet de Une (null ⇒ écran d'attente honnête, jamais vide). */
  sujetUne: SujetBriefing | null;
  autresSujets: SujetBriefing[];
  echo: EchoBriefing | null;
  aExaminer: SignalBriefing | null;
  conseil: ConseilBriefing | null;
  activitesRecentes: ActiviteBriefing[];
}

/** Ancres stables des sections (portes d'entrée « À retenir »). */
export const ANCRES = {
  sujetUne: 'matinale-sujet-du-jour',
  aExaminer: 'matinale-a-examiner',
  conseil: 'matinale-conseiller',
} as const;

/** Libellé invariant du conseiller (Charte : l'IA conseille, elle ne décide pas). */
export const LIBELLE_NON_INJONCTION = 'Une opportunité, jamais une injonction';
