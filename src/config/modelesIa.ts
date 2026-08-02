/**
 * Registre des modèles IA proposés dans l'interface (miroir du registre backend
 * `supabase/functions/_shared/modeles.ts`). Le front ne connaît que les
 * identifiants internes ; la correspondance vers la passerelle est faite côté
 * serveur. Ajouter un modèle ici ET dans le registre backend.
 */

export interface ModeleIaUI {
  id: string;
  label: string;
  fournisseur: string;
  defaut?: boolean;
}

export const MODELES_IA_UI: ModeleIaUI[] = [
  { id: 'gemini-flash', label: 'Gemini 2.5 Flash', fournisseur: 'Google', defaut: true },
  { id: 'gemini-flash-lite', label: 'Gemini 2.5 Flash Lite', fournisseur: 'Google' },
  { id: 'gpt-5-mini', label: 'GPT-5 mini', fournisseur: 'OpenAI' },
  { id: 'gpt-5', label: 'GPT-5', fournisseur: 'OpenAI' },
  { id: 'deepseek', label: 'DeepSeek V3', fournisseur: 'DeepSeek' },
  { id: 'kimi-k2', label: 'Kimi K2', fournisseur: 'Moonshot' },
];

export const MODELE_IA_DEFAUT = MODELES_IA_UI.find((m) => m.defaut)?.id ?? MODELES_IA_UI[0].id;
