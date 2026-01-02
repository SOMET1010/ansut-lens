import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Clock, Play, RefreshCw, Settings2, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useCronJobs, parseCronExpression, formatDuration, cronPresets, CronJob } from '@/hooks/useCronJobs';

export default function CronJobsPage() {
  const { jobs, history, isLoading, refetch, toggleJob, updateSchedule, runNow } = useCronJobs();
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [editingJob, setEditingJob] = useState<CronJob | null>(null);
  const [newSchedule, setNewSchedule] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filtrer l'historique
  const filteredHistory = history.filter(entry => {
    if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
    if (jobFilter !== 'all' && entry.jobid.toString() !== jobFilter) return false;
    return true;
  });

  const handleEditSchedule = (job: CronJob) => {
    setEditingJob(job);
    setNewSchedule(job.schedule);
    setIsDialogOpen(true);
  };

  const handleSaveSchedule = async () => {
    if (!editingJob || !newSchedule.trim()) return;
    await updateSchedule.mutateAsync({ jobId: editingJob.jobid, schedule: newSchedule.trim() });
    setIsDialogOpen(false);
    setEditingJob(null);
  };

  const handleToggle = async (jobId: number) => {
    await toggleJob.mutateAsync(jobId);
  };

  const handleRunNow = async (jobId: number) => {
    await runNow.mutateAsync(jobId);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/admin">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-8 w-8 text-chart-2" />
            Tâches planifiées (CRON)
          </h1>
          <p className="text-muted-foreground">Automatisation de la collecte de veille</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </Button>
      </div>

      {/* Jobs configurés */}
      <Card className="glass">
        <CardHeader>
          <CardTitle>Jobs configurés</CardTitle>
          <CardDescription>Liste des tâches planifiées et leur statut</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun job CRON configuré
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.jobid}>
                    <TableCell className="font-medium">{job.jobname}</TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help font-mono text-sm bg-muted px-2 py-1 rounded">
                            {job.schedule}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{parseCronExpression(job.schedule)}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={job.active}
                          onCheckedChange={() => handleToggle(job.jobid)}
                          disabled={toggleJob.isPending}
                        />
                        <Badge variant={job.active ? 'default' : 'secondary'}>
                          {job.active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditSchedule(job)}
                            >
                              <Settings2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Modifier le schedule</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleRunNow(job.jobid)}
                              disabled={runNow.isPending}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Exécuter maintenant</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Historique des exécutions */}
      <Card className="glass">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Historique des exécutions</CardTitle>
              <CardDescription>30 derniers jours</CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={jobFilter} onValueChange={setJobFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Tous les jobs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les jobs</SelectItem>
                  {jobs.map((job) => (
                    <SelectItem key={job.jobid} value={job.jobid.toString()}>
                      {job.jobname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Tous statuts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous statuts</SelectItem>
                  <SelectItem value="succeeded">Succès</SelectItem>
                  <SelectItem value="failed">Échec</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun historique disponible
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Job</TableHead>
                  <TableHead>Durée</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredHistory.map((entry) => (
                  <TableRow key={entry.runid}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(entry.start_time), 'dd MMM yyyy HH:mm', { locale: fr })}
                    </TableCell>
                    <TableCell className="font-medium">{entry.job_name || `Job #${entry.jobid}`}</TableCell>
                    <TableCell className="font-mono text-sm">
                      {formatDuration(entry.start_time, entry.end_time)}
                    </TableCell>
                    <TableCell>
                      {entry.status === 'succeeded' ? (
                        <Badge variant="default" className="bg-green-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Succès
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          Échec
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                      {entry.return_message || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog pour modifier le schedule */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le schedule</DialogTitle>
            <DialogDescription>
              Job : <span className="font-semibold">{editingJob?.jobname}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="schedule">Expression CRON</Label>
              <Input
                id="schedule"
                value={newSchedule}
                onChange={(e) => setNewSchedule(e.target.value)}
                placeholder="* * * * *"
                className="font-mono"
              />
              <p className="text-sm text-muted-foreground">
                Format: minute heure jour_mois mois jour_semaine
              </p>
            </div>
            <div className="space-y-2">
              <Label>Présets rapides</Label>
              <div className="flex flex-wrap gap-2">
                {cronPresets.map((preset) => (
                  <Button
                    key={preset.value}
                    variant="outline"
                    size="sm"
                    onClick={() => setNewSchedule(preset.value)}
                    className={newSchedule === preset.value ? 'border-primary' : ''}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>
            {newSchedule && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm">
                  <span className="text-muted-foreground">Interprétation :</span>{' '}
                  <span className="font-medium">{parseCronExpression(newSchedule)}</span>
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSaveSchedule} disabled={updateSchedule.isPending || !newSchedule.trim()}>
              {updateSchedule.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
