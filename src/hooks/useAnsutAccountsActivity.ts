import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AccountActivity {
  id: string;
  nom: string;
  plateforme: string;
  identifiant: string;
  url_profil: string | null;
  publications_24h: number;
  derniere_publication: string | null;
}

export function useAnsutAccountsActivity() {
  return useQuery({
    queryKey: ['ansut-accounts-activity'],
    queryFn: async () => {
      // 1. Get active VIP accounts
      const { data: comptes, error: comptesError } = await supabase
        .from('vip_comptes')
        .select('id, nom, plateforme, identifiant, url_profil')
        .eq('actif', true);

      if (comptesError) throw comptesError;
      if (!comptes?.length) return { accounts: [] as AccountActivity[], totalPubs: 0 };

      // 2. Get publications from last 24h
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: pubs, error: pubsError } = await supabase
        .from('publications_institutionnelles')
        .select('vip_compte_id, date_publication')
        .gte('date_publication', since)
        .not('vip_compte_id', 'is', null);

      if (pubsError) throw pubsError;

      // 3. Get latest publication per account (all time)
      const { data: latestPubs, error: latestError } = await supabase
        .from('publications_institutionnelles')
        .select('vip_compte_id, date_publication')
        .not('vip_compte_id', 'is', null)
        .order('date_publication', { ascending: false });

      if (latestError) throw latestError;

      // Group by vip_compte_id
      const countMap: Record<string, number> = {};
      const latestMap: Record<string, string> = {};

      for (const p of pubs || []) {
        if (p.vip_compte_id) {
          countMap[p.vip_compte_id] = (countMap[p.vip_compte_id] || 0) + 1;
        }
      }

      for (const p of latestPubs || []) {
        if (p.vip_compte_id && !latestMap[p.vip_compte_id]) {
          latestMap[p.vip_compte_id] = p.date_publication!;
        }
      }

      const accounts: AccountActivity[] = comptes.map(c => ({
        id: c.id,
        nom: c.nom,
        plateforme: c.plateforme,
        identifiant: c.identifiant,
        url_profil: c.url_profil,
        publications_24h: countMap[c.id] || 0,
        derniere_publication: latestMap[c.id] || null,
      }));

      const totalPubs = accounts.reduce((s, a) => s + a.publications_24h, 0);

      return { accounts, totalPubs };
    },
    refetchInterval: 5 * 60 * 1000, // refresh every 5 min
  });
}
