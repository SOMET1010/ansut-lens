import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, Loader2, Newspaper, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  PageContainer,
  PageHeader,
  PhraseSynthese,
  SectionRepliable,
  TermeMetier,
} from '@/components/common';
import {
  useActualites,
  useBatchSentiment,
  useEnrichActualite,
  useTriggerCollecte,
  useYesterdayArticles,
} from '@/hooks/useActualites';
import { useArticleClusters } from '@/hooks/useArticleClusters';
import { useSidebarAnalytics } from '@/hooks/useSidebarAnalytics';
import { MISSIONS_STRATEGIQUES } from '@/config/missions';
import { estVoixAnsut, missionsDeLActualite } from '@/lib/missions';
import type { Actualite } from '@/types';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ArticleCluster } from '@/components/actualites/ArticleCluster';
import { SmartSidebar } from '@/components/actualites/SmartSidebar';
import { WatchHeader } from '@/components/actualites/WatchHeader';
import { BigSearchBar } from '@/components/actualites/BigSearchBar';
import { PourVousFeed } from '@/components/actualites/PourVousFeed';
import { TitrologieWidget } from '@/components/actualites/TitrologieWidget';
import { SectionEmptyState } from '@/components/radar/SectionEmptyState';

/** Correspondance entre le libelle de periode et l'age maximal en heures. */
const PERIODES: Record<string, number | undefined> = {
  '24h': 24,
  '72h': 72,
  '7d': 168,
  '30d': 720,
  all: undefined,
};

/**
 * Page Veille.
 *
 * Cette page recupere ce qui constituait l'onglet « Flux complet » de l'ancien
 * ecran d'accueil, ainsi que le fil « Pour vous ». Les extraire de l'accueil
 * poursuit deux objectifs.
 *
 * D'abord, degager l'accueil : il ne devait pas cumuler tableau de bord et
 * lecture exhaustive de la presse.
 *
 * Ensuite, donner a la lecture de la veille l'espace qu'elle merite, avec une
 * adresse propre partageable, plutot qu'un onglet dont l'etat se perdait a
 * chaque navigation.
 *
 * L'analyse laterale, auparavant purement masquee sur mobile, est desormais
 * accessible sous forme de section repliable.
 */
