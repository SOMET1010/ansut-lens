import { describe, it, expect } from 'vitest';
import { categoriserCommunication, qualifier } from '@/lib/qualificationContenu';
import { piliersPourTexte } from '@/lib/missions';
import {
  categoriser as categoriserPortable,
  piliersDeTexte as piliersPortable,
  qualifierContenu,
} from '../../../supabase/functions/_shared/qualification';

/**
 * Parité étage 2 : le qualifieur PORTABLE (Deno, généré) doit produire EXACTEMENT
 * les mêmes catégories, thèmes et faits que le qualifieur frontend canonique.
 * Si ce test échoue, régénérer : `node scripts/gen-etage2-shared.mjs`.
 */

// Batterie incluant des pièges de sous-chaîne (frontière de mot) et les ajouts
// récents (IA / blockchain / big data en P3).
const BATTERIE = [
  'GITEX 2026 : l’ANSUT au rendez-vous africain de la tech',
  'Plongez dans l’excitation du football avec Digital Fanzone',
  'Félicitations à nos champions d’Ébimpé',
  'Déploiement de la fibre optique : 300 localités raccordées au backbone',
  'Signature d’une convention sur l’identité numérique et le guichet unique',
  'Formation Digital Literacy à l’intelligence artificielle, la blockchain et la big data',
  'Téléchargez l’application, jeu concours à gagner',
  'Rapport d’audit sur la gouvernance et la mobilisation des ressources',
  'Sensibilisation des citoyens et de la communauté au numérique',
  'Starlink lance ses offres de connectivité satellitaire en Côte d’Ivoire',
  'un reportage média sur la ville', // "média" ne doit PAS apparier "ia"
  'accès gratuit pour tous',          // "gratuit" ne doit PAS apparier "uit"
  '',
  'texte sans aucun marqueur pertinent',
];

describe('parité qualifieur portable vs frontend', () => {
  it('catégorise à l’identique', () => {
    for (const s of BATTERIE) {
      expect(categoriserPortable(s), `catégorie: ${s}`).toBe(categoriserCommunication(s));
    }
  });

  it('rattache les mêmes piliers (ordre inclus)', () => {
    for (const s of BATTERIE) {
      expect(piliersPortable(s).ids, `piliers: ${s}`).toEqual(piliersPourTexte(s));
    }
  });

  it('produit les mêmes faits (catégorie, thèmes, institutionnel)', () => {
    const nowMs = Date.UTC(2026, 7, 3);
    const publishedAt = '2026-07-20T10:00:00.000Z';
    for (const s of BATTERIE) {
      const front = qualifier(
        { texte: s, published_at: publishedAt, collected_at: null, source_officielle_ansut: true },
        nowMs,
      );
      const portable = qualifierContenu({
        texte: s,
        publishedAt,
        dateVerified: true,
        dateSource: 'platform_metadata',
        isAnsutVoice: true,
        nowMs,
      });
      expect(portable.category, `cat ${s}`).toBe(front.categorie);
      expect(portable.secondary_themes, `themes ${s}`).toEqual(front.themes);
      expect(portable.is_institutional, `inst ${s}`).toBe(front.estInstitutionnel);
      expect(portable.editorial_date).toBe(publishedAt);
      expect(portable.date_verified).toBe(true);
    }
  });

  it('détecte bien le pilier P3 pour l’IA/blockchain (ajout PR #21)', () => {
    const s = 'programme de formation à l’intelligence artificielle et la blockchain';
    expect(piliersPortable(s).ids).toContain('usages-competences');
  });
});
