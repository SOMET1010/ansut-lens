import { describe, it, expect } from 'vitest';
import { parseBulk, versPublication, dateValide, hashtagsDeTexte, csvVersEntrees, parseCSV, normaliserDate } from '@/lib/importManuel';

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

  it('parseCSV gère guillemets, virgules et retours à la ligne dans un champ', () => {
    const csv = 'plateforme,date,contenu\nlinkedin,2026-07-31,"Bravo, ANSUT\nligne 2"';
    const rows = parseCSV(csv);
    expect(rows).toHaveLength(2);
    expect(rows[1][2]).toBe('Bravo, ANSUT\nligne 2');
  });

  it('normaliserDate accepte ISO et JJ/MM/AAAA', () => {
    expect(normaliserDate('2026-07-31 00:00:00')).toBe('2026-07-31');
    expect(normaliserDate('31/07/2026')).toBe('2026-07-31');
    expect(normaliserDate('bidon')).toBe('');
  });

  it('csvVersEntrees mappe les colonnes de l’agent (date_publication_estimee, contenu, reactions_count)', () => {
    const csv = [
      'plateforme,date_publication_estimee,type_contenu,url_original,contenu,reactions_count,comments_count,shares_count,vues_count,hashtags',
      'linkedin,2026-07-31 00:00:00,carrousel / images,,"Notion #5 Inclusion Numérique",11,,1,,#ANSUT #InclusionNumérique',
      'linkedin,2026-07-30,image,,"Transformation digitale",5,,1,,',
    ].join('\n');
    const { entrees, erreurs } = csvVersEntrees(csv);
    expect(erreurs).toHaveLength(0);
    expect(entrees).toHaveLength(2);
    expect(entrees[0]).toMatchObject({ plateforme: 'linkedin', date: '2026-07-31', type: 'image', likes: 11, shares: 1 });
    expect(entrees[0].texte).toContain('#ANSUT');
    expect(entrees[0].comments).toBeNull();
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
