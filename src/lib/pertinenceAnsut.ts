/**
 * Moteur de valeur stratégique et de durée de vie des publications ANSUT.
 *
 * « Ce matin » n'est pas « les dernières publications de l'ANSUT ». Une
 * publication n'a pas une pertinence infinie : une félicitation sportive
 * expire en quelques jours, un événement (GITEX) le temps de l'événement, une
 * annonce de programme structurant reste pertinente plusieurs semaines.
 *
 * Ce module :
 *   - classe chaque publication par valeur stratégique et lui attribue une durée
 *     de vie (TTL) ;
 *   - détermine, pour chaque pilier, la dernière communication ANSUT encore
 *     « vivante » (datée réellement et dans son TTL).
 *
 * Les publications hors TTL ne disparaissent pas de la connaissance : elles
 * continuent d'alimenter l'ADN stratégique (voir `deriverAdnPublications`), mais
 * ne remontent plus dans le briefing du matin.
 */

import { piliersPourTexte } from '@/lib/missions';
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

/** Marqueurs d'annonce stratégique (portée durable). */
const ANNONCE = [
  'lancement', 'lance', 'inauguration', 'inaugure', 'signature', 'signé', 'signe',
  'partenariat', 'convention', 'accord', 'protocole', 'déploiement', 'déployé',
  'mise en service', 'financement', 'investissement', 'subvention', 'programme',
  'projet', 'connecté', 'connectés', 'raccordé', 'couverture', 'opérationnel',
  'km de fibre', 'milliards', 'coup d’envoi', 'officiellement',
];

/** Marqueurs d'événement (pertinence limitée à la période de l'événement). */
const EVENEMENT = [
  'gitex', 'salon', 'forum', 'séminaire', 'conférence', 'atelier', 'cérémonie',
  'panel', 'table ronde', 'sommet', 'journée', 'édition', 'participe', 'prend part',
  'célébration', 'webinaire', 'masterclass',
];

/** Marqueurs de communication communautaire (expire vite). */
const COMMUNAUTAIRE = [
  'félicitations', 'félicite', 'champion', 'champions', 'championne', 'victoire',
  'vainqueur', 'finale', 'match', 'football', 'foot', 'éléphants', 'can 2023',
  'can 2024', 'can 2025', 'can 2026', 'coupe d’afrique', 'anniversaire', 'joyeux',
  'bonne fête', 'meilleurs vœux', 'vœux', 'condoléances', 'hommage', 'décès',
  'bonne année', 'fête de',
];

export type CategoriePublication = 'strategique' | 'evenementiel' | 'communautaire';

/** Durée de vie (jours) par catégorie, plafonnée par la fenêtre du briefing. */
const TTL: Record<CategoriePublication, number> = {
  strategique: 60,
  evenementiel: 14,
  communautaire: 3,
};

/** Fenêtre maximale du briefing : au-delà, plus rien ne remonte (jamais ∞). */
export const FENETRE_BRIEFING_JOURS = 60;

export interface ClassificationPub {
  categorie: CategoriePublication;
  ttlJours: number;
  /** Piliers stratégiques touchés par le contenu. */
  piliers: string[];
}

/**
 * Classe une publication par valeur stratégique. Priorité au signal fort : si
 * elle touche un pilier ou porte un marqueur d'annonce, elle est stratégique,
 * même si elle mentionne aussi un événement. Sinon événement, sinon
 * communautaire (défaut prudent : faible valeur, expire vite).
 */
export function classifierPublication(contenu: string | null): ClassificationPub {
  const texte = normaliser(contenu ?? '');
  const piliers = piliersPourTexte(contenu ?? '');
  const communautaire = COMMUNAUTAIRE.some((k) => contient(texte, k));

  // Un vrai rattachement à un pilier prime sur tout.
  if (piliers.length > 0) return { categorie: 'strategique', ttlJours: TTL.strategique, piliers };
  // Un marqueur d'annonce compte, SAUF si le ton est clairement communautaire
  // (« félicitations pour ce beau projet » ne doit pas passer pour stratégique).
  if (!communautaire && ANNONCE.some((k) => contient(texte, k))) {
    return { categorie: 'strategique', ttlJours: TTL.strategique, piliers };
  }
  if (!communautaire && EVENEMENT.some((k) => contient(texte, k))) {
    return { categorie: 'evenementiel', ttlJours: TTL.evenementiel, piliers };
  }
  return { categorie: 'communautaire', ttlJours: TTL.communautaire, piliers };
}

export interface CommunicationPilier {
  publication: PublicationAnsut;
  /** Âge en jours au moment du calcul. */
  ageJours: number;
  categorie: CategoriePublication;
}

/**
 * Pour chaque pilier, retourne la dernière communication ANSUT encore vivante :
 * publication DATÉE réellement (date de publication, jamais la date de collecte)
 * et dont l'âge ne dépasse pas son TTL (ni la fenêtre max du briefing). Les
 * publications non datées ou expirées ne comptent pas — on ne prétend pas
 * qu'elles sont récentes.
 *
 * @param maintenantMs Horodatage de référence (Date.now() côté composant).
 */
export function communicationsRecentesParPilier(
  publications: PublicationAnsut[],
  maintenantMs: number,
): Map<string, CommunicationPilier> {
  const parPilier = new Map<string, CommunicationPilier>();

  for (const pub of publications ?? []) {
    // Date de publication réelle uniquement.
    if (!pub.date_publication) continue;
    const dateMs = new Date(pub.date_publication).getTime();
    if (Number.isNaN(dateMs)) continue;

    const ageJours = (maintenantMs - dateMs) / (24 * 3600 * 1000);
    if (ageJours < 0) continue; // date future aberrante

    const classe = classifierPublication(pub.contenu);
    const plafond = Math.min(classe.ttlJours, FENETRE_BRIEFING_JOURS);
    if (ageJours > plafond) continue; // expirée : nourrit l'ADN, pas le briefing
    if (classe.piliers.length === 0) continue; // sans pilier : pas un dossier

    for (const pilierId of classe.piliers) {
      const actuel = parPilier.get(pilierId);
      if (!actuel || ageJours < actuel.ageJours) {
        parPilier.set(pilierId, { publication: pub, ageJours, categorie: classe.categorie });
      }
    }
  }

  return parPilier;
}
