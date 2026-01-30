import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subHours, subDays } from 'date-fns';
import { Actualite, Signal } from '@/types';

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
    queryFn: async (): Promise<Signal[]> => {
      const { data, error } = await supabase
        .from('signaux')
        .select('*')
        .eq('actif', true)
        .order('date_detection', { ascending: false })
        .limit(12);

      if (error) throw error;
      
      // Map database fields to Signal type
      return (data || []).map(s => ({
        id: s.id,
        titre: s.titre,
        description: s.description || undefined,
        quadrant: (s.quadrant as Signal['quadrant']) || 'tech',
        niveau: (s.niveau as Signal['niveau']) || 'info',
        score_impact: s.score_impact || 0,
        tendance: s.tendance as Signal['tendance'] | undefined,
        source_type: s.source_type || undefined,
        source_id: s.source_id || undefined,
        actif: s.actif ?? true,
        date_detection: s.date_detection || s.created_at,
      }));
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

export function useIntelligenceFeed(limit: number = 50) {
  return useQuery({
    queryKey: ['intelligence-feed', limit],
    queryFn: async (): Promise<Actualite[]> => {
      const { data, error } = await supabase
        .from('actualites')
        .select('*')
        .order('date_publication', { ascending: false })
        .limit(limit);

      if (error) throw error;
      
      return (data || []).map(a => ({
        id: a.id,
        titre: a.titre,
        resume: a.resume || undefined,
        contenu: a.contenu || undefined,
        source_nom: a.source_nom || undefined,
        source_url: a.source_url || undefined,
        date_publication: a.date_publication || undefined,
        importance: a.importance || 50,
        tags: a.tags || undefined,
        categorie: a.categorie || undefined,
        analyse_ia: a.analyse_ia || undefined,
        pourquoi_important: a.pourquoi_important || undefined,
        sentiment: a.sentiment ?? undefined,
      }));
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
