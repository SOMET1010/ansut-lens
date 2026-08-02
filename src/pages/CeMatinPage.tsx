import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  BellRing,
  CalendarCheck,
  ChevronDown,
  Clock,
  FileText,
  Gauge,
  Home,
  MessageSquare,
  Newspaper,
  RefreshCw,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/ui/relative-time';
import {
  ChiffreCle,
  PageContainer,
  PageHeader,
  ProchaineAction,
  TermeMetier,
} from '@/components/common';
import {
  useIntelligenceFeed,
  useLastCollecteTime,
  useRadarKPIs,
  useRadarSignaux,
} from '@/hooks/useRadarData';
import { useUserPermissions } from '@/hooks/useUserPermissions';

/** Nombre de sujets presentes sur l'accueil. Volontairement bas. */
const NB_SUJETS_ACCUEIL = 5;

/**
 * Formule une phrase de lecture pour un volume de mentions.
 * Un nombre brut ne dit rien : c'est la tendance qui porte le sens.
 *
 * `phraseZero` est fourni par l'appelant plutot que construit ici : une formule
 * generique obligerait a inserer un point median pour couvrir les deux genres,
 * ce qui produit un texte illisible pour un lecteur peu familier de l'ecrit
 * administratif. Le public de la plateforme inclut des agents dont la maitrise
 * de l'ecrit varie, l'accord doit donc etre juste et non contourne.
 */
function lireVolume(valeur: number, phraseZero: string): string {
  if (valeur === 0) return phraseZero;
  if (valeur < 10) return `Activité faible sur la période`;
  if (valeur < 40) return `Activité modérée, dans la normale`;
  if (valeur < 100) return `Activité soutenue, à suivre`;
  return `Volume inhabituel, mérite une lecture attentive`;
}

function lireAlertes(valeur: number): string {
  if (valeur === 0) return 'Aucune alerte en attente de traitement';
  if (valeur === 1) return 'Une alerte attend votre traitement';
  return `${valeur} alertes attendent votre traitement`;
}

function lireScore(valeur: number): string {
  if (valeur >= 75) return 'Présence digitale solide';
  if (valeur >= 50) return 'Présence digitale correcte, marge de progression';
  if (valeur > 0) return 'Présence digitale à renforcer';
  return 'Score non encore calculé';
}

/**
 * Page d'accueil « Ce matin ».
 *
 * L'ancien ecran d'accueil cumulait trois roles — tableau de bord, flux
 * d'actualites et fil personnalise — derriere trois onglets de premier niveau
 * eux-memes surmontes de trois onglets de periode. L'utilisateur devait faire
 * plusieurs choix avant de voir la moindre information utile.
 *
 * Ce nouvel ecran repond a une seule question : que dois-je savoir maintenant ?
 * Il tient sans onglet et se lit de haut en bas en quatre strates de priorite
 * decroissante : alerte critique s'il y en a une, quatre chiffres cles
 * interpretes, les cinq sujets qui comptent, puis la prochaine action a mener.
 *
 * Tout le reste a migre vers les pages Veille et Recherche, accessibles en un
 * clic depuis des liens explicites.
 */
