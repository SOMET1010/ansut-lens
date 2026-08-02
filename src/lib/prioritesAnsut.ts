import { piliersPourTexte } from '@/lib/missions';
import { MISSIONS_STRATEGIQUES } from '@/config/missions';
import type { PublicationAnsut } from '@/hooks/useAnsutPublications';

/**
 * ADN stratégique appris — version « publications ».
 *
 * On déduit les priorités actuelles de l'ANSUT de ce qu'elle publie elle-même :
 * si ses communications récentes portent surtout sur la connectivité et
 * l'inclusion, alors ce sont ses axes actifs du moment. La veille devient ainsi
 * contextualisée — la question n'est plus « cette information est-elle
 * importante ? » mais « touche-t-elle une priorité que l'ANSUT porte
 * aujourd'hui ? ».
 *
 * Cette dérivation par mots-clés est une amorce ; l'ADN complet (phase 2)
 * intégrera aussi le site, les documents stratégiques et une analyse
 * sémantique. Elle reste néanmoins un signal réel et immédiatement exploitable.
 */

export interface PrioriteAnsut {
  pilierId: string;
  /** Nombre de publications ANSUT rattachées à ce pilier sur la période. */
  publications: number;
  /** Part des publications thématisées portant sur ce pilier (0-1). */
  part: number;
}

export interface AdnPublications {
  /** Intensité par pilier, du plus communiqué au moins communiqué. */
  priorites: PrioriteAnsut[];
  /** Piliers considérés comme activement portés par l'ANSUT en ce moment. */
  actifs: Set<string>;
  /** Nombre de publications analysées. */
  total: number;
}

/** Seuil minimal de publications pour considérer un pilier comme « actif ». */
const SEUIL_ACTIF = 2;

export function deriverAdnPublications(publications: PublicationAnsut[]): AdnPublications {
  const compte = new Map<string, number>();
  let thematisees = 0;

  for (const pub of publications ?? []) {
    const piliers = piliersPourTexte(pub.contenu ?? '');
    if (piliers.length > 0) thematisees++;
    for (const id of piliers) {
      compte.set(id, (compte.get(id) ?? 0) + 1);
    }
  }

  const denom = thematisees || 1;
  const priorites: PrioriteAnsut[] = [...compte.entries()]
    .map(([pilierId, publications]) => ({
      pilierId,
      publications,
      part: publications / denom,
    }))
    .sort((a, b) => b.publications - a.publications);

  const actifs = new Set(
    priorites.filter((p) => p.publications >= SEUIL_ACTIF).map((p) => p.pilierId),
  );

  return { priorites, actifs, total: publications?.length ?? 0 };
}

/** Piliers que l'ANSUT porte structurellement (entité porteuse d'un projet). */
export function piliersPorteurs(): Set<string> {
  return new Set(MISSIONS_STRATEGIQUES.filter((m) => m.ansutPorteur).map((m) => m.id));
}

/**
 * Priorités de l'ANSUT à retenir pour contextualiser la veille, avec repli.
 *
 * Idéalement on apprend les priorités de ce que l'ANSUT publie (ADN). Mais la
 * collecte des réseaux officiels est encore partielle : quand aucune priorité
 * n'émerge des publications, on retombe sur les piliers que l'ANSUT porte par
 * mandat (P1 Connectivité, P6 Inclusion). L'accueil reste ainsi centré sur ce
 * qui concerne l'ANSUT même sans données de publication.
 */
export function prioritesAvecRepli(publications: PublicationAnsut[]): {
  priorites: Set<string>;
  parPublications: boolean;
} {
  const adn = deriverAdnPublications(publications ?? []);
  if (adn.actifs.size > 0) {
    return { priorites: adn.actifs, parPublications: true };
  }
  return { priorites: piliersPorteurs(), parPublications: false };
}
