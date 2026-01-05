import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Plus, Rss } from 'lucide-react';
import { useFluxVeille, useFluxActualitesCount, useDeleteFlux, FluxVeille } from '@/hooks/useFluxVeille';
import { FluxCard, FluxFormDialog } from '@/components/flux';

export default function FluxPage() {
  const { data: flux, isLoading } = useFluxVeille();
  const { data: counts } = useFluxActualitesCount(flux?.map(f => f.id) || []);
  const deleteFlux = useDeleteFlux();

  const [formOpen, setFormOpen] = useState(false);
  const [editingFlux, setEditingFlux] = useState<FluxVeille | null>(null);
  const [deletingFlux, setDeletingFlux] = useState<FluxVeille | null>(null);

  const handleEdit = (f: FluxVeille) => {
    setEditingFlux(f);
    setFormOpen(true);
  };

  const handleDelete = (f: FluxVeille) => {
    setDeletingFlux(f);
  };

  const confirmDelete = async () => {
    if (deletingFlux) {
      await deleteFlux.mutateAsync(deletingFlux.id);
      setDeletingFlux(null);
    }
  };

  const handleCloseForm = (open: boolean) => {
    setFormOpen(open);
    if (!open) {
      setEditingFlux(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Rss className="h-8 w-8 text-primary" />
            Mes Flux de Veille
          </h1>
          <p className="text-muted-foreground">
            Créez des flux personnalisés pour recevoir les actualités qui vous intéressent
          </p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Créer un flux
        </Button>
      </div>

      {/* Flux Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="glass">
              <CardContent className="pt-4 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : flux?.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Rss className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun flux créé</h3>
            <p className="text-muted-foreground mb-4">
              Créez votre premier flux de veille personnalisé pour recevoir les actualités 
              correspondant à vos critères.
            </p>
            <Button onClick={() => setFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Créer mon premier flux
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flux?.map((f) => (
            <FluxCard
              key={f.id}
              flux={f}
              actualitesCount={counts?.[f.id] || 0}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Form Dialog */}
      <FluxFormDialog
        open={formOpen}
        onOpenChange={handleCloseForm}
        flux={editingFlux}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingFlux} onOpenChange={(open) => !open && setDeletingFlux(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce flux ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le flux "{deletingFlux?.nom}" sera définitivement supprimé. 
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
