import { describe, it, expect } from 'vitest';
import {
  filtrerIds,
  contientInjonction,
  validerConseil,
} from '../../../supabase/functions/_shared/conseiller';

/**
 * Gardes charte du Conseiller IA (Étage 4). Ces tests protègent le contrat
 * PIPELINE_EDITORIAL.md §7 côté serveur : l'IA ne cite que des preuves fournies,
 * et n'émet JAMAIS d'injonction (« explique, ne décide pas »). Un conseil qui
 * viole l'un ou l'autre est rejeté → le front retombe sur le conseil déterministe.
 */

describe('filtrerIds — liste blanche des preuves', () => {
  const ref = new Set(['a', 'b', 'c']);

  it('ne conserve que les identifiants réellement fournis', () => {
    expect(filtrerIds(['a', 'x', 'c'], ref)).toEqual(['a', 'c']);
  });

  it('rejette tout quand aucun id ne correspond', () => {
    expect(filtrerIds(['x', 'y'], ref)).toEqual([]);
  });

  it('tolère les entrées non-tableau', () => {
    expect(filtrerIds(undefined, ref)).toEqual([]);
    expect(filtrerIds('a', ref)).toEqual([]);
    expect(filtrerIds(null, ref)).toEqual([]);
  });

  it('normalise les identifiants numériques en chaînes', () => {
    expect(filtrerIds([1, 2], new Set(['1']))).toEqual(['1']);
  });
});

describe('contientInjonction — « explique, ne décide pas »', () => {
  const injonctions = [
    'Il faut publier sur ce thème.',
    'L’ANSUT devrait communiquer rapidement.',
    'Vous devriez prendre la parole.',
    'Il est recommandé de réagir.', // avec accents → doit matcher après normalisation
    'Il est impératif d’occuper le terrain.',
    'Publiez dès aujourd’hui.',
    'Nous recommandons une prise de parole.',
  ];
  for (const t of injonctions) {
    it(`détecte l'injonction : « ${t} »`, () => {
      expect(contientInjonction(t)).toBe(true);
    });
  }

  const descriptions = [
    'L’écosystème parle de la fibre du Nord ; l’ANSUT n’a pas publié sur ce thème.',
    'Trois médias couvrent le sujet sous l’angle de l’inclusion numérique.',
    'Le terrain éditorial est aujourd’hui vacant sur la connectivité rurale.',
  ];
  for (const t of descriptions) {
    it(`laisse passer la description : « ${t} »`, () => {
      expect(contientInjonction(t)).toBe(false);
    });
  }
});

describe('validerConseil — contrat complet', () => {
  const ids = new Set(['a1', 'a2', 'a3']);

  it('accepte un conseil descriptif borné aux preuves', () => {
    const out = validerConseil(
      {
        texte: 'L’écosystème parle de la fibre ; l’ANSUT reste silencieuse.',
        evidence_ids: ['a1', 'zzz', 'a3'],
        limitations: '  peu de sources  ',
      },
      ids,
    );
    expect(out).not.toBeNull();
    expect(out!.evidence_ids).toEqual(['a1', 'a3']); // id inventé retiré
    expect(out!.limitations).toBe('peu de sources'); // trim
  });

  it('rejette (null) un conseil contenant une injonction', () => {
    expect(
      validerConseil({ texte: 'Il faut publier maintenant.', evidence_ids: ['a1'] }, ids),
    ).toBeNull();
  });

  it('rejette (null) un texte vide', () => {
    expect(validerConseil({ texte: '   ', evidence_ids: ['a1'] }, ids)).toBeNull();
  });

  it('rejette (null) un conseil sans preuve valide (non traçable)', () => {
    expect(
      validerConseil({ texte: 'Description honnête du terrain.', evidence_ids: ['zzz'] }, ids),
    ).toBeNull();
  });
});
