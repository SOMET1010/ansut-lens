/**
 * Insights Communication — indicateurs RÉELS de la communication de l'ANSUT.
 *
 * Promesse unique : en moins de deux minutes, la Direction de la Communication
 * comprend COMMENT l'ANSUT a communiqué ces 7 / 30 / 90 derniers jours — sur
 * quels réseaux, quels thèmes, quels types, quels formats, avec quels
 * partenaires.
 *
 * Discipline Charte : aucun score, aucune estimation, aucune approximation. On
 * ne compte que des faits (des publications réelles). La fraîcheur s'appuie
 * EXCLUSIVEMENT sur la date de publication vérifiée (qualification commune) :
 * les publications à date non vérifiée ne sont pas rattachées à une fenêtre —
 * on affiche leur nombre en transparence plutôt que de les dater faussement.
 * L'engagement n'est montré que si la plateforme fournit réellement les chiffres.
 */

import { qualifier, LIBELLE_CATEGORIE, type CategorieCommunication } from '@/lib/qualificationContenu';
import { MISSIONS_STRATEGIQUES } from '@/config/missions';
import { partenairesDansTexte } from '@/lib/syntheseAnsut';

/** Publication ANSUT enrichie des champs nécessaires aux indicateurs. */
export interface PubInsights {
  id: string;
  plateforme: string;
  contenu: string | null;
  type_contenu: string | null;
  hashtags: string[] | null;
  media_urls: string[] | null;
  date_publication: string | null;
  collecte_le: string | null;
  likes: number;
  comments: number;
  shares: number;
  vues: number;
}

export type FormatPublication = 'video' | 'photo' | 'carrousel' | 'communique' | 'lien' | 'autre';

const LIBELLE_FORMAT: Record<FormatPublication, string> = {
  video: 'Vidéo',
  photo: 'Photo',
  carrousel: 'Carrousel',
  communique: 'Communiqué',
  lien: 'Lien',
  autre: 'Autre',
};

const LIBELLE_RESEAU: Record<string, string> = {
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  x: 'X',
  twitter: 'X',
  youtube: 'YouTube',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  website: 'Site web',
  web: 'Site web',
};

const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

export type Evolution = 'hausse' | 'baisse' | 'stable';

export interface StatReseau {
  cle: string;
  libelle: string;
  count: number;
  countAvant: number;
  evolution: Evolution;
  /** Fréquence moyenne de publication, en publications par semaine. */
  frequenceParSemaine: number;
}

export interface StatCompte {
  cle: string;
  libelle: string;
  count: number;
}

export interface EngagementReseau {
  cle: string;
  libelle: string;
  /** La plateforme fournit-elle réellement des chiffres d'engagement ? */
  disponible: boolean;
  vues: number;
  likes: number;
  comments: number;
  shares: number;
}

export interface InsightsCommunication {
  fenetreJours: number;
  /** Publications datées réellement et comptées dans la fenêtre. */
  totalDatees: number;
  /** Publications datées dans la fenêtre PRÉCÉDENTE (base de l'évolution de l'écho). */
  totalDateesAvant: number;
  /** Publications récentes mais à date non vérifiée (non comptées, transparence). */
  totalNonDatees: number;
  parReseau: StatReseau[];
  themes: StatCompte[];
  types: StatCompte[];
  partenaires: StatCompte[];
  formats: StatCompte[];
  /** Distribution par jour de semaine (Lundi → Dimanche). */
  calendrier: StatCompte[];
  engagement: EngagementReseau[];
}

function normReseau(p: string): { cle: string; libelle: string } {
  const c = (p || '').toLowerCase();
  const cle = c === 'twitter' ? 'x' : c === 'web' ? 'website' : c;
  return { cle, libelle: LIBELLE_RESEAU[c] || p || 'Autre' };
}

function inferFormat(p: PubInsights): FormatPublication {
  const plat = (p.plateforme || '').toLowerCase();
  const tc = (p.type_contenu || '').toLowerCase();
  const media = (p.media_urls || []).map((u) => (u || '').toLowerCase());
  if (plat === 'youtube' || tc.includes('video') || media.some((u) => /\.(mp4|mov|webm)|youtu/.test(u))) {
    return 'video';
  }
  if (plat === 'website' || plat === 'web' || tc === 'article' || tc.includes('communiqu')) {
    return 'communique';
  }
  const images = media.filter((u) => /\.(jpe?g|png|gif|webp)/.test(u));
  if (images.length > 1) return 'carrousel';
  if (images.length === 1) return 'photo';
  if (media.length > 0) return 'lien';
  return 'autre';
}

function evolutionDe(apres: number, avant: number): Evolution {
  if (apres > avant) return 'hausse';
  if (apres < avant) return 'baisse';
  return 'stable';
}

