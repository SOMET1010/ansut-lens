/**
 * Adaptateur « Notre communication » — assemble un {@link Communication} à partir
 * du moteur honnête déjà en place ({@link calculerInsights},
 * {@link calculerEchoMediatique}) et des FONDATIONS de crédibilité (dédup,
 * preuve, indicateur).
 *
 * Ne fabrique aucun score : reprend des comptages réels, expose leur méthode,
 * et dégrade en « donnée indisponible » plutôt que d'inventer une précision.
 * La vue « Notre communication » ne fait que rendre cet objet.
 */

import type { InsightsCommunication, EchoMediatique, ArticleEcho } from '@/lib/insightsCommunication';
import { nettoyerTitre } from '@/lib/nettoyerExtrait';
import { estPageArticle } from '@/lib/dedup';
import { tracable, indisponible } from '@/lib/indicateur';
import type { Preuve } from '@/lib/preuve';
import type {
  Communication,
  EchoCommunication,
  EngagementReseauItem,
  StatItem,
  StatReseauItem,
} from '@/lib/communication';

/** Reprises presse affichées comme preuves cliquables. */
const MAX_REPRISES = 12;
/** Articles portés par la carte d'écho médiatique. */
const MAX_ARTICLES_ECHO = 8;

function preuveArticle(a: ArticleEcho): Preuve {
  return {
    id: a.id,
    source: a.source ?? 'Presse',
    type: 'presse',
    titre: nettoyerTitre(a.titre),
    url: a.url ?? null,
    dateMs: a.dateMs,
  };
}

/** Ne garde comme reprise qu'un article attribuable pointant vers un vrai article. */
function estRepriseValide(a: ArticleEcho): boolean {
  if (!a.source) return false;
  return a.url ? estPageArticle(a.url) : true;
}

function versEcho(echo: EchoMediatique | null): EchoCommunication | null {
  if (!echo) return null;
  const articles = echo.articles.filter(estRepriseValide).slice(0, MAX_ARTICLES_ECHO).map(preuveArticle);
  return {
    // Une seule décimale : deux décimales sur-représenteraient la précision.
    ratio: echo.ratio == null ? null : Math.round(echo.ratio * 10) / 10,
    earned: echo.earned,
    owned: echo.owned,
    fenetreJours: echo.fenetreJours,
    methode: `Reprises presse citant « ANSUT » ÷ publications ANSUT sur ${echo.fenetreJours} jours — deux comptages réels de volumes (dédupliqués), sans lien de causalité ni estimation.`,
    articles,
  };
}

function versEngagement(insights: InsightsCommunication): EngagementReseauItem[] {
  return insights.engagement.map((e) => {
    if (!e.disponible) {
      return {
        cle: e.cle,
        libelle: e.libelle,
        indicateur: indisponible('La plateforme ne fournit pas de compteurs d’engagement.'),
      };
    }
    const interactions = e.likes + e.comments + e.shares;
    const details = [
      `${e.likes} j’aime`,
      `${e.comments} commentaire${e.comments > 1 ? 's' : ''}`,
      `${e.shares} partage${e.shares > 1 ? 's' : ''}`,
    ];
    if (e.vues > 0) details.push(`${e.vues} vue${e.vues > 1 ? 's' : ''}`);
    return {
      cle: e.cle,
      libelle: e.libelle,
      indicateur: tracable(
        `${interactions.toLocaleString('fr-FR')} interactions`,
        `${details.join(' · ')} — compteurs fournis par la plateforme.`,
      ),
    };
  });
}

const versStat = (s: { cle: string; libelle: string; count: number }): StatItem => ({
  cle: s.cle,
  libelle: s.libelle,
  count: s.count,
});

/** Assemble l'objet Communication à partir des agrégats réels et de l'écho. */
export function assemblerCommunication(input: {
  insights: InsightsCommunication;
  echo: EchoMediatique | null;
  maintenantMs: number;
}): Communication {
  const { insights, echo, maintenantMs } = input;

  const parReseau: StatReseauItem[] = insights.parReseau.map((r) => ({
    cle: r.cle,
    libelle: r.libelle,
    count: r.count,
    evolution: r.evolution,
    frequenceParSemaine: r.frequenceParSemaine,
  }));

  const echoC = versEcho(echo);
  const reprisesPresse = echo
    ? echo.articles.filter(estRepriseValide).slice(0, MAX_REPRISES).map(preuveArticle)
    : [];

  return {
    fenetreJours: insights.fenetreJours,
    periode: {
      debutMs: maintenantMs - insights.fenetreJours * 24 * 3600 * 1000,
      finMs: maintenantMs,
    },
    publications: {
      totalDatees: insights.totalDatees,
      totalNonDatees: insights.totalNonDatees,
      parReseau,
      themes: insights.themes.map(versStat),
      formats: insights.formats.map(versStat),
    },
    echo: echoC,
    engagement: versEngagement(insights),
    reprisesPresse,
    partenaires: insights.partenaires.map(versStat),
  };
}
