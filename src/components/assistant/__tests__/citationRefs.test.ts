import { describe, it, expect } from 'vitest';
import { collectCitations, extractNumericReferenceUrls } from '../citationRefs';

/**
 * Non-regression tests for the PDF/DOCX export citation pipeline.
 *
 * Both export paths in DocumentWorkspace.tsx rely on `collectCitations` to
 * decide whether a badge gets a clickable hyperlink ("Sources référencées")
 * or a non-clickable "lien manquant" note. These tests lock that contract:
 *   - broken refs MUST have `url === null`
 *   - valid refs MUST carry a usable http(s) URL
 *   - ACTU/DOSSIER refs always resolve to the in-app URL
 */
describe('citationRefs — export contract', () => {
  it('marks numeric references without an associated URL as broken (url=null)', () => {
    const content = 'Texte avec une citation orpheline [7]. Pas de source listée.';
    const refs = collectCitations(content);
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatchObject({ kind: 'num', num: '7', url: null });
  });

  it('binds numeric references to their URL when present in the body', () => {
    const content = [
      'Voir [1] pour plus de détails.',
      '',
      '[1] https://example.com/article',
    ].join('\n');
    const refs = collectCitations(content);
    const ref1 = refs.find((r) => r.kind === 'num' && r.num === '1');
    expect(ref1).toBeDefined();
    expect(ref1).toMatchObject({ kind: 'num', url: 'https://example.com/article' });
  });

  it('always assigns a URL to ACTU and DOSSIER badges', () => {
    const content =
      'Cf [[ACTU:abc-123|Titre actu]] et [[DOSSIER:xyz-9|Dossier ANSUT]].';
    const refs = collectCitations(content);
    const actu = refs.find((r) => r.kind === 'actu');
    const dossier = refs.find((r) => r.kind === 'dossier');
    expect(actu?.url).toMatch(/^https?:\/\/.+abc-123/);
    expect(dossier?.url).toMatch(/^https?:\/\/.+xyz-9/);
  });

  it('separates broken from valid references in a mixed document', () => {
    const content = [
      'Premier point [1], second point [2], troisième [3].',
      '',
      'Sources :',
      '[1] https://a.example.com',
      '[3]: https://c.example.com',
    ].join('\n');
    const refs = collectCitations(content).filter((r) => r.kind === 'num');
    const broken = refs.filter((r) => r.url === null);
    const valid = refs.filter((r) => r.url !== null);
    expect(valid.map((r: any) => r.num).sort()).toEqual(['1', '3']);
    expect(broken.map((r: any) => r.num)).toEqual(['2']);
  });

  it('deduplicates badges so each ref produces a single export entry', () => {
    const content = 'Répété [1] [1] [1] et [[ACTU:a|x]] [[ACTU:a|x]].';
    const refs = collectCitations(content);
    expect(refs.filter((r) => r.kind === 'num' && r.num === '1')).toHaveLength(1);
    expect(refs.filter((r) => r.kind === 'actu')).toHaveLength(1);
  });

  it('extractNumericReferenceUrls covers common citation formats', () => {
    const content = [
      '[1] https://one.example.com',
      '2. https://two.example.com',
      'Réf 3: https://three.example.com',
      'Voir [4] https://four.example.com',
    ].join('\n');
    const map = extractNumericReferenceUrls(content);
    expect(map['1']).toBe('https://one.example.com');
    expect(map['2']).toBe('https://two.example.com');
    expect(map['3']).toBe('https://three.example.com');
    expect(map['4']).toBe('https://four.example.com');
  });
});
