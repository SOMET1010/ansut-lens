import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { usePersonnalites, usePersonnalitesStats, useUpdatePersonnalite, useDeletePersonnalite, CERCLE_LABELS, type PersonnalitesFilters } from '@/hooks/usePersonnalites';
import { UnifiedFilterBar } from '@/components/personnalites/UnifiedFilterBar';
import { CompactStats } from '@/components/personnalites/CompactStats';
import { SmartActeurCard } from '@/components/personnalites/SmartActeurCard';
import { CercleHeader } from '@/components/personnalites/CercleHeader';
import { ActeurDetail } from '@/components/personnalites/ActeurDetail';
import { ActeurFormDialog } from '@/components/personnalites/ActeurFormDialog';
import { RadarVisualization } from '@/components/personnalites/RadarVisualization';
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

  const { data: personnalites, isLoading } = usePersonnalites(filters);
  const { data: stats } = usePersonnalitesStats();
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
    <div className="space-y-6 animate-fade-in">
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
          {/* Stats compactes */}
          <CompactStats />
          
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
          {isLoading ? (
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
        <div className="space-y-8">
          {isLoading ? (
            <LoadingSkeleton />
          ) : personnalites?.length === 0 ? (
            <EmptyState onAddManually={openCreateDialog} />
          ) : activeTab === 'all' ? (
            // Vue "Tous" - groupée par cercle
            ([1, 2, 3, 4] as CercleStrategique[]).map((cercle) => {
              const acteurs = parCercle[cercle];
              if (!acteurs || acteurs.length === 0) return null;
              return (
                <div key={cercle}>
                  <CercleHeader cercle={cercle} count={acteurs.length} />
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
                    {acteurs.map((acteur) => (
                      <SmartActeurCard
                        key={acteur.id}
                        personnalite={acteur}
                        allPersonnalites={personnalites}
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
            // Vue cercle spécifique
            <>
              <CercleHeader 
                cercle={parseInt(activeTab) as CercleStrategique} 
                count={filteredPersonnalites.length} 
              />
              {filteredPersonnalites.length === 0 ? (
                <EmptyState cercle={parseInt(activeTab) as CercleStrategique} />
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-4">
                  {filteredPersonnalites.map((acteur) => (
                    <SmartActeurCard
                      key={acteur.id}
                      personnalite={acteur}
                      allPersonnalites={personnalites}
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
