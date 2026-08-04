import { describe, it, expect } from 'vitest';
import { urlCanonique, estPageArticle, titreNormalise, dedupParUrl } from './dedup';

describe('urlCanonique', () => {
  it('retire www, la barre finale, la requête et le fragment', () => {
    expect(urlCanonique('https://www.Fratmat.info/article/123/?utm=x#top')).toBe('fratmat.info/article/123');
  });
  it('rend null pour une URL invalide ou vide', () => {
    expect(urlCanonique(null)).toBeNull();
    expect(urlCanonique('pas une url')).toBeNull();
  });
  it('rapproche deux variantes du même article', () => {
    expect(urlCanonique('http://x.com/a/')).toBe(urlCanonique('https://www.x.com/a'));
  });
});

describe('estPageArticle', () => {
  it('rejette une page d’accueil', () => {
    expect(estPageArticle('https://telecom.gouv.ci')).toBe(false);
    expect(estPageArticle('https://telecom.gouv.ci/')).toBe(false);
  });
  it('accepte un lien d’article', () => {
    expect(estPageArticle('https://fratmat.info/article/telecoms-ansut')).toBe(true);
  });
});

describe('titreNormalise', () => {
  it('efface casse, accents et ponctuation', () => {
    expect(titreNormalise('L’ANSUT accélère !')).toBe('l ansut accelere');
  });
});

describe('dedupParUrl', () => {
  it('déduplique par URL canonique et compte les reprises', () => {
    const items = [
      { u: 'https://x.com/a', t: 'Titre A' },
      { u: 'https://www.x.com/a/', t: 'Autre libellé' }, // même URL
      { u: 'https://x.com/b', t: 'Titre B' },
    ];
    const { uniques, nbReprises } = dedupParUrl(items, (i) => i.u, (i) => i.t);
    expect(uniques).toHaveLength(2);
    expect(nbReprises).toBe(1);
  });
  it('déduplique par titre quand l’URL manque', () => {
    const items = [
      { u: null, t: 'Même titre' },
      { u: null, t: 'même  TITRE' },
    ];
    const { uniques, nbReprises } = dedupParUrl(items, (i) => i.u, (i) => i.t);
    expect(uniques).toHaveLength(1);
    expect(nbReprises).toBe(1);
  });
});
