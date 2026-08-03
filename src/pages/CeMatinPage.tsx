import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  BellRing,
  CalendarCheck,
  Clock,
  FileText,
  Home,
  Newspaper,
  RefreshCw,
  Sparkles,
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
import { ChangementsDuJour } from '@/components/radar/ChangementsDuJour';
import { AnalyseCommunication } from '@/components/radar/AnalyseCommunication';
import { NotreCommunication } from '@/components/radar/NotreCommunication';
import { ChangementsDepuisHier } from '@/components/radar/ChangementsDepuisHier';
import { ASurveiller } from '@/components/radar/ASurveiller';
import { CarteSujet } from '@/components/radar/CarteSujet';
import { useAnsutPublications } from '@/hooks/useAnsutPublications';
import { useRecitsSujets } from '@/hooks/useRecitsSujets';
import { alignement, estVoixAnsut, piliersDeLActu } from '@/lib/missions';
import { construireSujets, sujetSuffisant } from '@/lib/sujets';
import { MISSIONS_STRATEGIQUES } from '@/config/missions';
import { nettoyerTitre } from '@/lib/nettoyerExtrait';

/**
 * Fenêtres de « Ce matin ».
 *
 * On charge la veille externe sur 72 h (compteurs des dossiers), et on isole le
 * sous-ensemble des dernières 24 h pour « ce qui a changé depuis hier ». La voix
 * propre de l'ANSUT est chargée sur une fenêtre large : c'est le TTL par type de
 * contenu (voir `pertinenceAnsut`) qui décide de ce qui est encore « vivant »,
 * pas la simple date de collecte.
 */
const TAILLE_VIVIER_ACCUEIL = 60;
const FENETRE_VEILLE_HEURES = 72;
const FENETRE_CHANGEMENTS_HEURES = 24;
const FENETRE_PUBLICATIONS_JOURS = 90;
/** Fenêtre d'observation de la carte-sujet (prototype), en jours. */
const FENETRE_SUJET_JOURS = 7;
/** Vivier de veille dédié au sujet (fenêtre plus large que l'accueil). */
const TAILLE_VIVIER_SUJET = 150;

/** Tous les piliers du Plan ANSUT : c'est le référentiel de pertinence, et non
 * une sélection déduite de la fréquence des publications (règle : ne pas
 * inventer les priorités à partir des mots les plus fréquents). */
const PILIERS_ANSUT = new Set(MISSIONS_STRATEGIQUES.map((m) => m.id));

/** Alignement minimal pour proposer un sujet comme prochaine action. */
const SEUIL_ACTION = 65;

/**
 * Fraîcheur maximale d'un signal critique pour l'accueil. Un signal détecté il y
 * a plusieurs mois n'est pas un sujet « à arbitrer aujourd'hui » : au-delà de
 * cette fenêtre, il n'est plus remonté sur « Ce matin » (il reste consultable
 * dans Surveillance).
 */
const FRAICHEUR_SIGNAL_JOURS = 30;

function mission(id: string | undefined) {
  return id ? MISSIONS_STRATEGIQUES.find((m) => m.id === id) : undefined;
}

/**
 * Page d'accueil « Ce matin ».
 *
 * L'écran relie TROIS couches sans jamais les fondre :
 *   - Connaissance institutionnelle : les piliers du Plan ANSUT 2026-2030.
 *   - Communication ANSUT : ce que l'ANSUT publie sur ses canaux.
 *   - Veille externe : ce que médias, institutions et partenaires publient.
 *
 * De haut en bas :
 *   1. Dossiers stratégiques de l'ANSUT (piliers + dernière comm vivante + veille)
 *   2. Ce qui a changé depuis hier (veille externe 24 h, rattachée aux piliers)
 *   3. À arbitrer (sujets externes méritant une attention humaine)
 *   4. Prochaine action (seulement si justifiée, sinon « À examiner »)
 *
 * Règles verrouillées : date de publication réelle, durée de vie par type de
 * contenu (rien d'expiré pour combler un vide), silence autorisé, aucune
 * mention « critique/stratégique » sans justification visible.
 */
