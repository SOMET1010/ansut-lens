import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface TitrologieSource {
  id: string;
  nom: string;
  url: string;
  type: string;
  actif: boolean;
  priorite: number;
  notes: string | null;
}

export interface TitrologieKeyword {
  id: string;
  mot_cle: string;
  categorie: string;
  poids: number;
  actif: boolean;
  notes: string | null;
}

const FREQ_KEY = 'titrologie_collect_cron';
const ALERT_THRESH_ROUGE = 'titrologie_alert_threshold_rouge';
const ALERT_THRESH_ORANGE = 'titrologie_alert_threshold_orange';

export interface TitrologieSettings {
  cron_schedule: string;
  alert_threshold_rouge: number;
  alert_threshold_orange: number;
}

const DEFAULT_SETTINGS: TitrologieSettings = {
  cron_schedule: '0 6 * * *',
  alert_threshold_rouge: 6,
  alert_threshold_orange: 3,
};

// ============ Sources ============
export function useTitrologieSources() {
  return useQuery({
    queryKey: ['titrologie_sources'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('titrologie_sources')
        .select('*')
        .order('priorite', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as TitrologieSource[];
    },
  });
}

export function useUpsertSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: Partial<TitrologieSource> & { nom: string; url: string }) => {
      const payload: any = { ...s };
      const { error } = s.id
        ? await supabase.from('titrologie_sources').update(payload).eq('id', s.id)
        : await supabase.from('titrologie_sources').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['titrologie_sources'] }); toast.success('Source enregistrée'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('titrologie_sources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['titrologie_sources'] }); toast.success('Source supprimée'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ============ Keywords ============
export function useTitrologieKeywords() {
  return useQuery({
    queryKey: ['titrologie_keywords'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('titrologie_keywords')
        .select('*')
        .order('poids', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as TitrologieKeyword[];
    },
  });
}

export function useUpsertKeyword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (k: Partial<TitrologieKeyword> & { mot_cle: string }) => {
      const payload: any = { ...k };
      const { error } = k.id
        ? await supabase.from('titrologie_keywords').update(payload).eq('id', k.id)
        : await supabase.from('titrologie_keywords').insert(payload);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['titrologie_keywords'] }); toast.success('Mot-clé enregistré'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteKeyword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('titrologie_keywords').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['titrologie_keywords'] }); toast.success('Mot-clé supprimé'); },
    onError: (e: Error) => toast.error(e.message),
  });
}

// ============ Settings (config_seuils) ============
export function useTitrologieSettings() {
  return useQuery({
    queryKey: ['titrologie_settings'],
    queryFn: async (): Promise<TitrologieSettings> => {
      const { data } = await supabase
        .from('config_seuils')
        .select('cle, valeur')
        .in('cle', [FREQ_KEY, ALERT_THRESH_ROUGE, ALERT_THRESH_ORANGE]);
      const map = new Map((data || []).map(r => [r.cle, r.valeur]));
      return {
        cron_schedule: (map.get(FREQ_KEY) as any) || DEFAULT_SETTINGS.cron_schedule,
        alert_threshold_rouge: Number(map.get(ALERT_THRESH_ROUGE) ?? DEFAULT_SETTINGS.alert_threshold_rouge),
        alert_threshold_orange: Number(map.get(ALERT_THRESH_ORANGE) ?? DEFAULT_SETTINGS.alert_threshold_orange),
      };
    },
  });
}

export function useUpdateTitrologieSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (s: TitrologieSettings) => {
      const rows = [
        { cle: FREQ_KEY, valeur: s.cron_schedule as any },
        { cle: ALERT_THRESH_ROUGE, valeur: s.alert_threshold_rouge as any },
        { cle: ALERT_THRESH_ORANGE, valeur: s.alert_threshold_orange as any },
      ];
      for (const r of rows) {
        const { error } = await supabase.from('config_seuils').upsert(
          { ...r, updated_at: new Date().toISOString() },
          { onConflict: 'cle' },
        );
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['titrologie_settings'] }); toast.success('Paramètres enregistrés'); },
    onError: (e: Error) => toast.error(e.message),
  });
}
