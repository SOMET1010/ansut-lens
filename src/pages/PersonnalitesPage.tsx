import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Users, Sparkles, UserPlus, Plus, List, Target, Swords, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { usePersonnalites, usePersonnalitesStats, useUpdatePersonnalite, useDeletePersonnalite, CERCLE_LABELS, type PersonnalitesFilters, type PersonnalitesStats } from '@/hooks/usePersonnalites';
import { UnifiedFilterBar } from '@/components/personnalites/UnifiedFilterBar';
import { ActeursStatsBar } from '@/components/personnalites/ActeursStatsBar';
import { ReseauResume } from '@/components/personnalites/ReseauResume';
import { SmartActeurCard } from '@/components/personnalites/SmartActeurCard';
import { CercleHeader } from '@/components/personnalites/CercleHeader';
import { ActeurDetail } from '@/components/personnalites/ActeurDetail';
import { ActeurFormDialog } from '@/components/personnalites/ActeurFormDialog';
import { RadarVisualization } from '@/components/personnalites/RadarVisualization';
import { SPDIBenchmarkPanel } from '@/components/spdi';
import { useMentionsRecentes } from '@/hooks/useMentionsRecentes';
import type { Personnalite, CercleStrategique } from '@/types';

type ViewMode = 'list' | 'radar';

