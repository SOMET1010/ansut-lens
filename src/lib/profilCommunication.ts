/**
 * Profil de communication de l'ANSUT (couche 1, analyse dans le temps).
 *
 * « Notre communication » ne doit pas être une simple liste des dernières
 * publications, ni remonter d'anciens contenus pour combler un vide. Ce module
 * analyse la communication propre de l'ANSUT sur une fenêtre glissante, à partir
 * de la DATE RÉELLE de publication, et en tire un profil :
 *   - les thèmes principaux (fréquence sur la période) ;
 *   - leur évolution (émergent / en hausse / stable / en baisse / disparu) ;
 *   - les publications récentes encore « vivantes » (non expirées selon leur
 *     type de contenu).
 *
 * Règles : on n'utilise QUE la date de publication réelle (jamais la date de
 * collecte). Les contenus sans date réelle ou expirés (selon leur TTL) sont
 * archivés d'office — ils ne remontent pas dans le briefing. Aucun KPI, aucun
 * pilotage : uniquement de l'analyse de communication.
 */

import { piliersPourTexte } from '@/lib/missions';
import { MISSIONS_STRATEGIQUES } from '@/config/missions';
import { synthetiserPublications } from '@/lib/syntheseAnsut';
import { nettoyerExtrait } from '@/lib/nettoyerExtrait';
import type { PublicationAnsut } from '@/hooks/useAnsutPublications';

