import { describe, it, expect } from 'vitest';
import { qualifier, qualifierDepuisRow } from '@/lib/qualificationContenu';

/**
 * Étage 3 — parité LECTURE vs CALCUL : reconstruire une Qualification depuis une
 * ligne persistée (`qualifierDepuisRow`) doit donner EXACTEMENT le même objet que
 * `qualifier()` sur le contenu brut équivalent. Garantit qu'un écran qui LIT la
 * qualification voit la même chose qu'un écran qui la calcule.
 */

const NOW = Date.UTC(2026, 7, 8);

const CAS = [
  {
    nom: 'institutionnel + daté (voix ANSUT)',
    texte: 'Déploiement de la fibre optique : 300 localités raccordées au backbone',
    published: '2026-08-05T09:00:00.000Z',
    ansut: true,
  },
  {
    nom: 'voix externe datée',
    texte: 'Starlink lance ses offres de connectivité satellitaire en Côte d’Ivoire',
    published: '2026-08-01T09:00:00.000Z',
    ansut: false,
  },
  {
    nom: 'hors axes (communautaire)',
    texte: 'Félicitations à nos champions d’Ébimpé',
    published: '2026-08-07T09:00:00.000Z',
    ansut: true,
  },
  {
    nom: 'date absente',
    texte: 'Signature d’une convention sur l’identité numérique et le guichet unique',
    published: null,
    ansut: true,
  },
];

describe('qualifierDepuisRow — parité lecture vs calcul', () => {
  for (const c of CAS) {
    it(c.nom, () => {
      const calcule = qualifier(
        { texte: c.texte, published_at: c.published, collected_at: null, source_officielle_ansut: c.ansut },
        NOW,
      );
      // Ligne persistée équivalente (faits stables issus du calcul étage 2).
      const lu = qualifierDepuisRow(
        {
          editorial_date: c.published,
          category: calcule.categorie,
          secondary_themes: calcule.themes,
          is_institutional: calcule.estInstitutionnel,
          is_ansut_voice: calcule.estVoixAnsut,
        },
        NOW,
      );
      expect(lu).toEqual(calcule);
    });
  }
});
