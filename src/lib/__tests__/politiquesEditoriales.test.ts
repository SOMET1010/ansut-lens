import { describe, it, expect } from 'vitest';
import {
  deriverEligibilites,
  dansFenetre,
  faitsDepuisRow,
  VERSION_POLITIQUES,
} from '@/lib/politiquesEditoriales';
import { qualifier } from '@/lib/qualificationContenu';

const NOW = Date.UTC(2026, 7, 8); // 2026-08-08
const JOUR = 24 * 3600 * 1000;

describe('politiquesEditoriales — dérivation des éligibilités', () => {
  it('date vérifiée : âge et éligibilités correctes', () => {
    const e = deriverEligibilites(
      { editorialDateMs: NOW - 3 * JOUR, estInstitutionnel: true, estVoixAnsut: true },
      NOW,
    );
    expect(e.dateVerifiee).toBe(true);
    expect(e.ageJours).toBeCloseTo(3, 6);
    expect(e.eligibleProfilStrategique).toBe(true); // institutionnel + daté
    expect(e.eligibleVeilleExterne).toBe(false); // voix ANSUT → pas veille externe
  });

  it('voix externe datée : éligible veille externe, pas profil', () => {
    const e = deriverEligibilites(
      { editorialDateMs: NOW - JOUR, estInstitutionnel: false, estVoixAnsut: false },
      NOW,
    );
    expect(e.eligibleVeilleExterne).toBe(true);
    expect(e.eligibleProfilStrategique).toBe(false);
  });

  it('date absente : rien n’est vérifié ni éligible', () => {
    const e = deriverEligibilites(
      { editorialDateMs: null, estInstitutionnel: true, estVoixAnsut: false },
      NOW,
    );
    expect(e.dateVerifiee).toBe(false);
    expect(e.ageJours).toBeNull();
    expect(e.eligibleProfilStrategique).toBe(false);
    expect(e.eligibleVeilleExterne).toBe(false);
  });

  it('date future : traitée comme non vérifiée (jamais d’âge négatif)', () => {
    const e = deriverEligibilites(
      { editorialDateMs: NOW + 5 * JOUR, estInstitutionnel: true, estVoixAnsut: false },
      NOW,
    );
    expect(e.dateVerifiee).toBe(false);
    expect(e.ageJours).toBeNull();
  });

  it('fenêtre glissante : bornes incluses, null exclu', () => {
    expect(dansFenetre(0, 7)).toBe(true);
    expect(dansFenetre(7, 7)).toBe(true);
    expect(dansFenetre(7.001, 7)).toBe(false);
    expect(dansFenetre(null, 7)).toBe(false);
  });

  it('version des politiques exposée', () => {
    expect(VERSION_POLITIQUES).toBeGreaterThanOrEqual(1);
  });
});

describe('parité calculé (qualifier) vs lu (faitsDepuisRow)', () => {
  it('dériver depuis une ligne persistée == éligibilités de qualifier()', () => {
    const publishedAt = '2026-08-05T09:00:00.000Z';
    // Chemin CALCULÉ : qualifier() sur le contenu brut.
    const q = qualifier(
      {
        texte: 'Déploiement de la fibre optique : 300 localités raccordées au backbone',
        published_at: publishedAt,
        collected_at: null,
        source_officielle_ansut: true,
      },
      NOW,
    );
    // Chemin LU : la ligne editorial_qualifications correspondante.
    const eligLu = deriverEligibilites(
      faitsDepuisRow({
        editorial_date: publishedAt,
        is_institutional: q.estInstitutionnel,
        is_ansut_voice: q.estVoixAnsut,
      }),
      NOW,
    );
    expect(eligLu.dateVerifiee).toBe(q.dateVerifiee);
    expect(eligLu.ageJours).toBe(q.ageJours);
    expect(eligLu.eligibleProfilStrategique).toBe(q.eligibleProfilStrategique);
    expect(eligLu.eligibleVeilleExterne).toBe(q.eligibleVeilleExterne);
  });
});
