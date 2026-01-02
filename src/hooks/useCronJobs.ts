import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CronJob {
  jobid: number;
  jobname: string;
  schedule: string;
  command: string;
  active: boolean;
}

export interface CronHistory {
  runid: number;
  jobid: number;
  job_name: string;
  status: string;
  start_time: string;
  end_time: string | null;
  return_message: string | null;
}

interface CronJobsResponse {
  jobs: CronJob[];
  history: CronHistory[];
}

export function useCronJobs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<CronJobsResponse>({
    queryKey: ['cron-jobs'],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Non authentifié');
      }

      const { data, error } = await supabase.functions.invoke('manage-cron-jobs', {
        method: 'GET',
      });

      if (error) throw error;
      return data as CronJobsResponse;
    },
    staleTime: 30000, // 30 secondes
  });

  const toggleJob = useMutation({
    mutationFn: async (jobId: number) => {
      const { data, error } = await supabase.functions.invoke('manage-cron-jobs', {
        body: { action: 'toggle', jobId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      toast({
        title: 'Statut modifié',
        description: 'Le statut du job a été mis à jour.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ jobId, schedule }: { jobId: number; schedule: string }) => {
      const { data, error } = await supabase.functions.invoke('manage-cron-jobs', {
        body: { action: 'update_schedule', jobId, schedule },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      toast({
        title: 'Schedule modifié',
        description: 'Le planning du job a été mis à jour.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const runNow = useMutation({
    mutationFn: async (jobId: number) => {
      const { data, error } = await supabase.functions.invoke('manage-cron-jobs', {
        body: { action: 'run_now', jobId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['cron-jobs'] });
      toast({
        title: 'Exécution déclenchée',
        description: data?.message || 'Le job a été lancé.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    jobs: data?.jobs || [],
    history: data?.history || [],
    isLoading,
    error,
    refetch,
    toggleJob,
    updateSchedule,
    runNow,
  };
}

// Helper: Convertit une expression CRON en texte lisible
export function parseCronExpression(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length < 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Cas spéciaux courants
  if (minute === '*' && hour === '*') return 'Chaque minute';
  if (minute === '0' && hour === '*') return 'Chaque heure';
  if (minute === '*/5' && hour === '*') return 'Toutes les 5 minutes';
  if (minute === '*/10' && hour === '*') return 'Toutes les 10 minutes';
  if (minute === '*/15' && hour === '*') return 'Toutes les 15 minutes';
  if (minute === '*/30' && hour === '*') return 'Toutes les 30 minutes';
  
  // Toutes les X heures
  if (hour.startsWith('*/')) {
    const interval = hour.replace('*/', '');
    return `Toutes les ${interval} heures`;
  }

  // Heure précise chaque jour
  if (minute.match(/^\d+$/) && hour.match(/^\d+$/) && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Tous les jours à ${hour.padStart(2, '0')}h${minute.padStart(2, '0')}`;
  }

  // Jour de la semaine
  if (dayOfWeek !== '*' && dayOfMonth === '*') {
    const days = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
    const dayName = days[parseInt(dayOfWeek)] || dayOfWeek;
    if (minute.match(/^\d+$/) && hour.match(/^\d+$/)) {
      return `Chaque ${dayName} à ${hour.padStart(2, '0')}h${minute.padStart(2, '0')}`;
    }
  }

  return cron;
}

// Helper: Formate une durée entre deux dates
export function formatDuration(start: string, end: string | null): string {
  if (!end) return 'En cours...';
  
  const startDate = new Date(start);
  const endDate = new Date(end);
  const durationMs = endDate.getTime() - startDate.getTime();

  if (durationMs < 1000) return `${durationMs}ms`;
  if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
  if (durationMs < 3600000) return `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`;
  
  return `${Math.floor(durationMs / 3600000)}h ${Math.floor((durationMs % 3600000) / 60000)}m`;
}

// Presets de schedules CRON courants
export const cronPresets = [
  { label: 'Toutes les heures', value: '0 * * * *' },
  { label: 'Toutes les 6 heures', value: '0 */6 * * *' },
  { label: 'Tous les jours à 8h', value: '0 8 * * *' },
  { label: 'Tous les jours à minuit', value: '0 0 * * *' },
  { label: 'Toutes les semaines (lundi 8h)', value: '0 8 * * 1' },
  { label: 'Toutes les 30 minutes', value: '*/30 * * * *' },
  { label: 'Toutes les 15 minutes', value: '*/15 * * * *' },
];
