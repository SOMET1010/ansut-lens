import { useState, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

import type { TitrologieData } from '@/types/matinale';

type MatinaleContent = Record<string, any>;

interface FreshnessMeta {
  window_hours: number;
  based_on: string;
  articles_total_raw: number;
  articles_kept: number;
  oldest_publication: string | null;
  newest_publication: string | null;
}

interface MatinaleResponse {
  matinale: MatinaleContent;
  titrologie?: TitrologieData;
  html?: string;
  articles_count: number;
  generated_at: string;
  sent?: number;
  failed?: number;
  warning?: string;
  error?: string;
  freshness?: FreshnessMeta;
}

export type FreshnessWindow = 24 | 48 | 168;

export interface MatinaleJobProgress {
  jobId: string | null;
  status: 'pending' | 'running' | 'completed' | 'failed' | null;
  step: string | null;
  progress: number;
}

const POLL_INTERVAL_MS = 3000;
const MAX_POLL_MS = 10 * 60 * 1000; // 10 min

const IDLE: MatinaleJobProgress = { jobId: null, status: null, step: null, progress: 0 };

/**
 * Lance la génération de la Matinale en mode asynchrone (job/queue côté Edge)
 * puis suit l'avancement par polling jusqu'à complétion.
 */
function useMatinaleJobRunner() {
  const [job, setJob] = useState<MatinaleJobProgress>(IDLE);
  const cancelled = useRef(false);

  const reset = useCallback(() => {
    cancelled.current = true;
    setJob(IDLE);
  }, []);

  const run = useCallback(async (body: Record<string, unknown>): Promise<MatinaleResponse> => {
    cancelled.current = false;
    setJob({ jobId: null, status: 'pending', step: 'Démarrage…', progress: 0 });

    const { data: created, error: createError } = await supabase.functions.invoke('generer-matinale', {
      body: { ...body, async: true },
    });
    if (createError) throw createError;
    if (created?.error) throw new Error(created.error);

    const jobId: string = created.jobId;
    setJob({ jobId, status: 'pending', step: 'En file d\'attente', progress: 0 });

    const startedAt = Date.now();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (cancelled.current) throw new Error('Génération annulée');
      if (Date.now() - startedAt > MAX_POLL_MS) throw new Error('Délai dépassé (10 min)');

      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

      const { data: status, error: statusError } = await supabase.functions.invoke('generer-matinale', {
        body: { jobId },
      });
      if (statusError) throw statusError;

      setJob({
        jobId,
        status: status.status,
        step: status.step ?? null,
        progress: status.progress ?? 0,
      });

      if (status.status === 'completed') {
        return status.result as MatinaleResponse;
      }
      if (status.status === 'failed') {
        throw new Error(status.error || 'Échec de la génération');
      }
    }
  }, []);

  return { job, run, reset };
}

export function useMatinalePreview() {
  const { job, run, reset } = useMatinaleJobRunner();
  const mutation = useMutation({
    mutationFn: async (freshnessHours: FreshnessWindow = 24): Promise<MatinaleResponse> =>
      run({ previewOnly: true, freshnessHours }),
    onError: (err: Error) => {
      reset();
      toast.error(`Erreur de génération : ${err.message}`);
    },
  });
  return Object.assign(mutation, { job });
}

export function useMatinaleSend() {
  const { job, run, reset } = useMatinaleJobRunner();
  const mutation = useMutation({
    mutationFn: async (params?: { recipients?: string[]; freshnessHours?: FreshnessWindow }): Promise<MatinaleResponse> => {
      const recipients = params?.recipients;
      const freshnessHours = params?.freshnessHours ?? 24;
      return run({ previewOnly: false, freshnessHours, ...(recipients ? { recipients } : {}) });
    },
    onSuccess: (data) => {
      if (data?.sent !== undefined) {
        toast.success(`Matinale envoyée à ${data.sent} destinataire(s)`);
      }
      if (data?.warning) {
        toast.warning(data.warning);
      }
    },
    onError: (err: Error) => {
      reset();
      toast.error(`Erreur d'envoi : ${err.message}`);
    },
  });
  return Object.assign(mutation, { job });
}

export function useMatinaleHistory() {
  return useQuery({
    queryKey: ['matinale-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('diffusion_logs')
        .select('*')
        .eq('contenu_type', 'matinale')
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });
}
