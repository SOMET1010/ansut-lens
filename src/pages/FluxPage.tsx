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
import { Plus, Radio, Sparkles, Bot } from 'lucide-react';
import { useFluxVeille, useFluxActualitesCount, useFluxNewActualitesCount, useDeleteFlux, FluxVeille, useCreateFlux, FluxFormData } from '@/hooks/useFluxVeille';
import { FluxCard, FluxFormDialog, FluxTemplateCard, fluxTemplates, FluxTemplate } from '@/components/flux';
import { PageContainer, PageHeader, SectionRepliable } from '@/components/common';

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
    <PageContainer>
      <div className="w-full space-y-6 animate-fade-in">
        <PageHeader
          titre="Surveillance"
          description="Les sujets et sources surveillés en continu, avec leur activité récente."
          icon={Radio}
        />

        {/* Header — Capteurs Stratégiques */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-3">
              <Radio className="h-5 w-5 text-primary" aria-hidden />
              Capteurs Stratégiques
              {!isLoading && flux && flux.length > 0 && (
                <Badge variant="secondary" className="text-xs gap-1">
                  <Bot className="h-3 w-3" aria-hidden />
                  {activeCount} agent{activeCount > 1 ? 's' : ''} actif{activeCount > 1 ? 's' : ''}
                </Badge>
              )}
            </h2>
            <p className="text-muted-foreground mt-1">
              Dispositifs de surveillance numérique — chaque agent surveille, analyse, alerte et recommande.
            </p>
          </div>
          <Button onClick={handleCreateNew} className="gap-2 min-h-11 sm:min-h-9">
            <Plus className="h-4 w-4" aria-hidden />
            Déployer un capteur
          </Button>
        </div>

        {/* Flux Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-card">
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
          <Card className="bg-card">
            <CardContent className="py-12 text-center">
              <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Radio className="h-8 w-8 text-primary" aria-hidden />
              </div>
              <h3 className="text-lg font-semibold mb-2">Aucun capteur déployé</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Déployez votre premier capteur stratégique pour activer la surveillance automatique,
                ou choisissez un dispositif ANSUT ci-dessous.
              </p>
              <Button onClick={handleCreateNew} size="lg" className="min-h-11 sm:min-h-9">
                <Plus className="h-4 w-4 mr-2" aria-hidden />
                Déployer mon premier capteur
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

        {/* Section : Dispositifs ANSUT */}
        <div className="border-t border-border pt-8">
          <h2 className="text-sm font-bold text-muted-foreground uppercase mb-1 flex items-center gap-2">
            <Sparkles className="h-4 w-4" aria-hidden />
            Dispositifs de Surveillance ANSUT
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Modèles préconfigurés alignés sur les missions stratégiques ANSUT — déploiement en un clic.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
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
              <AlertDialogCancel className="min-h-11 sm:min-h-9">Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground min-h-11 sm:min-h-9">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageContainer>
  );
}
