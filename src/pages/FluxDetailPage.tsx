import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Bell, BellOff, Mail, Rss, ExternalLink, Settings } from 'lucide-react';
import { useFluxById, useFluxActualites } from '@/hooks/useFluxVeille';
import { calculateFreshness } from '@/hooks/useActualites';
import { FreshnessIndicator } from '@/components/actualites/FreshnessIndicator';
import { useState } from 'react';
import { FluxFormDialog } from '@/components/flux';

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
  const { data: flux, isLoading: isLoadingFlux } = useFluxById(id);
  const { data: actualites, isLoading: isLoadingActus } = useFluxActualites(id);
  const [editOpen, setEditOpen] = useState(false);

  if (isLoadingFlux) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!flux) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate('/flux')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Retour aux flux
        </Button>
        <Card className="glass">
          <CardContent className="py-12 text-center">
            <Rss className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Flux introuvable</h3>
            <p className="text-muted-foreground">Ce flux n'existe pas ou a été supprimé.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/flux')} className="mb-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux flux
          </Button>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Rss className="h-8 w-8 text-primary" />
            {flux.nom}
          </h1>
          {flux.description && (
            <p className="text-muted-foreground mt-1">{flux.description}</p>
          )}
        </div>
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Settings className="h-4 w-4 mr-2" />
          Paramètres
        </Button>
      </div>

      {/* Flux Info Card */}
      <Card className="glass">
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

            {/* Quadrants */}
            {flux.quadrants.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {flux.quadrants.map((q) => (
                  <Badge key={q} variant="outline">{quadrantLabels[q] || q}</Badge>
                ))}
              </div>
            )}

            {/* Importance */}
            {flux.importance_min > 0 && (
              <Badge variant="outline">≥{flux.importance_min}% importance</Badge>
            )}

            {/* Notifications */}
            <div className="flex items-center gap-2 text-muted-foreground ml-auto">
              {flux.alerte_push ? (
                <span className="flex items-center gap-1">
                  <Bell className="h-4 w-4" />
                  {frequenceLabels[flux.frequence_digest]}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <BellOff className="h-4 w-4" />
                  Pas d'alerte
                </span>
              )}
              {flux.alerte_email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actualites List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">
          Actualités ({actualites?.length || 0})
        </h2>

        {isLoadingActus ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="glass">
              <CardContent className="pt-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))
        ) : actualites?.length === 0 ? (
          <Card className="glass">
            <CardContent className="py-12 text-center">
              <Rss className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
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
              <Card key={item.id} className="glass hover:shadow-glow transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FreshnessIndicator datePublication={actu.date_publication} />
                        <Badge variant="outline" className="text-xs">
                          Score: {item.score_match}
                        </Badge>
                      </div>
                      {actu.source_url ? (
                        <a 
                          href={actu.source_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="group"
                        >
                          <CardTitle className="text-lg leading-tight group-hover:text-primary transition-colors flex items-center gap-2">
                            {actu.titre}
                            <ExternalLink className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </CardTitle>
                        </a>
                      ) : (
                        <CardTitle className="text-lg leading-tight">{actu.titre}</CardTitle>
                      )}
                    </div>
                    <Badge variant={actu.importance && actu.importance > 70 ? 'default' : 'secondary'}>
                      {actu.importance || 50}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {actu.resume && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {actu.resume}
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
  );
}
