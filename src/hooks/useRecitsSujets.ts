import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { nettoyerExtrait, nettoyerTitre } from '@/lib/nettoyerExtrait';
import type { Sujet } from '@/lib/sujets';

/**
 * Récits éditoriaux des sujets (edge function `recit-sujet`).
 *
 * Le récit IA est une couche d'ENRICHISSEMENT : la carte-sujet fonctionne sans
 * lui (résumé factuel + preuves). Ce hook échoue donc silencieusement — en cas
 * d'erreur ou d'IA indisponible, il renvoie simplement une carte de récits vide
 * et l'interface bascule sur le résumé factuel.
 *
 * Contrat de sortie (validé côté serveur : les identifiants cités sont
 * garantis présents dans les faits envoyés).
 */
export interface RecitSujet {
  subject_id: string;
  headline: string;
  narrative: string;
  why_today: string;
  evidence_ids: string[];
  ansut_content_ids: string[];
  external_content_ids: string[];
  limitations: string;
}

/** Limite ce qu'on envoie au modèle (coût) ; l'affichage des preuves reste complet. */
const MAX_ARTICLES_ENVOYES = 12;
const MAX_PUBS_ENVOYEES = 8;

function sujetVersFaits(s: Sujet) {
  return {
    subject_id: s.id,
    nom: s.nom,
    code: s.code,
    periodeJours: s.periodeJours,
    ecart: s.ecart,
    compteurs: {
      articles: s.nbArticles,
      publications: s.nbPublications,
      articles24h: s.nbArticles24h,
      articlesAvant24h: s.nbArticlesAvant24h,
      sources: s.sources.length,
    },
    external_content: s.articles.slice(0, MAX_ARTICLES_ENVOYES).map((a) => ({
      id: a.id,
      titre: nettoyerTitre(a.titre),
      source: a.source_nom ?? undefined,
    })),
    ansut_content: s.publications.slice(0, MAX_PUBS_ENVOYEES).map((p) => ({
      id: p.id,
      extrait: (nettoyerExtrait(p.contenu) || '').slice(0, 180),
      plateforme: p.plateforme,
    })),
    partenaires: s.partenaires,
  };
}

export function useRecitsSujets(sujets: Sujet[], enabled: boolean) {
  const faits = useMemo(() => sujets.map(sujetVersFaits), [sujets]);

  // Clé stable : les récits ne changent que si la matière du sujet change.
  const cle = faits.map(
    (f) => `${f.subject_id}:${f.compteurs.articles}:${f.compteurs.publications}:${f.compteurs.articles24h}`,
  );

  return useQuery({
    queryKey: ['recits-sujets', cle],
    enabled: enabled && faits.length > 0,
    staleTime: 10 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<Record<string, RecitSujet>> => {
      const { data, error } = await supabase.functions.invoke('recit-sujet', {
        body: { sujets: faits },
      });
      if (error) throw error;
      const recits: RecitSujet[] = data?.recits ?? [];
      const map: Record<string, RecitSujet> = {};
      for (const r of recits) map[r.subject_id] = r;
      return map;
    },
  });
}
