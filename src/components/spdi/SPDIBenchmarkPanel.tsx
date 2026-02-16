import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Lightbulb, Swords, TrendingUp, TrendingDown, Trophy } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { usePersonnalites } from '@/hooks/usePersonnalites';
import { useBenchmarkData } from '@/hooks/useBenchmarkData';
import { MiniSparkline } from './MiniSparkline';
import { SentimentBar } from './SentimentBar';
import { ShareOfVoiceDonut } from './ShareOfVoiceDonut';
import { cn } from '@/lib/utils';
import type { Personnalite } from '@/types';
import type { Periode } from '@/hooks/useActeurDigitalDashboard';

interface SPDIBenchmarkPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedActeur?: Personnalite | null;
}

const PERIODES: { value: Periode; label: string }[] = [
  { value: '7j', label: '7 jours' },
  { value: '30j', label: '30 jours' },
  { value: '1an', label: '1 an' },
];

function ActorHeader({ acteur, side }: { acteur: Personnalite | null; side: 'A' | 'B' }) {
  if (!acteur) return <div className="h-16 flex items-center justify-center text-sm text-muted-foreground">Sélectionnez un acteur</div>;
  const initials = `${acteur.prenom?.[0] ?? ''}${acteur.nom[0]}`.toUpperCase();
  const score = acteur.score_spdi_actuel ?? 0;
  const sideColor = side === 'A' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400';

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-12 w-12">
        {acteur.photo_url && <AvatarImage src={acteur.photo_url} alt={acteur.nom} />}
        <AvatarFallback className="font-bold">{initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className={cn('font-semibold text-sm truncate', sideColor)}>
          {acteur.prenom} {acteur.nom}
        </p>
        <p className="text-xs text-muted-foreground truncate">{acteur.fonction ?? acteur.organisation ?? `Cercle ${acteur.cercle}`}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-lg font-black">{Math.round(score)}</span>
          <span className="text-[10px] text-muted-foreground">SPDI</span>
        </div>
      </div>
    </div>
  );
}

function MetricBlock({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('p-3 bg-muted/20 rounded-lg border border-border/50', className)}>
      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">{title}</span>
      {children}
    </div>
  );
}

