import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Surveille l'état de synchronisation des tables temps réel principales.
 * Récupère le `max(created_at)` de chaque table pour vérifier la fraîcheur des données.
 */

export interface SyncTableStatus {
  table: string;
  label: string;
  lastUpdate: string | null;
  count24h: number;
  status: 'fresh' | 'stale' | 'cold' | 'error';
}

const TABLES: Array<{ table: 'actualites' | 'social_insights' | 'alertes' | 'mentions' | 'publications_institutionnelles' | 'signaux'; label: string; freshHours: number }> = [
  { table: 'actualites', label: 'Actualités', freshHours: 6 },
  { table: 'social_insights', label: 'Réseaux sociaux', freshHours: 12 },
  { table: 'alertes', label: 'Alertes', freshHours: 24 },
  { table: 'mentions', label: 'Mentions', freshHours: 24 },
  { table: 'publications_institutionnelles', label: 'Publications inst.', freshHours: 24 },
  { table: 'signaux', label: 'Signaux faibles', freshHours: 48 },
];

function classify(lastUpdate: string | null, freshHours: number): SyncTableStatus['status'] {
  if (!lastUpdate) return 'cold';
  const ageMs = Date.now() - new Date(lastUpdate).getTime();
  const ageH = ageMs / 3_600_000;
  if (ageH <= freshHours) return 'fresh';
  if (ageH <= freshHours * 3) return 'stale';
  return 'cold';
}

export function useSyncStatus() {
  return useQuery({
    queryKey: ['sync-status'],
    refetchInterval: 60_000, // refresh chaque minute
    queryFn: async (): Promise<SyncTableStatus[]> => {
      const since24h = new Date(Date.now() - 24 * 3_600_000).toISOString();

      const results = await Promise.all(
        TABLES.map(async ({ table, label, freshHours }) => {
          try {
            const [{ data: latest }, { count }] = await Promise.all([
              supabase.from(table).select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle(),
              supabase.from(table).select('*', { count: 'exact', head: true }).gte('created_at', since24h),
            ]);
            const lastUpdate = (latest as { created_at: string } | null)?.created_at ?? null;
            return {
              table,
              label,
              lastUpdate,
              count24h: count ?? 0,
              status: classify(lastUpdate, freshHours),
            } satisfies SyncTableStatus;
          } catch {
            return { table, label, lastUpdate: null, count24h: 0, status: 'error' as const };
          }
        })
      );

      return results;
    },
  });
}

export function aggregateSyncStatus(rows: SyncTableStatus[] | undefined): {
  level: 'fresh' | 'stale' | 'cold' | 'error';
  label: string;
} {
  if (!rows || rows.length === 0) return { level: 'cold', label: 'Sync inconnue' };
  if (rows.some((r) => r.status === 'error')) return { level: 'error', label: 'Sync erreur' };
  if (rows.every((r) => r.status === 'fresh')) return { level: 'fresh', label: 'Sync OK' };
  if (rows.some((r) => r.status === 'cold')) return { level: 'cold', label: 'Sync ancienne' };
  return { level: 'stale', label: 'Sync partielle' };
}
