import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Signalement manuel de fils sociaux (posts de tiers) et suivi de leurs
 * commentaires — option A de `docs/PROCEDURE_ACCES_SOCIAUX.md`, qui ne dépend
 * d'aucun accès API externe.
 */

export interface FilSocial {
  id: string;
  url: string;
  plateforme: string;
  titre: string | null;
  auteur_publication: string | null;
  contexte: string | null;
  statut: string;
  tonalite_globale: number | null;
  alerte_generee: boolean;
  derniere_evaluation: string | null;
  signale_par: string | null;
  created_at: string;
}

export interface CommentaireFil {
  id: string;
  fil_id: string;
  auteur: string | null;
  contenu: string;
  auteur_influent: boolean;
  sentiment: number | null;
  date_commentaire: string;
  created_at: string;
}

export function useFilsSociaux() {
  return useQuery({
    queryKey: ['fils-sociaux'],
    queryFn: async (): Promise<FilSocial[]> => {
      const { data, error } = await supabase
        .from('fils_sociaux')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as FilSocial[];
    },
  });
}

export function useCommentairesFil(filId: string | null) {
  return useQuery({
    queryKey: ['commentaires-fil', filId],
    enabled: !!filId,
    queryFn: async (): Promise<CommentaireFil[]> => {
      const { data, error } = await supabase
        .from('commentaires_fil')
        .select('*')
        .eq('fil_id', filId!)
        .order('date_commentaire', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CommentaireFil[];
    },
  });
}

export function useSignalerFil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entree: {
      url: string;
      plateforme: string;
      titre?: string;
      auteur_publication?: string;
      contexte?: string;
    }) => {
      const { data: session } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from('fils_sociaux')
        .insert({
          url: entree.url.trim(),
          plateforme: entree.plateforme,
          titre: entree.titre?.trim() || null,
          auteur_publication: entree.auteur_publication?.trim() || null,
          contexte: entree.contexte?.trim() || null,
          signale_par: session.user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as FilSocial;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fils-sociaux'] });
      toast.success('Fil signalé', { description: 'Ajoutez les commentaires observés pour lancer la veille.' });
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Enregistrement impossible';
      toast.error('Signalement refusé', {
        description: message.includes('duplicate') ? 'Ce fil est déjà suivi.' : message,
      });
    },
  });
}

export function useAjouterCommentaire() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entree: {
      fil_id: string;
      contenu: string;
      auteur?: string;
      auteur_influent?: boolean;
      date_commentaire?: string;
    }) => {
      const { data: session } = await supabase.auth.getUser();
      const { error } = await supabase.from('commentaires_fil').insert({
        fil_id: entree.fil_id,
        contenu: entree.contenu.trim(),
        auteur: entree.auteur?.trim() || null,
        auteur_influent: entree.auteur_influent ?? false,
        date_commentaire: entree.date_commentaire ?? new Date().toISOString(),
        saisi_par: session.user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['commentaires-fil', variables.fil_id] });
      toast.success('Commentaire enregistré');
    },
    onError: (error) => {
      toast.error('Enregistrement impossible', {
        description: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    },
  });
}

export function useEvaluerFil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (filId: string) => {
      const { data, error } = await supabase.functions.invoke('evaluer-fil-social', {
        body: { fil_id: filId },
      });
      if (error) throw error;
      return data as {
        alerte: boolean;
        motifs: string[];
        tonalite_globale: number | null;
        negatifs_24h: number;
      };
    },
    onSuccess: (data, filId) => {
      queryClient.invalidateQueries({ queryKey: ['fils-sociaux'] });
      queryClient.invalidateQueries({ queryKey: ['commentaires-fil', filId] });
      if (data?.alerte) {
        toast.warning('Seuil d\u2019alerte atteint', { description: data.motifs.join(' ; ') });
      } else {
        toast.success('Fil évalué', { description: 'Aucun seuil d\u2019alerte atteint.' });
      }
    },
    onError: (error) => {
      toast.error('Évaluation impossible', {
        description: error instanceof Error ? error.message : 'Erreur inconnue',
      });
    },
  });
}

export function useSupprimerFil() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (filId: string) => {
      const { error } = await supabase.from('fils_sociaux').delete().eq('id', filId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fils-sociaux'] });
      toast.success('Fil retiré du suivi');
    },
  });
}
