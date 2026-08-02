import { supabase } from '@/integrations/supabase/client';

/**
 * Récupération de sources pour l'ancrage (RAG) de l'Assistant.
 *
 * Sans ancrage, un modèle de langage répond de mémoire et hallucine. On récupère
 * ici, dans les actualités réellement collectées, celles qui se rapportent à la
 * question, pour les fournir comme sources citables. Le modèle répond alors sur
 * des faits vérifiables, pas sur ses souvenirs.
 *
 * Récupération par mots (ilike) en attendant une recherche plein-texte dédiée :
 * simple, mais déjà un garde-fou réel contre l'hallucination.
 */

export interface SourceRag {
  id: string;
  titre: string;
  resume: string | null;
  source_nom: string | null;
  date_publication: string | null;
}

/** Mots trop courants pour discriminer, écartés de la requête. */
const MOTS_VIDES = new Set([
  'les', 'des', 'une', 'que', 'qui', 'quoi', 'pour', 'sur', 'dans', 'avec', 'cette',
  'ces', 'aux', 'par', 'plus', 'est', 'sont', 'the', 'and', 'for', 'with', 'quel',
  'quelle', 'quels', 'quelles', 'comment', 'pourquoi', 'quand', 'donne', 'moi',
  'nous', 'vous', 'votre', 'notre', 'leur', 'sont', 'fait', 'faire',
]);

/** Extrait les termes significatifs d'une question. */
function termesUtiles(question: string): string[] {
  return Array.from(
    new Set(
      (question || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .filter((t) => t.length >= 4 && !MOTS_VIDES.has(t)),
    ),
  ).slice(0, 6);
}

/**
 * Récupère jusqu'à `limite` actualités pertinentes pour la question. Renvoie un
 * tableau vide si aucun terme exploitable (l'appelant retombe alors sur le
 * contexte sélectionné manuellement).
 */
export async function rechercherSourcesPertinentes(
  question: string,
  limite = 8,
): Promise<SourceRag[]> {
  const termes = termesUtiles(question);
  if (termes.length === 0) return [];

  // Un article est retenu s'il contient l'un des termes dans son titre ou son
  // résumé. Les termes sont assainis pour ne pas casser la syntaxe du filtre.
  const orFiltre = termes
    .map((t) => t.replace(/[%,()]/g, ''))
    .filter(Boolean)
    .flatMap((t) => [`titre.ilike.%${t}%`, `resume.ilike.%${t}%`])
    .join(',');

  if (!orFiltre) return [];

  const { data, error } = await supabase
    .from('actualites')
    .select('id, titre, resume, source_nom, date_publication')
    .or(orFiltre)
    .order('date_publication', { ascending: false })
    .limit(limite);

  if (error) {
    console.error('[RAG] récupération impossible :', error);
    return [];
  }
  return (data || []) as SourceRag[];
}

/** Formate les sources récupérées en bloc de contexte citable pour le modèle. */
export function formaterContexteRag(sources: SourceRag[]): string {
  if (sources.length === 0) return '';
  const lignes = sources
    .map(
      (s) =>
        `- [[ACTU:${s.id}|${(s.titre || '').slice(0, 80)}]] (${s.source_nom || 'source'}) : ${(s.resume || '').slice(0, 200)}`,
    )
    .join('\n');
  return `\n\n=== SOURCES PERTINENTES RÉCUPÉRÉES (ancrage automatique) ===\nRéponds en t'appuyant sur ces sources et cite-les avec [[ACTU:id|titre]]. N'invente aucun fait absent de ces sources ou du contexte.\n${lignes}\n`;
}
