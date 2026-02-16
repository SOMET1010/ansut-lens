import { useState } from 'react';
import { Activity, RefreshCw, Users, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import {
  SPDIGaugeCard,
  SPDIAxesRadar,
  SPDIEvolutionChart,
  SPDIRecommandations,
  SPDIComparaisonPairs,
  SPDIAlerteBanner,
  SPDIComparaisonTemporelle,
} from '@/components/spdi';
import {
  useActeursSPDI,
  useDerniereMetriqueSPDI,
  useEvolutionSPDI,
  useRecommandationsSPDI,
  useComparaisonPairs,
} from '@/hooks/usePresenceDigitale';
import type { CercleStrategique } from '@/types';

export default function PresenceDigitalePage() {
  const [selectedActeur, setSelectedActeur] = useState<string | undefined>();
  const [periode, setPeriode] = useState<'7j' | '30j' | '90j'>('30j');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: acteurs, isLoading: acteursLoading } = useActeursSPDI();
  const { data: derniere, isLoading: derniereLoading } = useDerniereMetriqueSPDI(selectedActeur);
  const { data: evolution, isLoading: evolutionLoading } = useEvolutionSPDI(selectedActeur, periode);
  const { data: recommandations, isLoading: recoLoading } = useRecommandationsSPDI(selectedActeur);
  
  const acteurSelectionne = acteurs?.find(a => a.id === selectedActeur);
  const cercle = (acteurSelectionne?.cercle ?? 1) as CercleStrategique;
  const { data: comparaison, isLoading: comparaisonLoading } = useComparaisonPairs(selectedActeur, cercle);

  // Auto-select first acteur
  if (!selectedActeur && acteurs && acteurs.length > 0) {
    setSelectedActeur(acteurs[0].id);
  }

  const handleRecalculer = async () => {
    if (!selectedActeur) return;
    setIsCalculating(true);
    try {
      const { data, error } = await supabase.functions.invoke('calculer-spdi', {
        body: { personnalite_id: selectedActeur },
      });
      if (error) throw error;
      toast.success('Score SPDI recalculé', { description: `Nouveau score : ${data?.score_final?.toFixed(1) ?? '—'}` });
    } catch (e: any) {
      toast.error('Erreur lors du calcul', { description: e.message });
    } finally {
      setIsCalculating(false);
    }
  };

  const handleGenererRecommandations = async () => {
    if (!selectedActeur) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyser-spdi', {
        body: { personnalite_id: selectedActeur },
      });
      if (error) throw error;
      toast.success('Analyse IA terminée', { description: `${data?.recommandations_generees ?? 0} recommandations générées` });
    } catch (e: any) {
      toast.error('Erreur lors de l\'analyse', { description: e.message });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6 text-primary" />
            Présence Digitale Institutionnelle
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Score SPDI, analyses IA et recommandations stratégiques
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sélecteur d'acteur */}
          <Select value={selectedActeur} onValueChange={setSelectedActeur}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Sélectionner un acteur…" />
            </SelectTrigger>
            <SelectContent>
              {acteursLoading ? (
                <div className="p-2"><Skeleton className="h-8 w-full" /></div>
              ) : (
                acteurs?.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    <div className="flex items-center gap-2">
                      <span>{a.prenom} {a.nom}</span>
                      <Badge variant="outline" className="text-[10px]">C{a.cercle}</Badge>
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm" onClick={handleRecalculer} disabled={!selectedActeur || isCalculating}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isCalculating ? 'animate-spin' : ''}`} />
            Recalculer
          </Button>
          <Button size="sm" onClick={handleGenererRecommandations} disabled={!selectedActeur || isGenerating}>
            <Sparkles className={`h-4 w-4 mr-1.5 ${isGenerating ? 'animate-pulse' : ''}`} />
            Analyser IA
          </Button>
        </div>
      </div>

      {!selectedActeur ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground">
              Sélectionnez un acteur avec suivi SPDI actif pour voir son tableau de bord
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Alert banner for significant drops */}
          {evolution && <SPDIAlerteBanner variation={evolution.variation} />}

          {/* Row 1: Gauge + Radar Axes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {derniereLoading ? (
              <Card><CardContent className="py-12"><Skeleton className="h-40 w-full" /></CardContent></Card>
            ) : derniere ? (
              <SPDIGaugeCard
                score={derniere.score_final}
                variation={evolution?.variation}
                tendance={evolution?.tendance}
              />
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground text-sm">
                  Aucune mesure disponible. Cliquez sur "Recalculer" pour générer le premier score.
                </CardContent>
              </Card>
            )}
            
            {derniere?.axes ? (
              <SPDIAxesRadar axes={derniere.axes} />
            ) : (
              <Card><CardContent className="py-12"><Skeleton className="h-40 w-full" /></CardContent></Card>
            )}
          </div>

          {/* Row 2: Evolution chart */}
          {evolutionLoading ? (
            <Card><CardContent className="py-12"><Skeleton className="h-64 w-full" /></CardContent></Card>
          ) : evolution ? (
            <SPDIEvolutionChart evolution={evolution} onPeriodeChange={setPeriode} />
          ) : null}

          {/* Row 2.5: Comparaison temporelle multi-acteurs */}
          <SPDIComparaisonTemporelle />

          {/* Row 3: Recommandations + Comparaison */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              {recoLoading ? (
                <Card><CardContent className="py-12"><Skeleton className="h-40 w-full" /></CardContent></Card>
              ) : (
                <SPDIRecommandations recommandations={recommandations ?? []} />
              )}
            </div>
            <div>
              {comparaisonLoading ? (
                <Card><CardContent className="py-12"><Skeleton className="h-40 w-full" /></CardContent></Card>
              ) : comparaison ? (
                <SPDIComparaisonPairs
                  comparaison={comparaison}
                  cercleLabel={`Cercle ${cercle}`}
                />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">Aucun pair à comparer dans ce cercle</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
