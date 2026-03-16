import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { BarChart3, Link2, ShieldCheck, Target, Info, TrendingUp, MessageCircle, HelpCircle } from 'lucide-react';
import { useSourceReliability, type SourceReliabilityStats } from '@/hooks/useSourceReliability';

/* ─── Score helpers ─── */

function scoreLabel(score: number): { text: string; color: string; bg: string; border: string; emoji: string } {
  if (score >= 70) return { text: 'Fiable', color: 'text-emerald-600', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', emoji: '✅' };
  if (score >= 40) return { text: 'Modérée', color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/30', emoji: '⚠️' };
  return { text: 'Faible', color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/30', emoji: '🔴' };
}

function ScoreBadge({ score }: { score: number }) {
  const { text, color, bg, border } = scoreLabel(score);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={`${bg} ${color} ${border} cursor-help gap-1.5`}>
          {score}<span className="font-normal opacity-70">/ 100</span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-xs">
        <strong>{text}</strong> — {score >= 70
          ? 'Source de confiance avec des contenus vérifiés'
          : score >= 40
            ? 'Certains contenus manquent de sources vérifiables'
            : 'Contenus rarement sourcés ou hors sujet'
        }
      </TooltipContent>
    </Tooltip>
  );
}

function progressColor(score: number) {
  if (score >= 70) return '[&>div]:bg-emerald-500';
  if (score >= 40) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-destructive';
}

/* ─── Detail dialog ─── */

function SourceDetailDialog({ source, open, onOpenChange }: { source: SourceReliabilityStats | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  if (!source) return null;
  const { text, emoji } = scoreLabel(source.reliability_score);

  const criteria = [
    {
      label: 'Liens vérifiables',
      icon: Link2,
      weight: '40%',
      value: `${source.valid_links_pct}%`,
      score: source.valid_links_pct,
      desc: 'Proportion d\'articles avec un lien URL fonctionnel. Une source sans preuves vérifiables perd en crédibilité.',
      color: 'text-blue-600',
      bg: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      label: 'Pertinence ANSUT',
      icon: Target,
      weight: '30%',
      value: `${source.avg_importance}/100`,
      score: source.avg_importance,
      desc: 'Niveau d\'importance moyen des articles pour les missions de l\'ANSUT.',
      color: 'text-violet-600',
      bg: 'bg-violet-50 dark:bg-violet-950/30',
    },
    {
      label: 'Tonalité générale',
      icon: MessageCircle,
      weight: '30%',
      value: source.avg_sentiment > 0 ? `+${source.avg_sentiment}` : `${source.avg_sentiment}`,
      score: Math.min(100, Math.max(0, (source.avg_sentiment + 1) * 50)),
      desc: 'Analyse du ton des articles : positif, neutre ou négatif. Un ton équilibré renforce la crédibilité.',
      color: source.avg_sentiment >= 0 ? 'text-emerald-600' : 'text-red-600',
      bg: source.avg_sentiment >= 0 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30',
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {source.source_nom}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-5">
          {/* Global score */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border">
            <div>
              <p className="text-sm text-muted-foreground">Score de crédibilité</p>
              <p className="text-3xl font-bold">{source.reliability_score}<span className="text-lg font-normal text-muted-foreground">/100</span></p>
            </div>
            <div className="text-right">
              <span className="text-2xl">{emoji}</span>
              <p className={`text-sm font-semibold ${scoreLabel(source.reliability_score).color}`}>{text}</p>
            </div>
          </div>

          {/* Criteria breakdown */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">Détail des critères :</p>
            {criteria.map((c) => (
              <div key={c.label} className={`p-3 rounded-lg ${c.bg} space-y-2`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <c.icon className={`h-4 w-4 ${c.color}`} />
                    <span className="text-sm font-medium">{c.label}</span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">{c.weight}</Badge>
                  </div>
                  <span className={`text-sm font-bold ${c.color}`}>{c.value}</span>
                </div>
                <Progress value={c.score} className={`h-1.5 ${progressColor(c.score)}`} />
                <p className="text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
              </div>
            ))}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{source.total_articles}</p>
              <p className="text-xs text-muted-foreground">Articles analysés</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-lg font-bold">{source.impact_ansut_pct}%</p>
              <p className="text-xs text-muted-foreground">Mentionnent l'ANSUT</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Main dashboard ─── */

export default function SourceReliabilityDashboard() {
  const { data: stats, isLoading } = useSourceReliability();
  const [selectedSource, setSelectedSource] = useState<SourceReliabilityStats | null>(null);

  const totalSources = stats?.length ?? 0;
  const avgValidLinks = totalSources > 0
    ? Math.round(stats!.reduce((s, r) => s + r.valid_links_pct, 0) / totalSources)
    : 0;
  const avgReliability = totalSources > 0
    ? Math.round(stats!.reduce((s, r) => s + r.reliability_score, 0) / totalSources)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explanation banner */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-4 pb-3">
          <div className="flex gap-3 items-start">
            <Info className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Comment est calculé le score de crédibilité ?</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Chaque source reçoit une <strong>note sur 100</strong> basée sur 3 critères :
                <strong> liens vérifiables</strong> (40%),
                <strong> pertinence ANSUT</strong> (30%) et
                <strong> tonalité</strong> (30%).
                Cliquez sur une source pour voir le détail.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {[
          { min: 70, max: 100, ...scoreLabel(80) },
          { min: 40, max: 69, ...scoreLabel(50) },
          { min: 0, max: 39, ...scoreLabel(20) },
        ].map((level) => (
          <div key={level.text} className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${level.bg} ${level.color} border ${level.border}`}>
            <span>{level.emoji}</span>
            <span>{level.min}–{level.max}</span>
            <span className="opacity-70">→</span>
            <span>{level.text}</span>
          </div>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card className="glass">
          <CardContent className="pt-4 flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{totalSources}</p>
              <p className="text-xs text-muted-foreground">Sources actives (30j)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4 flex items-center gap-3">
            <Link2 className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{avgValidLinks}%</p>
              <p className="text-xs text-muted-foreground">Liens vérifiables en moy.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div className="flex items-center gap-2">
              <p className="text-2xl font-bold">{avgReliability}</p>
              <ScoreBadge score={avgReliability} />
            </div>
            <p className="text-xs text-muted-foreground">Crédibilité moyenne</p>
          </CardContent>
        </Card>
      </div>

      {/* Ranking Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Classement de crédibilité des sources
          </CardTitle>
          <CardDescription>
            Basé sur les 30 derniers jours · Cliquez sur une ligne pour voir le détail
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!stats || stats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune donnée disponible sur les 30 derniers jours.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-center">Articles</TableHead>
                  <TableHead className="text-center">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 cursor-help">
                          Liens <HelpCircle className="h-3 w-3 opacity-50" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs max-w-[200px]">
                        % d'articles avec un lien URL fonctionnel (poids : 40%)
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-center hidden md:table-cell">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 cursor-help">
                          Pertinence <HelpCircle className="h-3 w-3 opacity-50" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs max-w-[200px]">
                        Importance moyenne des articles pour l'ANSUT (poids : 30%)
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-center hidden md:table-cell">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-flex items-center gap-1 cursor-help">
                          Tonalité <HelpCircle className="h-3 w-3 opacity-50" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent className="text-xs max-w-[200px]">
                        Sentiment moyen des articles : positif (+) ou négatif (−) (poids : 30%)
                      </TooltipContent>
                    </Tooltip>
                  </TableHead>
                  <TableHead className="text-center">Crédibilité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((row, index) => {
                  const { emoji } = scoreLabel(row.reliability_score);
                  return (
                    <TableRow
                      key={row.source_nom}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedSource(row)}
                    >
                      <TableCell className="text-muted-foreground font-mono text-xs">{index + 1}</TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate">{row.source_nom}</TableCell>
                      <TableCell className="text-center">{row.total_articles}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <Progress value={row.valid_links_pct} className={`h-2 w-16 ${progressColor(row.valid_links_pct)}`} />
                          <span className="text-xs text-muted-foreground w-8">{row.valid_links_pct}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">{row.avg_importance}/100</TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        <span className={row.avg_sentiment >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                          {row.avg_sentiment > 0 ? '+' : ''}{row.avg_sentiment}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-sm">{emoji}</span>
                          <ScoreBadge score={row.reliability_score} />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <SourceDetailDialog
        source={selectedSource}
        open={!!selectedSource}
        onOpenChange={(open) => { if (!open) setSelectedSource(null); }}
      />
    </div>
  );
}
