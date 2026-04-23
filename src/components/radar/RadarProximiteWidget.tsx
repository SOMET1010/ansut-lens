import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Radar, MapPin, RefreshCw, Loader2, ArrowRight, ExternalLink, HelpCircle, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
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

// Pertinence éditoriale (com institutionnelle) :
// similarité brute − pénalité fraîcheur (1pt/jour, max 30) + bonus actionnabilité
function computePertinence(p: any): number {
  const sim = Number(p.similitude_score) || 0;
  const detected = p.date_detection ? new Date(p.date_detection).getTime() : Date.now();
  const ageDays = Math.max(0, (Date.now() - detected) / 86400000);
  const freshnessPenalty = Math.min(30, ageDays);
  const actionBonus = (p.recommandation_com ? 10 : 0) + (p.projet_ansut_equivalent ? 5 : 0);
  return sim - freshnessPenalty + actionBonus;
}

export default function RadarProximiteWidget() {
  const { data: rawData, isLoading } = useRadarProximite();
  const detecter = useDetecterProximite();

  // Filtrer (source vérifiable obligatoire) puis trier par pertinence éditoriale
  const data = (rawData || [])
    .filter((p: any) => isValidUrl(p.source_url))
    .sort((a: any, b: any) => computePertinence(b) - computePertinence(a));
  const hiddenCount = (rawData?.length || 0) - data.length;

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
              return (
                <div key={projet.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                        <Badge variant="outline" className="text-[10px]">{projet.pays}</Badge>
                        <Badge className={`text-[10px] ${scoreColor(projet.similitude_score)}`}>
                          {projet.similitude_score}% · {scoreLabel(projet.similitude_score)}
                        </Badge>
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
