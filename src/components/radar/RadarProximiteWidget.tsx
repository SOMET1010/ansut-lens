import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Radar, MapPin, RefreshCw, Loader2, ArrowRight, ExternalLink, HelpCircle, AlertTriangle, Info, CheckCircle2, CircleHelp, Settings2, RotateCcw, Copy, Check } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getDataQuality } from './utils/dataQuality';

function isValidUrl(u?: string | null): boolean {
  if (!u || typeof u !== 'string') return false;
  try {
    const p = new URL(u);
    return p.protocol === 'http:' || p.protocol === 'https:';
  } catch { return false; }
}

function getHostname(u: string): string {
  try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; }
}

function useRadarProximite() {
  const queryClient = useQueryClient();

  // Realtime : recalcul automatique du tri pertinence dès qu'une donnée
  // (similitude_score, date_detection, recommandation_com, projet_ansut_equivalent…)
  // est créée ou mise à jour côté Supabase.
  useEffect(() => {
    const channel = supabase
      .channel('radar-proximite-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'radar_proximite' },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['radar-proximite'] });
          if (payload.eventType === 'INSERT') {
            toast.info('Nouveau projet détecté – tri pertinence mis à jour', { duration: 2500 });
          } else if (payload.eventType === 'UPDATE') {
            const oldRow: any = payload.old || {};
            const newRow: any = payload.new || {};
            const simChanged = oldRow.similitude_score !== newRow.similitude_score;
            const dateChanged = oldRow.date_detection !== newRow.date_detection;
            if (simChanged || dateChanged) {
              toast.info('Données de pertinence actualisées – tri recalculé', { duration: 2500 });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['radar-proximite'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('radar_proximite')
        .select('*')
        .order('similitude_score', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10 * 60 * 1000,
  });
}

function useDetecterProximite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('detecter-proximite');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['radar-proximite'] });
      const skipped = data?.skipped_no_source || 0;
      toast.success(
        `${data?.detected || 0} projet(s) détecté(s)` +
        (skipped > 0 ? ` · ${skipped} écarté(s) faute de source vérifiable` : '')
      );
    },
    onError: () => toast.error('Erreur lors de la détection'),
  });
}

const scoreColor = (score: number) => {
  if (score >= 80) return 'bg-destructive/15 text-destructive';
  if (score >= 60) return 'bg-amber-500/15 text-amber-600';
  return 'bg-muted text-muted-foreground';
};

const scoreLabel = (score: number) => {
  if (score >= 80) return 'Très similaire';
  if (score >= 60) return 'Similaire';
  return 'Faible similarité';
};

// Helper centralisé importé depuis utils/dataQuality (cf. tests dataQuality.test.ts)

type PertinenceWeights = {
  freshnessPerDay: number;
  freshnessMax: number;
  bonusReco: number;
  bonusEquivalent: number;
};

const DEFAULT_WEIGHTS: PertinenceWeights = {
  freshnessPerDay: 1,
  freshnessMax: 30,
  bonusReco: 10,
  bonusEquivalent: 5,
};

const WEIGHTS_STORAGE_KEY = 'radar-proximite-weights-v1';

// Pertinence éditoriale (com institutionnelle) :
// similarité brute − pénalité fraîcheur + bonus actionnabilité
function computePertinence(p: any, w: PertinenceWeights): number {
  const sim = Number(p.similitude_score) || 0;
  const detected = p.date_detection ? new Date(p.date_detection).getTime() : Date.now();
  const ageDays = Math.max(0, (Date.now() - detected) / 86400000);
  const freshnessPenalty = Math.min(w.freshnessMax, ageDays * w.freshnessPerDay);
  const actionBonus = (p.recommandation_com ? w.bonusReco : 0) + (p.projet_ansut_equivalent ? w.bonusEquivalent : 0);
  return sim - freshnessPenalty + actionBonus;
}

