/**
 * Helper centralisé : détection de la qualité des données pour les projets
 * du Radar de Proximité (et autres widgets exploitant similitude_score / date_detection).
 *
 * Un projet est considéré "partiel" lorsque :
 *  - le score de similarité est manquant (null/undefined) ou vaut 0 (valeur par défaut),
 *  - et/ou la date de détection est absente.
 *
 * Ce helper est isolé dans un module dédié pour faciliter la réutilisation
 * (tests, futurs widgets, exports CSV…) et éviter la duplication de logique.
 */

export interface DataQualityInput {
  similitude_score?: number | string | null;
  date_detection?: string | Date | null;
}

export interface DataQualityResult {
  missingSimilarity: boolean;
  missingDate: boolean;
  isPartial: boolean;
}

export function getDataQuality(p: DataQualityInput | null | undefined): DataQualityResult {
  if (!p) {
    return { missingSimilarity: true, missingDate: true, isPartial: true };
  }

  const rawScore = p.similitude_score;
  const numericScore = rawScore == null ? NaN : Number(rawScore);
  const missingSimilarity = rawScore == null || Number.isNaN(numericScore) || numericScore === 0;
  const missingDate = !p.date_detection;

  return {
    missingSimilarity,
    missingDate,
    isPartial: missingSimilarity || missingDate,
  };
}
