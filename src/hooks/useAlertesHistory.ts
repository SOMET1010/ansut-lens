import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { subDays, subHours, startOfDay } from 'date-fns';

type Alerte = Tables<'alertes'>;

export type NiveauFilter = 'all' | 'critical' | 'warning' | 'info';
export type PeriodeFilter = '24h' | '7d' | '30d' | 'all';
export type EtatFilter = 'all' | 'unread' | 'read' | 'treated';

interface UseAlertesHistoryOptions {
  niveau?: NiveauFilter;
  periode?: PeriodeFilter;
  etat?: EtatFilter;
  search?: string;
  page?: number;
  pageSize?: number;
}

interface AlertesStats {
  total: number;
  critical: number;
  warning: number;
  info: number;
  unread: number;
  treated: number;
}

export function useAlertesHistory(options: UseAlertesHistoryOptions = {}) {
  const {
    niveau = 'all',
    periode = '7d',
    etat = 'all',
    search = '',
    page = 1,
    pageSize = 20,
  } = options;

  const dateFilter = useMemo(() => {
    const now = new Date();
    switch (periode) {
      case '24h':
        return subHours(now, 24);
      case '7d':
        return subDays(startOfDay(now), 7);
      case '30d':
        return subDays(startOfDay(now), 30);
      default:
        return null;
    }
  }, [periode]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['alertes-history', niveau, periode, etat, search, page, pageSize],
    queryFn: async () => {
      let query = supabase
        .from('alertes')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Filtre par niveau
      if (niveau !== 'all') {
        query = query.eq('niveau', niveau);
      }

      // Filtre par période
      if (dateFilter) {
        query = query.gte('created_at', dateFilter.toISOString());
      }

      // Filtre par état
      if (etat === 'unread') {
        query = query.eq('lue', false);
      } else if (etat === 'read') {
        query = query.eq('lue', true);
      } else if (etat === 'treated') {
        query = query.eq('traitee', true);
      }

      // Recherche textuelle
      if (search.trim()) {
        query = query.or(`titre.ilike.%${search}%,message.ilike.%${search}%`);
      }

      // Pagination
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        alertes: data as Alerte[],
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      };
    },
  });

  // Stats query (separate for better caching)
  const { data: stats } = useQuery({
    queryKey: ['alertes-stats', periode],
    queryFn: async () => {
      let query = supabase.from('alertes').select('niveau, lue, traitee');

      if (dateFilter) {
        query = query.gte('created_at', dateFilter.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;

      const stats: AlertesStats = {
        total: data.length,
        critical: data.filter((a) => a.niveau === 'critical').length,
        warning: data.filter((a) => a.niveau === 'warning').length,
        info: data.filter((a) => a.niveau === 'info').length,
        unread: data.filter((a) => !a.lue).length,
        treated: data.filter((a) => a.traitee).length,
      };

      return stats;
    },
  });

  const markAsRead = async (alertId: string) => {
    await supabase.from('alertes').update({ lue: true }).eq('id', alertId);
    refetch();
  };

  const markAsTreated = async (alertId: string) => {
    await supabase.from('alertes').update({ traitee: true, lue: true }).eq('id', alertId);
    refetch();
  };

  const markAllAsRead = async () => {
    let query = supabase.from('alertes').update({ lue: true }).eq('lue', false);

    if (dateFilter) {
      query = query.gte('created_at', dateFilter.toISOString());
    }

    await query;
    refetch();
  };

  return {
    alertes: data?.alertes ?? [],
    total: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
    stats: stats ?? { total: 0, critical: 0, warning: 0, info: 0, unread: 0, treated: 0 },
    isLoading,
    error,
    refetch,
    markAsRead,
    markAsTreated,
    markAllAsRead,
  };
}
