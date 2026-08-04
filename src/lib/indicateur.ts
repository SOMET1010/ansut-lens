/**
 * Fondation crédibilité — contrat « ZÉRO SCORE OPAQUE ».
 *
 * Point #2 de l'audit : Résonance « 10/100 », SPDI « 11/73 », « 72 points
 * d'engagement », « 100 % enrichi », « +2033 nouveaux », statut « Aligné »… des
 * verdicts chiffrés sans méthode, sans corpus, sans reproductibilité.
 *
 * Règle, valable pour tout écran reconstruit : un indicateur affiché DOIT porter
 * sa méthode (comment il est calculé) et, quand c'est pertinent, ses sources. À
 * défaut, il n'est pas affiché comme un chiffre : il devient explicitement
 * « donnée indisponible ». Mieux vaut un trou honnête qu'une fausse précision.
 *
 * Ce module fournit le TYPE qui rend cette règle impossible à contourner : on ne
 * peut pas fabriquer un `Indicateur` traçable sans fournir sa méthode.
 */

/** Un indicateur dont la valeur est réelle et la méthode explicable. */
export interface IndicateurTracable {
  statut: 'tracable';
  /** Valeur déjà formatée pour l'affichage (« 4,8 », « 28 », « 6,5 j »…). */
  valeur: string;
  /** Comment cette valeur est obtenue — affichée en clair, jamais seulement au survol. */
  methode: string;
  /** Sources ou corpus derrière la valeur, le cas échéant (traçabilité). */
  sources?: string[];
}

/** L'absence assumée d'un indicateur : on expose pourquoi, on n'invente rien. */
export interface IndicateurIndisponible {
  statut: 'indisponible';
  /** Pourquoi la valeur n'est pas affichable (données manquantes, non vérifiées…). */
  raison: string;
}

export type Indicateur = IndicateurTracable | IndicateurIndisponible;

/** Crée un indicateur traçable — impossible sans fournir sa méthode. */
export function tracable(valeur: string, methode: string, sources?: string[]): IndicateurTracable {
  return { statut: 'tracable', valeur, methode, sources };
}

/** Déclare un indicateur indisponible, avec la raison exposée à l'utilisateur. */
export function indisponible(raison: string): IndicateurIndisponible {
  return { statut: 'indisponible', raison };
}

/** Vrai si l'indicateur porte une valeur affichable. */
export function estTracable(i: Indicateur): i is IndicateurTracable {
  return i.statut === 'tracable';
}
