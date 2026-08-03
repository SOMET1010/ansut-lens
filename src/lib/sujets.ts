/**
 * Le « Sujet » — la nouvelle unité de lecture de RADAR (prototype).
 *
 * RADAR est un conseiller éditorial : un Directeur de la Communication ne pense
 * pas en articles, il pense en sujets. Ce module regroupe les contenus DÉJÀ
 * collectés (veille externe + publications ANSUT) autour d'un thème du Plan
 * ANSUT, et en tire :
 *   - des compteurs RÉELS (strictement égaux aux preuves affichées) ;
 *   - le mouvement du sujet (émergent / hausse / stable / baisse) ;
 *   - l'écart entre la communication de l'ANSUT et celle de l'écosystème ;
 *   - une raison EXPLICABLE de sa présence aujourd'hui (aucun score opaque) ;
 *   - un résumé factuel déterministe, servant de repli si le récit IA échoue.
 *
 * Aucune donnée n'est inventée : tout provient des contenus associés, et chaque
 * chiffre est adossé à la liste de preuves correspondante.
 */

import type { Actualite } from '@/types';
import type { PublicationAnsut } from '@/hooks/useAnsutPublications';
import { MISSIONS_STRATEGIQUES } from '@/config/missions';
import { piliersDeLActu } from '@/lib/missions';
import { partenairesDansTexte } from '@/lib/syntheseAnsut';
import { dansLaFenetre, qualifier } from '@/lib/qualificationContenu';

const JOUR_MS = 24 * 3600 * 1000;

export type MouvementSujet = 'emergent' | 'hausse' | 'stable' | 'baisse';
export type EcartSujet = 'ecosysteme-devant' | 'partage' | 'ansut-devant';

export interface Sujet {
  /** Identifiant stable du sujet (l'axe du Plan ANSUT). */
  id: string;
  code: string;
  nom: string;
  nomCourt: string;
  periodeJours: number;
  /** Preuves — écosystème : tous les articles comptés (compteur == longueur). */
  articles: Actualite[];
  /** Preuves — voix ANSUT : toutes les publications comptées. */
  publications: PublicationAnsut[];
  /** Partenaires / institutions cités (adossés au texte réel). */
  partenaires: string[];
  /** Sources distinctes de l'écosystème. */
  sources: string[];
  nbArticles: number;
  nbPublications: number;
  nbArticles24h: number;
  nbArticlesAvant24h: number;
  mouvement: MouvementSujet;
  ecart: EcartSujet;
  /** Raison explicable de la présence du sujet (sans score ni pourcentage). */
  pourquoi: string;
  /** Résumé factuel déterministe (repli si le récit IA est indisponible). */
  resumeFactuel: string;
}

function dateMs(d?: string | null): number | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? null : t;
}

function texteArticle(a: Actualite): string {
  return `${a.titre ?? ''} ${a.resume ?? ''} ${(a.tags ?? []).join(' ')}`;
}

function mouvementDepuis(apres: number, avant: number): MouvementSujet {
  if (avant === 0 && apres > 0) return 'emergent';
  if (apres > avant) return 'hausse';
  if (apres < avant) return 'baisse';
  return 'stable';
}

function ecartPhrase(nbArticles: number, nbPublications: number): string {
  if (nbPublications === 0)
    return 'L’écosystème en parle, mais l’ANSUT n’a pas publié sur ce thème sur la période.';
  if (nbArticles === 0)
    return 'L’ANSUT communique sur ce thème ; l’écosystème en parle peu.';
  return `Le sujet est partagé : l’ANSUT (${nbPublications}) et l’écosystème (${nbArticles}) le traitent tous deux.`;
}

function construirePourquoi(s: {
  mouvement: MouvementSujet;
  nbArticles: number;
  nbArticles24h: number;
  nbArticlesAvant24h: number;
  sources: string[];
  periodeJours: number;
}): string {
  const nbSources = s.sources.length;
  const src = `${nbSources} source${nbSources > 1 ? 's' : ''} distincte${nbSources > 1 ? 's' : ''}`;
  if (s.mouvement === 'emergent') {
    return `Ce sujet apparaît parce qu’il émerge dans la veille depuis hier (${s.nbArticles24h} nouveau${s.nbArticles24h > 1 ? 'x' : ''} contenu${s.nbArticles24h > 1 ? 's' : ''}).`;
  }
  if (s.mouvement === 'hausse') {
    return `Ce sujet apparaît parce que son volume a augmenté depuis la veille (${s.nbArticlesAvant24h} → ${s.nbArticles24h} contenus sur 24 h) et que ${src} en parlent.`;
  }
  return `Ce sujet apparaît parce que ${s.nbArticles} contenu${s.nbArticles > 1 ? 's' : ''} de ${src} le traitent sur les ${s.periodeJours} derniers jours.`;
}

