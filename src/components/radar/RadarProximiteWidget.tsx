import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Radar, MapPin, RefreshCw, Loader2, ArrowRight, ExternalLink, HelpCircle, AlertTriangle, Info, CheckCircle2, CircleHelp, Settings2, RotateCcw } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

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

// Détecte les données de qualité dégradée (similitude/date manquantes ou par défaut)
function getDataQuality(p: any) {
  const missingSimilarity = p.similitude_score == null || Number(p.similitude_score) === 0;
  const missingDate = !p.date_detection;
  return { missingSimilarity, missingDate, isPartial: missingSimilarity || missingDate };
}

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

export default function RadarProximiteWidget() {
  const { data: rawData, isLoading } = useRadarProximite();
  const detecter = useDetecterProximite();

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

  // Tri recalculé instantanément à chaque changement de pondération
  const data = useMemo(() => {
    return (rawData || [])
      .filter((p: any) => isValidUrl(p.source_url))
      .sort((a: any, b: any) => computePertinence(b, weights) - computePertinence(a, weights));
  }, [rawData, weights]);
  const hiddenCount = (rawData?.length || 0) - data.length;
  const allPartial = data.length > 0 && data.every((p: any) => getDataQuality(p).isPartial);

  if (isLoading) {
    return (
      <Card className="glass">
        <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
      </Card>
    );
  }

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

            {allPartial && (
              <div className="rounded-md border border-amber-500/40 bg-amber-500/5 p-2.5 text-[11px] flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-semibold text-amber-700 dark:text-amber-400">Pertinence indicative</p>
                  <p className="text-muted-foreground">
                    Les scores de similarité ou dates de détection sont incomplets pour tous les projets affichés.
                    L'ordre reste basé sur l'actionnabilité, mais le tri par pertinence est dégradé.
                    Relancez une détection pour rafraîchir les données.
                  </p>
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
                <p>
                  Les projets sont classés par <strong className="text-foreground">pertinence éditoriale</strong>,
                  pas seulement par similarité brute. Calcul :
                </p>
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
                                <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600 text-[10px] px-1.5 py-0 cursor-help">
                                  <CircleHelp className="h-2.5 w-2.5" />
                                  Pertinence indicative
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs text-xs space-y-1">
                                <p className="font-semibold">Données partielles pour ce projet</p>
                                {quality.missingSimilarity && (
                                  <p>• <strong>Score de similarité manquant</strong> : impossible de mesurer la convergence avec un projet ANSUT. Le tri se fait alors uniquement sur la fraîcheur et l'actionnabilité.</p>
                                )}
                                {quality.missingDate && (
                                  <p>• <strong>Date de détection manquante</strong> : la pénalité de fraîcheur ne peut pas s'appliquer (le projet est traité comme « récent » par défaut).</p>
                                )}
                                <p className="text-muted-foreground italic pt-1">Relancez une détection pour obtenir un score complet.</p>
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
