import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Compte, pour un ensemble d'acteurs, le nombre de mentions réelles sur une
 * fenêtre récente (par défaut 7 jours), à partir du lien acteur↔contenu écrit
 * par le job `lier-mentions-acteurs`.
 *
 * Charte de crédibilité : ce comptage n'existe QUE si le lien a été peuplé.
 * Tant qu'aucune mention n'est reliée, la carte n'affiche rien (pas un « 0 »
 * présenté comme une mesure). Une « mention » = l'acteur est nommé dans un
 * contenu sourcé — ce n'est pas une « prise de parole ».
 *
 * Une seule requête pour toute la page, indexée sur la liste d'identifiants.
 */
export function useMentionsRecentes(ids: string[], fenetreJours = 7) {
  const cle = [...ids].sort().join(',');

  return useQuery({
    queryKey: ['mentions-recentes', fenetreJours, cle],
    enabled: ids.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Record<string, number>> => {
      const depuis = new Date(Date.now() - fenetreJours * 86400000).toISOString();

      const { data, error } = await supabase
        .from('personnalites_mentions')
        .select('personnalite_id, mentions!inner(date_mention)')
        .in('personnalite_id', ids)
        .gte('mentions.date_mention', depuis);

      if (error) throw error;

      const compte: Record<string, number> = {};
      for (const ligne of (data || []) as { personnalite_id: string }[]) {
        compte[ligne.personnalite_id] = (compte[ligne.personnalite_id] || 0) + 1;
      }
      return compte;
    },
  });
}
