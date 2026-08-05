import { describe, it, expect } from 'vitest';
import { documentsProbants } from '@/lib/preuve';
import type { Actualite } from '@/types';

/**
 * Filet de régression sur `documentsProbants` : la fonction qui construit les
 * PREUVES affichées (La Matinale, carte-sujet). La Charte exige un compteur
 * reproductible — une même URL ne doit jamais gonfler le total, une page
 * d'accueil ne prouve rien, une source non nommée n'est pas attribuable.
 * (Audit de santé P1 #15.)
 */
function art(p: Partial<Actualite>): Actualite {
  return {
    titre: 'Titre',
    source_nom: 'Presse X',
    source_url: 'https://exemple.ci/article/1',
    date_publication: '2026-08-01T08:00:00Z',
    ...p,
  } as Actualite;
}

describe('documentsProbants', () => {
  it('déduplique les articles par URL (la reprise est écartée, pas comptée)', () => {
    const r = documentsProbants({
      publications: [],
      articles: [
        art({ source_url: 'https://exemple.ci/article/1' }),
        art({ source_url: 'https://exemple.ci/article/1' }),
      ],
    });
    expect(r.documents).toHaveLength(1);
    expect(r.nbReprises).toBe(1);
  });

  it("rejette les pages d'accueil (URL réduite au domaine)", () => {
    const r = documentsProbants({
      publications: [],
      articles: [art({ source_url: 'https://exemple.ci/' })],
    });
    expect(r.documents).toHaveLength(0);
  });

  it('exclut les articles sans source nommée', () => {
    const r = documentsProbants({
      publications: [],
      articles: [art({ source_nom: null, source_url: 'https://exemple.ci/article/2' })],
    });
    expect(r.documents).toHaveLength(0);
  });

  it('conserve deux articles distincts de la même source', () => {
    const r = documentsProbants({
      publications: [],
      articles: [
        art({ source_url: 'https://exemple.ci/article/1', titre: 'A' }),
        art({ source_url: 'https://exemple.ci/article/2', titre: 'B' }),
      ],
    });
    expect(r.documents).toHaveLength(2);
    expect(r.nbReprises).toBe(0);
  });
});
