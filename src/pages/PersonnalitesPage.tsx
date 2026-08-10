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
import { Users, Sparkles, UserPlus, Plus, List, Target } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { usePersonnalites, usePersonnalitesStats, useUpdatePersonnalite, useDeletePersonnalite, CERCLE_LABELS, type PersonnalitesFilters, type PersonnalitesStats } from '@/hooks/usePersonnalites';
import { PhraseSynthese } from '@/components/common';
import { UnifiedFilterBar } from '@/components/personnalites/UnifiedFilterBar';
import { ActeursStatsBar } from '@/components/personnalites/ActeursStatsBar';
import { ReseauResume } from '@/components/personnalites/ReseauResume';
import { SmartActeurCard } from '@/components/personnalites/SmartActeurCard';
import { CercleHeader } from '@/components/personnalites/CercleHeader';
import { ActeurDetail } from '@/components/personnalites/ActeurDetail';
import { ActeurFormDialog } from '@/components/personnalites/ActeurFormDialog';
import { RadarVisualization } from '@/components/personnalites/RadarVisualization';
import { SectionEmptyState } from '@/components/radar/SectionEmptyState';
import { SectionSkeleton } from '@/components/radar/SectionSkeleton';
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

          {isAdmin && (
            <Button onClick={openCreateDialog} className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Ajouter</span>
            </Button>
          )}
        </div>
      </div>

      {/* Phrase de synthèse — signature éditoriale de RADAR. Le directeur lit
          l'essentiel en 5 s ; tuiles et cartes ne font que le prouver. */}
      <SyntheseActeurs
        personnalites={personnalites}
        mentions7j={mentions7j}
        stats={stats}
        isLoading={isLoading}
      />

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
      />

      {/* Form dialog */}
      <ActeurFormDialog
        open={formDialogOpen}
        onOpenChange={handleDialogClose}
        acteur={editingActeur ?? undefined}
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

// États éditoriaux partagés (Empty / Error / Skeleton) : la page ne réécrit plus
// ses propres variantes, elle consomme le kit commun — cohérence charte garantie.
function LoadingSkeleton() {
  return (
    <SectionSkeleton
      variant="cards"
      count={8}
      gridClassName="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      aria-label="Chargement des acteurs"
    />
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <SectionEmptyState
      variant="error"
      title="Impossible de charger les acteurs"
      description="Les données des personnalités n'ont pas pu être récupérées. Vérifiez votre connexion ou réessayez dans quelques instants."
      onRetry={onRetry}
    />
  );
}

function EmptyState({ cercle, onAddManually }: { cercle?: CercleStrategique; onAddManually?: () => void }) {
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  // Cercle spécifique vide : message simple, compact.
  if (cercle) {
    return (
      <SectionEmptyState
        compact
        title="Aucun acteur trouvé"
        description={`Aucun acteur dans le cercle ${cercle} pour le moment.`}
        icon={<Users className="h-8 w-8" />}
      />
    );
  }

  // Base vide : état global avec actions (générer / ajouter) ou consigne lecteur.
  return (
    <SectionEmptyState
      title="Aucun acteur dans la base"
      description="La base d'acteurs est vide. Commencez par générer des personnalités clés du secteur numérique ivoirien."
      icon={<Users className="h-8 w-8" />}
      actions={
        isAdmin ? (
          <>
            <Button className="gap-2" onClick={() => navigate('/admin/import-acteurs')}>
              <Sparkles className="h-4 w-4" />
              Générer des acteurs
            </Button>
            <Button variant="outline" className="gap-2" onClick={onAddManually}>
              <UserPlus className="h-4 w-4" />
              Ajouter manuellement
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-3 rounded-lg">
            <UserPlus className="h-4 w-4" />
            <span>Contactez un administrateur pour alimenter la base</span>
          </div>
        )
      }
    />
  );
}

/**
 * Phrase de synthèse en tête d'Acteurs — la signature éditoriale de RADAR.
 *
 * Charte : la maquette de référence proposait une phrase INTERPRÉTÉE (« le
 * Ministre domine les échanges sur la connectivité… »). On tient la même forme
 * — un lead que le directeur lit en 5 secondes — mais on n'énonce qu'un constat
 * d'agrégats RÉELS (répartition, mentions reliées, alertes déclarées), jamais
 * une causalité ni une intention inventée.
 */
function SyntheseActeurs({
  personnalites,
  mentions7j,
  stats,
  isLoading,
}: {
  personnalites?: Personnalite[];
  mentions7j?: Record<string, number>;
  stats?: PersonnalitesStats;
  isLoading?: boolean;
}) {
  const total = stats?.total ?? personnalites?.length ?? 0;

  if (isLoading && total === 0) {
    return <PhraseSynthese contexte="cette semaine" phrase="" isLoading />;
  }

  if (total === 0) {
    return (
      <PhraseSynthese
        contexte="cette semaine"
        phrase="La cartographie des acteurs n'est pas encore constituée. Les repères apparaîtront dès les premières fiches et mentions reliées."
      />
    );
  }

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
  if (aSurveiller > 0) {
    phrases.push(
      `${aSurveiller} ${aSurveiller > 1 ? 'sont signalés' : 'est signalé'} à surveiller.`,
    );
  }

  return (
    <PhraseSynthese
      contexte="cette semaine"
      phrase={phrases.join(' ')}
      note="Constat d'agrégats mesurés, sans interprétation."
    />
  );
}
