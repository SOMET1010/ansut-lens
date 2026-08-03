import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AccountActivity {
  id: string;
  nom: string;
  plateforme: string;
  identifiant: string;
  url_profil: string | null;
  publications_24h: number;
  publications_7j: number;
  derniere_publication: string | null;
  total_likes: number;
  total_comments: number;
  total_shares: number;
  total_vues: number;
  taux_engagement: number;
  sentiment_moyen: number | null;
  variation_vs_veille: number;
  statut_activite: 'actif' | 'faible' | 'dormant';
}

export type Pilier =
  | 'connectivite'
  | 'inclusion'
  | 'innovation'
  | 'service_universel'
  | 'eservices'
  | 'institutionnel'
  | 'evenementiel'
  | 'autre';

const PILIER_KEYWORDS: Record<Pilier, string[]> = {
  connectivite: ['connectivit', 'fibre', 'réseau', 'reseau', '4g', '5g', 'haut débit', 'haut debit', 'couverture'],
  inclusion: ['inclusion', 'femme', 'jeune', 'rural', 'zone blanche', 'accessib', 'handicap', 'égalit', 'egalit'],
  innovation: ['innovation', 'startup', 'ia ', 'intelligence artificielle', 'tech', 'numérique', 'numerique', 'digital'],
  service_universel: ['service universel', 'suta', 'universel', 'fsu'],
  eservices: ['e-service', 'eservice', 'e-gov', 'administration', 'dématérial', 'dematerial', 'plateforme'],
  institutionnel: ['ministre', 'directeur', 'visite', 'audience', 'cérémonie', 'ceremonie', 'protocol', 'partenariat', 'signature'],
  evenementiel: ['événement', 'evenement', 'forum', 'salon', 'conférence', 'conference', 'sommet', 'lancement'],
  autre: [],
};

function inferPilier(text: string): Pilier {
  const t = (text || '').toLowerCase();
  for (const [pilier, kws] of Object.entries(PILIER_KEYWORDS) as [Pilier, string[]][]) {
    if (pilier === 'autre') continue;
    if (kws.some(kw => t.includes(kw))) return pilier;
  }
  return 'autre';
}

function inferFormat(p: any): 'video' | 'image' | 'texte' {
  const tc = (p.type_contenu || '').toLowerCase();
  if (tc.includes('video') || tc.includes('vidéo')) return 'video';
  const urls: string[] = p.media_urls || [];
  if (urls.length) {
    if (urls.some(u => /\.(mp4|mov|webm)/i.test(u))) return 'video';
    return 'image';
  }
  if (tc.includes('image') || tc.includes('photo')) return 'image';
  return 'texte';
}

