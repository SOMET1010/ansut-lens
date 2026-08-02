import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Bell, BellOff, Mail, Rss, ExternalLink, Settings, Radio } from 'lucide-react';
import { useFluxById, useFluxActualites } from '@/hooks/useFluxVeille';
import { FreshnessIndicator } from '@/components/actualites/FreshnessIndicator';
import { SectionEmptyState } from '@/components/radar/SectionEmptyState';
import { toErrorMessage } from '@/utils/errors';
import { useState } from 'react';
import { FluxFormDialog } from '@/components/flux';
import { nettoyerExtrait, nettoyerTitre } from '@/lib/nettoyerExtrait';
import { PageContainer, PageHeader } from '@/components/common';

const frequenceLabels: Record<string, string> = {
  instantane: 'Instantané',
  quotidien: 'Quotidien',
  hebdo: 'Hebdomadaire',
};

const quadrantLabels: Record<string, string> = {
  tech: 'Technologie',
  regulation: 'Régulation',
  market: 'Marché',
  reputation: 'Réputation',
};

export default function FluxDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: flux, isLoading: isLoadingFlux, isError: isErrorFlux, error: errorFlux, refetch: refetchFlux } = useFluxById(id);
  const { data: actualites, isLoading: isLoadingActus, isError: isErrorActus, error: errorActus, refetch: refetchActus } = useFluxActualites(id);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoadingFlux) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </div>
      </PageContainer>
    );
  }

  if (isErrorFlux) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate('/surveillance')} className="min-h-11 sm:min-h-9">
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
            Retour aux flux
          </Button>
          <SectionEmptyState
            variant="error"
            title="Impossible de charger ce flux"
            description={toErrorMessage(errorFlux)}
            onRetry={() => refetchFlux()}
          />
        </div>
      </PageContainer>
    );
  }

  if (!flux) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Button variant="ghost" onClick={() => navigate('/surveillance')} className="min-h-11 sm:min-h-9">
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
            Retour aux flux
          </Button>
          <Card className="bg-card">
            <CardContent className="py-12 text-center">
              <Rss className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden />
              <h2 className="text-lg font-semibold">Flux introuvable</h2>
              <p className="text-muted-foreground">Ce flux n'existe pas ou a été supprimé.</p>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="w-full space-y-6 animate-fade-in">
        <Button variant="ghost" size="sm" onClick={() => navigate('/surveillance')} className="mb-2 min-h-11 sm:min-h-9">
          <ArrowLeft className="h-4 w-4 mr-2" aria-hidden />
          Retour aux flux
        </Button>

        <PageHeader
          titre="Surveillance"
          description="Détail d'un élément surveillé : son activité, ses sources et son historique."
          icon={Radio}
          actions={
            <Button variant="outline" onClick={() => setEditOpen(true)} className="min-h-11 sm:min-h-9">
              <Settings className="h-4 w-4 mr-2" aria-hidden />
              Modifier
            </Button>
          }
        />

        {/* Flux Info Card */}
        <Card className="bg-card">
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-4 items-center text-sm">
              {/* Keywords */}
              {flux.mots_cles.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {flux.mots_cles.map((kw) => (
                    <Badge key={kw} variant="secondary">{kw}</Badge>
                  ))}
                </div>
              )}

              {/* Notifications */}
              <div className="flex items-center gap-2 text-muted-foreground ml-auto">
                {flux.alerte_push ? (
                  <span className="flex items-center gap-1">
                    <Bell className="h-4 w-4" aria-hidden />
                    Notifications actives
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <BellOff className="h-4 w-4" aria-hidden />
                    Pas d'alerte
                  </span>
                )}
                {flux.alerte_email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" aria-hidden />
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actualites List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Actualités ({actualites?.length || 0})
          </h2>

          {isLoadingActus ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="bg-card">
                <CardContent className="pt-4">
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))
          ) : isErrorActus ? (
            <SectionEmptyState
              variant="error"
              title="Impossible de charger les actualités du flux"
              description={toErrorMessage(errorActus)}
              onRetry={() => refetchActus()}
            />
          ) : actualites?.length === 0 ? (
            <Card className="bg-card">
              <CardContent className="py-12 text-center">
                <Rss className="h-12 w-12 mx-auto text-muted-foreground mb-4" aria-hidden />
                <h3 className="text-lg font-semibold mb-2">Aucune actualité</h3>
                <p className="text-muted-foreground">
                  Aucune actualité ne correspond encore aux critères de ce flux.
                  Les nouvelles actualités seront ajoutées automatiquement lors des prochaines collectes.
                </p>
              </CardContent>
            </Card>
          ) : (
            actualites?.map((item) => {
              const actu = item.actualites as {
                id: string;
                titre: string;
                resume: string | null;
                source_nom: string | null;
                source_url: string | null;
                date_publication: string | null;
                importance: number | null;
                categorie: string | null;
                tags: string[] | null;
              };

              if (!actu) return null;

              return (
                <Card key={item.id} className="bg-card hover:border-primary/40 transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FreshnessIndicator datePublication={actu.date_publication} />
                        </div>
                        {actu.source_url ? (
                          <a 
                            href={actu.source_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="group"
                          >
                            <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors flex items-center gap-2">
                              {nettoyerTitre(actu.titre)}
                              <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden />
                            </CardTitle>
                          </a>
                        ) : (
                          <CardTitle className="text-lg leading-tight">{nettoyerTitre(actu.titre)}</CardTitle>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {actu.resume && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {nettoyerExtrait(actu.resume)}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
                      <span className="text-sm text-muted-foreground">{actu.source_nom}</span>
                      {actu.categorie && <Badge variant="outline">{actu.categorie}</Badge>}
                      {actu.tags?.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Edit Dialog */}
        <FluxFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          flux={flux}
        />
      </div>
    </PageContainer>
  );
}
