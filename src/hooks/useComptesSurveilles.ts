import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Gestion des comptes réseaux sociaux surveillés (`vip_comptes`).
 *
 * Lecture pour tout utilisateur authentifié ; écriture réservée aux admins
 * (RLS `has_role('admin')`). C'est la liste qu'utilise la collecte
 * institutionnelle pour aller chercher les publications de l'ANSUT.
 */

export interface CompteSurveille {
  id: string;
  nom: string;
  plateforme: string;
  identifiant: string;
  url_profil: string | null;
  fonction: string | null;
  actif: boolean | null;
  derniere_verification: string | null;
}

export interface NouveauCompte {
  nom: string;
  plateforme: string;
  identifiant: string;
  url_profil: string;
  fonction?: string | null;
}

const CLE = ['comptes-surveilles'];

export function useComptesSurveilles() {
  return useQuery({
    queryKey: CLE,
    queryFn: async (): Promise<CompteSurveille[]> => {
      const { data, error } = await supabase
        .from('vip_comptes')
        .select('id, nom, plateforme, identifiant, url_profil, fonction, actif, derniere_verification')
        .order('nom', { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMutationsComptes() {
  const qc = useQueryClient();
  const invalider = () => qc.invalidateQueries({ queryKey: CLE });

  const ajouter = useMutation({
    mutationFn: async (c: NouveauCompte) => {
      const { error } = await supabase.from('vip_comptes').insert({
        nom: c.nom,
        plateforme: c.plateforme,
        identifiant: c.identifiant,
        url_profil: c.url_profil,
        fonction: c.fonction ?? null,
        actif: true,
      });
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Compte ajouté à la surveillance'); invalider(); },
    onError: (e) => toast.error(`Impossible d’ajouter le compte : ${e instanceof Error ? e.message : ''}`),
  });

  const basculerActif = useMutation({
    mutationFn: async ({ id, actif }: { id: string; actif: boolean }) => {
      const { error } = await supabase.from('vip_comptes').update({ actif }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => invalider(),
    onError: (e) => toast.error(`Mise à jour impossible : ${e instanceof Error ? e.message : ''}`),
  });

  const supprimer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vip_comptes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Compte retiré de la surveillance'); invalider(); },
    onError: (e) => toast.error(`Suppression impossible : ${e instanceof Error ? e.message : ''}`),
  });

  return { ajouter, basculerActif, supprimer };
}
