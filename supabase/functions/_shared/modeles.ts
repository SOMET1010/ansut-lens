/**
 * Registre des modèles IA disponibles.
 *
 * Source unique de vérité pour les modèles utilisables via la passerelle Lovable
 * (`https://ai.gateway.lovable.dev`, compatible OpenAI). Ajouter un modèle =
 * ajouter une entrée ici. Le champ `gateway` est l'identifiant EXACT attendu par
 * la passerelle : il doit correspondre à ce que Lovable expose.
 *
 * ⚠️ DeepSeek et Kimi (Moonshot) sont ajoutés ici pour être sélectionnables ;
 * leur disponibilité dépend de la passerelle Lovable. Si la passerelle refuse un
 * identifiant, corriger la chaîne `gateway` (ou basculer ce fournisseur sur son
 * API directe avec une clé dédiée). À vérifier en préproduction.
 */

export interface ModeleIA {
  /** Identifiant interne stable (utilisé par le front et les requêtes). */
  id: string;
  /** Libellé affiché. */
  label: string;
  /** Identifiant exact envoyé à la passerelle Lovable. */
  gateway: string;
  /** Fournisseur, pour l'affichage/regroupement. */
  fournisseur: string;
  /** Modèle proposé par défaut dans les sélecteurs. */
  defaut?: boolean;
}

export const MODELES_IA: ModeleIA[] = [
  { id: 'gemini-flash', label: 'Gemini 2.5 Flash', gateway: 'google/gemini-2.5-flash', fournisseur: 'Google', defaut: true },
  { id: 'gemini-flash-lite', label: 'Gemini 2.5 Flash Lite', gateway: 'google/gemini-2.5-flash-lite', fournisseur: 'Google' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini', gateway: 'openai/gpt-5-mini', fournisseur: 'OpenAI' },
  { id: 'gpt-5', label: 'GPT-5', gateway: 'openai/gpt-5', fournisseur: 'OpenAI' },
  { id: 'deepseek', label: 'DeepSeek V3', gateway: 'deepseek/deepseek-chat', fournisseur: 'DeepSeek' },
  { id: 'kimi-k2', label: 'Kimi K2', gateway: 'moonshotai/kimi-k2', fournisseur: 'Moonshot' },
];

/** Identifiant de passerelle du modèle par défaut. */
export const MODELE_DEFAUT_GATEWAY =
  MODELES_IA.find((m) => m.defaut)?.gateway ?? 'google/gemini-2.5-flash';

/**
 * Résout un modèle demandé (id interne ou chaîne passerelle) vers l'identifiant
 * de passerelle à envoyer. Retourne le `fallback` si la demande est absente ou
 * inconnue — jamais une valeur arbitraire non validée.
 */
export function resolveModeleGateway(
  demande?: string | null,
  fallback: string = MODELE_DEFAUT_GATEWAY,
): string {
  if (!demande) return fallback;
  const m = MODELES_IA.find((x) => x.id === demande || x.gateway === demande);
  return m?.gateway ?? fallback;
}
