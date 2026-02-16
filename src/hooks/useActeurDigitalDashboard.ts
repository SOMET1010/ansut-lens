import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
}

export interface ActeurDigitalDashboard {
  sparklineData: number[];
  sentimentDistribution: SentimentDistribution;
  canauxPresence: CanauxPresence;
  shareOfVoice: ShareOfVoice;
  topThematiques: string[];
  isLoading: boolean;
}

export function useActeurDigitalDashboard(personnaliteId?: string, cercle?: number): ActeurDigitalDashboard {
  // Sparkline: last 7 SPDI scores
  const { data: sparkline, isLoading: sparkLoading } = useQuery({
    queryKey: ['spdi-sparkline', personnaliteId],
    enabled: !!personnaliteId,
    queryFn: async () => {
      const { data } = await supabase
        .from('presence_digitale_metrics')
        .select('score_spdi, date_mesure')
        .eq('personnalite_id', personnaliteId!)
        .order('date_mesure', { ascending: true })
        .limit(7);
      return (data ?? []).map(d => Number(d.score_spdi ?? 0));
    },
  });

  // Sentiment from mentions
  const { data: sentiment, isLoading: sentLoading } = useQuery({
    queryKey: ['spdi-sentiment', personnaliteId],
    enabled: !!personnaliteId,
    queryFn: async () => {
      const { data } = await supabase
        .from('personnalites_mentions')
        .select('mention_id, mentions(sentiment)')
        .eq('personnalite_id', personnaliteId!);
      
      let pos = 0, neu = 0, neg = 0;
      const rows = data ?? [];
      for (const row of rows) {
        const s = (row as any).mentions?.sentiment;
        if (s == null) { neu++; continue; }
        if (s > 0.2) pos++;
        else if (s < -0.2) neg++;
        else neu++;
      }
      const total = pos + neu + neg || 1;
      return {
        positif: Math.round((pos / total) * 100),
        neutre: Math.round((neu / total) * 100),
        negatif: Math.round((neg / total) * 100),
      };
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
      // Normalize to 0-100
      const norm = (v: number, max: number) => Math.min(100, Math.round((v / max) * 100));
      return {
        linkedin: norm(Number(data.activite_linkedin ?? 0), 20),
        presse: norm(Number(data.nb_citations_directes ?? 0), 10),
        conferences: norm(Number(data.nb_invitations_panels ?? 0), 5),
      };
    },
  });

  // Share of voice
  const { data: sov, isLoading: sovLoading } = useQuery({
    queryKey: ['spdi-sov', personnaliteId, cercle],
    enabled: !!personnaliteId && cercle != null,
    queryFn: async () => {
      // Get all actors in same cercle with their latest nb_mentions
      const { data: peers } = await supabase
        .from('personnalites')
        .select('id')
        .eq('cercle', cercle!)
        .eq('actif', true)
        .eq('suivi_spdi_actif', true);
      
      if (!peers?.length) return { monScore: 0, moyenneCercle: 0, rang: 1, total: 1 };

      const peerIds = peers.map(p => p.id);
      
      // Get latest metrics for all peers
      const { data: metrics } = await supabase
        .from('presence_digitale_metrics')
        .select('personnalite_id, nb_mentions, date_mesure')
        .in('personnalite_id', peerIds)
        .order('date_mesure', { ascending: false });
      
      // Take latest per actor
      const latestMap = new Map<string, number>();
      for (const m of metrics ?? []) {
        if (!latestMap.has(m.personnalite_id)) {
          latestMap.set(m.personnalite_id, Number(m.nb_mentions ?? 0));
        }
      }
      
      const values = Array.from(latestMap.values());
      const myMentions = latestMap.get(personnaliteId!) ?? 0;
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
      const sorted = [...values].sort((a, b) => b - a);
      const rang = sorted.indexOf(myMentions) + 1;

      return {
        monScore: myMentions,
        moyenneCercle: Math.round(avg * 10) / 10,
        rang: rang || values.length,
        total: values.length,
      };
    },
  });

  return {
    sparklineData: sparkline ?? [],
    sentimentDistribution: sentiment ?? { positif: 0, neutre: 0, negatif: 0 },
    canauxPresence: canaux ?? { linkedin: 0, presse: 0, conferences: 0 },
    shareOfVoice: sov ?? { monScore: 0, moyenneCercle: 0, rang: 1, total: 1 },
    topThematiques: [],
    isLoading: sparkLoading || sentLoading || canLoading || sovLoading,
  };
}