export function useAnsutAccountsActivity() {
  return useQuery({
    queryKey: ['ansut-accounts-activity-v2'],
    queryFn: async () => {
      const { data: comptes, error: comptesError } = await supabase
        .from('vip_comptes' as any)
        .select('id, nom, plateforme, identifiant, url_profil')
        .eq('actif', true);
      if (comptesError) throw comptesError;
      if (!comptes?.length) {
        return emptyResult();
      }

      const since7 = new Date(Date.now() - 7 * 864e5).toISOString();
      const since24 = new Date(Date.now() - 864e5).toISOString();
      const since48 = new Date(Date.now() - 2 * 864e5).toISOString();

      const { data: pubs7, error: pErr } = await supabase
        .from('publications_institutionnelles')
        .select('vip_compte_id, plateforme, date_publication, contenu, hashtags, type_contenu, media_urls, likes_count, comments_count, shares_count, vues_count, sentiment_commentaires')
        .gte('date_publication', since7)
        .order('date_publication', { ascending: false });
      if (pErr) throw pErr;

      const { data: latestPubs } = await supabase
        .from('publications_institutionnelles')
        .select('vip_compte_id, date_publication')
        .not('vip_compte_id', 'is', null)
        .order('date_publication', { ascending: false })
        .limit(500);

      const latestMap: Record<string, string> = {};
      for (const p of latestPubs || []) {
        if (p.vip_compte_id && !latestMap[p.vip_compte_id]) latestMap[p.vip_compte_id] = p.date_publication!;
      }

      // Aggregate per account
      const perAccount: Record<string, any> = {};
      const pilierCounts: Record<Pilier, number> = {
        connectivite: 0, inclusion: 0, innovation: 0, service_universel: 0,
        eservices: 0, institutionnel: 0, evenementiel: 0, autre: 0,
      };
      const formatCounts: Record<string, number> = { video: 0, image: 0, texte: 0 };
      const networkStats: Record<string, { pubs: number; likes: number; comments: number; shares: number; vues: number; engagement: number; sentiments: number[] }> = {};
      const horaire: number[] = Array(24).fill(0);

      let pubs24 = 0, pubs48_24 = 0;

      for (const p of pubs7 || []) {
        const cid = p.vip_compte_id;
        if (!cid) continue;
        if (!perAccount[cid]) {
          perAccount[cid] = { p7: 0, p24: 0, p48_24: 0, likes: 0, comments: 0, shares: 0, vues: 0, sentiments: [] as number[] };
        }
        const a = perAccount[cid];
        a.p7++;
        a.likes += p.likes_count || 0;
        a.comments += p.comments_count || 0;
        a.shares += p.shares_count || 0;
        a.vues += p.vues_count || 0;
        if (p.sentiment_commentaires != null) a.sentiments.push(Number(p.sentiment_commentaires));

        const dp = new Date(p.date_publication!);
        if (dp.toISOString() >= since24) { a.p24++; pubs24++; }
        else if (dp.toISOString() >= since48) { a.p48_24++; pubs48_24++; }

        // pilier
        const pilier = inferPilier(`${p.contenu || ''} ${(p.hashtags || []).join(' ')}`);
        pilierCounts[pilier]++;

        // format
        const fmt = inferFormat(p);
        formatCounts[fmt]++;

        // network
        const net = (p.plateforme || 'autre').toLowerCase();
        if (!networkStats[net]) networkStats[net] = { pubs: 0, likes: 0, comments: 0, shares: 0, vues: 0, engagement: 0, sentiments: [] };
        const ns = networkStats[net];
        ns.pubs++;
        ns.likes += p.likes_count || 0;
        ns.comments += p.comments_count || 0;
        ns.shares += p.shares_count || 0;
        ns.vues += p.vues_count || 0;
        if (p.sentiment_commentaires != null) ns.sentiments.push(Number(p.sentiment_commentaires));

        horaire[dp.getHours()]++;
      }

      const accounts: AccountActivity[] = comptes.map((c: any) => {
        const a = perAccount[c.id] || { p7: 0, p24: 0, p48_24: 0, likes: 0, comments: 0, shares: 0, vues: 0, sentiments: [] };
        const interactions = a.likes + a.comments + a.shares;
        const taux = a.vues > 0 ? (interactions / a.vues) * 100 : (a.p7 > 0 ? interactions / a.p7 : 0);
        const variation = a.p48_24 === 0 ? (a.p24 > 0 ? 100 : 0) : ((a.p24 - a.p48_24) / a.p48_24) * 100;
        const lastPub = latestMap[c.id] || null;
        const hoursAgo = lastPub ? (Date.now() - new Date(lastPub).getTime()) / 36e5 : Infinity;
        let statut: 'actif' | 'faible' | 'dormant' = 'dormant';
        if (a.p7 >= 5 && hoursAgo < 48) statut = 'actif';
        else if (a.p7 >= 1 && hoursAgo < 168) statut = 'faible';
        return {
          id: c.id,
          nom: c.nom,
          plateforme: c.plateforme,
          identifiant: c.identifiant,
          url_profil: c.url_profil,
          publications_24h: a.p24,
          publications_7j: a.p7,
          derniere_publication: lastPub,
          total_likes: a.likes,
          total_comments: a.comments,
          total_shares: a.shares,
          total_vues: a.vues,
          taux_engagement: Math.round(taux * 10) / 10,
          sentiment_moyen: a.sentiments.length ? a.sentiments.reduce((s: number, v: number) => s + v, 0) / a.sentiments.length : null,
          variation_vs_veille: Math.round(variation),
          statut_activite: statut,
        };
      });

      // Networks finalisation
      const networks = Object.entries(networkStats).map(([k, v]) => {
        const interactions = v.likes + v.comments + v.shares;
        v.engagement = v.vues > 0 ? (interactions / v.vues) * 100 : interactions / Math.max(v.pubs, 1);
        return {
          plateforme: k,
          publications: v.pubs,
          likes: v.likes,
          comments: v.comments,
          shares: v.shares,
          vues: v.vues,
          taux_engagement: Math.round(v.engagement * 10) / 10,
          sentiment: v.sentiments.length ? v.sentiments.reduce((s, x) => s + x, 0) / v.sentiments.length : null,
        };
      });

      // Sentiment global (from publications)
      const allSent = (pubs7 || []).map(p => p.sentiment_commentaires).filter((s): s is number => s != null).map(Number);
      const pos = allSent.filter(s => s > 0.2).length;
      const neg = allSent.filter(s => s < -0.2).length;
      const neu = allSent.length - pos - neg;
      const totalSent = allSent.length || 1;

      const total7 = pubs7?.length || 0;
      const variationGlobale = pubs48_24 === 0 ? (pubs24 > 0 ? 100 : 0) : Math.round(((pubs24 - pubs48_24) / pubs48_24) * 100);

      // Alerts
      const alerts: { niveau: 'critique' | 'attention' | 'info'; message: string }[] = [];
      const dormants = accounts.filter(a => a.statut_activite === 'dormant');
      if (dormants.length) alerts.push({ niveau: 'attention', message: `${dormants.length} compte(s) sans activité significative` });
      const silencieux72 = accounts.filter(a => {
        if (!a.derniere_publication) return true;
        return (Date.now() - new Date(a.derniere_publication).getTime()) / 36e5 > 72;
      });
      if (silencieux72.length) alerts.push({ niveau: 'critique', message: `${silencieux72.length} compte(s) silencieux depuis +72h` });
      if (neg / Math.max(totalSent, 1) > 0.25) alerts.push({ niveau: 'critique', message: 'Sentiment négatif élevé (>25%) — risque réputation' });
      if (pubs24 === 0) alerts.push({ niveau: 'critique', message: 'Aucune publication ANSUT sur les dernières 24h' });

      // Pilier percentages
      const totalPilier = Object.values(pilierCounts).reduce((s, n) => s + n, 0) || 1;
      const piliers = (Object.entries(pilierCounts) as [Pilier, number][])
        .map(([k, v]) => ({ pilier: k, count: v, pct: Math.round((v / totalPilier) * 100) }))
        .sort((a, b) => b.count - a.count);

      return {
        accounts,
        totalPubs: pubs24,
        totalPubs7j: total7,
        variationGlobale,
        networks,
        sentimentBreakdown: {
          positif: Math.round((pos / totalSent) * 100),
          neutre: Math.round((neu / totalSent) * 100),
          negatif: Math.round((neg / totalSent) * 100),
          total: totalSent,
        },
        formatCounts,
        horaire,
        piliers,
        alerts,
        inactiveCount: dormants.length,
      };
    },
    refetchInterval: 5 * 60 * 1000,
  });
}

function emptyResult() {
  return {
    accounts: [] as AccountActivity[],
    totalPubs: 0,
    totalPubs7j: 0,
    variationGlobale: 0,
    networks: [] as any[],
    sentimentBreakdown: { positif: 0, neutre: 0, negatif: 0, total: 0 },
    formatCounts: { video: 0, image: 0, texte: 0 },
    horaire: Array(24).fill(0),
    piliers: [] as { pilier: Pilier; count: number; pct: number }[],
    alerts: [] as { niveau: 'critique' | 'attention' | 'info'; message: string }[],
    inactiveCount: 0,
  };
}