// Décompose le score pour l'affichage pédagogique par projet
function breakdownPertinence(p: any, w: PertinenceWeights) {
  const sim = Number(p.similitude_score) || 0;
  const detected = p.date_detection ? new Date(p.date_detection).getTime() : Date.now();
  const ageDays = Math.max(0, (Date.now() - detected) / 86400000);
  const freshnessPenalty = Math.min(w.freshnessMax, ageDays * w.freshnessPerDay);
  const bonusReco = p.recommandation_com ? w.bonusReco : 0;
  const bonusEq = p.projet_ansut_equivalent ? w.bonusEquivalent : 0;
  const actionBonus = bonusReco + bonusEq;
  const total = sim - freshnessPenalty + actionBonus;
  return { sim, ageDays, freshnessPenalty, bonusReco, bonusEq, actionBonus, total };
}

export default function RadarProximiteWidget() {
  const { data: rawData, isLoading } = useRadarProximite();
  const detecter = useDetecterProximite();

  const [copied, setCopied] = useState(false);
  const [qualityFilter, setQualityFilter] = useState<'all' | 'complete' | 'partial'>('all');

  // Pondérations ajustables (persistées en localStorage)
  const [weights, setWeights] = useState<PertinenceWeights>(() => {
    try {
      const raw = localStorage.getItem(WEIGHTS_STORAGE_KEY);
      if (raw) return { ...DEFAULT_WEIGHTS, ...JSON.parse(raw) };
    } catch {}
    return DEFAULT_WEIGHTS;
  });

  useEffect(() => {
    try { localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(weights)); } catch {}
  }, [weights]);

  const isCustomized = useMemo(
    () => (Object.keys(DEFAULT_WEIGHTS) as (keyof PertinenceWeights)[])
      .some((k) => weights[k] !== DEFAULT_WEIGHTS[k]),
    [weights]
  );

  // Liste sourcée + triée par pertinence (avant filtre qualité, pour les compteurs)
  const sourcedSorted = useMemo(() => {
    return (rawData || [])
      .filter((p: any) => isValidUrl(p.source_url))
      .sort((a: any, b: any) => computePertinence(b, weights) - computePertinence(a, weights));
  }, [rawData, weights]);

  const completeCount = useMemo(
    () => sourcedSorted.filter((p: any) => !getDataQuality(p).isPartial).length,
    [sourcedSorted]
  );
  const partialCount = sourcedSorted.length - completeCount;

  const data = useMemo(() => {
    if (qualityFilter === 'complete') return sourcedSorted.filter((p: any) => !getDataQuality(p).isPartial);
    if (qualityFilter === 'partial') return sourcedSorted.filter((p: any) => getDataQuality(p).isPartial);
    return sourcedSorted;
  }, [sourcedSorted, qualityFilter]);

  const hiddenCount = (rawData?.length || 0) - sourcedSorted.length;
  const allPartial = data.length > 0 && data.every((p: any) => getDataQuality(p).isPartial);

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }

  const formuleText =
    `Pertinence éditoriale (Radar de Proximité ANSUT)\n` +
    `\n` +
    `pertinence = similarité (0-100)\n` +
    `             − pénalité fraîcheur (${weights.freshnessPerDay} pt/jour, plafond ${weights.freshnessMax})\n` +
    `             + bonus actionnabilité (+${weights.bonusReco} si recommandation com, +${weights.bonusEquivalent} si équivalent ANSUT)\n` +
    `\n` +
    `Pondérations actuelles :\n` +
    `  • Pénalité fraîcheur : ${weights.freshnessPerDay} pt/jour (plafond −${weights.freshnessMax})\n` +
    `  • Bonus recommandation com : +${weights.bonusReco}\n` +
    `  • Bonus équivalent ANSUT : +${weights.bonusEquivalent}\n` +
    `\n` +
    `Lecture : un projet récent et actionnable peut dépasser un projet plus similaire mais ancien.`;

  const handleCopyFormule = async () => {
    try {
      await navigator.clipboard.writeText(formuleText);
      setCopied(true);
      toast.success('Formule copiée — prête à coller dans le briefing DG');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Impossible de copier la formule');
    }
  };

  return (
    <Card className="glass border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Radar className="h-4 w-4 text-primary" />
              Radar de Proximité
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5">
                    <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="text-xs max-w-sm space-y-2">
                  <p className="font-semibold">Comment ça marche ?</p>
                  <p>
                    Le radar identifie des projets <strong>similaires à ceux de l'ANSUT</strong> chez les
                    voisins (Sénégal, Ghana, Nigeria, Kenya, Rwanda, Maroc).
                  </p>
                  <p>
                    <strong>Sources :</strong> Perplexity (recherche web 30 derniers jours) →
                    extraction structurée par Gemini 2.5 Flash.
                  </p>
                  <p>
                    <strong>Score de similarité :</strong> 0-100, basé sur la convergence
                    d'objectifs, d'infrastructures et de publics cibles.
                  </p>
                  <p className="text-muted-foreground">
                    Les projets sans URL source vérifiable sont automatiquement écartés.
                  </p>
                </PopoverContent>
              </Popover>
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              Benchmark régional · Projets télécoms/numériques voisins comparables
            </CardDescription>
          </div>
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  title="Régler les pondérations"
                  className="relative"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  {isCustomized && (
                    <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">Pondérations du tri</p>
                    <p className="text-[11px] text-muted-foreground">
                      L'ordre se recalcule instantanément.
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => setWeights(DEFAULT_WEIGHTS)}
                    disabled={!isCustomized}
                    title="Réinitialiser aux valeurs par défaut"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    Réinitialiser
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Pénalité fraîcheur (pts/jour)</Label>
                    <span className="text-xs font-mono text-muted-foreground">{weights.freshnessPerDay.toFixed(1)}</span>
                  </div>
                  <Slider
                    value={[weights.freshnessPerDay]}
                    min={0} max={5} step={0.1}
                    onValueChange={([v]) => setWeights((w) => ({ ...w, freshnessPerDay: v }))}
                  />
                  <p className="text-[10px] text-muted-foreground">0 = fraîcheur ignorée. 5 = projets anciens fortement déclassés.</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Plafond pénalité fraîcheur</Label>
                    <span className="text-xs font-mono text-muted-foreground">−{weights.freshnessMax}</span>
                  </div>
                  <Slider
                    value={[weights.freshnessMax]}
                    min={0} max={100} step={5}
                    onValueChange={([v]) => setWeights((w) => ({ ...w, freshnessMax: v }))}
                  />
                  <p className="text-[10px] text-muted-foreground">Au-delà, l'âge n'est plus pénalisé davantage.</p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Bonus recommandation com</Label>
                    <span className="text-xs font-mono text-muted-foreground">+{weights.bonusReco}</span>
                  </div>
                  <Slider
                    value={[weights.bonusReco]}
                    min={0} max={50} step={1}
                    onValueChange={([v]) => setWeights((w) => ({ ...w, bonusReco: v }))}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Bonus équivalent ANSUT</Label>
                    <span className="text-xs font-mono text-muted-foreground">+{weights.bonusEquivalent}</span>
                  </div>
                  <Slider
                    value={[weights.bonusEquivalent]}
                    min={0} max={50} step={1}
                    onValueChange={([v]) => setWeights((w) => ({ ...w, bonusEquivalent: v }))}
                  />
                </div>
              </PopoverContent>
            </Popover>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => detecter.mutate()}
              disabled={detecter.isPending}
              title="Relancer la détection"
            >
              {detecter.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {(!data || data.length === 0) ? (
          <div className="text-center py-6">
            <Radar className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3">
              {hiddenCount > 0
                ? `${hiddenCount} projet(s) écarté(s) faute de source vérifiable. Relancez une analyse pour obtenir des résultats sourcés.`
                : 'Aucun projet similaire détecté. Lancez une analyse pour comparer avec les pays voisins.'}
            </p>
            <Button size="sm" onClick={() => detecter.mutate()} disabled={detecter.isPending}>
              Lancer l'analyse
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {hiddenCount > 0 && (
              <p className="text-[11px] text-muted-foreground italic px-1">
                {hiddenCount} projet(s) masqué(s) faute de source vérifiable.
              </p>
            )}

            {/* Filtre qualité de pertinence */}
            {sourcedSorted.length > 0 && (partialCount > 0 || qualityFilter !== 'all') && (
              <div className="flex items-center gap-1 flex-wrap">
                <span className="text-[10px] text-muted-foreground mr-1">Filtrer :</span>
                <Button
                  variant={qualityFilter === 'all' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => setQualityFilter('all')}
                >
                  Tous <span className="ml-1 text-muted-foreground">({sourcedSorted.length})</span>
                </Button>
                <Button
                  variant={qualityFilter === 'complete' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 px-2 text-[10px] gap-1"
                  onClick={() => setQualityFilter('complete')}
                  disabled={completeCount === 0}
                >
                  <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                  Complète <span className="text-muted-foreground">({completeCount})</span>
                </Button>
                <Button
                  variant={qualityFilter === 'partial' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-6 px-2 text-[10px] gap-1"
                  onClick={() => setQualityFilter('partial')}
                  disabled={partialCount === 0}
                >
                  <CircleHelp className="h-2.5 w-2.5 text-amber-600" />
                  Indicative <span className="text-muted-foreground">({partialCount})</span>
                </Button>
              </div>
            )}

            {data.length === 0 && qualityFilter !== 'all' && (
              <div className="px-1 py-3 text-center space-y-2">
                <p className="text-[11px] text-muted-foreground italic">
                  Aucun projet ne correspond à ce filtre.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => detecter.mutate()}
                  disabled={detecter.isPending}
                  className="h-7 gap-1.5 text-[11px]"
                  aria-label="Relancer la détection pour enrichir les données manquantes"
                >
                  {detecter.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                  ) : (
                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                  )}
                  {detecter.isPending ? 'Enrichissement…' : 'Relancer détection'}
                </Button>
              </div>
            )}

            {allPartial && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5 text-[11px] flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <p className="font-semibold text-amber-700 dark:text-amber-400">Pertinence indicative</p>
                  <p className="text-muted-foreground">
                    Les scores de similarité ou dates de détection sont incomplets pour tous les projets affichés.
                    L'ordre reste basé sur l'actionnabilité, mais le tri par pertinence est dégradé.
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => detecter.mutate()}
                    disabled={detecter.isPending}
                    className="h-7 gap-1.5 text-[11px] border-amber-500/40"
                    aria-label="Relancer la détection pour enrichir les données manquantes"
                  >
                    {detecter.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="h-3 w-3" aria-hidden="true" />
                    )}
                    {detecter.isPending ? 'Enrichissement…' : 'Relancer détection'}
                  </Button>
                </div>
              </div>
            )}

            {/* Encart pédagogique : explication du tri */}
            <details className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-2.5 text-[11px] group">
              <summary className="cursor-pointer font-semibold text-primary flex items-center gap-1.5 select-none">
                <Info className="h-3 w-3" />
                Pourquoi cet ordre ?
              </summary>
              <div className="mt-2 space-y-1.5 text-muted-foreground">
                <div className="flex items-start justify-between gap-2">
                  <p className="flex-1">
                    Les projets sont classés par <strong className="text-foreground">pertinence éditoriale</strong>,
                    pas seulement par similarité brute. Calcul :
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyFormule}
                    className="h-6 px-2 text-[10px] gap-1 shrink-0"
                    title="Copier la formule + pondérations actuelles"
                  >
                    {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                    {copied ? 'Copié' : 'Copier le calcul'}
                  </Button>
                </div>
                <div className="font-mono text-[10px] bg-background/60 rounded px-2 py-1.5 leading-relaxed">
                  pertinence = <strong className="text-primary">similarité</strong> (0-100)
                  <br />
                  &nbsp;&nbsp;− <strong className="text-amber-600">fraîcheur</strong> (1 pt par jour, max 30)
                  <br />
                  &nbsp;&nbsp;+ <strong className="text-emerald-600">actionnabilité</strong> (+10 reco com, +5 équivalent ANSUT)
                </div>
                <ul className="space-y-0.5 pl-3 list-disc">
                  <li><strong>Similarité (0-100)</strong> : convergence d'objectifs, infrastructures et publics cibles avec un projet ANSUT.</li>
                  <li><strong>Pénalité fraîcheur</strong> : −1 pt par jour écoulé depuis la détection (plafonnée à −30). Un projet d'il y a 1 mois est neutralisé.</li>
                  <li><strong>Bonus actionnabilité</strong> : +10 si une recommandation com existe, +5 si l'équivalent ANSUT est identifié — pour faire remonter ce qui est <em>directement exploitable</em>.</li>
                </ul>
                <p className="italic">
                  Objectif : afficher en tête ce qui est à la fois <strong className="text-foreground">proche, récent et exploitable</strong> par l'équipe communication.
                </p>
              </div>
            </details>

            {data.map((projet: any) => {
              const urlOk = true; // garanti par le filtre ci-dessus
              const quality = getDataQuality(projet);
              const bd = breakdownPertinence(projet, weights);
              // Largeurs proportionnelles pour la barre empilée (en valeurs absolues, plafonnées à 100 pour la lisibilité)
              const denom = Math.max(1, bd.sim + bd.freshnessPenalty + bd.actionBonus);
              const wSim = (bd.sim / denom) * 100;
              const wFresh = (bd.freshnessPenalty / denom) * 100;
              const wAction = (bd.actionBonus / denom) * 100;
              return (
                <div key={projet.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <Badge variant="outline" className="text-[10px]">{projet.pays}</Badge>
                        <Badge className={`text-[10px] ${scoreColor(projet.similitude_score)}`}>
                          {projet.similitude_score ?? '?'}% · {scoreLabel(projet.similitude_score)}
                        </Badge>
                        {quality.isPartial && (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  aria-label={
                                    `Pertinence indicative : ${[
                                      quality.missingSimilarity && 'score de similarité manquant',
                                      quality.missingDate && 'date de détection manquante',
                                    ].filter(Boolean).join(', ')}. Appuyez sur Entrée pour plus de détails.`
                                  }
                                  className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                                >
                                  <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600 text-[10px] px-1.5 py-0 cursor-help">
                                    <CircleHelp className="h-2.5 w-2.5" aria-hidden="true" />
                                    Pertinence indicative
                                  </Badge>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" role="tooltip" className="max-w-xs text-xs space-y-2">
                                <p className="font-semibold">Données partielles pour ce projet</p>
                                {quality.missingSimilarity && (
                                  <p>• <strong>Score de similarité manquant</strong> : impossible de mesurer la convergence avec un projet ANSUT. Le tri se fait alors uniquement sur la fraîcheur et l'actionnabilité.</p>
                                )}
                                {quality.missingDate && (
                                  <p>• <strong>Date de détection manquante</strong> : la pénalité de fraîcheur ne peut pas s'appliquer (le projet est traité comme « récent » par défaut).</p>
                                )}
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 w-full gap-1.5 text-[11px]"
                                  onClick={(e) => { e.stopPropagation(); detecter.mutate(); }}
                                  disabled={detecter.isPending}
                                  aria-label="Relancer la détection pour enrichir les données manquantes"
                                >
                                  {detecter.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                                  ) : (
                                    <RefreshCw className="h-3 w-3" aria-hidden="true" />
                                  )}
                                  {detecter.isPending ? 'Enrichissement…' : 'Relancer détection'}
                                </Button>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        {urlOk ? (
                          <Badge variant="outline" className="gap-1 border-emerald-500/40 text-emerald-600 text-[10px] px-1.5 py-0">
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            Source vérifiée
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600 text-[10px] px-1.5 py-0">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            Sans source
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium line-clamp-1">{projet.titre}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{projet.description}</p>
                    </div>
                  </div>

                  {/* Mini-score pédagogique : décomposition similarité / fraîcheur / actionnabilité.
                      Accessibilité (a11y) :
                      - <button> = focusable au clavier (Tab) ; Radix Tooltip ouvre au focus, ferme à Esc/blur.
                      - aria-label complet → score lisible sans dépendre du visuel ni du tooltip.
                      - aria-describedby relie explicitement le bouton à la décomposition (lecteur d'écran).
                      - delayDuration={0} → tooltip immédiat au focus clavier (pas d'attente hover).
                      - Contraste dark mode : remplacement de text-muted-foreground (insuffisant à 9px)
                        par text-foreground/75 + bump à 10px → conforme WCAG AA en dark theme.
                      - Pastilles de légende : ring-1 ring-background pour démarquer les couleurs sur fond sombre. */}
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label={
                            `Pertinence ${Math.round(bd.total)} sur 100. ` +
                            `Décomposition : similarité ${Math.round(bd.sim)}, ` +
                            `pénalité fraîcheur moins ${Math.round(bd.freshnessPenalty)}, ` +
                            `bonus actionnabilité plus ${Math.round(bd.actionBonus)}. ` +
                            `Appuyez sur Entrée ou Espace pour afficher le détail, Échap pour fermer.`
                          }
                          aria-describedby={`pertinence-detail-${projet.id}`}
                          className="w-full text-left space-y-1 cursor-help rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:bg-muted/30 transition-colors px-1 py-0.5 -mx-1"
                        >
                          <div className="flex items-center justify-between gap-2 text-[10px]">
                            <span className="text-foreground/75 font-medium">Pertinence</span>
                            <span className="font-mono font-semibold text-foreground tabular-nums">
                              {Math.round(bd.total)}
                              {/* Détail inline masqué <640px (déjà cassait le layout mobile) */}
                              <span className="text-foreground/60 font-normal ml-1 hidden sm:inline" aria-hidden="true">
                                = {Math.round(bd.sim)} − {Math.round(bd.freshnessPenalty)} + {Math.round(bd.actionBonus)}
                              </span>
                            </span>
                          </div>
                          {/* Barre empilée — bordure subtile pour contraste en dark mode */}
                          <div className="flex h-2 sm:h-1.5 w-full rounded-full overflow-hidden bg-muted ring-1 ring-border/50" role="presentation" aria-hidden="true">
                            <div className="bg-primary" style={{ width: `${wSim}%` }} />
                            <div className="bg-amber-500 dark:bg-amber-400" style={{ width: `${wFresh}%` }} />
                            <div className="bg-emerald-600 dark:bg-emerald-400" style={{ width: `${wAction}%` }} />
                          </div>
                          {/* Légende : compacte mobile, contraste renforcé pour dark mode */}
                          <div className="flex items-center justify-between sm:justify-start sm:gap-3 gap-1 text-[10px] text-foreground/75 tabular-nums" aria-hidden="true">
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-primary shrink-0 ring-1 ring-background" />
                              <span className="hidden sm:inline">Similarité </span>
                              <span className="sm:hidden">Sim </span>
                              {Math.round(bd.sim)}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400 shrink-0 ring-1 ring-background" />
                              <span className="hidden sm:inline">Fraîcheur </span>
                              <span className="sm:hidden">Frais </span>
                              −{Math.round(bd.freshnessPenalty)}
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0 ring-1 ring-background" />
                              <span className="hidden sm:inline">Action </span>
                              <span className="sm:hidden">Act </span>
                              +{Math.round(bd.actionBonus)}
                            </span>
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        id={`pertinence-detail-${projet.id}`}
                        side="top"
                        role="tooltip"
                        className="max-w-xs text-xs space-y-1"
                      >
                        <p className="font-semibold">Décomposition du score</p>
                        <p>• <strong>Similarité brute</strong> : {Math.round(bd.sim)}/100</p>
                        <p>• <strong>Pénalité fraîcheur</strong> : −{bd.freshnessPenalty.toFixed(1)} pt ({Math.round(bd.ageDays)} j × {weights.freshnessPerDay}/j, plafond {weights.freshnessMax})</p>
                        <p>• <strong>Bonus actionnabilité</strong> : +{bd.actionBonus} ({bd.bonusReco > 0 ? `reco com +${bd.bonusReco}` : 'pas de reco'}{bd.bonusEq > 0 ? `, équivalent ANSUT +${bd.bonusEq}` : ''})</p>
                        <p className="pt-1 border-t font-semibold">Total : {Math.round(bd.total)}</p>
                        <p className="text-[10px] text-muted-foreground italic pt-1">Échap pour fermer · Tab pour passer au suivant</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  {projet.projet_ansut_equivalent && (
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      <ArrowRight className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      <span>Équivalent ANSUT : <strong className="text-foreground">{projet.projet_ansut_equivalent}</strong></span>
                    </div>
                  )}

                  {projet.recommandation_com && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded p-2 whitespace-pre-line">
                      {projet.recommandation_com}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1">
                      <Info className="h-3 w-3" />
                      {projet.organisme || 'Organisme non précisé'}
                    </span>
                    <div className="flex items-center gap-2">
                      {urlOk ? (
                        <a
                          href={projet.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                        >
                          <ExternalLink className="h-3 w-3" />
                          {getHostname(projet.source_url)}
                        </a>
                      ) : (
                        <span className="italic">URL manquante</span>
                      )}
                      {projet.date_detection && (
                        <span>· {formatDistanceToNow(new Date(projet.date_detection), { addSuffix: true, locale: fr })}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
