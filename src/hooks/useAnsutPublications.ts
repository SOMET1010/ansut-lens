import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Publications propres de l'ANSUT (pages officielles : LinkedIn/X ANSUT, site).
 *
 * Le pilotage stratégique commence par ce que l'ANSUT elle-même publie : c'est
 * l'information la plus pertinente et le signal le plus direct de ses priorités
 * du moment. On lit ici la table `publications_institutionnelles`, filtrée sur
 * les publications officielles (`est_officiel = true`), par opposition aux prises
 * de parole des directeurs ou aux mentions externes.
 */

export interface PublicationAnsut {
  id: string;
  plateforme: string;
  auteur: string | null;
  contenu: string | null;
  date_publication: string | null;
  url_original: string | null;
  likes_count: number;
  comments_count: number;
  shares_count: number;
}

export function useAnsutPublications(limit = 5, maxAgeHours?: number) {
  return useQuery({
    queryKey: ['ansut-publications', limit, maxAgeHours ?? null],
    queryFn: async (): Promise<PublicationAnsut[]> => {
      // On montre toute la voix institutionnelle de l'ANSUT (pages officielles
      // ET prises de parole des dirigeants), sans dépendre du drapeau
      // `est_officiel` qui n'est positionné que si le champ `fonction` du compte
      // contient « officiel » — trop fragile pour conditionner l'affichage.
      let query = supabase
        .from('publications_institutionnelles')
        .select(
          'id, plateforme, auteur, contenu, date_publication, url_original, likes_count, comments_count, shares_count',
        )
        .order('date_publication', { ascending: false });

      if (maxAgeHours) {
        const cutoff = new Date();
        cutoff.setHours(cutoff.getHours() - maxAgeHours);
        query = query.gte('date_publication', cutoff.toISOString());
      }

      const { data, error } = await query.limit(limit);
      if (error) throw error;

      return (data || []).map((p) => ({
        id: p.id,
        plateforme: p.plateforme,
        auteur: p.auteur ?? null,
        contenu: p.contenu ?? null,
        date_publication: p.date_publication ?? null,
        url_original: p.url_original ?? null,
        likes_count: p.likes_count ?? 0,
        comments_count: p.comments_count ?? 0,
        shares_count: p.shares_count ?? 0,
      }));
    },
    refetchInterval: 5 * 60 * 1000,
  });
}