function trier(map: Map<string, StatCompte>): StatCompte[] {
  return [...map.values()].filter((s) => s.count > 0).sort((a, b) => b.count - a.count);
}

/** Un article de presse retenu pour l'écho médiatique (pour justifier le chiffre). */
export interface ArticleEcho {
  id: string;
  titre: string;
  source: string | null;
  url: string | null;
  dateMs: number | null;
}

/**
 * Écho médiatique — rapport entre la reprise presse et l'effort de communication.
 *
 * DÉFINITION HONNÊTE : ce n'est PAS une « part de voix » au sens strict (qui
 * comparerait les mentions de l'ANSUT à celles de TOUS les acteurs suivis sur un
 * même corpus). Ici le dénominateur est le nombre de publications propres de
 * l'ANSUT. On mesure donc combien d'articles de presse citent l'ANSUT rapporté à
 * ce qu'elle publie elle-même : un rapport earned/owned, une amplification
 * externe. Aucun score, aucune estimation — deux comptages réels et leur quotient.
 */
export interface EchoMediatique {
  fenetreJours: number;
  periodeDebutMs: number;
  periodeFinMs: number;
  /** Publications propres de l'ANSUT datées dans la fenêtre (owned). */
  owned: number;
  /** Articles de presse collectés citant « ANSUT », datés dans la fenêtre (earned). */
  earned: number;
  /** earned / owned, arrondi au centième ; null si owned = 0 (quotient impossible). */
  ratio: number | null;
  /** Ratio de la fenêtre PRÉCÉDENTE (même durée, juste avant) ; null si non calculable. */
  ratioAvant: number | null;
  /**
   * Évolution du ratio en % vs la fenêtre précédente, arrondie à l'entier ;
   * null si l'un des deux ratios est indisponible (on n'invente pas de tendance).
   */
  variationPct: number | null;
  /** Les articles comptés, du plus récent au plus ancien — preuves cliquables. */
  articles: ArticleEcho[];
}

/**
 * Calcule l'écho médiatique sur la fenêtre.
 *
 * `owned` est fourni par l'appelant (le nombre de publications ANSUT datées déjà
 * calculé par {@link calculerInsights}) pour garantir que le chiffre est le même
 * partout sur l'écran. `earned` est recompté ici en fenêtrant les articles de
 * presse par leur date de publication (fournie par la source).
 */
export function calculerEchoMediatique(
  articlesPresse: ArticleEcho[],
  owned: number,
  fenetreJours: number,
  maintenantMs: number,
  /**
   * Publications propres datées dans la fenêtre PRÉCÉDENTE (fournie par
   * {@link calculerInsights} via `totalDateesAvant`). Optionnel : sans elle,
   * aucune tendance n'est calculée (on ne fabrique pas d'évolution).
   */
  ownedAvant?: number,
): EchoMediatique {
  const fenetreMs = fenetreJours * 24 * 3600 * 1000;
  const debut = maintenantMs - fenetreMs;
  const comptes = (articlesPresse ?? [])
    .filter((a) => a.dateMs !== null && a.dateMs >= debut && a.dateMs <= maintenantMs)
    .sort((a, b) => (b.dateMs ?? 0) - (a.dateMs ?? 0));
  const earned = comptes.length;
  const ratio = owned > 0 ? Math.round((earned / owned) * 100) / 100 : null;

  // Fenêtre précédente [maintenant - 2·fenêtre, maintenant - fenêtre[ : même
  // durée, juste avant. On ne calcule l'évolution que si les deux ratios existent.
  const debutAvant = debut - fenetreMs;
  const earnedAvant = (articlesPresse ?? []).filter(
    (a) => a.dateMs !== null && a.dateMs >= debutAvant && a.dateMs < debut,
  ).length;
  const ratioAvant =
    ownedAvant && ownedAvant > 0 ? Math.round((earnedAvant / ownedAvant) * 100) / 100 : null;
  const variationPct =
    ratio !== null && ratioAvant !== null && ratioAvant > 0
      ? Math.round(((ratio - ratioAvant) / ratioAvant) * 100)
      : null;

  return {
    fenetreJours,
    periodeDebutMs: debut,
    periodeFinMs: maintenantMs,
    owned,
    earned,
    ratio,
    ratioAvant,
    variationPct,
    articles: comptes,
  };
}

/** Formate un nombre décimal court en français (5 → « 5 », 5.2 → « 5,2 »). */
function nombreCourt(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 });
}

/**
 * Synthèse d'une phrase, calculée (pas générée par un LLM) à partir des faits
 * mesurés : combien de publications, sur quels thèmes dominants, avec quel écho
 * presse moyen. Renvoie `null` s'il n'y a rien de daté à résumer. Chaque membre
 * n'est ajouté que si la donnée existe (jamais de tendance ni de thème inventé).
 */
