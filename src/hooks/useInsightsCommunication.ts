import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PubInsights } from '@/lib/insightsCommunication';

/**
 * Publications propres de l'ANSUT pour les Insights Communication.
 *
 * On charge un historique large (par date de collecte) ; le moteur d'insights
 * fenêtre ensuite par la date de PUBLICATION vérifiée (qualification commune).
 * On récupère les champs nécessaires aux indicateurs réels : réseau, contenu,
 * type, hashtags, médias, dates, et les compteurs d'engagement fournis par la
 * plateforme (jamais recalculés).
 */
export function useInsightsCommunication(limit = 500) {
  return useQuery({
    queryKey: ['insights-communication', limit],
    queryFn: async (): Promise<PubInsights[]> => {
      const { data, error } = await supabase
        .from('publications_institutionnelles')
        .select(
          'id, plateforme, contenu, type_contenu, hashtags, media_urls, date_publication, created_at, likes_count, comments_count, shares_count, vues_count',
        )
        .order('created_at', { ascending: false })
        .limit(limit);
      if (error) throw error;

      return (data || []).map((p) => ({
        id: p.id,
        plateforme: p.plateforme,
        contenu: p.contenu ?? null,
        type_contenu: p.type_contenu ?? null,
        hashtags: p.hashtags ?? null,
        media_urls: p.media_urls ?? null,
        date_publication: p.date_publication ?? null,
        collecte_le: p.created_at ?? null,
        likes: p.likes_count ?? 0,
        comments: p.comments_count ?? 0,
        shares: p.shares_count ?? 0,
        vues: p.vues_count ?? 0,
      }));
    },
    refetchInterval: 5 * 60 * 1000,
  });
}