/**
 * Construit les sujets à partir des contenus déjà collectés, sur une fenêtre
 * glissante. Les articles sont datés (date de publication réelle) ; les
 * publications ANSUT sont fenêtrées sur leur horodatage de collecte (toujours
 * connu), et affichées ensuite avec leur date honnête. Les sujets sans aucune
 * activité sont exclus. Le tri met en tête ce qui bouge et ce qui est le plus
 * traité (ordonnancement interne, jamais affiché comme score).
 */
export function construireSujets(
  externes: Actualite[],
  publications: PublicationAnsut[],
  maintenantMs: number,
  periodeJours = 7,
): Sujet[] {
  const debut = maintenantMs - periodeJours * JOUR_MS;
  const debut24 = maintenantMs - JOUR_MS;
  const debut48 = maintenantMs - 2 * JOUR_MS;

  // Articles de veille datés RÉELLEMENT dans la période.
  const articlesPeriode = (externes ?? []).filter((a) => {
    const ms = dateMs(a.date_publication);
    return ms !== null && ms >= debut && ms <= maintenantMs;
  });
  // Publications ANSUT : qualification commune — seules les prises de parole
  // INSTITUTIONNELLES, datées réellement dans la période, peuvent servir de
  // preuve d'un thème stratégique (Fanzone/sport/GITEX ancien exclus).
  const pubsQualifiees = (publications ?? [])
    .map((p) => ({
      p,
      q: qualifier(
        {
          texte: p.contenu,
          published_at: p.date_publication,
          collected_at: p.collecte_le,
          source_officielle_ansut: true,
        },
        maintenantMs,
      ),
    }))
    .filter((x) => x.q.eligibleProfilStrategique && dansLaFenetre(x.q, periodeJours));

  const sujets: Sujet[] = MISSIONS_STRATEGIQUES.map((m) => {
    const articles = articlesPeriode.filter((a) => piliersDeLActu(a).includes(m.id));
    const pubs = pubsQualifiees.filter((x) => x.q.themes.includes(m.id)).map((x) => x.p);

    const nbArticles24h = articles.filter((a) => {
      const ms = dateMs(a.date_publication);
      return ms !== null && ms >= debut24;
    }).length;
    const nbArticlesAvant24h = articles.filter((a) => {
      const ms = dateMs(a.date_publication);
      return ms !== null && ms >= debut48 && ms < debut24;
    }).length;

    const sources = Array.from(
      new Set(articles.map((a) => a.source_nom).filter((s): s is string => !!s)),
    );

    const texteGlobal = [
      ...articles.map(texteArticle),
      ...pubs.map((p) => p.contenu ?? ''),
    ].join('  \n  ');
    const partenaires = partenairesDansTexte(texteGlobal);

    const mouvement = mouvementDepuis(nbArticles24h, nbArticlesAvant24h);
    const ecart: EcartSujet =
      pubs.length === 0 ? 'ecosysteme-devant' : articles.length === 0 ? 'ansut-devant' : 'partage';

    const pourquoi = construirePourquoi({
      mouvement,
      nbArticles: articles.length,
      nbArticles24h,
      nbArticlesAvant24h,
      sources,
      periodeJours,
    });
    const resumeFactuel = `Sur les ${periodeJours} derniers jours, ${articles.length} article${articles.length > 1 ? 's' : ''} de veille et ${pubs.length} publication${pubs.length > 1 ? 's' : ''} ANSUT traitent de « ${m.nomCourt} ». ${ecartPhrase(articles.length, pubs.length)}`;

    return {
      id: m.id,
      code: m.code,
      nom: m.nom,
      nomCourt: m.nomCourt,
      periodeJours,
      articles,
      publications: pubs,
      partenaires,
      sources,
      nbArticles: articles.length,
      nbPublications: pubs.length,
      nbArticles24h,
      nbArticlesAvant24h,
      mouvement,
      ecart,
      pourquoi,
      resumeFactuel,
    } satisfies Sujet;
  }).filter((s) => s.nbArticles > 0 || s.nbPublications > 0);

  // Ordonnancement interne (jamais affiché) : ce qui bouge et ce qui est le plus
  // traité passe en tête.
  const poidsMouvement: Record<MouvementSujet, number> = {
    emergent: 3,
    hausse: 3,
    stable: 0,
    baisse: 0,
  };
  return sujets.sort(
    (a, b) =>
      b.nbArticles24h * 2 + b.nbArticles + poidsMouvement[b.mouvement] -
      (a.nbArticles24h * 2 + a.nbArticles + poidsMouvement[a.mouvement]),
  );
}

/** Un sujet est « suffisant » pour un récit IA fiable s'il a assez de matière. */
export function sujetSuffisant(s: Sujet): boolean {
  return s.nbArticles >= 2 || (s.nbArticles >= 1 && s.nbPublications >= 1);
}
