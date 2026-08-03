import { describe, it, expect } from 'vitest';
import { parseBulk, versPublication, dateValide, hashtagsDeTexte } from '@/lib/importManuel';

describe('import manuel', () => {
  it('valide les dates ISO non futures', () => {
    expect(dateValide('2026-04-08')).toBe(true);
    expect(dateValide('08/04/2026')).toBe(false);
    expect(dateValide('2999-01-01')).toBe(false);
  });

  it('extrait les hashtags réels', () => {
    expect(hashtagsDeTexte('Bravo #ANSUT et #NumériquePourTous !')).toEqual(['ANSUT', 'NumériquePourTous']);
  });

  it('parse un collage en vrac et signale les erreurs', () => {
    const texte = [
      'facebook | 2026-07-20 | post | https://fb.com/p/1 | Transformation digitale #ANSUT | 12 | 2 | 5 | 300',
      'linkedin | 2026-07-19 | article | https://linkedin.com/p/2 | Accès numérique',
      'tiktok | 2026-07-18 | post | url | texte',            // plateforme non gérée
      'facebook | 20/07/2026 | post | url | texte',           // date invalide
    ].join('\n');
    const { entrees, erreurs } = parseBulk(texte);
    expect(entrees).toHaveLength(2);
    expect(erreurs).toHaveLength(2);
    expect(entrees[0]).toMatchObject({ plateforme: 'facebook', likes: 12, comments: 2, shares: 5, vues: 300 });
    expect(entrees[1].likes).toBeNull();
  });

  it('construit une publication honnête (date vérifiée, métriques optionnelles)', () => {
    const pub = versPublication({
      plateforme: 'facebook', date: '2026-07-20', type: 'post',
      url: 'https://fb.com/p/1', texte: 'Bonjour #ANSUT', likes: 12, comments: null, shares: null, vues: null,
    });
    expect(pub.publication_date_verified).toBe(true);
    expect(pub.publication_date_source).toBe('absolute_source');
    expect(pub.date_publication).toContain('2026-07-20');
    expect(pub.likes_count).toBe(12);
    expect(pub.comments_count).toBeNull();
    expect(pub.hashtags).toContain('ANSUT');
  });
});
