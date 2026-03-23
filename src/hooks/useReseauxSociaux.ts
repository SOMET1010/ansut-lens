import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface VipAccountStatus {
  id: string;
  nom: string;
  plateforme: string;
  identifiant: string;
  url_profil: string | null;
  fonction: string | null;
  posts_24h: number;
  derniere_publication: string | null;
  status: 'active' | 'warning' | 'critical';
}

export interface TopPost {
  id: string;
  plateforme: string;
  contenu: string | null;
  auteur: string | null;
  url_original: string | null;
  date_publication: string | null;
  engagement_score: number;
  likes_count: number | null;
  shares_count: number | null;
  comments_count: number | null;
  vip_compte_id: string | null;
}

export interface DailyEngagement {
  date: string;
  twitter: number;
  linkedin: number;
  facebook: number;
}

export function useVipAccountStatuses() {
  return useQuery({
    queryKey: ['vip-account-statuses'],
    queryFn: async () => {
      const { data: comptes, error } = await supabase
        .from('vip_comptes')
        .select('id, nom, plateforme, identifiant, url_profil, fonction')
        .eq('actif', true);

      if (error) throw error;
      if (!comptes?.length) return [];

      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const since72h = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();

      // Get recent posts grouped by vip_compte_id
      const { data: recentPosts } = await supabase
        .from('social_insights' as any)
        .select('vip_compte_id, date_publication')
        .not('vip_compte_id', 'is', null)
        .gte('created_at', since72h);

      const countMap: Record<string, number> = {};
      const latestMap: Record<string, string> = {};

      for (const p of (recentPosts as any[]) || []) {
        if (!p.vip_compte_id) continue;
        const pubDate = p.date_publication || '';
        if (pubDate >= since24h) {
          countMap[p.vip_compte_id] = (countMap[p.vip_compte_id] || 0) + 1;
        }
        if (!latestMap[p.vip_compte_id] || pubDate > latestMap[p.vip_compte_id]) {
          latestMap[p.vip_compte_id] = pubDate;
        }
      }

      // Also check publications_institutionnelles
      const { data: instPubs } = await supabase
        .from('publications_institutionnelles')
        .select('vip_compte_id, date_publication')
        .not('vip_compte_id', 'is', null)
        .gte('date_publication', since72h);

      for (const p of instPubs || []) {
        if (!p.vip_compte_id) continue;
        const pubDate = p.date_publication || '';
        if (pubDate >= since24h) {
          countMap[p.vip_compte_id] = (countMap[p.vip_compte_id] || 0) + 1;
        }
        if (!latestMap[p.vip_compte_id] || pubDate > latestMap[p.vip_compte_id]) {
          latestMap[p.vip_compte_id] = pubDate;
        }
      }

      return comptes.map((c): VipAccountStatus => {
        const posts24h = countMap[c.id] || 0;
        const latest = latestMap[c.id] || null;
        let status: 'active' | 'warning' | 'critical' = 'critical';
        if (posts24h > 0) {
          status = 'active';
        } else if (latest && latest >= since72h) {
          status = 'warning';
        }
        return {
          ...c,
          posts_24h: posts24h,
          derniere_publication: latest,
          status,
        };
      });
    },
    refetchInterval: 3 * 60 * 1000,
  });
}

export function useTopPosts(days = 7, limit = 10) {
  return useQuery({
    queryKey: ['top-posts', days, limit],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('social_insights' as any)
        .select('id, plateforme, contenu, auteur, url_original, date_publication, engagement_score, likes_count, shares_count, comments_count, vip_compte_id')
        .gte('created_at', since)
        .order('engagement_score', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as TopPost[];
    },
  });
}

export function useSocialKpis() {
  return useQuery({
    queryKey: ['social-kpis'],
    queryFn: async () => {
      const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('social_insights' as any)
        .select('engagement_score, est_critique, plateforme, vip_compte_id')
        .gte('created_at', since24h);

      if (error) throw error;
      const insights = (data || []) as any[];

      const totalPosts = insights.length;
      const avgEngagement = totalPosts > 0
        ? Math.round(insights.reduce((s, i) => s + (i.engagement_score || 0), 0) / totalPosts)
        : 0;
      const criticalCount = insights.filter(i => i.est_critique).length;
      const activeVips = new Set(insights.filter(i => i.vip_compte_id).map(i => i.vip_compte_id)).size;

      return { totalPosts, avgEngagement, criticalCount, activeVips };
    },
    refetchInterval: 2 * 60 * 1000,
  });
}

export function useEngagementTimeline(days = 7) {
  return useQuery({
    queryKey: ['engagement-timeline', days],
    queryFn: async () => {
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('social_insights' as any)
        .select('plateforme, engagement_score, created_at')
        .gte('created_at', since);

      if (error) throw error;

      // Group by day and platform
      const byDay: Record<string, Record<string, number>> = {};
      for (const row of (data || []) as any[]) {
        const day = (row.created_at as string).substring(0, 10);
        if (!byDay[day]) byDay[day] = { twitter: 0, linkedin: 0, facebook: 0 };
        const p = row.plateforme as string;
        if (p in byDay[day]) {
          byDay[day][p] += row.engagement_score || 0;
        }
      }

      return Object.entries(byDay)
        .map(([date, platforms]) => ({ date, ...platforms } as DailyEngagement))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
  });
}

export function useCollectSocialNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('collecte-social-api');
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['vip-account-statuses'] });
      queryClient.invalidateQueries({ queryKey: ['top-posts'] });
      queryClient.invalidateQueries({ queryKey: ['social-kpis'] });
      queryClient.invalidateQueries({ queryKey: ['engagement-timeline'] });
      toast.success('Collecte terminée', {
        description: `${data?.total_collected || 0} publications collectées`,
      });
    },
    onError: (err) => {
      toast.error('Erreur de collecte', {
        description: err instanceof Error ? err.message : 'Échec',
      });
    },
  });
}
