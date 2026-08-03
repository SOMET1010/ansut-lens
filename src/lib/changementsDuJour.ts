/**
 * « Ce qui change aujourd'hui » — l'essentiel depuis hier, en un coup d'œil.
 *
 * La page s'appelle « Ce matin » : elle doit répondre immédiatement à « qu'est-ce
 * qui est nouveau depuis hier ? ». Ce module compare les dernières 24 h aux 24 h
 * précédentes et produit quelques phrases synthétiques (hausse/baisse d'un thème
 * dans la veille, nouvelle prise de parole ANSUT ou absence, mention négative).
 *
 * Analyse de communication, pas de pilotage : on observe des variations, on ne
 * mesure pas de performance. Tout est calculé sur la date de publication réelle.
 */

import type { Actualite } from '@/types';
import type { PublicationAnsut } from '@/hooks/useAnsutPublications';
import { MISSIONS_STRATEGIQUES } from '@/config/missions';
import { piliersDeLActu } from '@/lib/missions';

const JOUR_MS = 24 * 3600 * 1000;
const SEUIL_NEGATIF = -0.2;

export type SensChangement = 'hausse' | 'baisse' | 'emergent' | 'disparu' | 'ansut' | 'negatif' | 'calme';

export interface ChangementDuJour {
  sens: SensChangement;
  texte: string;
}

function dateMs(d: string | null | undefined): number | null {
  if (!d) return null;
  const ms = new Date(d).getTime();
  return Number.isNaN(ms) ? null : ms;
}

/** Comptage par pilier des actualités externes dont la date tombe dans [debut, fin[. */
function comptesVeille(externes: Actualite[], debut: number, fin: number): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of externes ?? []) {
    const ms = dateMs(a.date_publication);
    if (ms === null || ms < debut || ms >= fin) continue;
    for (const id of piliersDeLActu(a)) m.set(id, (m.get(id) ?? 0) + 1);
  }
  return m;
}

export function changementsDuJour(
  externes: Actualite[],
  publications: PublicationAnsut[],
  maintenantMs: number,
): ChangementDuJour[] {
  const j0 = maintenantMs - JOUR_MS; // début des dernières 24 h
  const j1 = maintenantMs - 2 * JOUR_MS; // début des 24 h précédentes

  const aujourd = comptesVeille(externes, j0, maintenantMs);
  const hier = comptesVeille(externes, j1, j0);

  // Variations de thèmes dans la veille externe.
  const variations = MISSIONS_STRATEGIQUES.map((mission) => {
    const apres = aujourd.get(mission.id) ?? 0;
    const avant = hier.get(mission.id) ?? 0;
    return { mission, apres, avant, delta: apres - avant };
  }).filter((v) => v.apres !== v.avant);

  const changements: ChangementDuJour[] = [];

  // Émergences et hausses d'abord (par ampleur), puis baisses/disparitions.
  const hausses = variations
    .filter((v) => v.delta > 0)
    .sort((a, b) => b.delta - a.delta);
  const baisses = variations
    .filter((v) => v.delta < 0)
    .sort((a, b) => a.delta - b.delta);

  for (const v of hausses.slice(0, 3)) {
    if (v.avant === 0) {
      changements.push({
        sens: 'emergent',
        texte: `« ${v.mission.nomCourt} » apparaît dans la veille aujourd'hui (${v.apres} contenu${v.apres > 1 ? 's' : ''}).`,
      });
    } else {
      changements.push({
        sens: 'hausse',
        texte: `Hausse sur « ${v.mission.nomCourt} » (+${v.delta} contenu${v.delta > 1 ? 's' : ''} aujourd'hui).`,
      });
    }
  }
  for (const v of baisses.slice(0, 2)) {
    if (v.apres === 0) {
      changements.push({
        sens: 'disparu',
        texte: `« ${v.mission.nomCourt} » n'apparaît plus dans la veille aujourd'hui.`,
      });
    } else {
      changements.push({
        sens: 'baisse',
        texte: `Baisse sur « ${v.mission.nomCourt} » (${v.delta} contenu${v.delta < -1 ? 's' : ''} aujourd'hui).`,
      });
    }
  }

  // Prise de parole ANSUT aujourd'hui (date de publication réelle).
  const ansutAujourdhui = (publications ?? []).filter((p) => {
    const ms = dateMs(p.date_publication);
    return ms !== null && ms >= j0 && ms <= maintenantMs;
  }).length;
  changements.push(
    ansutAujourdhui > 0
      ? {
          sens: 'ansut',
          texte: `${ansutAujourdhui} nouvelle${ansutAujourdhui > 1 ? 's' : ''} prise${ansutAujourdhui > 1 ? 's' : ''} de parole ANSUT aujourd'hui.`,
        }
      : { sens: 'ansut', texte: `Aucun nouveau communiqué ANSUT aujourd'hui.` },
  );

  // Mentions négatives détectées aujourd'hui.
  const negatifs = (externes ?? []).filter((a) => {
    const ms = dateMs(a.date_publication);
    return (
      ms !== null &&
      ms >= j0 &&
      typeof a.sentiment === 'number' &&
      a.sentiment < SEUIL_NEGATIF
    );
  }).length;
  if (negatifs > 0) {
    changements.push({
      sens: 'negatif',
      texte: `${negatifs} mention${negatifs > 1 ? 's' : ''} négative${negatifs > 1 ? 's' : ''} détectée${negatifs > 1 ? 's' : ''} aujourd'hui.`,
    });
  }

  return changements;
}
