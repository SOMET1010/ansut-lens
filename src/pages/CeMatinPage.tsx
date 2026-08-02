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
  Home,
  Newspaper,
  RefreshCw,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { RelativeTime } from '@/components/ui/relative-time';
import {
  PageContainer,
  PageHeader,
  ProchaineAction,
} from '@/components/common';
import {
  useIntelligenceFeed,
  useLastCollecteTime,
  useRadarKPIs,
  useRadarSignaux,
} from '@/hooks/useRadarData';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { ObjectifsStrategiques } from '@/components/radar/ObjectifsStrategiques';
import { PreuvesParAxe } from '@/components/radar/PreuvesParAxe';
import { DailyBriefing } from '@/components/radar/DailyBriefing';
import { ActiviteAnsut } from '@/components/radar/ActiviteAnsut';
import { useAnsutPublications } from '@/hooks/useAnsutPublications';
import { deriverAdnPublications } from '@/lib/prioritesAnsut';

/**
 * Taille du vivier d'actualites recentes charge pour l'accueil. Il alimente a la
 * fois la repartition par mission (« objectifs impactes ») et les preuves, sans
 * multiplier les requetes.
 */
const TAILLE_VIVIER_ACCUEIL = 40;

/**
 * Fenetre « ce matin » : l'accueil ne considere que l'actualite des dernieres
 * 24 h. La page promet « ce qu'il faut savoir aujourd'hui » — elle ne doit donc
 * pas afficher d'articles anciens sous ce bandeau. En l'absence d'actualite
 * fraiche, l'ecran le dit honnetement plutot que de remonter du contenu perime.
 */
const FENETRE_CE_MATIN_HEURES = 24;

/**
 * Formule une phrase de lecture pour un volume d'alertes en attente.
 * L'accord est ecrit selon le nombre plutot que contourne par un point median :
 * le public de la plateforme inclut des agents dont la maitrise de l'ecrit
 * varie, l'accord doit donc etre juste et lisible.
 */
function lireAlertes(valeur: number): string {
  if (valeur === 0) return 'Aucune alerte en attente de traitement';
  if (valeur === 1) return 'Une alerte attend votre traitement';
  return `${valeur} alertes attendent votre traitement`;
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
 * decroissante : alerte critique s'il y en a une, les objectifs strategiques
 * impactes (ce qui bouge sur les missions de l'ANSUT), les sujets qui comptent
 * comme preuves, puis la prochaine action a mener.
 *
 * Les chiffres bruts d'antan (mentions, articles, alertes, score) ont ete
 * remplaces par cette lecture par mission : l'article devient une preuve
 * rattachee a un objectif, plutot que le contenu principal.
 *
 * Tout le reste a migre vers les pages Veille et Recherche, accessibles en un
 * clic depuis des liens explicites.
 */
export default function CeMatinPage() {
  /** Depliage des signaux critiques directement dans la barre d'alerte. */
  const [signauxDeplies, setSignauxDeplies] = useState(false);

  const { data: kpis, isFetching: kpisFetching } = useRadarKPIs('24h');
  const { data: signaux } = useRadarSignaux();
  const { data: sujets, isLoading: sujetsLoading } = useIntelligenceFeed(
    TAILLE_VIVIER_ACCUEIL,
    FENETRE_CE_MATIN_HEURES,
  );

  // ADN appris des publications de l'ANSUT sur ~2 mois : quels axes l'agence
  // porte-t-elle activement en ce moment ? Ces priorités contextualisent la
  // lecture de la veille (« touche-t-elle une priorité actuelle de l'ANSUT ? »).
  const { data: publicationsAdn } = useAnsutPublications(200, 60 * 24);
  const prioritesActives = useMemo(
    () => deriverAdnPublications(publicationsAdn ?? []).actifs,
    [publicationsAdn],
  );
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

        {/*
          Strate 2 : les objectifs strategiques impactes.

          Les quatre chiffres bruts (mentions, articles, alertes, score) ont ete
          remplaces : a 8 h du matin, un decideur ne veut pas un decompte, il
          veut savoir ce qui bouge sur les missions de l'ANSUT. Les actualites
          recentes sont reparties par mission, chaque carte portant un niveau
          d'attention et l'information la plus alignee du moment. Les articles
          deviennent les preuves, presentees juste en dessous.
        */}
        {/*
          Strate 1 bis : la synthese executive du matin. Le briefing 30 s (en
          cache 2 h) donne l'essentiel avant meme les objectifs. La Matinale
          riche (priorite executive + actions) prendra le relais en phase 2, une
          fois sa sortie persistee pour une lecture d'accueil peu couteuse.
        */}
        <DailyBriefing />

        {/*
          Strate 2 : notre propre voix d'abord. Le pilotage commence par ce que
          l'ANSUT publie — l'information la plus pertinente et le signal le plus
          direct de ses priorites — avant la presse exterieure.
        */}
        <ActiviteAnsut maxAgeHours={FENETRE_CE_MATIN_HEURES} />

        <ObjectifsStrategiques
          actualites={sujets ?? []}
          isLoading={sujetsLoading}
          prioritesActives={prioritesActives}
        />

        {/* Strate 3 : les preuves, regroupees sous l'axe strategique impacte. */}
        <PreuvesParAxe actualites={sujets ?? []} isLoading={sujetsLoading} />

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
