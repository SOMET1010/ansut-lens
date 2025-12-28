import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subHours, subDays } from 'date-fns';

export type PeriodFilter = '24h' | '7j' | '30j';

function getPeriodDate(period: PeriodFilter): Date {
  switch (period) {
    case '24h': return subHours(new Date(), 24);
    case '7j': return subDays(new Date(), 7);
    case '30j': return subDays(new Date(), 30);
  }
}

export function useRadarKPIs(period: PeriodFilter = '24h') {
  const periodDate = getPeriodDate(period);
  
  return useQuery({
    queryKey: ['radar-kpis', period],
    queryFn: async () => {
      const [mentionsRes, actualitesRes, alertesRes] = await Promise.all([
        supabase
          .from('mentions')
          .select('id, score_influence', { count: 'exact' })
          .gte('created_at', periodDate.toISOString()),
        supabase
          .from('actualites')
          .select('id', { count: 'exact' })
          .gte('created_at', periodDate.toISOString()),
        supabase
          .from('alertes')
          .select('id', { count: 'exact' })
          .eq('traitee', false)
      ]);

      const mentions = mentionsRes.data || [];
      const avgInfluence = mentions.length > 0 
        ? Math.round(mentions.reduce((acc, m) => acc + (m.score_influence || 0), 0) / mentions.length)
        : 0;

      return {
        mentions: mentionsRes.count || 0,
        articles: actualitesRes.count || 0,
        scoreInfluence: avgInfluence,
        alertesActives: alertesRes.count || 0,
        lastUpdate: new Date()
      };
    },
    refetchInterval: 60000
  });
}

export function useRadarSignaux() {
  return useQuery({
    queryKey: ['radar-signaux'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('signaux')
        .select('*')
        .eq('actif', true)
        .order('date_detection', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000
  });
}

export function useRadarTimeline() {
  return useQuery({
    queryKey: ['radar-timeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('actualites')
        .select('id, titre, date_publication, source_nom, categorie, importance')
        .order('date_publication', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    refetchInterval: 60000
  });
}

export function useLastCollecteTime() {
  return useQuery({
    queryKey: ['last-collecte-time'],
    queryFn: async () => {
      const { data } = await supabase
        .from('collectes_log')
        .select('created_at')
        .eq('statut', 'succes')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return data?.created_at ? new Date(data.created_at) : null;
    },
    refetchInterval: 60000
  });
}