export default function VeillePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [termeRecherche, setTermeRecherche] = useState('');
  const [periode, setPeriode] = useState<string>('72h');
  const [filtresActifs, setFiltresActifs] = useState<string[]>([]);
  const [enrichissementEnCours, setEnrichissementEnCours] = useState<string | null>(null);
  // La veille = ce que dit l'ÉCOSYSTÈME. Les publications officielles de l'ANSUT
  // en sont exclues par défaut (elles ont leur écran « Notre communication ») ;
  // l'utilisateur peut les réintégrer explicitement.
  const [inclureAnsut, setInclureAnsut] = useState(false);

  const ongletActif = searchParams.get('tab') === 'pour-vous' ? 'pour-vous' : 'tout';

  // Filtre par pilier stratégique (lien depuis « Ce matin »). On préfère le
  // rattachement persisté (pilier_id / piliers) dès qu'il existe en base, avec
  // repli sur le calcul par mots-clés côté client pour les articles anciens.
  const missionParam = searchParams.get('mission');
  const missionActive = MISSIONS_STRATEGIQUES.find((m) => m.id === missionParam);
  const articleDansMission = useCallback((actu: Actualite, missionId: string) => {
    const persiste = actu as Actualite & { pilier_id?: string; piliers?: string[] };
    if (persiste.pilier_id) return persiste.pilier_id === missionId;
    if (persiste.piliers?.length) return persiste.piliers.includes(missionId);
    return missionsDeLActualite(actu).includes(missionId);
  }, []);

  const effacerMission = useCallback(() => {
    setSearchParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        p.delete('mission');
        return p;
      },
      { replace: true },
    );
  }, [setSearchParams]);

  const { data: actualites, isLoading, isError, refetch } = useActualites({
    maxAgeHours: PERIODES[periode],
  });
  const { data: articlesHier } = useYesterdayArticles();
  const declencherCollecte = useTriggerCollecte();
  const enrichirActualite = useEnrichActualite();
  const analyseSentiment = useBatchSentiment();

  const actualitesFiltrees = useMemo(() => {
    return (actualites ?? []).filter((actu) => {
      // La pige presse n'est plus un écran séparé : c'est de la presse comme le
      // reste, elle fait donc partie du fil Veille (une seule expérience de
      // veille, la notion de « pige » disparaît de l'expérience utilisateur).
      // Corpus externe : on écarte la voix officielle de l'ANSUT par défaut.
      if (!inclureAnsut && estVoixAnsut(actu)) return false;
      if (termeRecherche) {
        const terme = termeRecherche.toLowerCase();
        const correspond =
          actu.titre.toLowerCase().includes(terme) ||
          actu.resume?.toLowerCase().includes(terme) ||
          actu.source_nom?.toLowerCase().includes(terme) ||
          actu.tags?.some((tag) => tag.toLowerCase().includes(terme));
        if (!correspond) return false;
      }
      if (filtresActifs.length > 0) {
        const correspond = filtresActifs.every(
          (filtre) =>
            actu.tags?.some((tag) => tag.toLowerCase() === filtre.toLowerCase()) ||
            actu.source_nom?.toLowerCase() === filtre.toLowerCase(),
        );
        if (!correspond) return false;
      }
      if (missionActive && !articleDansMission(actu, missionActive.id)) return false;
      return true;
    });
  }, [actualites, termeRecherche, filtresActifs, missionActive, articleDansMission, inclureAnsut]);

  // Nombre de publications officielles ANSUT présentes dans la période (pour la
  // bascule « inclure / exclure du corpus externe »).
  const nbAnsut = useMemo(
    () => (actualites ?? []).filter((a) => estVoixAnsut(a)).length,
    [actualites],
  );

  const clusters = useArticleClusters(actualitesFiltrees);

  // Lien profond /veille?article=<id> : scroller et surligner l'article ciblé
  // (depuis les citations de l'Assistant, la recherche, les alertes, « Preuves
  // par axe »…). Sans ça, le clic retombait sur la liste — traçabilité rompue
  // (audit P1 #9).
  const articleFocusId = searchParams.get('article');
  useEffect(() => {
    if (!articleFocusId || clusters.length === 0) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`article-${articleFocusId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-primary');
        setTimeout(() => el.classList.remove('ring-2', 'ring-primary'), 2500);
      }
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete('article');
          return p;
        },
        { replace: true },
      );
    }, 400);
    return () => clearTimeout(t);
  }, [articleFocusId, clusters.length, setSearchParams]);
  const analytics = useSidebarAnalytics(actualitesFiltrees, articlesHier, filtresActifs);

  const changerOnglet = (valeur: string) => {
    setSearchParams(valeur === 'tout' ? {} : { tab: valeur }, { replace: true });
  };

  const rafraichir = () => {
    declencherCollecte.mutate('critique', { onSuccess: () => refetch() });
  };

  const enrichir = async (id: string) => {
    setEnrichissementEnCours(id);
    try {
      await enrichirActualite.mutateAsync(id);
    } finally {
      setEnrichissementEnCours(null);
    }
  };

  const basculerFiltre = useCallback((tag: string) => {
    setFiltresActifs((precedents) =>
      precedents.includes(tag) ? precedents.filter((f) => f !== tag) : [...precedents, tag],
    );
  }, []);

  const retirerFiltre = useCallback((filtre: string) => {
    setFiltresActifs((precedents) => precedents.filter((f) => f !== filtre));
  }, []);

  const reinitialiser = () => {
    setTermeRecherche('');
    setFiltresActifs([]);
  };

  return (
    <PageContainer>
      <div className="space-y-5">
        <PageHeader
          titre="Veille"
          description="Tous les articles collectés sur le secteur, regroupés par sujet et classés par pertinence."
          icon={Newspaper}
        />

        {/* Conclusion avant les commandes : signature RADAR. Le lecteur sait
            immédiatement combien de sujets structurent la période et lequel
            domine — calculé, jamais fabriqué. */}
        {clusters.length > 0 && actualitesFiltrees.length > 0 && (
          <PhraseSynthese
            contexte="aujourd'hui"
            phrase={
              <>
                <span className="font-semibold">
                  {clusters.length} sujet{clusters.length > 1 ? 's' : ''}
                </span>{' '}
                regroupe{clusters.length > 1 ? 'nt' : ''} les {actualitesFiltrees.length} article
                {actualitesFiltrees.length > 1 ? 's' : ''} de la période.
                {clusters[0]?.mainArticle?.titre && (
                  <>
                    {' '}En tête&nbsp;:{' '}
                    <span className="font-medium">{clusters[0].mainArticle.titre}</span>.
                  </>
                )}
              </>
            }
            note="Regroupement par similarité de titre, tri par pertinence."
          />
        )}

        {missionActive && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2">
            <span className="text-xs text-muted-foreground">Filtré par l’objectif</span>
            <Badge variant="secondary" className="gap-1">
              <span className="text-muted-foreground">{missionActive.code}</span>
              {missionActive.nom}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-7 gap-1 px-2 text-xs"
              onClick={effacerMission}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Retirer le filtre
            </Button>
          </div>
        )}

        <Tabs value={ongletActif} onValueChange={changerOnglet}>
          <TabsList>
            <TabsTrigger value="tout" className="gap-2">
              <Newspaper className="h-4 w-4" aria-hidden />
              Tous les sujets
            </TabsTrigger>
            <TabsTrigger value="pour-vous" className="gap-2">
              <Sparkles className="h-4 w-4" aria-hidden />
              Mes sujets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tout" className="mt-5 space-y-4">
            <WatchHeader
              newArticlesCount={actualites?.length ?? 0}
              selectedPeriod={periode}
              onPeriodChange={setPeriode}
              onRefresh={rafraichir}
              isRefreshing={declencherCollecte.isPending}
              collectePhase={declencherCollecte.phase}
              onBatchSentiment={() => analyseSentiment.mutate()}
              isBatchingSentiment={analyseSentiment.isPending}
            />

            <BigSearchBar
              value={termeRecherche}
              onChange={setTermeRecherche}
              activeFilters={filtresActifs}
              onClearFilter={retirerFiltre}
            />

            {/* Analyse laterale : repliee sur mobile, colonne sur grand ecran. */}
            <div className="lg:hidden">
              <SectionRepliable
                titre="Analyse de la période"
                indication={`${clusters.length} sujet${clusters.length > 1 ? 's' : ''}`}
                icon={BarChart3}
                toujoursOuvertDes="jamais"
              >
                <div className="space-y-4 pt-1">
                  <TitrologieWidget />
                  <SmartSidebar
                    analytics={analytics}
                    activeFilters={filtresActifs}
                    onFilterChange={basculerFiltre}
                    onPersonClick={setTermeRecherche}
                    onSourceClick={basculerFiltre}
                  />
                </div>
              </SectionRepliable>
            </div>

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
              <div className="min-w-0 flex-1 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-muted-foreground">
                    {clusters.length} sujet{clusters.length > 1 ? 's' : ''} regroupé
                    {clusters.length > 1 ? 's' : ''}, trié
                    {clusters.length > 1 ? 's' : ''} par{' '}
                    <TermeMetier cle="resonance" discret>
                      résonance
                    </TermeMetier>{' '}
                    et fraîcheur.
                  </p>
                  {nbAnsut > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1.5 text-[11px]"
                      onClick={() => setInclureAnsut((v) => !v)}
                      aria-pressed={inclureAnsut}
                    >
                      {inclureAnsut
                        ? `Masquer les publications ANSUT (${nbAnsut})`
                        : `Inclure les publications ANSUT (${nbAnsut})`}
                    </Button>
                  )}
                </div>

                {isLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Card key={index} className="overflow-hidden">
                        <CardContent className="space-y-2 p-5">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : isError && clusters.length === 0 ? (
                  // Charte : un échec de chargement n'est PAS un « aucune actualité ».
                  // On le dit honnêtement et on propose de réessayer, sans masquer
                  // l'erreur derrière un état vide. (Si des données restent affichables
                  // malgré une erreur de rafraîchissement, on les garde plutôt que ce bloc.)
                  <SectionEmptyState
                    variant="error"
                    title="Impossible de charger la veille"
                    description="Les actualités n'ont pas pu être récupérées. Vérifiez votre connexion ou réessayez dans un instant."
                    onRetry={() => refetch()}
                  />
                ) : clusters.length === 0 ? (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                      <Newspaper className="h-12 w-12 text-muted-foreground" aria-hidden />
                      <p className="text-sm text-muted-foreground">
                        {termeRecherche || filtresActifs.length > 0
                          ? 'Aucun article ne correspond à vos critères.'
                          : 'Aucune actualité collectée sur cette période.'}
                      </p>
                      <div className="flex flex-wrap justify-center gap-3">
                        {(termeRecherche || filtresActifs.length > 0) && (
                          <Button
                            variant="outline"
                            onClick={reinitialiser}
                            className="min-h-11 sm:min-h-9"
                          >
                            Effacer les filtres
                          </Button>
                        )}
                        <Button
                          onClick={rafraichir}
                          disabled={declencherCollecte.isPending}
                          className="min-h-11 sm:min-h-9"
                        >
                          {declencherCollecte.isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                          )}
                          Lancer une collecte
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  clusters.map((cluster) => (
                    <ArticleCluster
                      key={cluster.mainArticle.id}
                      mainArticle={cluster.mainArticle}
                      relatedArticles={cluster.relatedArticles}
                      onEnrich={enrichir}
                      isEnriching={enrichissementEnCours === cluster.mainArticle.id}
                    />
                  ))
                )}
              </div>

              <aside className="hidden w-full space-y-6 self-start lg:sticky lg:top-20 lg:block lg:w-80 xl:w-96">
                <TitrologieWidget />
                <SmartSidebar
                  analytics={analytics}
                  activeFilters={filtresActifs}
                  onFilterChange={basculerFiltre}
                  onPersonClick={setTermeRecherche}
                  onSourceClick={basculerFiltre}
                />
              </aside>
            </div>
          </TabsContent>

          <TabsContent value="pour-vous" className="mt-5">
            <PourVousFeed />
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  );
}
