import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  qualifierDepuisRow,
  qualifier,
  type Qualification,
  type ContenuBrut,
} from '@/lib/qualificationContenu';

/**
 * Étage 3 — LECTURE de la qualification persistée.
 *
 * Le principe fondateur : « le pipeline décide, l'écran présente ». Cet écran ne
 * recalcule plus la qualification : il LIT la qualification déjà persistée à
 * l'ingestion (`editorial_qualifications`, étage 2) et n'en dérive que les
 * éligibilités time-relative, via le service unique de politiques.
 *
 * Charte : un contenu peut ne PAS avoir de ligne (collecté mais pas encore
 * requalifié). On l'expose alors honnêtement (`aQualification: false`) et on
 * fournit un FALLBACK explicite `qualifierContenu(brut)` qui recalcule à la volée
 * — jamais un vide silencieux ni une donnée manquante déguisée.
 */

const COLONNES =
  'content_key, editorial_date, category, secondary_themes, is_institutional, is_ansut_voice';

export interface ResultatQualification {
  /** Qualifications lues en base, indexées par content_key. */
  parCle: Record<string, Qualification>;
  /** Vrai si une ligne persistée existe pour cette clé. */
  aQualification: (contentKey: string) => boolean;
  /**
   * Qualification d'un contenu : la version LUE si elle existe, sinon un fallback
   * RECALCULÉ à partir du contenu brut (mêmes règles — service unique). Trace le
   * recours au fallback pour le suivi de couverture de l'étage 2.
   */
  qualificationDe: (contentKey: string, brut: ContenuBrut) => Qualification;
}

/**
 * Lit la qualification persistée pour un ensemble de contenus.
 * `maintenantMs` est figé par requête pour un fenêtrage cohérent sur la page.
 */
export function useQualification(contentKeys: string[], maintenantMs = Date.now()) {
  const cles = [...new Set(contentKeys.filter(Boolean))];
  const cleCache = [...cles].sort().join(',');

  return useQuery({
    queryKey: ['qualification', cleCache],
    enabled: cles.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ResultatQualification> => {
      const { data, error } = await supabase
        .from('editorial_qualifications')
        .select(COLONNES)
        .in('content_key', cles);
      if (error) throw error;

      const parCle: Record<string, Qualification> = {};
      for (const row of (data ?? []) as (LigneRow & { content_key: string })[]) {
        parCle[row.content_key] = qualifierDepuisRow(row, maintenantMs);
      }

      return {
        parCle,
        aQualification: (contentKey: string) => contentKey in parCle,
        qualificationDe: (contentKey: string, brut: ContenuBrut) => {
          const lu = parCle[contentKey];
          if (lu) return lu;
          // Fallback honnête : contenu pas encore requalifié → recalcul à la volée.
          console.warn(
            `[useQualification] pas de qualification persistée pour ${contentKey} — fallback recalcul`,
          );
          return qualifier(brut, maintenantMs);
        },
      };
    },
  });
}

// Forme minimale d'une ligne lue (sous-ensemble de editorial_qualifications).
interface LigneRow {
  editorial_date: string | null;
  category: string;
  secondary_themes: string[];
  is_institutional: boolean;
  is_ansut_voice: boolean;
}
