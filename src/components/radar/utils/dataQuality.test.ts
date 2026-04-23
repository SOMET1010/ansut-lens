import { describe, it, expect } from 'vitest';
import { getDataQuality } from './dataQuality';

describe('getDataQuality', () => {
  it('considère un projet complet quand similitude_score > 0 et date_detection est définie', () => {
    const result = getDataQuality({
      similitude_score: 75,
      date_detection: '2025-01-15T10:00:00Z',
    });
    expect(result).toEqual({
      missingSimilarity: false,
      missingDate: false,
      isPartial: false,
    });
  });

  it('marque comme partiel quand similitude_score vaut 0 (valeur par défaut)', () => {
    const result = getDataQuality({
      similitude_score: 0,
      date_detection: '2025-01-15T10:00:00Z',
    });
    expect(result.missingSimilarity).toBe(true);
    expect(result.missingDate).toBe(false);
    expect(result.isPartial).toBe(true);
  });

  it('marque comme partiel quand similitude_score est null', () => {
    const result = getDataQuality({
      similitude_score: null,
      date_detection: '2025-01-15T10:00:00Z',
    });
    expect(result.missingSimilarity).toBe(true);
    expect(result.isPartial).toBe(true);
  });

  it('marque comme partiel quand similitude_score est undefined', () => {
    const result = getDataQuality({
      date_detection: '2025-01-15T10:00:00Z',
    });
    expect(result.missingSimilarity).toBe(true);
    expect(result.isPartial).toBe(true);
  });

  it('marque comme partiel quand date_detection est absente', () => {
    const result = getDataQuality({
      similitude_score: 80,
      date_detection: null,
    });
    expect(result.missingSimilarity).toBe(false);
    expect(result.missingDate).toBe(true);
    expect(result.isPartial).toBe(true);
  });

  it('marque comme partiel quand les deux champs sont absents', () => {
    const result = getDataQuality({
      similitude_score: null,
      date_detection: null,
    });
    expect(result.missingSimilarity).toBe(true);
    expect(result.missingDate).toBe(true);
    expect(result.isPartial).toBe(true);
  });

  it('accepte un score sous forme de chaîne ("0" → manquant)', () => {
    const result = getDataQuality({
      similitude_score: '0' as any,
      date_detection: '2025-01-15T10:00:00Z',
    });
    expect(result.missingSimilarity).toBe(true);
  });

  it('accepte un score sous forme de chaîne ("65" → présent)', () => {
    const result = getDataQuality({
      similitude_score: '65' as any,
      date_detection: '2025-01-15T10:00:00Z',
    });
    expect(result.missingSimilarity).toBe(false);
    expect(result.isPartial).toBe(false);
  });

  it('gère un input null/undefined sans planter (tout est partiel)', () => {
    expect(getDataQuality(null)).toEqual({
      missingSimilarity: true,
      missingDate: true,
      isPartial: true,
    });
    expect(getDataQuality(undefined)).toEqual({
      missingSimilarity: true,
      missingDate: true,
      isPartial: true,
    });
  });

  it('considère une chaîne vide pour date_detection comme manquante', () => {
    const result = getDataQuality({
      similitude_score: 70,
      date_detection: '',
    });
    expect(result.missingDate).toBe(true);
    expect(result.isPartial).toBe(true);
  });
});