export default function CeMatinPage() {
  const maintenantMs = Date.now();

  const { data: kpis, isFetching: kpisFetching } = useRadarKPIs('24h');
  const { data: signaux } = useRadarSignaux();
  const { data: sujets, isLoading: sujetsLoading } = useIntelligenceFeed(
    TAILLE_VIVIER_ACCUEIL,
    FENETRE_VEILLE_HEURES,
  );

  // Communication propre de l'ANSUT sur une fenêtre large ; le TTL par type de
  // contenu décide ensuite de ce qui est encore vivant pour le briefing.
  const { data: publications } = useAnsutPublications(100, FENETRE_PUBLICATIONS_JOURS * 24);

  const { data: derniereCollecte } = useLastCollecteTime();
  const { hasPermission } = useUserPermissions();

  // Veille EXTERNE (la voix de l'ANSUT vit en section 1, jamais dans la veille).
  const externes = useMemo(() => (sujets ?? []).filter((a) => !estVoixAnsut(a)), [sujets]);
  // Sous-ensemble « depuis hier » (24 h), à partir de la date de publication.
  const externes24h = externes.filter((a) => {
    if (!a.date_publication) return false;
    return new Date(a.date_publication).getTime() >= maintenantMs - FENETRE_CHANGEMENTS_HEURES * 3600 * 1000;
  });

  // Sujet du jour (PROTOTYPE) — nouvelle unité de lecture « 1 carte = 1 sujet ».
  // Flux de veille dédié sur 7 jours ; les autres cartes gardent leur fenêtre 72 h.
  const { data: sujetFeed } = useIntelligenceFeed(TAILLE_VIVIER_SUJET, FENETRE_SUJET_JOURS * 24);
  const externesSujet = useMemo(
    () => (sujetFeed ?? []).filter((a) => !estVoixAnsut(a)),
    [sujetFeed],
  );
  const sujetsCalcules = useMemo(
    () => construireSujets(externesSujet, publications ?? [], maintenantMs, FENETRE_SUJET_JOURS),
    [externesSujet, publications, maintenantMs],
  );
  const sujetDuJour = sujetsCalcules[0];
  const sujetPret = !!sujetDuJour && sujetSuffisant(sujetDuJour);
  const { data: recits, isLoading: recitsLoading } = useRecitsSujets(
    sujetDuJour ? [sujetDuJour] : [],
    sujetPret,
  );

  const signauxCritiques = useMemo(() => {
    const limite = Date.now() - FRAICHEUR_SIGNAL_JOURS * 24 * 3600 * 1000;
    return (signaux ?? []).filter((signal) => {
      if (signal.niveau !== 'critical') return false;
      const detecte = signal.date_detection ? new Date(signal.date_detection).getTime() : NaN;
      // On exclut les signaux trop anciens ; une date manquante reste affichée.
      return Number.isNaN(detecte) || detecte >= limite;
    });
  }, [signaux]);

  const alertesActives = kpis?.alertesActives ?? 0;

  // Sujet externe le plus aligné et rattaché à un pilier (candidat à examiner).
  const sujetPhare = useMemo(
    () => externes.find((a) => alignement(a) >= SEUIL_ACTION && piliersDeLActu(a).length > 0),
    [externes],
  );

  /**
   * Question 4 — Action. Règle verrouillée : on ne génère une action concrète
   * QUE si elle est justifiée (reliée à un signal nouveau et à un pilier, avec
   * source). Sinon on n'invente pas : on affiche « À examiner » ou « Données
   * insuffisantes », et on laisse l'utilisateur décider.
   */
  const prochaineAction = useMemo(() => {
    if (signauxCritiques.length > 0) {
      const s = signauxCritiques[0];
      return {
        titre: `Préparer une note sur : ${s.titre}`,
        raison:
          signauxCritiques.length === 1
            ? 'Un signal critique récent doit être qualifié et documenté.'
            : `${signauxCritiques.length} signaux critiques récents doivent être qualifiés.`,
        actionLabel: 'Aller à Publier',
        to: '/publier',
        icon: FileText,
        ton: 'urgent' as const,
      };
    }
    if (sujetPhare) {
      const m = mission(piliersDeLActu(sujetPhare)[0]);
      return {
        titre: `À examiner : ${nettoyerTitre(sujetPhare.titre)}`,
        raison: m
          ? `Nouveau signal externe rattaché à ${m.code} — ${m.nom}. À confirmer avant toute conclusion ; l'outil ne recommande pas à votre place.`
          : 'Nouveau signal externe aligné sur une mission. À confirmer avant toute conclusion.',
        actionLabel: 'Ouvrir la veille',
        to: `/veille?mission=${piliersDeLActu(sujetPhare)[0]}`,
        icon: Newspaper,
        ton: 'attention' as const,
      };
    }
    if (alertesActives > 0 && hasPermission('receive_alerts')) {
      return {
        titre: 'Passer en revue les alertes en attente',
        raison:
          alertesActives === 1
            ? 'Une alerte attend votre traitement.'
            : `${alertesActives} alertes attendent votre traitement.`,
        actionLabel: 'Ouvrir les alertes',
        to: '/alertes',
        icon: BellRing,
        ton: 'attention' as const,
      };
    }
    return {
      titre: 'Rien ne requiert d’action aujourd’hui',
      raison:
        'Données insuffisantes pour une recommandation fiable : aucun signal externe aligné ni alerte en attente. La surveillance reste active.',
      actionLabel: 'Ouvrir la veille',
      to: '/veille',
      icon: Newspaper,
      ton: 'neutre' as const,
    };
  }, [signauxCritiques, sujetPhare, alertesActives, hasPermission]);

  return (
    <PageContainer>
      <div className="space-y-8">
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

        {/* PROTOTYPE — Le sujet du jour : nouvelle unité de lecture « 1 carte =
            1 sujet », raconté et prouvé. En observation avant généralisation. */}
        {sujetDuJour && (
          <section aria-labelledby="sujet-jour-titre" className="space-y-3">
            <div>
              <h2
                id="sujet-jour-titre"
                className="flex items-center gap-2 text-base font-semibold text-foreground"
              >
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                Le sujet du jour
              </h2>
              <p className="text-xs text-muted-foreground">
                De quoi parle-t-on aujourd'hui — raconté et prouvé. Chaque chiffre renvoie à ses
                sources.
              </p>
            </div>
            <CarteSujet
              sujet={sujetDuJour}
              recit={recits?.[sujetDuJour.id]}
              recitLoading={sujetPret && recitsLoading}
              suffisant={sujetPret}
            />
          </section>
        )}

        {/* En-tête — Ce qui change aujourd'hui (l'essentiel depuis hier, <30 s). */}
        <ChangementsDuJour
          externes={externes}
          publications={publications ?? []}
          maintenantMs={maintenantMs}
          isLoading={sujetsLoading}
        />

        {/* Analyse : notre communication vs écosystème. */}
        <AnalyseCommunication
          publications={publications ?? []}
          externes={externes}
          isLoading={sujetsLoading}
        />

        {/* Couche 1 — Notre communication (thèmes portés par l'ANSUT). */}
        <NotreCommunication />

        {/* Couche 2 — L'écosystème (veille externe récente, rattachée aux thèmes). */}
        <ChangementsDepuisHier
          actualites={externes24h}
          prioritesActives={PILIERS_ANSUT}
          isLoading={sujetsLoading}
          titre="L’écosystème"
          sousTitre="Les sujets qui bougent dans le secteur ces dernières 24 h."
        />

        {/* 3 — À arbitrer (sujets externes méritant une attention humaine). */}
        <ASurveiller
          actualites={externes}
          signauxCritiques={signauxCritiques}
          prioritesActives={PILIERS_ANSUT}
          isLoading={sujetsLoading}
        />

        {/* Q4 — Que faut-il faire aujourd'hui ? */}
        <ProchaineAction {...prochaineAction} />

        {/* Accès secondaires, volontairement sous la ligne de flottaison. */}
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
