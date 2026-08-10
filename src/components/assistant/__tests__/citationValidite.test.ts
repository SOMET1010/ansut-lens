import { describe, it, expect } from 'vitest';
import {
  cleCitation,
  construireClesInvalides,
  extraireSources,
} from '../citationValidite';

/**
 * Garde crédibilité de l'assistant : une citation hallucinée (id absente du
 * contexte) ne doit jamais être présentée comme une source valide. Ces tests
 * verrouillent la logique qui alimente le rendu (`MessageContent`, `ChatMessage`).
 */

describe('cleCitation', () => {
  it('compose une clé stable type:id', () => {
    expect(cleCitation('ACTU', 'abc-123')).toBe('ACTU:abc-123');
    expect(cleCitation('DOSSIER', 'x9')).toBe('DOSSIER:x9');
  });
});

describe('construireClesInvalides', () => {
  it('construit l’ensemble des clés depuis les citations signalées', () => {
    const set = construireClesInvalides([
      { type: 'ACTU', id: 'a1' },
      { type: 'DOSSIER', id: 'd2' },
    ]);
    expect(set.has('ACTU:a1')).toBe(true);
    expect(set.has('DOSSIER:d2')).toBe(true);
    expect(set.size).toBe(2);
  });

  it('ignore les entrées incomplètes ou de type inconnu', () => {
    const set = construireClesInvalides([
      { type: 'ACTU' }, // pas d'id
      { id: 'orphelin' }, // pas de type
      { type: 'AUTRE', id: 'z' } as unknown as { type: string; id: string },
    ]);
    expect(set.size).toBe(0);
  });

  it('tolère null / undefined', () => {
    expect(construireClesInvalides(null).size).toBe(0);
    expect(construireClesInvalides(undefined).size).toBe(0);
  });
});

describe('extraireSources', () => {
  const contenu =
    'Selon [[ACTU:a1f0-9|La 5G avance]] et [[DOSSIER:d33f|Note ANSUT]], le sujet progresse. Répété [[ACTU:a1f0-9|La 5G avance]].';

  it('extrait et déduplique les sources par (type, id) en conservant l’ordre', () => {
    const s = extraireSources(contenu);
    expect(s).toHaveLength(2);
    expect(s[0]).toMatchObject({ type: 'ACTU', id: 'a1f0-9', titre: 'La 5G avance', invalide: false });
    expect(s[1]).toMatchObject({ type: 'DOSSIER', id: 'd33f', titre: 'Note ANSUT', invalide: false });
  });

  it('marque invalide toute citation dont la clé est dans l’ensemble signalé', () => {
    const invalides = construireClesInvalides([{ type: 'ACTU', id: 'a1f0-9' }]);
    const s = extraireSources(contenu, invalides);
    expect(s.find((x) => x.id === 'a1f0-9')!.invalide).toBe(true);
    expect(s.find((x) => x.id === 'd33f')!.invalide).toBe(false);
  });

  it('n’extrait pas les marqueurs à id non hex (jamais rendus comme citations)', () => {
    // « xyz » n'est pas une id hex/UUID → non traité comme citation.
    expect(extraireSources('Faux [[ACTU:xyz|bidon]].')).toEqual([]);
  });

  it('renvoie vide pour un contenu sans citation', () => {
    expect(extraireSources('Texte simple, aucune source.')).toEqual([]);
    expect(extraireSources('')).toEqual([]);
  });
});
