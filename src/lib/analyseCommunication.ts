/**
 * Analyse IA — communication ANSUT vs écosystème (couche 3 de RADAR).
 *
 * RADAR est un outil de veille et d'analyse de COMMUNICATION, pas un cockpit de
 * pilotage. Cette couche ne mesure pas des KPI et ne pilote rien : elle COMPARE
 * deux signaux — ce que l'ANSUT met en avant (sa communication) et ce dont parle
 * l'écosystème (la veille externe) — pour en tirer des observations utiles à la
 * Direction de la Communication :
 *   - convergences (on parle des mêmes sujets) ;
 *   - opportunités (l'écosystème parle d'un sujet que l'ANSUT ne porte pas encore) ;
 *   - écho faible (l'ANSUT communique, mais l'écosystème reprend peu) ;
 *   - risque réputationnel (sujet à tonalité négative dans l'écosystème).
 *
 * L'IA/le moteur observe, compare, explique — il ne décide pas. Les thèmes
 * servent seulement à classer (contexte), jamais à mesurer une performance.
 * Chaque observation est explicable (volumes réels des deux côtés).
 */

import type { Actualite } from '@/types';
import type { PublicationAnsut } from '@/hooks/useAnsutPublications';
import { MISSIONS_STRATEGIQUES } from '@/config/missions';
import { piliersDeLActu, piliersPourTexte } from '@/lib/missions';

export type TypeSignalCom =
  | 'opportunite'
  | 'convergence'
  | 'echo-faible'
  | 'risque';

export interface SignalCommunication {
  pilierId: string;
  code: string;
  nom: string;
  type: TypeSignalCom;
  /** Nombre de communications ANSUT récentes touchant ce thème. */
  poidsAnsut: number;
  /** Nombre d'informations de l'écosystème touchant ce thème. */
  poidsEcosysteme: number;
  /** Nombre d'informations externes à tonalité négative sur ce thème. */
  negatifsEcosysteme: number;
  /** Phrase d'observation, factuelle et explicable. */
  observation: string;
}

/** Seuil de sentiment en dessous duquel une information est jugée négative. */
const SEUIL_NEGATIF = -0.2;

function compterAnsut(publications: PublicationAnsut[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const pub of publications ?? []) {
    for (const id of piliersPourTexte(pub.contenu ?? '')) {
      m.set(id, (m.get(id) ?? 0) + 1);
    }
  }
  return m;
}

function compterEcosysteme(
  externes: Actualite[],
): { total: Map<string, number>; negatifs: Map<string, number> } {
  const total = new Map<string, number>();
  const negatifs = new Map<string, number>();
  for (const a of externes ?? []) {
    const estNegatif = typeof a.sentiment === 'number' && a.sentiment < SEUIL_NEGATIF;
    for (const id of piliersDeLActu(a)) {
      total.set(id, (total.get(id) ?? 0) + 1);
      if (estNegatif) negatifs.set(id, (negatifs.get(id) ?? 0) + 1);
    }
  }
  return { total, negatifs };
}

/**
 * Produit les observations « communication vs écosystème » par thème. On ne
 * remonte que les thèmes qui portent un signal (présents d'un côté au moins), et
 * on classe les observations par valeur pour la communication : d'abord les
 * risques, puis les opportunités, puis les convergences, puis l'écho faible.
 */
export function analyserCommunication(
  publications: PublicationAnsut[],
  externes: Actualite[],
): SignalCommunication[] {
  const ansut = compterAnsut(publications);
  const { total: eco, negatifs } = compterEcosysteme(externes);

  const signaux: SignalCommunication[] = [];

  for (const mission of MISSIONS_STRATEGIQUES) {
    const poidsAnsut = ansut.get(mission.id) ?? 0;
    const poidsEcosysteme = eco.get(mission.id) ?? 0;
    const negatifsEcosysteme = negatifs.get(mission.id) ?? 0;
    if (poidsAnsut === 0 && poidsEcosysteme === 0) continue;

    let type: TypeSignalCom;
    let observation: string;

    if (negatifsEcosysteme > 0) {
      type = 'risque';
      observation = `${negatifsEcosysteme} information${negatifsEcosysteme > 1 ? 's' : ''} à tonalité négative dans l'écosystème sur « ${mission.nom} » — à surveiller pour la réputation.`;
    } else if (poidsEcosysteme > 0 && poidsAnsut === 0) {
      type = 'opportunite';
      observation = `L'écosystème parle de « ${mission.nom} » (${poidsEcosysteme} info${poidsEcosysteme > 1 ? 's' : ''}), mais l'ANSUT ne communique pas encore sur ce thème — opportunité de communication.`;
    } else if (poidsAnsut > 0 && poidsEcosysteme === 0) {
      type = 'echo-faible';
      observation = `L'ANSUT communique sur « ${mission.nom} », mais l'écosystème le reprend peu (aucune info externe récente).`;
    } else {
      type = 'convergence';
      observation = `Convergence sur « ${mission.nom} » : communication ANSUT (${poidsAnsut}) et écosystème (${poidsEcosysteme}) parlent du même thème.`;
    }

    signaux.push({
      pilierId: mission.id,
      code: mission.code,
      nom: mission.nom,
      type,
      poidsAnsut,
      poidsEcosysteme,
      negatifsEcosysteme,
      observation,
    });
  }

  const ordre: Record<TypeSignalCom, number> = {
    risque: 0,
    opportunite: 1,
    convergence: 2,
    'echo-faible': 3,
  };
  return signaux.sort((a, b) => {
    const d = ordre[a.type] - ordre[b.type];
    if (d !== 0) return d;
    return b.poidsEcosysteme - a.poidsEcosysteme;
  });
}
