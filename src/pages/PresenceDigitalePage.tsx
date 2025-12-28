import { useState } from 'react';
import { Activity, Users, ChevronDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  useActeursSPDI, 
  useEvolutionSPDI, 
  useDerniereMetriqueSPDI,
  useRecommandationsSPDI,
  useComparaisonPairs,
  INTERPRETATION_LABELS,
} from '@/hooks/usePresenceDigitale';
import { 
  SPDIGaugeCard, 
  SPDIAxesRadar, 
  SPDIEvolutionChart, 
  SPDIRecommandations,
  SPDIComparaisonPairs,
  SPDIAlerteBanner,
} from '@/components/spdi';
import { CERCLE_LABELS } from '@/hooks/usePersonnalites';
import type { CercleStrategique } from '@/types';

export default function PresenceDigitalePage() {
  const [selectedActeurId, setSelectedActeurId] = useState<string | undefined>();
  const [periode, setPeriode] = useState<'7j' | '30j' | '90j'>('30j');
  
  const { data: acteurs, isLoading: loadingActeurs } = useActeursSPDI();
  const { data: evolution, isLoading: loadingEvolution } = useEvolutionSPDI(selectedActeurId, periode);
  const { data: metrique, isLoading: loadingMetrique } = useDerniereMetriqueSPDI(selectedActeurId);
  const { data: recommandations, isLoading: loadingReco } = useRecommandationsSPDI(selectedActeurId);
  
  const selectedActeur = acteurs?.find(a => a.id === selectedActeurId);
  const cercle = (selectedActeur?.cercle || 1) as CercleStrategique;
  const { data: comparaison } = useComparaisonPairs(selectedActeurId, cercle);

  // Auto-select first actor if none selected
  if (!selectedActeurId && acteurs && acteurs.length > 0) {
    setSelectedActeurId(acteurs[0].id);
  }

  const isLoading = loadingActeurs || loadingMetrique || loadingEvolution;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Présence Digitale Institutionnelle
          </h1>
          <p className="text-muted-foreground mt-1">
            Score SPDI et recommandations stratégiques
          </p>
        </div>
        
        {/* Sélecteur d'acteur */}
        <div className="flex items-center gap-3">
          <Select value={selectedActeurId} onValueChange={setSelectedActeurId}>
            <SelectTrigger className="w-[280px]">
              <SelectValue placeholder="Sélectionner un acteur" />
            </SelectTrigger>
            <SelectContent>
              {acteurs?.map((acteur) => (
                <SelectItem key={acteur.id} value={acteur.id}>
                  <div className="flex items-center gap-2">
                    <span>{acteur.prenom} {acteur.nom}</span>
                    <span className="text-xs text-muted-foreground">
                      ({acteur.organisation})
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* État vide */}
      {!loadingActeurs && (!acteurs || acteurs.length === 0) && (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Aucun suivi SPDI actif</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Activez le suivi de présence digitale pour vos acteurs clés depuis 
              leur fiche détaillée dans la page Personnalités.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Contenu principal */}
      {selectedActeurId && (
        <>
          {/* Alerte si baisse significative */}
          {evolution && (
            <SPDIAlerteBanner 
              variation={evolution.variation} 
              periode={periode}
            />
          )}

          {/* Grille principale */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Colonne 1 - Score & Axes */}
            <div className="space-y-6">
              {isLoading ? (
                <Skeleton className="h-64" />
              ) : metrique ? (
                <>
                  <SPDIGaugeCard 
                    score={metrique.score_final}
                    variation={evolution?.variation || 0}
                    tendance={evolution?.tendance || 'stable'}
                  />
                  <SPDIAxesRadar axes={metrique.axes} />
                </>
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Aucune métrique disponible
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Colonne 2 - Évolution */}
            <div className="lg:col-span-2 space-y-6">
              {loadingEvolution ? (
                <Skeleton className="h-80" />
              ) : evolution ? (
                <SPDIEvolutionChart 
                  evolution={evolution}
                  onPeriodeChange={setPeriode}
                />
              ) : null}

              {/* Comparaison pairs */}
              {comparaison && (
                <SPDIComparaisonPairs 
                  comparaison={comparaison}
                  cercleLabel={CERCLE_LABELS[cercle]?.label}
                />
              )}
            </div>
          </div>

          {/* Recommandations */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="lg:col-span-2">
              {loadingReco ? (
                <Skeleton className="h-48" />
              ) : (
                <SPDIRecommandations recommandations={recommandations || []} />
              )}
            </div>
          </div>

          {/* Détails par axe */}
          {metrique && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Visibilité */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Visibilité</span>
                    <span className="text-lg font-bold text-primary">
                      {metrique.axes.visibilite.score.toFixed(0)}%
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Mentions</span>
                      <span>{metrique.axes.visibilite.nb_mentions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sources distinctes</span>
                      <span>{metrique.axes.visibilite.nb_sources}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Régularité</span>
                      <span>{(metrique.axes.visibilite.regularite * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Qualité */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Qualité</span>
                    <span className="text-lg font-bold text-primary">
                      {metrique.axes.qualite.score.toFixed(0)}%
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Sentiment moyen</span>
                      <span>{(metrique.axes.qualite.sentiment_moyen * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Thèmes stratégiques</span>
                      <span>{(metrique.axes.qualite.themes_strategiques * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Controverses</span>
                      <span>{metrique.axes.qualite.controverses}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Autorité */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Autorité</span>
                    <span className="text-lg font-bold text-primary">
                      {metrique.axes.autorite.score.toFixed(0)}%
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Citations directes</span>
                      <span>{metrique.axes.autorite.citations_directes}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Invitations panels</span>
                      <span>{metrique.axes.autorite.invitations_panels}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Références croisées</span>
                      <span>{metrique.axes.autorite.references_croisees}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Présence */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Présence</span>
                    <span className="text-lg font-bold text-primary">
                      {metrique.axes.presence.score.toFixed(0)}%
                    </span>
                  </div>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Activité LinkedIn</span>
                      <span>{metrique.axes.presence.activite_linkedin}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Engagement</span>
                      <span>{metrique.axes.presence.engagement.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cohérence message</span>
                      <span>{(metrique.axes.presence.coherence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