export function construireSyntheseInsights(
  ins: InsightsCommunication,
  echo: EchoMediatique,
): string | null {
  if (ins.totalDatees === 0) return null;
  let phrase = `En ${ins.fenetreJours} jours, l'ANSUT a publié ${ins.totalDatees} fois`;
  const top = ins.themes.slice(0, 2).map((t) => t.libelle.toLowerCase());
  if (top.length === 2) phrase += `, surtout sur ${top[0]} et ${top[1]}`;
  else if (top.length === 1) phrase += `, surtout sur ${top[0]}`;
  phrase += '.';
  if (echo.ratio !== null) {
    const r = nombreCourt(echo.ratio);
    phrase += ` Chaque publication a généré en moyenne ${r} reprise${echo.ratio >= 2 ? 's' : ''} presse.`;
  }
  return phrase;
}

/**
 * Trajectoire de l'écho presse : répartit les articles comptés en `bins`
 * tranches de temps égales sur la fenêtre (de la plus ancienne à la plus
 * récente), et renvoie le nombre réel d'articles par tranche. Sert de
 * micro-courbe sous le KPI. Aucune interpolation : ce sont des comptages bruts.
 */
export function serieEcho(echo: EchoMediatique, bins = 12): number[] {
  const debut = echo.periodeDebutMs;
  const span = Math.max(echo.periodeFinMs - debut, 1);
  const counts = new Array<number>(bins).fill(0);
  for (const a of echo.articles) {
    if (a.dateMs === null) continue;
    let idx = Math.floor(((a.dateMs - debut) / span) * bins);
    if (idx < 0) idx = 0;
    if (idx >= bins) idx = bins - 1;
    counts[idx]++;
  }
  return counts;
}

export interface PointRetenir {
  cle: string;
  texte: string;
}

/**
 * Points « À retenir » — un résumé (pas une recommandation), entièrement dérivé
 * des faits mesurés. Chaque point n'apparaît que si sa donnée existe : thème
 * dominant, réseau dominant, partenaire le plus cité, écho presse et son
 * évolution. Aucune interprétation, aucun chiffre fabriqué.
 */
export function pointsARetenir(ins: InsightsCommunication, echo: EchoMediatique): PointRetenir[] {
  const points: PointRetenir[] = [];

  if (ins.themes.length > 0 && ins.totalDatees > 0) {
    const t = ins.themes[0];
    const pct = Math.round((t.count / ins.totalDatees) * 100);
    points.push({
      cle: 'theme',
      texte: `${t.libelle} concentre ${pct} % des publications (${t.count}/${ins.totalDatees}).`,
    });
  }

  if (ins.parReseau.length > 0 && ins.totalDatees > 0) {
    const r = ins.parReseau[0];
    const pct = Math.round((r.count / ins.totalDatees) * 100);
    points.push({
      cle: 'reseau',
      texte: `${r.libelle} concentre l'essentiel de l'activité (${pct} %, ${r.count} publication${r.count > 1 ? 's' : ''}).`,
    });
  }

  if (ins.partenaires.length > 0) {
    const p = ins.partenaires[0];
    points.push({
      cle: 'partenaire',
      texte: `${p.libelle} est le partenaire le plus cité (${p.count} mention${p.count > 1 ? 's' : ''}).`,
    });
  }

  if (echo.ratio !== null) {
    let texte = `L'écho presse est de ${nombreCourt(echo.ratio)} article${echo.ratio >= 2 ? 's' : ''} de presse par publication`;
    if (echo.variationPct !== null && echo.variationPct !== 0) {
      texte += `, ${echo.variationPct > 0 ? 'en hausse' : 'en baisse'} de ${Math.abs(echo.variationPct)} % vs la période précédente`;
    } else if (echo.variationPct === 0) {
      texte += `, stable vs la période précédente`;
    }
    texte += '.';
    points.push({ cle: 'echo', texte });
  }

  return points;
}

