import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { BarChart3, Link2, ShieldCheck, Target } from 'lucide-react';
import { useSourceReliability } from '@/hooks/useSourceReliability';

function scoreBadge(score: number) {
  if (score >= 70) return <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30">{score}</Badge>;
  if (score >= 40) return <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30">{score}</Badge>;
  return <Badge className="bg-destructive/15 text-destructive border-destructive/30">{score}</Badge>;
}

function progressColor(score: number) {
  if (score >= 70) return '[&>div]:bg-emerald-500';
  if (score >= 40) return '[&>div]:bg-amber-500';
  return '[&>div]:bg-destructive';
}

export default function SourceReliabilityDashboard() {
  const { data: stats, isLoading } = useSourceReliability();

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
              <p className="text-xs text-muted-foreground">Liens valides moy.</p>
            </div>
          </CardContent>
        </Card>
        <Card className="glass">
          <CardContent className="pt-4 flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{avgReliability}</p>
              <p className="text-xs text-muted-foreground">Score fiabilité moy.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking Table */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Classement de fiabilité des sources (30 derniers jours)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!stats || stats.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Aucune donnée disponible sur les 30 derniers jours.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-center">Articles</TableHead>
                  <TableHead className="text-center">Liens valides</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Sentiment</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Importance</TableHead>
                  <TableHead className="text-center hidden lg:table-cell">Impact ANSUT</TableHead>
                  <TableHead className="text-center">Fiabilité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((row) => (
                  <TableRow key={row.source_nom}>
                    <TableCell className="font-medium max-w-[200px] truncate">{row.source_nom}</TableCell>
                    <TableCell className="text-center">{row.total_articles}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center gap-2 justify-center">
                        <Progress value={row.valid_links_pct} className={`h-2 w-16 ${progressColor(row.valid_links_pct)}`} />
                        <span className="text-xs text-muted-foreground w-8">{row.valid_links_pct}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">
                      <span className={row.avg_sentiment >= 0 ? 'text-emerald-600' : 'text-destructive'}>
                        {row.avg_sentiment > 0 ? '+' : ''}{row.avg_sentiment}
                      </span>
                    </TableCell>
                    <TableCell className="text-center hidden md:table-cell">{row.avg_importance}</TableCell>
                    <TableCell className="text-center hidden lg:table-cell">{row.impact_ansut_pct}%</TableCell>
                    <TableCell className="text-center">{scoreBadge(row.reliability_score)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