export default function CeMatinPage() {
  /** Depliage des signaux critiques directement dans la barre d'alerte. */
  const [signauxDeplies, setSignauxDeplies] = useState(false);

  const { data: kpis, isLoading: kpisLoading, isFetching: kpisFetching } = useRadarKPIs('24h');
  const { data: signaux } = useRadarSignaux();
  const { data: sujets, isLoading: sujetsLoading } = useIntelligenceFeed(NB_SUJETS_ACCUEIL);
  const { data: derniereCollecte } = useLastCollecteTime();
  const { hasPermission } = useUserPermissions();

  const signauxCritiques = useMemo(
    () => (signaux ?? []).filter((signal) => signal.niveau === 'critical'),
    [signaux],
  );

  const alertesActives = kpis?.alertesActives ?? 0;

  /**
   * Determine l'action la plus pertinente a proposer, selon l'etat du systeme
   * et les permissions. Une seule action est proposee a la fois : proposer un
   * choix reviendrait a reintroduire la charge de decision que la refonte
   * cherche precisement a supprimer.
   */
  const prochaineAction = useMemo(() => {
    if (signauxCritiques.length > 0) {
      return {
        titre: 'Traiter les signaux critiques du jour',
        raison:
          signauxCritiques.length === 1
            ? 'Un signal critique n’a pas encore été traité.'
            : `${signauxCritiques.length} signaux critiques n’ont pas encore été traités.`,
        actionLabel: 'Examiner les signaux',
        onAction: () => setSignauxDeplies(true),
        icon: AlertTriangle,
        ton: 'urgent' as const,
      };
    }
    if (alertesActives > 0 && hasPermission('receive_alerts')) {
      return {
        titre: 'Passer en revue les alertes en attente',
        raison: lireAlertes(alertesActives),
        actionLabel: 'Ouvrir les alertes',
        to: '/alertes',
        icon: BellRing,
        ton: 'attention' as const,
      };
    }
    if (hasPermission('view_dossiers')) {
      return {
        titre: 'Préparer la note de synthèse du jour',
        raison:
          'La veille des dernières vingt-quatre heures est disponible et peut être transformée en note.',
        actionLabel: 'Aller à Publier',
        to: '/publier',
        icon: FileText,
        ton: 'neutre' as const,
      };
    }
    return {
      titre: 'Explorer la veille de la journée',
      raison: 'Les articles collectés cette nuit sont prêts à être lus.',
      actionLabel: 'Ouvrir la veille',
      to: '/veille',
      icon: Newspaper,
      ton: 'neutre' as const,
    };
  }, [signauxCritiques.length, alertesActives, hasPermission]);

  return (
    <PageContainer>
      <div className="space-y-6">
        <PageHeader
          titre="Ce matin"
          description={`Ce qu’il faut savoir aujourd’hui, ${format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}.`}
          icon={Home}
          actions={
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {derniereCollecte && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Dernière collecte</span>
                  <RelativeTime date={derniereCollecte} />
                </span>
              )}
              {kpisFetching && (
                <RefreshCw className="h-4 w-4 animate-spin" aria-label="Mise à jour" />
              )}
            </div>
          }
        />

        {/*
          Strate 1 : alerte critique, affichee seulement si necessaire.

          Cette barre pointait initialement vers `/veille?niveau=critical`. La
          recette a montre que la promesse ne pouvait pas etre tenue : les
          signaux proviennent de la table `signaux`, tandis que la page Veille
          lit la table `actualites`. Aucun champ commun ne permet de filtrer
          l'une par la criticite de l'autre, si bien que l'utilisateur cliquait
          sur « Examiner » et recevait la liste complete des articles.

          Plutot que de simuler un filtre, les signaux sont depliables sur place.
          L'information demandee est ainsi obtenue sans changer d'ecran ni
          perdre le contexte.
        */}
        {signauxCritiques.length > 0 && (
          <div
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/[0.06] p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-destructive">
                    {signauxCritiques.length === 1
                      ? 'Un signal critique détecté'
                      : `${signauxCritiques.length} signaux critiques détectés`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {signauxCritiques.length === 1
                      ? 'Ce sujet requiert votre attention aujourd’hui.'
                      : 'Ces sujets requièrent votre attention aujourd’hui.'}
                  </p>
                </div>
              </div>
              <Button
                variant="destructive"
                size="sm"
                className="min-h-11 shrink-0 sm:min-h-9"
                onClick={() => setSignauxDeplies((ouvert) => !ouvert)}
                aria-expanded={signauxDeplies}
              >
                {signauxDeplies ? 'Masquer' : 'Examiner'}
                <ChevronDown
                  className={`ml-1.5 h-4 w-4 transition-transform ${
                    signauxDeplies ? 'rotate-180' : ''
                  }`}
                  aria-hidden
                />
              </Button>
            </div>

            {signauxDeplies && (
              <ul className="mt-3 space-y-2 border-t border-destructive/20 pt-3">
                {signauxCritiques.map((signal) => (
                  <li key={signal.id} className="rounded-lg bg-background/70 p-3">
                    <p className="text-sm font-medium leading-snug">{signal.titre}</p>
                    {signal.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{signal.description}</p>
                    )}
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      Détecté <RelativeTime date={signal.date_detection} />
                      {typeof signal.score_impact === 'number' && signal.score_impact > 0 && (
                        <> · impact estimé {signal.score_impact}/100</>
                      )}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Strate 2 : quatre chiffres cles, chacun accompagne de sa lecture. */}
        <section aria-labelledby="chiffres-titre" className="space-y-3">
          <h2 id="chiffres-titre" className="text-sm font-semibold text-muted-foreground">
            Les chiffres des dernières 24 heures
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ChiffreCle
              libelle="Mentions"
              valeur={kpis?.mentions ?? 0}
              lecture={lireVolume(kpis?.mentions ?? 0, 'Aucune mention sur la période')}
              icon={MessageSquare}
              to="/veille"
              isLoading={kpisLoading}
            />
            <ChiffreCle
              libelle="Articles collectés"
              valeur={kpis?.articles ?? 0}
              lecture={lireVolume(kpis?.articles ?? 0, 'Aucun article collecté sur la période')}
              icon={Newspaper}
              to="/veille"
              isLoading={kpisLoading}
            />
            <ChiffreCle
              libelle="Alertes actives"
              valeur={alertesActives}
              lecture={lireAlertes(alertesActives)}
              icon={BellRing}
              to="/alertes"
              isLoading={kpisLoading}
              alerte={alertesActives > 0}
            />
            <ChiffreCle
              libelle="Score d’influence"
              valeur={kpis?.scoreInfluence ?? 0}
              lecture={lireScore(kpis?.scoreInfluence ?? 0)}
              icon={Gauge}
              to="/acteurs?tab=spdi"
              isLoading={kpisLoading}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Le score d’influence agrège les{' '}
            <TermeMetier cle="spdi">scores de présence digitale</TermeMetier> des acteurs
            suivis.
          </p>
        </section>

        {/* Strate 3 : les sujets qui comptent, reduits a l'essentiel. */}
        <section aria-labelledby="sujets-titre" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 id="sujets-titre" className="text-sm font-semibold text-muted-foreground">
              Les sujets qui comptent
            </h2>
            <Button asChild variant="link" size="sm" className="h-auto p-0">
              <Link to="/veille">
                Toute la veille
                <ArrowRight className="ml-1 h-3.5 w-3.5" aria-hidden />
              </Link>
            </Button>
          </div>

          {sujetsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-16 rounded-xl" />
              ))}
            </div>
          ) : (sujets ?? []).length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <Newspaper className="h-10 w-10 text-muted-foreground/60" aria-hidden />
                <p className="text-sm text-muted-foreground">
                  Aucun sujet collecté pour le moment.
                </p>
                <Button asChild size="sm" className="min-h-11 sm:min-h-9">
                  <Link to="/veille">Lancer une collecte</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ul className="space-y-2">
              {(sujets ?? []).slice(0, NB_SUJETS_ACCUEIL).map((sujet) => (
                <li key={sujet.id}>
                  <Link
                    to={`/veille?article=${sujet.id}`}
                    className="flex min-h-11 items-start gap-3 rounded-xl border bg-card p-3.5 transition-colors hover:border-primary/40 hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="min-w-0 flex-1 space-y-1">
                      <span className="line-clamp-2 block text-sm font-medium leading-snug">
                        {sujet.titre}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                        {sujet.source_nom && <span className="truncate">{sujet.source_nom}</span>}
                        {sujet.date_publication && (
                          <>
                            <span aria-hidden>·</span>
                            <RelativeTime date={sujet.date_publication} />
                          </>
                        )}
                      </span>
                    </span>
                    <ArrowRight
                      className="mt-1 h-4 w-4 shrink-0 text-muted-foreground/50"
                      aria-hidden
                    />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Strate 4 : la prochaine action a mener. */}
        <ProchaineAction {...prochaineAction} />

        {/* Acces secondaires, volontairement sous la ligne de flottaison. */}
        <section aria-labelledby="acces-titre" className="space-y-3">
          <h2 id="acces-titre" className="text-sm font-semibold text-muted-foreground">
            Aller plus loin
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Link
              to="/recherche"
              className="flex min-h-11 items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-medium">Rechercher un sujet</span>
                <span className="block text-xs text-muted-foreground">
                  Toutes les sources sur trente jours
                </span>
              </span>
            </Link>
            <Link
              to="/acteurs"
              className="flex min-h-11 items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-medium">Voir les acteurs</span>
                <span className="block text-xs text-muted-foreground">
                  Qui parle et qui compte dans le secteur
                </span>
              </span>
            </Link>
            <Link
              to="/publier"
              className="flex min-h-11 items-start gap-3 rounded-xl border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-medium">Publier une note</span>
                <span className="block text-xs text-muted-foreground">
                  Notes de synthèse et newsletters
                </span>
              </span>
            </Link>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}
