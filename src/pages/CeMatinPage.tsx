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
import { ActiviteAnsut } from '@/components/radar/ActiviteAnsut';
import { ChangementsDepuisHier } from '@/components/radar/ChangementsDepuisHier';
import { ASurveiller } from '@/components/radar/ASurveiller';
import { useAnsutPublications } from '@/hooks/useAnsutPublications';
import { prioritesAvecRepli } from '@/lib/prioritesAnsut';
import { alignement, piliersDeLActu } from '@/lib/missions';
import { MISSIONS_STRATEGIQUES } from '@/config/missions';
import { nettoyerTitre } from '@/lib/nettoyerExtrait';

/**
 * Fenêtre « ce matin » pour la veille externe : l'accueil ne considère que
 * l'actualité des dernières 24 h sous la question « qu'est-ce qui a changé
 * depuis hier ? ». Le vivier chargé sert au filtrage par priorité et au
 * dédoublonnage.
 */
const TAILLE_VIVIER_ACCUEIL = 40;
const FENETRE_CE_MATIN_HEURES = 24;

/** Fenêtre de la voix propre de l'ANSUT (question 1), en jours. */
const FENETRE_ANSUT_JOURS = 30;

/** Alignement minimal pour proposer un sujet comme prochaine action. */
const SEUIL_ACTION = 65;

function mission(id: string | undefined) {
  return id ? MISSIONS_STRATEGIQUES.find((m) => m.id === id) : undefined;
}

/**
 * Page d'accueil « Ce matin ».
 *
 * L'écran répond à quatre questions, et à elles seules, de haut en bas :
 *   1. Qu'a fait ou annoncé l'ANSUT récemment ?  → « L'ANSUT récemment »
 *   2. Qu'est-ce qui a changé depuis hier ?       → « Ce qui a changé depuis hier »
 *   3. Quel sujet mérite une attention humaine ?  → « À arbitrer »
 *   4. Que faut-il faire aujourd'hui ?            → « Prochaine action »
 *
 * L'organisation part de l'actualité propre de l'ANSUT, puis relie les signaux
 * externes à ces priorités — au lieu d'un simple flux de presse. Les chiffres
 * bruts, le briefing en prose non sourcée et la répétition de l'alerte critique
 * ont été retirés : chaque fait affiché provient d'une source datée.
 */
export default function CeMatinPage() {
  const { data: kpis, isFetching: kpisFetching } = useRadarKPIs('24h');
  const { data: signaux } = useRadarSignaux();
  const { data: sujets, isLoading: sujetsLoading } = useIntelligenceFeed(
    TAILLE_VIVIER_ACCUEIL,
    FENETRE_CE_MATIN_HEURES,
  );

  // Priorités de l'ANSUT : apprises de ses publications, avec repli sur les
  // piliers qu'elle porte par mandat (P1, P6) quand la collecte est encore mince.
  const { data: publicationsAdn } = useAnsutPublications(200, FENETRE_ANSUT_JOURS * 24);
  const { priorites: prioritesActives } = useMemo(
    () => prioritesAvecRepli(publicationsAdn ?? []),
    [publicationsAdn],
  );

  const { data: derniereCollecte } = useLastCollecteTime();
  const { hasPermission } = useUserPermissions();

  const signauxCritiques = useMemo(
    () => (signaux ?? []).filter((signal) => signal.niveau === 'critical'),
    [signaux],
  );

  const alertesActives = kpis?.alertesActives ?? 0;

  // Sujet le plus aligné du matin (sert la prochaine action quand aucun signal
  // critique n'est en attente).
  const sujetPhare = useMemo(
    () => (sujets ?? []).find((a) => alignement(a) >= SEUIL_ACTION),
    [sujets],
  );

  /**
   * Question 4 : une action précise et attribuable. On formule un verbe clair
   * (préparer une note, vérifier, ouvrir la veille), rattaché au sujet concret
   * du jour, plutôt qu'une recommandation générique. L'alerte critique n'est pas
   * répétée ici : elle vit dans « À arbitrer ».
   */
  const prochaineAction = useMemo(() => {
    if (signauxCritiques.length > 0) {
      const s = signauxCritiques[0];
      return {
        titre: `Préparer une note sur : ${s.titre}`,
        raison:
          signauxCritiques.length === 1
            ? 'Un signal critique doit être qualifié et documenté aujourd’hui.'
            : `${signauxCritiques.length} signaux critiques doivent être qualifiés aujourd’hui.`,
        actionLabel: 'Aller à Publier',
        to: '/publier',
        icon: FileText,
        ton: 'urgent' as const,
      };
    }
    if (sujetPhare) {
      const m = mission(piliersDeLActu(sujetPhare)[0]);
      return {
        titre: `Vérifier et qualifier : ${nettoyerTitre(sujetPhare.titre)}`,
        raison: m
          ? `Sujet le plus aligné du matin (${m.code} — ${m.nom}). À confirmer avant toute diffusion.`
          : 'Sujet le plus aligné du matin. À confirmer avant toute diffusion.',
        actionLabel: 'Ouvrir la veille',
        to: sujetPhare.pilier_id ? `/veille?mission=${sujetPhare.pilier_id}` : '/veille',
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
      titre: 'Maintenir la surveillance',
      raison: 'Aucun sujet ne requiert d’action particulière aujourd’hui. La veille reste active.',
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

        {/* Q1 — Qu'a fait ou annoncé l'ANSUT récemment ? */}
        <ActiviteAnsut joursFenetre={FENETRE_ANSUT_JOURS} />

        {/* Q2 — Qu'est-ce qui a changé depuis hier ? */}
        <ChangementsDepuisHier
          actualites={sujets ?? []}
          prioritesActives={prioritesActives}
          isLoading={sujetsLoading}
        />

        {/* Q3 — Quel sujet mérite une attention humaine ? */}
        <ASurveiller
          actualites={sujets ?? []}
          signauxCritiques={signauxCritiques}
          prioritesActives={prioritesActives}
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
