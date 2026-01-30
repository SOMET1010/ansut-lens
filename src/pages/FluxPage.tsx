import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Rss, Sparkles } from 'lucide-react';
import { useFluxVeille, useFluxActualitesCount, useFluxNewActualitesCount, useDeleteFlux, FluxVeille, useCreateFlux, FluxFormData } from '@/hooks/useFluxVeille';
import { FluxCard, FluxFormDialog, FluxTemplateCard, fluxTemplates, FluxTemplate } from '@/components/flux';

export default function FluxPage() {
  const { data: flux, isLoading } = useFluxVeille();
  const fluxIds = flux?.map(f => f.id) || [];
  const { data: counts } = useFluxActualitesCount(fluxIds);
  const { data: newCounts } = useFluxNewActualitesCount(fluxIds);
  const deleteFlux = useDeleteFlux();
  const createFlux = useCreateFlux();

  const [formOpen, setFormOpen] = useState(false);
  const [editingFlux, setEditingFlux] = useState<FluxVeille | null>(null);
  const [deletingFlux, setDeletingFlux] = useState<FluxVeille | null>(null);
  const [templateData, setTemplateData] = useState<Partial<FluxFormData> | null>(null);

  const activeCount = flux?.filter(f => f.actif).length || 0;

  const handleEdit = (f: FluxVeille) => {
    setEditingFlux(f);
    setTemplateData(null);
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
      setTemplateData(null);
    }
  };

  const handleTemplateSelect = (template: FluxTemplate) => {
    setTemplateData({
      nom: template.title,
      description: template.description,
      mots_cles: template.keywords,
      quadrants: template.quadrants,
      categories_ids: [],
      importance_min: 0,
      alerte_email: false,
      alerte_push: true,
      frequence_digest: 'quotidien',
    });
    setEditingFlux(null);
    setFormOpen(true);
  };

  const handleCreateNew = () => {
    setEditingFlux(null);
    setTemplateData(null);
    setFormOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header amélioré */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Rss className="h-7 w-7 text-primary" />
            Mes Flux de Veille
            {!isLoading && flux && flux.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeCount} actifs
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Gérez vos robots de surveillance et vos alertes automatiques
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Créer un nouveau flux
        </Button>
      </div>

      {/* Flux Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="glass">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
                <Skeleton className="h-12 w-full rounded-lg" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : flux?.length === 0 ? (
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Rss className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucun flux créé</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Créez votre premier flux de veille personnalisé pour recevoir les actualités 
              correspondant à vos critères, ou utilisez un modèle recommandé ci-dessous.
            </p>
            <Button onClick={handleCreateNew} size="lg">
              <Plus className="h-4 w-4 mr-2" />
              Créer mon premier flux
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {flux?.map((f) => (
            <FluxCard
              key={f.id}
              flux={f}
              actualitesCount={counts?.[f.id] || 0}
              newCount={newCounts?.[f.id] || 0}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Section : Modèles recommandés */}
      <div className="border-t border-border pt-8">
        <h2 className="text-sm font-bold text-muted-foreground uppercase mb-4 flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Modèles recommandés pour vous
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {fluxTemplates.map((template) => (
            <FluxTemplateCard
              key={template.id}
              template={template}
              onSelect={handleTemplateSelect}
            />
          ))}
        </div>
      </div>

      {/* Form Dialog */}
      <FluxFormDialog
        open={formOpen}
        onOpenChange={handleCloseForm}
        flux={editingFlux}
        initialData={templateData}
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
