import { describe, it, expect } from 'vitest';
import { analyserUrlCompte, nettoyerNomAffiche } from '@/lib/comptesSociaux';

describe('analyserUrlCompte', () => {
  const cas: [string, string, string][] = [
    ['https://www.facebook.com/ANSUT.CI', 'facebook', 'ANSUT.CI'],
    ['facebook.com/ANSUT.CI/', 'facebook', 'ANSUT.CI'],
    ['https://www.linkedin.com/company/ansut/', 'linkedin', 'ansut'],
    ['https://x.com/ANSUT_CI', 'x', 'ANSUT_CI'],
    ['https://twitter.com/@ANSUT_CI', 'x', 'ANSUT_CI'],
    ['https://www.youtube.com/@ANSUTCotedivoire', 'youtube', 'ANSUTCotedivoire'],
    ['https://www.youtube.com/channel/UC12345', 'youtube', 'UC12345'],
    ['https://www.instagram.com/ansut.ci?hl=fr', 'instagram', 'ansut.ci'],
    ['https://www.tiktok.com/@ansut', 'tiktok', 'ansut'],
    ['https://t.me/ansutci', 'telegram', 'ansutci'],
  ];

  it.each(cas)('%s → %s / %s', (url, plateforme, identifiant) => {
    const r = analyserUrlCompte(url);
    expect(r.valide).toBe(true);
    expect(r.plateforme).toBe(plateforme);
    expect(r.identifiant).toBe(identifiant);
    expect(r.urlProfil).toMatch(/^https?:\/\//);
  });

  it('Facebook profile.php conserve l’id', () => {
    const r = analyserUrlCompte('https://www.facebook.com/profile.php?id=100064');
    expect(r.valide).toBe(true);
    expect(r.identifiant).toBe('100064');
    expect(r.urlProfil).toContain('id=100064');
  });

  it('URL vide ou illisible → invalide avec raison', () => {
    expect(analyserUrlCompte('').valide).toBe(false);
    expect(analyserUrlCompte('pas une url du tout $$').raison).toBeTruthy();
  });

  it('domaine inconnu → site web exploitable', () => {
    const r = analyserUrlCompte('https://www.ansut.ci/actualites');
    expect(r.valide).toBe(true);
    expect(r.plateforme).toBe('website');
  });

  it('nettoyerNomAffiche retire les suffixes de plateforme', () => {
    expect(nettoyerNomAffiche('ANSUT | Facebook')).toBe('ANSUT');
    expect(nettoyerNomAffiche('ANSUT Côte d’Ivoire - YouTube')).toBe('ANSUT Côte d’Ivoire');
  });
});