function normaliser(s: string): string {
  return (s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function echapper(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function contient(texteNorm: string, terme: string): boolean {
  const t = normaliser(terme).trim();
  if (!t) return false;
  return new RegExp(`(^|[^a-z0-9])${echapper(t)}([^a-z0-9]|$)`).test(texteNorm);
}

export type TypeCommunication = 'evenement' | 'campagne' | 'institutionnel' | 'actualite';

/** Durée de vie (jours) par type de communication. */
const TTL: Record<TypeCommunication, number> = {
  evenement: 14, // expire vite (le temps de l'événement)
  actualite: 30,
  campagne: 60, // une campagne se déroule sur plusieurs semaines
  institutionnel: 90, // positionnement durable
};

const MARQUEURS_EVENEMENT = [
  'gitex', 'salon', 'forum', 'séminaire', 'conférence', 'cérémonie', 'participe',
  'prend part', 'célébration', 'journée', 'sommet', 'atelier', 'panel',
  'table ronde', 'édition', 'webinaire', 'masterclass',
];
const MARQUEURS_CAMPAGNE = [
  'campagne', 'sensibilisation', 'programme national', 'tournée', 'caravane',
  'mois de', 'semaine de', 'n’zassa', 'nzassa',
];
const MARQUEURS_INSTITUTIONNEL = [
  'communiqué', 'discours', 'partenariat', 'convention', 'signature', 'signé',
  'inauguration', 'inaugure', 'lancement', 'accord', 'protocole', 'engagement',
  'officiellement',
];

/** Type de communication d'une publication, pour lui appliquer un TTL. */
export function typeCommunication(contenu: string | null): {
  type: TypeCommunication;
  ttlJours: number;
} {
  const t = normaliser(contenu ?? '');
  if (MARQUEURS_EVENEMENT.some((k) => contient(t, k))) return { type: 'evenement', ttlJours: TTL.evenement };
  if (MARQUEURS_CAMPAGNE.some((k) => contient(t, k))) return { type: 'campagne', ttlJours: TTL.campagne };
  if (MARQUEURS_INSTITUTIONNEL.some((k) => contient(t, k))) return { type: 'institutionnel', ttlJours: TTL.institutionnel };
  return { type: 'actualite', ttlJours: TTL.actualite };
}

export interface ThemeCount {
  pilierId: string;
  code: string;
  nom: string;
  /** Nom court orienté communication (affiché en priorité). */
  nomCourt: string;
  count: number;
}

export type EvolutionType = 'emergent' | 'hausse' | 'stable' | 'baisse' | 'disparu';

export interface ThemeEvolution extends ThemeCount {
  evolution: EvolutionType;
  /** Nombre de publications sur la fenêtre précédente (même durée). */
  avant: number;
}

/** Élément court (campagne / événement) tiré d'une publication. */
export interface ItemCommunication {
  id: string;
  titre: string;
  date_publication: string | null;
  url_original: string | null;
}

export interface ProfilCommunication {
  fenetreJours: number;
  /** Publications datées réellement et publiées dans la fenêtre. */
  total: number;
  /** Thèmes principaux de la fenêtre, du plus au moins communiqué. */
  themes: ThemeCount[];
  /** Évolution des thèmes vs la fenêtre précédente (même durée). */
  evolution: ThemeEvolution[];
  /** Partenaires cités dans la communication de la fenêtre. */
  partenaires: string[];
  /** Campagnes en cours (contenus de type campagne, non expirés). */
  campagnes: ItemCommunication[];
  /** Événements récents (contenus de type événement, non expirés). */
  evenements: ItemCommunication[];
  /** Publications récentes encore vivantes (non expirées), du plus récent. */
  publicationsRecentes: (PublicationAnsut & { type: TypeCommunication })[];
}

const JOUR_MS = 24 * 3600 * 1000;

function dateReelleMs(pub: PublicationAnsut): number | null {
  if (!pub.date_publication) return null;
  const ms = new Date(pub.date_publication).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function comptesParPilier(pubs: PublicationAnsut[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const pub of pubs) {
    for (const id of piliersPourTexte(pub.contenu ?? '')) {
      m.set(id, (m.get(id) ?? 0) + 1);
    }
  }
  return m;
}

/**
 * Construit le profil de communication sur une fenêtre glissante. Toutes les
 * dates sont des dates de publication réelles ; les publications sans date ou
 * futures sont ignorées.
 */
export function profilCommunication(
  publications: PublicationAnsut[],
  fenetreJours: number,
  maintenantMs: number,
): ProfilCommunication {
  const debutActuel = maintenantMs - fenetreJours * JOUR_MS;
  const debutPrecedent = maintenantMs - 2 * fenetreJours * JOUR_MS;

  const actuelles: PublicationAnsut[] = [];
  const precedentes: PublicationAnsut[] = [];

  for (const pub of publications ?? []) {
    const ms = dateReelleMs(pub);
    if (ms === null || ms > maintenantMs) continue; // pas de date réelle / futur
    if (ms >= debutActuel) actuelles.push(pub);
    else if (ms >= debutPrecedent) precedentes.push(pub);
  }

  // Thèmes principaux de la fenêtre (fréquence).
  const comptesActuels = comptesParPilier(actuelles);
  const comptesPrecedents = comptesParPilier(precedentes);

  const themes: ThemeCount[] = MISSIONS_STRATEGIQUES.map((m) => ({
    pilierId: m.id,
    code: m.code,
    nom: m.nom,
    nomCourt: m.nomCourt,
    count: comptesActuels.get(m.id) ?? 0,
  }))
    .filter((t) => t.count > 0)
    .sort((a, b) => b.count - a.count);

  // Évolution vs fenêtre précédente (même durée). On garde les thèmes qui
  // bougent (présents dans l'une ou l'autre fenêtre).
  const evolution: ThemeEvolution[] = MISSIONS_STRATEGIQUES.map((m) => {
    const apres = comptesActuels.get(m.id) ?? 0;
    const avant = comptesPrecedents.get(m.id) ?? 0;
    let type: EvolutionType;
    if (avant === 0 && apres > 0) type = 'emergent';
    else if (avant > 0 && apres === 0) type = 'disparu';
    else if (apres > avant) type = 'hausse';
    else if (apres < avant) type = 'baisse';
    else type = 'stable';
    return {
      pilierId: m.id,
      code: m.code,
      nom: m.nom,
      nomCourt: m.nomCourt,
      count: apres,
      avant,
      evolution: type,
    };
  }).filter((e) => e.count > 0 || e.avant > 0);

  // Contenus VIVANTS : datés, dans la fenêtre, non expirés selon leur TTL de
  // type. Les contenus expirés sont archivés d'office.
  const vivantes = actuelles
    .map((pub) => {
      const ms = dateReelleMs(pub) as number;
      const { type, ttlJours } = typeCommunication(pub.contenu);
      const ageJours = (maintenantMs - ms) / JOUR_MS;
      return { pub, ms, type, vivante: ageJours <= ttlJours };
    })
    .filter((x) => x.vivante)
    .sort((a, b) => b.ms - a.ms);

  const titreCourt = (contenu: string | null): string => {
    const t = nettoyerExtrait(contenu ?? '') || 'Publication';
    return t.length > 90 ? `${t.slice(0, 90).trimEnd()}…` : t;
  };
  const toItem = (x: { pub: PublicationAnsut }): ItemCommunication => ({
    id: x.pub.id,
    titre: titreCourt(x.pub.contenu),
    date_publication: x.pub.date_publication,
    url_original: x.pub.url_original,
  });

  const campagnes = vivantes.filter((x) => x.type === 'campagne').slice(0, 4).map(toItem);
  const evenements = vivantes.filter((x) => x.type === 'evenement').slice(0, 4).map(toItem);
  const publicationsRecentes = vivantes.slice(0, 4).map((x) => ({ ...x.pub, type: x.type }));

  // Partenaires cités dans la communication de la fenêtre (réutilise la liste
  // de référence de l'écosystème).
  const partenaires = synthetiserPublications(actuelles).partenaires;

  return {
    fenetreJours,
    total: actuelles.length,
    themes,
    evolution,
    partenaires,
    campagnes,
    evenements,
    publicationsRecentes,
  };
}
