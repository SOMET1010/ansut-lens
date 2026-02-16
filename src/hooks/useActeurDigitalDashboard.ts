import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays } from 'date-fns';

export type Periode = '7j' | '30j' | '1an';

interface SentimentDistribution {
  positif: number;
  neutre: number;
  negatif: number;
}

interface CanauxPresence {
  linkedin: number;
  presse: number;
  conferences: number;
}

interface ShareOfVoice {
  monScore: number;
  moyenneCercle: number;
  rang: number;
  total: number;
  sharePercent: number;
}

export interface ActeurDigitalDashboard {
  sparklineData: number[];
  sentimentDistribution: SentimentDistribution;
  canauxPresence: CanauxPresence;
  shareOfVoice: ShareOfVoice;
  topThematiques: string[];
  isLoading: boolean;
}

function periodeToConfig(periode: Periode) {
  switch (periode) {
    case '7j': return { days: 7, limit: 7 };
    case '30j': return { days: 30, limit: 30 };
    case '1an': return { days: 365, limit: 365 };
  }
}

export function useActeurDigitalDashboard(
  personnaliteId?: string,
  cercle?: number,
  periode: Periode = '30j',
  nomComplet?: string
): ActeurDigitalDashboard {
  const config = periodeToConfig(periode);
  const dateDebut = subDays(new Date(), config.days).toISOString().split('T')[0];

  // Sparkline: SPDI scores for the period
  const { data: sparkline, isLoading: sparkLoading } = useQuery({
    queryKey: ['spdi-sparkline', personnaliteId, periode],
    enabled: !!personnaliteId,
    queryFn: async () => {
      const { data } = await supabase
        .from('presence_digitale_metrics')
        .select('score_spdi, date_mesure')
        .eq('personnalite_id', personnaliteId!)
        .gte('date_mesure', dateDebut)
        .order('date_mesure', { ascending: true })
        .limit(config.limit);
      return (data ?? []).map(d => Number(d.score_spdi ?? 0));
    },
  });

  // Sentiment from mentions + actualites filtered by period
  const { data: sentiment, isLoading: sentLoading } = useQuery({
    queryKey: ['spdi-sentiment', personnaliteId, periode, nomComplet],
    enabled: !!personnaliteId,
    queryFn: async () => {
      let pos = 0, neu = 0, neg = 0;

      // Source 1: personnalites_mentions -> mentions
      const { data: mentionLinks } = await supabase
        .from('personnalites_mentions')
        .select('mention_id, mentions(sentiment, date_mention)')
        .eq('personnalite_id', personnaliteId!);

      for (const row of mentionLinks ?? []) {
        const m = (row as Record<string, unknown>).mentions as { sentiment: number | null; date_mention: string | null } | null;
        if (!m) { neu++; continue; }
        if (m.date_mention && m.date_mention < dateDebut) continue;
        const s = m.sentiment;
        if (s == null) continue; // skip nulls instead of counting as neutre
        if (s > 0.2) pos++;
        else if (s < -0.2) neg++;
        else neu++;
      }

      // Source 2: actualites mentioning this actor by name
      if (nomComplet) {
        const searchTerms = nomComplet.split(' ').filter(t => t.length > 2);
        if (searchTerms.length > 0) {
          let query = supabase
            .from('actualites')
            .select('sentiment, date_publication')
            .gte('date_publication', dateDebut)
            .not('sentiment', 'is', null);

          // Search by each name part in entites_personnes array
          for (const term of searchTerms) {
            query = query.ilike('titre', `%${term}%`);
          }

          const { data: articles } = await query.limit(500);
          for (const art of articles ?? []) {
            const s = art.sentiment;
            if (s == null) continue;
            if (s > 0.2) pos++;
            else if (s < -0.2) neg++;
            else neu++;
          }
        }
      }

      return { positif: pos, neutre: neu, negatif: neg };
    },
  });

  // Canaux from latest metric
  const { data: canaux, isLoading: canLoading } = useQuery({
    queryKey: ['spdi-canaux', personnaliteId],
    enabled: !!personnaliteId,
    queryFn: async () => {
      const { data } = await supabase
        .from('presence_digitale_metrics')
        .select('activite_linkedin, nb_citations_directes, nb_invitations_panels')
        .eq('personnalite_id', personnaliteId!)
        .order('date_mesure', { ascending: false })
        .limit(1)
        .single();
      if (!data) return { linkedin: 0, presse: 0, conferences: 0 };
      const norm = (v: number, max: number) => Math.min(100, Math.round((v / max) * 100));
      return {
        linkedin: norm(Number(data.activite_linkedin ?? 0), 20),
        presse: norm(Number(data.nb_citations_directes ?? 0), 10),
        conferences: norm(Number(data.nb_invitations_panels ?? 0), 5),
      };
    },
  });

  // Share of voice with sharePercent
  const { data: sov, isLoading: sovLoading } = useQuery({
    queryKey: ['spdi-sov', personnaliteId, cercle],
    enabled: !!personnaliteId && cercle != null,
    queryFn: async () => {
      const { data: peers } = await supabase
        .from('personnalites')
        .select('id')
        .eq('cercle', cercle!)
        .eq('actif', true)
        .eq('suivi_spdi_actif', true);

      if (!peers?.length) return { monScore: 0, moyenneCercle: 0, rang: 1, total: 1, sharePercent: 0 };

      const peerIds = peers.map(p => p.id);
      const { data: metrics } = await supabase
        .from('presence_digitale_metrics')
        .select('personnalite_id, nb_mentions, date_mesure')
        .in('personnalite_id', peerIds)
        .order('date_mesure', { ascending: false });

      const latestMap = new Map<string, number>();
      for (const m of metrics ?? []) {
        if (!latestMap.has(m.personnalite_id)) {
          latestMap.set(m.personnalite_id, Number(m.nb_mentions ?? 0));
        }
      }

      const values = Array.from(latestMap.values());
      const myMentions = latestMap.get(personnaliteId!) ?? 0;
      const totalMentions = values.reduce((a, b) => a + b, 0) || 1;
      const avg = values.length ? totalMentions / values.length : 0;
      const sorted = [...values].sort((a, b) => b - a);
      const rang = sorted.indexOf(myMentions) + 1;

      return {
        monScore: myMentions,
        moyenneCercle: Math.round(avg * 10) / 10,
        rang: rang || values.length,
        total: values.length,
        sharePercent: Math.round((myMentions / totalMentions) * 100),
      };
    },
  });

  // NLP Thematiques from social_insights
  const { data: thematiques, isLoading: themaLoading } = useQuery({
    queryKey: ['spdi-thematiques', personnaliteId, periode],
    enabled: !!personnaliteId,
    queryFn: async () => {
      // Get mention_ids for this actor
      const { data: links } = await supabase
        .from('personnalites_mentions')
        .select('mention_id')
        .eq('personnalite_id', personnaliteId!);

      if (!links?.length) return [];

      const mentionIds = links.map(l => l.mention_id);

      // Get social_insights linked to these mentions (via source correlation)
      // Since there's no direct FK, we query social_insights with date filter
      const { data: insights } = await supabase
        .from('social_insights')
        .select('hashtags, entites_detectees')
        .gte('date_publication', dateDebut)
        .limit(200);

      if (!insights?.length) return [];

      const counts = new Map<string, number>();
      for (const row of insights) {
        for (const tag of row.hashtags ?? []) {
          const t = tag.toLowerCase().replace(/^#/, '');
          if (t.length > 1) counts.set(t, (counts.get(t) ?? 0) + 1);
        }
        for (const ent of row.entites_detectees ?? []) {
          const e = ent.toLowerCase();
          if (e.length > 1) counts.set(e, (counts.get(e) ?? 0) + 1);
        }
      }

      return Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([term]) => term);
    },
  });

  return {
    sparklineData: sparkline ?? [],
    sentimentDistribution: sentiment ?? { positif: 0, neutre: 0, negatif: 0 },
    canauxPresence: canaux ?? { linkedin: 0, presse: 0, conferences: 0 },
    shareOfVoice: sov ?? { monScore: 0, moyenneCercle: 0, rang: 1, total: 1, sharePercent: 0 },
    topThematiques: thematiques ?? [],
    isLoading: sparkLoading || sentLoading || canLoading || sovLoading || themaLoading,
  };
}
