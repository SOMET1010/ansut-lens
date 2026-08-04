/**
 * Communication — objet métier de l'écran « Notre communication ».
 *
 * Répond honnêtement à « Comment l'ANSUT est-elle visible ? » avec, EXCLUSIVEMENT,
 * des faits vérifiables :
 *  - ce que l'ANSUT a publié (voix propre, agrégée sur des dates réelles) ;
 *  - l'écho médiatique (reprises presse ÷ publications, dédupliqué, méthode
 *    exposée) ;
 *  - l'engagement UNIQUEMENT si la plateforme fournit les compteurs (sinon
 *    « donnée indisponible ») ;
 *  - les reprises presse récentes (documents attribuables, datés, dédupliqués).
 *
 * Aucun score opaque : ni Résonance /100, ni « 72 points d'engagement », ni
 * total contaminé par les doublons ou les pages d'accueil. La vue est passive :
 * elle ne fait que rendre cet objet.
 */

import type { Preuve } from '@/lib/preuve';
import type { Indicateur } from '@/lib/indicateur';

/** Un décompte simple, réel (thème, format…). */
export interface StatItem {
  cle: string;
  libelle: string;
  count: number;
}

/** Activité par réseau, avec tendance calculée sur deux périodes. */
export interface StatReseauItem extends StatItem {
  evolution: 'hausse' | 'baisse' | 'stable';
  frequenceParSemaine: number;
}

/** Engagement d'un réseau — traçable seulement si la plateforme fournit les chiffres. */
export interface EngagementReseauItem {
  cle: string;
  libelle: string;
  indicateur: Indicateur;
}

/** Écho médiatique — rapport earned/owned, entièrement traçable. */
export interface EchoCommunication {
  ratio: number | null;
  earned: number;
  owned: number;
  fenetreJours: number;
  methode: string;
  articles: Preuve[];
}

/** L'objet métier complet consommé par la vue « Notre communication ». */
export interface Communication {
  fenetreJours: number;
  /** Période réellement couverte par les publications datées. */
  periode: { debutMs: number | null; finMs: number | null };
  /** Ce que l'ANSUT a publié (voix propre). */
  publications: {
    totalDatees: number;
    /** Publications à date non vérifiée : comptées à part, jamais datées faussement. */
    totalNonDatees: number;
    parReseau: StatReseauItem[];
    themes: StatItem[];
    formats: StatItem[];
  };
  /** Écho médiatique (null si l'indicateur n'est pas calculable). */
  echo: EchoCommunication | null;
  /** Engagement par réseau — chaque entrée porte un indicateur traçable ou indisponible. */
  engagement: EngagementReseauItem[];
  /** Reprises presse récentes — preuves cliquables, dédupliquées. */
  reprisesPresse: Preuve[];
  /** Organisations citées dans la communication (comptages réels), à titre indicatif. */
  partenaires: StatItem[];
}
