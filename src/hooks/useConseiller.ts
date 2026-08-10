import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nettoyerExtrait, nettoyerTitre } from '@/lib/nettoyerExtrait';
import type { Sujet } from '@/lib/sujets';

/**
 * Conseiller éditorial IA (edge function `conseiller-editorial`, Étage 4).
 *
 * Couche d'ENRICHISSEMENT du conseiller de La Matinale : l'opportunité (« terrain
 * éditorial vacant ») est détectée de façon DÉTERMINISTE côté front ; ce hook
 * demande à l'IA d'en formuler une lecture courte, bornée aux articles de preuve.
 *
 * Il échoue SILENCIEUSEMENT (erreur, IA indisponible, garde charte déclenchée) :
 * il renvoie alors `null` et l'adaptateur conserve le conseil déterministe et
 * sourcé. Aucune régression tant que la fonction n'est pas déployée.
 *
 * Contrat de sortie (validé côté serveur : texte non-injonctif + ids réellement
 * fournis, cf. `_shared/conseiller.ts`).
 */
export interface ConseilIA {
  texte: string;
  evidence_ids: string[];
  limitations: string;
}

/** Limite ce qu'on envoie au modèle (coût) ; l'affichage des preuves reste complet. */
const MAX_ARTICLES_ENVOYES = 10;

function opportuniteVersFaits(s: Sujet) {
  return {
    subject_id: s.id,
    nom: s.nom,
    code: s.code,
    periodeJours: s.periodeJours,
    nbArticles: s.nbArticles,
    external_content: s.articles.slice(0, MAX_ARTICLES_ENVOYES).map((a) => ({
      id: a.id,
      titre: nettoyerTitre(a.titre),
      source: a.source_nom ?? undefined,
      extrait: (nettoyerExtrait(a.resume) || '').slice(0, 180) || undefined,
    })),
  };
}

/**
 * @param opportunite le sujet « terrain vacant » détecté déterministiquement, ou
 *   `null` s'il n'y en a pas (le conseiller n'a alors rien à enrichir).
 * @param enabled active l'appel (typiquement `!!opportunite`).
 */
export function useConseiller(opportunite: Sujet | null, enabled: boolean) {
  const faits = useMemo(
    () => (opportunite ? opportuniteVersFaits(opportunite) : null),
    [opportunite],
  );

  // Clé stable : le conseil ne change que si l'opportunité ou son volume change.
  const cle = faits ? `${faits.subject_id}:${faits.nbArticles}` : 'aucune';

  return useQuery({
    queryKey: ['conseiller-editorial', cle],
    enabled: enabled && !!faits,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<ConseilIA | null> => {
      const { data, error } = await supabase.functions.invoke('conseiller-editorial', {
        body: { opportunite: faits },
      });
      if (error) throw error;
      return (data?.conseil as ConseilIA | null) ?? null;
    },
  });
}