export default function PersonnalitesPage() {
  const [filters, setFilters] = useState<PersonnalitesFilters>({ actif: true });
  const [selectedActeur, setSelectedActeur] = useState<Personnalite | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingActeur, setEditingActeur] = useState<Personnalite | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [deletingActeur, setDeletingActeur] = useState<Personnalite | null>(null);
  const [benchmarkOpen, setBenchmarkOpen] = useState(false);
  const [benchmarkPreselected, setBenchmarkPreselected] = useState<Personnalite | null>(null);
  const { isAdmin } = useAuth();

  const { data: personnalites, isLoading, isError, refetch } = usePersonnalites(filters);
  const { data: stats } = usePersonnalitesStats();
  const mentionsIds = useMemo(() => (personnalites || []).map((p) => p.id), [personnalites]);
  const { data: mentions7j } = useMentionsRecentes(mentionsIds);
  const updatePersonnalite = useUpdatePersonnalite();
  const deletePersonnalite = useDeletePersonnalite();

  // Grouper par cercle
  const parCercle = useMemo(() => {
    if (!personnalites) return { 1: [], 2: [], 3: [], 4: [] };
    return personnalites.reduce((acc, p) => {
      const cercle = p.cercle || 2;
      if (!acc[cercle]) acc[cercle] = [];
      acc[cercle].push(p);
      return acc;
    }, {} as Record<CercleStrategique, Personnalite[]>);
  }, [personnalites]);

  const handleActeurClick = (acteur: Personnalite) => {
    setSelectedActeur(acteur);
    setDetailOpen(true);
  };

  // Lien profond /acteurs?id=<id> : ouvrir directement la fiche ciblée (depuis
  // la recherche globale, les alertes, l'Assistant). Sinon le clic retombait
  // sur la liste (traçabilité rompue — audit P1 #10).
  const [searchParams, setSearchParams] = useSearchParams();
  const focusId = searchParams.get('id');
  useEffect(() => {
    if (!focusId || !personnalites) return;
    const cible = personnalites.find((p) => p.id === focusId);
    if (cible) {
      setSelectedActeur(cible);
      setDetailOpen(true);
      setSearchParams(
        (prev) => {
          const p = new URLSearchParams(prev);
          p.delete('id');
          return p;
        },
        { replace: true },
      );
    }
  }, [focusId, personnalites, setSearchParams]);

  const openCreateDialog = () => {
    setEditingActeur(null);
    setFormDialogOpen(true);
  };

  const openEditDialog = (acteur: Personnalite) => {
    setEditingActeur(acteur);
    setFormDialogOpen(true);
  };

  const handleDialogClose = (open: boolean) => {
    setFormDialogOpen(open);
    if (!open) setEditingActeur(null);
  };

  const handleArchive = async (acteur: Personnalite) => {
    try {
      await updatePersonnalite.mutateAsync({ id: acteur.id, actif: false });
      toast.success('Acteur archivé', { 
        description: `${acteur.prenom || ''} ${acteur.nom} a été archivé.` 
      });
      setDetailOpen(false);
    } catch (error) {
      toast.error('Erreur lors de l\'archivage');
    }
  };

  const handleDeleteRequest = (acteur: Personnalite) => {
    setDeletingActeur(acteur);
  };

  const confirmDelete = async () => {
    if (deletingActeur) {
      try {
        await deletePersonnalite.mutateAsync(deletingActeur.id);
        toast.success('Acteur supprimé', { 
          description: `${deletingActeur.prenom || ''} ${deletingActeur.nom} a été supprimé définitivement.` 
        });
        setDeletingActeur(null);
        setDetailOpen(false);
      } catch (error) {
        toast.error('Erreur lors de la suppression');
      }
    }
  };

  const filteredPersonnalites = useMemo(() => {
    if (activeTab === 'all') return personnalites || [];
    const cercle = parseInt(activeTab) as CercleStrategique;
    return parCercle[cercle] || [];
  }, [activeTab, personnalites, parCercle]);

  return (
    <div className="w-full space-y-6 animate-fade-in">
      {/* Header compact avec stats intégrées */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Target className="h-7 w-7 text-primary" />
            Cartographie des Acteurs
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Suivi de l'influence et des interactions du secteur
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          {/* Toggle Vue Liste / Radar */}
          <ToggleGroup 
            type="single" 
            value={viewMode} 
            onValueChange={(value) => value && setViewMode(value as ViewMode)}
            className="bg-muted/50 p-1 rounded-lg"
          >
            <ToggleGroupItem value="list" aria-label="Vue liste" className="gap-1.5 px-3 text-xs">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Liste</span>
            </ToggleGroupItem>
            <ToggleGroupItem value="radar" aria-label="Vue radar" className="gap-1.5 px-3 text-xs">
              <Target className="h-4 w-4" />
              <span className="hidden sm:inline">Radar</span>
            </ToggleGroupItem>
          </ToggleGroup>
          
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => { setBenchmarkPreselected(null); setBenchmarkOpen(true); }}
          >
            <Swords className="h-4 w-4" />
            <span className="hidden sm:inline">Comparer</span>
          </Button>

          {isAdmin && (
            <Button onClick={openCreateDialog} className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Ajouter</span>
            </Button>
          )}
        </div>
      </div>

      {/* Repères chiffrés réels (Charte : mesures traçables, aucun chiffre fabriqué) */}
      <ActeursStatsBar
        personnalites={personnalites}
        mentions7j={mentions7j}
        stats={stats}
        isLoading={isLoading}
      />

      {/* Barre de filtres unifiée */}
      <UnifiedFilterBar
        filters={filters} 
        onFiltersChange={setFilters}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        stats={stats}
      />

      {/* Vue Radar */}
      {viewMode === 'radar' && (
        <div className="py-8">
          {isError ? (
            <ErrorState onRetry={() => refetch()} />
          ) : isLoading ? (
            <div className="flex items-center justify-center h-96">
              <Skeleton className="w-96 h-96 rounded-full" />
            </div>
          ) : personnalites && personnalites.length > 0 ? (
            <RadarVisualization 
              personnalites={filteredPersonnalites} 
              onActeurClick={handleActeurClick}
            />
          ) : (
            <EmptyState onAddManually={openCreateDialog} />
          )}
        </div>
      )}

      {/* Vue Liste */}
      {viewMode === 'list' && (
        isError ? (
          <ErrorState onRetry={() => refetch()} />
        ) : isLoading ? (
          <div className="space-y-8">
            <LoadingSkeleton />
          </div>
        ) : !personnalites || personnalites.length === 0 ? (
          <EmptyState onAddManually={openCreateDialog} />
        ) : (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            {/* Colonne principale : acteurs groupés par cercle */}
            <div className="min-w-0 space-y-8">
              {activeTab === 'all' ? (
                ([1, 2, 3, 4] as CercleStrategique[]).map((cercle) => {
                  const acteurs = parCercle[cercle];
                  if (!acteurs || acteurs.length === 0) return null;
                  return (
                    <div key={cercle}>
                      <CercleHeader cercle={cercle} count={acteurs.length} />
                      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3 mt-4">
                        {acteurs.map((acteur) => (
                          <SmartActeurCard
                            key={acteur.id}
                            personnalite={acteur}
                            allPersonnalites={personnalites}
                            mentions7j={mentions7j?.[acteur.id]}
                            onClick={() => handleActeurClick(acteur)}
                            onEdit={isAdmin ? () => openEditDialog(acteur) : undefined}
                            onArchive={isAdmin ? () => handleArchive(acteur) : undefined}
                            onDelete={isAdmin ? () => handleDeleteRequest(acteur) : undefined}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <>
                  <CercleHeader
                    cercle={parseInt(activeTab) as CercleStrategique}
                    count={filteredPersonnalites.length}
                  />
                  {filteredPersonnalites.length === 0 ? (
                    <EmptyState cercle={parseInt(activeTab) as CercleStrategique} />
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3 mt-4">
                      {filteredPersonnalites.map((acteur) => (
                        <SmartActeurCard
                          key={acteur.id}
                          personnalite={acteur}
                          allPersonnalites={personnalites}
                          mentions7j={mentions7j?.[acteur.id]}
                          onClick={() => handleActeurClick(acteur)}
                          onEdit={isAdmin ? () => openEditDialog(acteur) : undefined}
                          onArchive={isAdmin ? () => handleArchive(acteur) : undefined}
                          onDelete={isAdmin ? () => handleDeleteRequest(acteur) : undefined}
                        />
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* Synthèse honnête (agrégats réels, aucune interprétation fabriquée) */}
              <SyntheseActeurs
                personnalites={personnalites}
                mentions7j={mentions7j}
                stats={stats}
              />
            </div>

            {/* Colonne latérale : résumé réel du réseau */}
            <div className="self-start xl:sticky xl:top-4">
              <ReseauResume
                personnalites={personnalites}
                mentions7j={mentions7j}
                stats={stats}
                onActeurClick={handleActeurClick}
                onVoirRadar={() => setViewMode('radar')}
              />
            </div>
          </div>
        )
      )}

      {/* Detail panel */}
      <ActeurDetail
        personnalite={selectedActeur}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => {
          if (selectedActeur) {
            setDetailOpen(false);
            openEditDialog(selectedActeur);
          }
        }}
        onArchive={selectedActeur ? () => handleArchive(selectedActeur) : undefined}
        onDelete={selectedActeur ? () => handleDeleteRequest(selectedActeur) : undefined}
        onCompare={(acteur) => {
          setDetailOpen(false);
          setBenchmarkPreselected(acteur);
          setBenchmarkOpen(true);
        }}
      />

      {/* Form dialog */}
      <ActeurFormDialog
        open={formDialogOpen}
        onOpenChange={handleDialogClose}
        acteur={editingActeur ?? undefined}
      />

      {/* Benchmark panel */}
      <SPDIBenchmarkPanel
        open={benchmarkOpen}
        onOpenChange={setBenchmarkOpen}
        preselectedActeur={benchmarkPreselected}
      />

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={!!deletingActeur} onOpenChange={(open) => !open && setDeletingActeur(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cet acteur ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'acteur « {deletingActeur?.prenom} {deletingActeur?.nom} » sera 
              définitivement supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div key={i} className="p-5 rounded-2xl border bg-card">
          <div className="flex items-start gap-4">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="mt-4 flex gap-1">
            <Skeleton className="h-5 w-12" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-10" />
          </div>
          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <div className="flex -space-x-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center rounded-lg border border-dashed border-destructive/40 bg-destructive/5">
      <div className="rounded-full bg-destructive/10 p-3 mb-4">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-lg font-semibold">Impossible de charger les acteurs</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        Les données des personnalités n'ont pas pu être récupérées. Vérifiez votre
        connexion ou réessayez dans quelques instants.
      </p>
      <Button variant="outline" size="sm" onClick={onRetry} className="mt-6 gap-1.5">
        <RefreshCw className="h-3.5 w-3.5" />
        Réessayer
      </Button>
    </div>
  );
}

function EmptyState({ cercle, onAddManually }: { cercle?: CercleStrategique; onAddManually?: () => void }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // Si c'est un cercle spécifique vide, message simple
  if (cercle) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold">Aucun acteur trouvé</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Aucun acteur dans le cercle {cercle} pour le moment.
        </p>
      </div>
    );
  }

  // EmptyState global avec actions
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="rounded-full bg-primary/10 p-4 mb-6">
        <Users className="h-16 w-16 text-primary" />
      </div>
      <h3 className="text-xl font-semibold">Aucun acteur dans la base</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        La base d'acteurs est vide. Commencez par générer des personnalités
        clés du secteur numérique ivoirien.
      </p>
      
      {isAdmin ? (
        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Button 
            size="lg" 
            className="gap-2"
            onClick={() => navigate('/admin/import-acteurs')}
          >
            <Sparkles className="h-5 w-5" />
            Générer des acteurs
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            className="gap-2"
            onClick={onAddManually}
          >
            <UserPlus className="h-5 w-5" />
            Ajouter manuellement
          </Button>
        </div>
      ) : (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-3 rounded-lg">
          <UserPlus className="h-4 w-4" />
          <span>Contactez un administrateur pour alimenter la base</span>
        </div>
      )}
    </div>
  );
}

/**
 * Bande de synthèse « À retenir » en bas de la cartographie.
 *
 * Charte : la maquette de référence terminait par une phrase interprétée
 * (« Le Ministre concentre l'essentiel des prises de parole… »). On ne produit
 * ici qu'un constat d'agrégats RÉELS (répartition, mentions reliées, alertes
 * déclarées) — jamais une intention ou une causalité inventée.
 */
function SyntheseActeurs({
  personnalites,
  mentions7j,
  stats,
}: {
  personnalites?: Personnalite[];
  mentions7j?: Record<string, number>;
  stats?: PersonnalitesStats;
}) {
  const total = stats?.total ?? personnalites?.length ?? 0;
  if (total === 0) return null;

  const parCercle = stats?.parCercle ?? { 1: 0, 2: 0, 3: 0, 4: 0 };
  const dominant = ([1, 2, 3, 4] as CercleStrategique[]).reduce<CercleStrategique>(
    (best, c) => ((parCercle[c] ?? 0) > (parCercle[best] ?? 0) ? c : best),
    1,
  );
  const domN = parCercle[dominant] ?? 0;

  const compte = mentions7j ?? {};
  const actifs = Object.values(compte).filter((n) => n > 0).length;
  const aSurveiller = stats?.alertesElevees ?? 0;

  const phrases: string[] = [];
  if (domN > 0) {
    phrases.push(
      `${total} acteur${total > 1 ? 's' : ''} suivi${total > 1 ? 's' : ''}, ` +
        `dont ${domN} dans le cercle ${CERCLE_LABELS[dominant].label.toLowerCase()}.`,
    );
  } else {
    phrases.push(`${total} acteur${total > 1 ? 's' : ''} suivi${total > 1 ? 's' : ''}.`);
  }
  phrases.push(
    actifs > 0
      ? `${actifs} ${actifs > 1 ? 'ont' : 'a'} été nommé${actifs > 1 ? 's' : ''} dans un contenu sourcé cette semaine.`
      : `Aucun n'a été nommé dans un contenu sourcé cette semaine.`,
  );
  phrases.push(
    aSurveiller > 0
      ? `${aSurveiller} ${aSurveiller > 1 ? 'sont signalés' : 'est signalé'} à surveiller.`
      : `Aucun n'est signalé à surveiller.`,
  );

  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 rounded-lg bg-primary/10 p-1.5 text-primary">
          <Sparkles className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            À retenir
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground/90">
            {phrases.join(' ')}
          </p>
          <p className="mt-1.5 text-[11px] text-muted-foreground/70">
            Constat d'agrégats mesurés — pas d'interprétation.
          </p>
        </div>
      </div>
    </div>
  );
}
