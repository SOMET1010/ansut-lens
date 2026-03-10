import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Publications institutionnelles
export function usePublicationsInstitutionnelles() {
  return useQuery({
    queryKey: ['publications-institutionnelles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('publications_institutionnelles')
        .select('*')
        .order('date_publication', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });
}

// Echo metrics with publication info
export function useEchoMetrics() {
  return useQuery({
    queryKey: ['echo-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('echo_metrics')
        .select(`*, publications_institutionnelles(contenu, plateforme, auteur, date_publication, likes_count, shares_count)`)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });
}

// Part de voix
export function usePartDeVoix() {
  return useQuery({
    queryKey: ['part-de-voix'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('part_de_voix')
        .select('*')
        .order('mois', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });
}

// VIP comptes
export function useVipComptes() {
  return useQuery({
    queryKey: ['vip-comptes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_comptes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

// VIP alertes
export function useVipAlertes() {
  return useQuery({
    queryKey: ['vip-alertes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vip_alertes')
        .select('*, vip_comptes(nom, plateforme, fonction)')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data;
    },
  });
}

// Trigger collecte
export function useCollecteInstitutionnelle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mode: string = 'all') => {
      const { data, error } = await supabase.functions.invoke('collecte-institutionnelle', {
        body: { mode },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['publications-institutionnelles'] });
      toast.success(`${data.collected || 0} publications collectées`);
    },
    onError: (e) => {
      toast.error('Erreur lors de la collecte institutionnelle');
      console.error(e);
    },
  });
}

// Trigger echo analysis
export function useAnalyserEcho() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { publication_id?: string; mode?: string }) => {
      const { data, error } = await supabase.functions.invoke('analyser-echo-resonance', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['echo-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['part-de-voix'] });
      toast.success(`${data.analyzed || 0} publications analysées`);
    },
    onError: (e) => {
      toast.error("Erreur lors de l'analyse écho");
      console.error(e);
    },
  });
}

// Add VIP compte
export function useAddVipCompte() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (compte: {
      nom: string;
      fonction?: string;
      plateforme: string;
      identifiant: string;
      url_profil?: string;
      personnalite_id?: string;
    }) => {
      const { data, error } = await supabase.from('vip_comptes').insert(compte).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vip-comptes'] });
      toast.success('Compte VIP ajouté');
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });
}

// Stats summary
export function useAutoVeilleStats() {
  return useQuery({
    queryKey: ['auto-veille-stats'],
    queryFn: async () => {
      const [pubRes, echoRes, voixRes, vipRes] = await Promise.all([
        supabase.from('publications_institutionnelles').select('*', { count: 'exact', head: true }),
        supabase.from('echo_metrics').select('score_resonance').order('created_at', { ascending: false }).limit(10),
        supabase.from('part_de_voix').select('*').order('mois', { ascending: false }).limit(1),
        supabase.from('vip_comptes').select('*', { count: 'exact', head: true }).eq('actif', true),
      ]);

      const avgResonance = echoRes.data?.length
        ? echoRes.data.reduce((s: number, e: any) => s + (Number(e.score_resonance) || 0), 0) / echoRes.data.length
        : 0;

      return {
        totalPublications: pubRes.count || 0,
        avgResonance: Math.round(avgResonance),
        latestVoix: voixRes.data?.[0] || null,
        activeVip: vipRes.count || 0,
      };
    },
  });
}