export function calculerInsights(
  publications: PubInsights[],
  fenetreJours: number,
  maintenantMs: number,
): InsightsCommunication {
  const dansFenetre: PubInsights[] = [];
  const fenetrePrecedente: PubInsights[] = [];
  let totalNonDatees = 0;

  for (const p of publications ?? []) {
    const q = qualifier(
      {
        texte: p.contenu,
        published_at: p.date_publication,
        collected_at: p.collecte_le,
        source_officielle_ansut: true,
      },
      maintenantMs,
    );
    if (!q.dateVerifiee || q.ageJours === null) {
      totalNonDatees++;
      continue;
    }
    if (q.ageJours <= fenetreJours) dansFenetre.push(p);
    else if (q.ageJours <= 2 * fenetreJours) fenetrePrecedente.push(p);
  }

  // 1) Activité par réseau (+ évolution + fréquence par semaine).
  const reseauCount = new Map<string, { libelle: string; count: number }>();
  const reseauAvant = new Map<string, number>();
  for (const p of dansFenetre) {
    const { cle, libelle } = normReseau(p.plateforme);
    const r = reseauCount.get(cle) ?? { libelle, count: 0 };
    r.count++;
    reseauCount.set(cle, r);
  }
  for (const p of fenetrePrecedente) {
    const { cle } = normReseau(p.plateforme);
    reseauAvant.set(cle, (reseauAvant.get(cle) ?? 0) + 1);
  }
  const semaines = Math.max(fenetreJours / 7, 1 / 7);
  const parReseau: StatReseau[] = [...reseauCount.entries()]
    .map(([cle, { libelle, count }]) => {
      const countAvant = reseauAvant.get(cle) ?? 0;
      return {
        cle,
        libelle,
        count,
        countAvant,
        evolution: evolutionDe(count, countAvant),
        frequenceParSemaine: Math.round((count / semaines) * 10) / 10,
      };
    })
    .sort((a, b) => b.count - a.count);

  // 2) Thèmes portés (piliers).
  const themeMap = new Map<string, StatCompte>();
  for (const m of MISSIONS_STRATEGIQUES) {
    themeMap.set(m.id, { cle: m.id, libelle: m.nomCourt, count: 0 });
  }
  // 3) Types de communication.
  const typeMap = new Map<string, StatCompte>();
  // 4) Partenaires cités.
  const partMap = new Map<string, StatCompte>();
  // 5) Formats.
  const formatMap = new Map<string, StatCompte>();
  // 6) Calendrier (jour de semaine).
  const calMap = new Map<string, StatCompte>();
  JOURS.forEach((j, i) => calMap.set(String(i), { cle: String(i), libelle: j, count: 0 }));

  for (const p of dansFenetre) {
    const q = qualifier(
      { texte: p.contenu, published_at: p.date_publication, collected_at: p.collecte_le, source_officielle_ansut: true },
      maintenantMs,
    );
    // Thèmes
    for (const id of q.themes) {
      const t = themeMap.get(id);
      if (t) t.count++;
    }
    // Type
    const cat: CategorieCommunication = q.categorie;
    const tExist = typeMap.get(cat) ?? { cle: cat, libelle: LIBELLE_CATEGORIE[cat], count: 0 };
    tExist.count++;
    typeMap.set(cat, tExist);
    // Partenaires (une pub compte une fois par partenaire cité)
    for (const nom of partenairesDansTexte(p.contenu ?? '')) {
      const pa = partMap.get(nom) ?? { cle: nom, libelle: nom, count: 0 };
      pa.count++;
      partMap.set(nom, pa);
    }
    // Format
    const f = inferFormat(p);
    const fe = formatMap.get(f) ?? { cle: f, libelle: LIBELLE_FORMAT[f], count: 0 };
    fe.count++;
    formatMap.set(f, fe);
    // Calendrier : jour de semaine (getDay: 0=dimanche → on ramène à Lundi..Dimanche)
    const d = new Date(p.date_publication as string);
    if (!Number.isNaN(d.getTime())) {
      const idx = (d.getDay() + 6) % 7; // 0 = lundi
      const c = calMap.get(String(idx));
      if (c) c.count++;
    }
  }

  // 7) Engagement — uniquement les chiffres réellement fournis (aucun score).
  const engMap = new Map<string, EngagementReseau>();
  for (const p of dansFenetre) {
    const { cle, libelle } = normReseau(p.plateforme);
    const e = engMap.get(cle) ?? { cle, libelle, disponible: false, vues: 0, likes: 0, comments: 0, shares: 0 };
    e.vues += p.vues || 0;
    e.likes += p.likes || 0;
    e.comments += p.comments || 0;
    e.shares += p.shares || 0;
    if ((p.vues || 0) + (p.likes || 0) + (p.comments || 0) + (p.shares || 0) > 0) e.disponible = true;
    engMap.set(cle, e);
  }

  const themes = [...themeMap.values()].filter((t) => t.count > 0).sort((a, b) => b.count - a.count);

  return {
    fenetreJours,
    totalDatees: dansFenetre.length,
    totalDateesAvant: fenetrePrecedente.length,
    totalNonDatees,
    parReseau,
    themes,
    types: trier(typeMap),
    partenaires: trier(partMap),
    formats: trier(formatMap),
    calendrier: [...calMap.values()], // ordre Lundi→Dimanche conservé
    engagement: [...engMap.values()].sort((a, b) => b.vues - a.vues),
  };
}
