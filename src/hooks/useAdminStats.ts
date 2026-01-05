import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminStats {
  usersActifs: number;
  totalActeurs: number;
  motsClesActifs: number;
  newslettersEnAttente: number;
  alertesNonLues: number;
  sourcesActives: number;
  derniereCollecte: string | null;
  actionsAudit24h: number;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async (): Promise<AdminStats> => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const [
        usersResult,
        acteursResult,
        motsClesResult,
        newslettersResult,
        alertesResult,
        sourcesResult,
        collecteResult,
        auditResult
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('disabled', false),
        supabase.from('personnalites').select('id', { count: 'exact', head: true }),
        supabase.from('mots_cles_veille').select('id', { count: 'exact', head: true }).eq('actif', true),
        supabase.from('newsletters').select('id', { count: 'exact', head: true }).eq('statut', 'brouillon'),
        supabase.from('alertes').select('id', { count: 'exact', head: true }).eq('lue', false),
        supabase.from('sources_media').select('id', { count: 'exact', head: true }).eq('actif', true),
        supabase.from('collectes_log').select('created_at').order('created_at', { ascending: false }).limit(1),
        supabase.from('admin_audit_logs').select('id', { count: 'exact', head: true }).gte('created_at', yesterday)
      ]);

      return {
        usersActifs: usersResult.count ?? 0,
        totalActeurs: acteursResult.count ?? 0,
        motsClesActifs: motsClesResult.count ?? 0,
        newslettersEnAttente: newslettersResult.count ?? 0,
        alertesNonLues: alertesResult.count ?? 0,
        sourcesActives: sourcesResult.count ?? 0,
        derniereCollecte: collecteResult.data?.[0]?.created_at ?? null,
        actionsAudit24h: auditResult.count ?? 0
      };
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000 // 1 minute
  });
}