export function SPDIBenchmarkPanel({ open, onOpenChange, preselectedActeur }: SPDIBenchmarkPanelProps) {
  const [selectedIdA, setSelectedIdA] = useState<string | null>(preselectedActeur?.id ?? null);
  const [selectedIdB, setSelectedIdB] = useState<string | null>(null);
  const [periode, setPeriode] = useState<Periode>('30j');

  const { data: personnalites } = usePersonnalites({ actif: true });
  const spdiActeurs = useMemo(
    () => (personnalites ?? []).filter(p => p.suivi_spdi_actif),
    [personnalites],
  );

  const acteurA = useMemo(() => spdiActeurs.find(p => p.id === selectedIdA) ?? null, [spdiActeurs, selectedIdA]);
  const acteurB = useMemo(() => spdiActeurs.find(p => p.id === selectedIdB) ?? null, [spdiActeurs, selectedIdB]);

  const { dashA, dashB, mergedSparkline, verdict, isLoading } = useBenchmarkData(acteurA, acteurB, periode);

  // If preselected changes, update
  const handleOpenChange = (v: boolean) => {
    if (v && preselectedActeur) {
      setSelectedIdA(preselectedActeur.id);
    }
    onOpenChange(v);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Swords className="h-5 w-5 text-primary" />
            Duel d'Influence
          </DialogTitle>
          <DialogDescription>Comparez côte à côte deux acteurs sur leurs métriques de présence digitale</DialogDescription>
        </DialogHeader>

        {/* Period selector */}
        <div className="flex justify-end">
          <div className="flex rounded-md border border-border overflow-hidden">
            {PERIODES.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriode(p.value)}
                className={cn(
                  'px-3 py-1 text-xs font-medium transition-colors',
                  periode === p.value ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Actor selectors */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Acteur A</label>
            <Select value={selectedIdA ?? ''} onValueChange={setSelectedIdA}>
              <SelectTrigger><SelectValue placeholder="Choisir un acteur…" /></SelectTrigger>
              <SelectContent>
                {spdiActeurs.filter(p => p.id !== selectedIdB).map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.prenom} {p.nom} — Cercle {p.cercle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Acteur B</label>
            <Select value={selectedIdB ?? ''} onValueChange={setSelectedIdB}>
              <SelectTrigger><SelectValue placeholder="Choisir un acteur…" /></SelectTrigger>
              <SelectContent>
                {spdiActeurs.filter(p => p.id !== selectedIdA).map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.prenom} {p.nom} — Cercle {p.cercle}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Comparison content */}
        {acteurA && acteurB ? (
          <div className="space-y-4 mt-2">
            {/* Headers */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                <ActorHeader acteur={acteurA} side="A" />
              </div>
              <div className="p-4 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20">
                <ActorHeader acteur={acteurB} side="B" />
              </div>
            </div>

            {/* Superimposed sparkline chart */}
            {mergedSparkline.length > 1 && (
              <MetricBlock title="Évolution comparée du SPDI">
                {isLoading ? (
                  <Skeleton className="h-48 w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={mergedSparkline}>
                      <XAxis dataKey="index" hide />
                      <YAxis domain={['auto', 'auto']} hide />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          `${Math.round(value)}`,
                          name === 'a' ? `${acteurA.prenom ?? ''} ${acteurA.nom}` : `${acteurB.prenom ?? ''} ${acteurB.nom}`,
                        ]}
                        contentStyle={{ fontSize: 12 }}
                      />
                      <Legend
                        formatter={(value: string) =>
                          value === 'a' ? `${acteurA.prenom ?? ''} ${acteurA.nom}` : `${acteurB.prenom ?? ''} ${acteurB.nom}`
                        }
                      />
                      <Line type="monotone" dataKey="a" stroke="hsl(217, 91%, 60%)" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="b" stroke="hsl(25, 95%, 53%)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </MetricBlock>
            )}

            {/* Side-by-side metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Sentiment */}
              <MetricBlock title={`Sentiment — ${acteurA.prenom ?? ''} ${acteurA.nom}`}>
                {isLoading ? <Skeleton className="h-8 w-full" /> : <SentimentBar {...dashA.sentimentDistribution} />}
              </MetricBlock>
              <MetricBlock title={`Sentiment — ${acteurB.prenom ?? ''} ${acteurB.nom}`}>
                {isLoading ? <Skeleton className="h-8 w-full" /> : <SentimentBar {...dashB.sentimentDistribution} />}
              </MetricBlock>

              {/* Share of Voice */}
              <MetricBlock title={`Part de Voix — ${acteurA.prenom ?? ''} ${acteurA.nom}`}>
                {isLoading ? <Skeleton className="h-14 w-full" /> : <ShareOfVoiceDonut {...dashA.shareOfVoice} />}
              </MetricBlock>
              <MetricBlock title={`Part de Voix — ${acteurB.prenom ?? ''} ${acteurB.nom}`}>
                {isLoading ? <Skeleton className="h-14 w-full" /> : <ShareOfVoiceDonut {...dashB.shareOfVoice} />}
              </MetricBlock>

              {/* Thematiques */}
              <MetricBlock title={`Thématiques — ${acteurA.prenom ?? ''} ${acteurA.nom}`}>
                <div className="flex flex-wrap gap-1">
                  {(dashA.topThematiques.length > 0 ? dashA.topThematiques : acteurA.thematiques ?? []).slice(0, 6).map(t => (
                    <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>
                  ))}
                  {dashA.topThematiques.length === 0 && (!acteurA.thematiques || acteurA.thematiques.length === 0) && (
                    <span className="text-xs text-muted-foreground">Aucune thématique</span>
                  )}
                </div>
              </MetricBlock>
              <MetricBlock title={`Thématiques — ${acteurB.prenom ?? ''} ${acteurB.nom}`}>
                <div className="flex flex-wrap gap-1">
                  {(dashB.topThematiques.length > 0 ? dashB.topThematiques : acteurB.thematiques ?? []).slice(0, 6).map(t => (
                    <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>
                  ))}
                  {dashB.topThematiques.length === 0 && (!acteurB.thematiques || acteurB.thematiques.length === 0) && (
                    <span className="text-xs text-muted-foreground">Aucune thématique</span>
                  )}
                </div>
              </MetricBlock>
            </div>

            {/* Verdict */}
            {verdict.lines.length > 0 && (
              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5">
                <div className="flex items-center gap-2 mb-2">
                  <Trophy className="h-4 w-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">Verdict comparatif</span>
                  {verdict.winner !== 'draw' && (
                    <Badge variant="secondary" className="text-[10px]">
                      Avantage {verdict.winner === 'A' ? `${acteurA.prenom ?? ''} ${acteurA.nom}` : `${acteurB.prenom ?? ''} ${acteurB.nom}`}
                    </Badge>
                  )}
                </div>
                <ul className="space-y-1">
                  {verdict.lines.map((line, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary/60" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Swords className="h-12 w-12 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Sélectionnez deux acteurs avec un suivi SPDI actif pour lancer la comparaison.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
