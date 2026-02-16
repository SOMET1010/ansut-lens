import { ArrowLeft, Activity, RefreshCw, Play, CheckCircle2, XCircle, Clock, Users, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSpdiStatus } from '@/hooks/useSpdiStatus';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';

function StatusBadge({ statut }: { statut: string }) {
  const isSuccess = statut === 'succes' || statut === 'success';
  return (
    <Badge variant={isSuccess ? 'default' : 'destructive'} className={isSuccess ? 'bg-emerald-600' : ''}>
      {isSuccess ? <CheckCircle2 size={12} className="mr-1" /> : <XCircle size={12} className="mr-1" />}
      {statut}
    </Badge>
  );
}

function TendanceBadge({ tendance }: { tendance: string | null }) {
  if (!tendance || tendance === 'stable') return <Badge variant="secondary"><Minus size={12} className="mr-1" />Stable</Badge>;
  if (tendance === 'hausse') return <Badge className="bg-emerald-600"><TrendingUp size={12} className="mr-1" />Hausse</Badge>;
  return <Badge variant="destructive"><TrendingDown size={12} className="mr-1" />Baisse</Badge>;
}

export default function SpdiStatusPage() {
  const { logs, acteurs, lastLog, avgDuration, isLoading, runBatch } = useSpdiStatus();
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['spdi-batch-logs'] });
    queryClient.invalidateQueries({ queryKey: ['spdi-acteurs-suivis'] });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link to="/admin">
            <Button variant="ghost" size="icon"><ArrowLeft size={20} /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity size={24} className="text-primary" /> Statut SPDI Batch
            </h1>
            <p className="text-sm text-muted-foreground">Suivi du calcul automatique quotidien du SPDI</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw size={16} className="mr-1" /> Actualiser
          </Button>
          <Button size="sm" onClick={() => runBatch.mutate()} disabled={runBatch.isPending}>
            <Play size={16} className="mr-1" /> {runBatch.isPending ? 'En cours…' : 'Lancer un calcul batch'}
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Dernier statut</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-6 w-20" /> : lastLog ? <StatusBadge statut={lastLog.statut} /> : <span className="text-muted-foreground text-sm">Aucun</span>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Clock size={14} /> Dernier calcul</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-6 w-32" /> : lastLog ? (
              <span className="text-sm font-medium">{formatDistanceToNow(new Date(lastLog.created_at), { addSuffix: true, locale: fr })}</span>
            ) : <span className="text-muted-foreground text-sm">Jamais</span>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Users size={14} /> Acteurs traités</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-6 w-12" /> : <span className="text-xl font-bold">{lastLog?.nb_resultats ?? 0}</span>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Durée moyenne (10 derniers)</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-6 w-16" /> : avgDuration != null ? (
              <span className="text-xl font-bold">{(avgDuration / 1000).toFixed(1)}s</span>
            ) : <span className="text-muted-foreground text-sm">N/A</span>}
          </CardContent>
        </Card>
      </div>

      {/* Historique */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Historique des exécutions</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !logs || logs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune exécution enregistrée.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Acteurs</TableHead>
                    <TableHead className="text-right">Durée</TableHead>
                    <TableHead>Erreur</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">{format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: fr })}</TableCell>
                      <TableCell><StatusBadge statut={log.statut} /></TableCell>
                      <TableCell className="text-right">{log.nb_resultats ?? 0}</TableCell>
                      <TableCell className="text-right">{log.duree_ms != null ? `${(log.duree_ms / 1000).toFixed(1)}s` : '—'}</TableCell>
                      <TableCell className="text-sm text-destructive max-w-[200px] truncate">{log.erreur || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acteurs suivis */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Acteurs avec suivi SPDI actif</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
          ) : !acteurs || acteurs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucun acteur avec suivi SPDI actif.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead className="text-right">Score SPDI</TableHead>
                    <TableHead>Dernière mesure</TableHead>
                    <TableHead>Tendance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {acteurs.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{a.prenom} {a.nom}</TableCell>
                      <TableCell className="text-right font-bold">{a.score_spdi_actuel != null ? Number(a.score_spdi_actuel).toFixed(1) : '—'}</TableCell>
                      <TableCell className="text-sm">{a.derniere_mesure_spdi ? formatDistanceToNow(new Date(a.derniere_mesure_spdi), { addSuffix: true, locale: fr }) : '—'}</TableCell>
                      <TableCell><TendanceBadge tendance={a.tendance_spdi} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
