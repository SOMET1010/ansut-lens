/**
 * Habilitation partagée des edge functions internes (audit santé P0 #1).
 *
 * Avant : toutes les fonctions étaient en `verify_jwt = false` sans barrière →
 * n'importe qui pouvait les déclencher avec la clé anon publique (DoS financier
 * sur Perplexity/Gemini/Firecrawl, injection de contenu, pipelines déclenchés).
 *
 * Deux appelants légitimes existent pour ces fonctions :
 *   1. les jobs `pg_cron` / services internes → en-tête `x-internal-token`
 *      comparé au secret `INTERNAL_FUNCTION_SECRET` (patron identique à
 *      `import-publications` / `x-import-token`) ;
 *   2. un utilisateur RADAR connecté qui déclenche l'action depuis l'interface
 *      → JWT utilisateur valide (vérifié en code via `getClaims`).
 *
 * Tout le reste reçoit 401.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

/** En-têtes CORS à utiliser par les fonctions internes. */
export const enTetesInternes =
  "authorization, x-client-info, apikey, content-type, x-internal-token";

/** Vrai si la requête porte le jeton interne partagé (cron / service). */
export function estAppelInterne(req: Request): boolean {
  const attendu = Deno.env.get("INTERNAL_FUNCTION_SECRET");
  if (!attendu) return false;
  return req.headers.get("x-internal-token") === attendu;
}

/** Renvoie l'identifiant de l'utilisateur si le JWT porté est valide. */
export async function utilisateurConnecte(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims?.sub) return null;
    return String(data.claims.sub);
  } catch {
    return null;
  }
}

export interface OptionsHabilitation {
  /** Exige le rôle admin pour un appel utilisateur (le cron reste autorisé). */
  adminRequis?: boolean;
  /** En-têtes CORS à joindre à la réponse 401. */
  cors?: Record<string, string>;
}

/**
 * Barrière d'entrée : renvoie une `Response` 401/403 à retourner tel quel si
 * l'appel n'est pas autorisé, ou `null` si l'appel peut continuer.
 */
export async function refuserSiNonAutorise(
  req: Request,
  options: OptionsHabilitation = {},
): Promise<Response | null> {
  const cors = options.cors ?? { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": enTetesInternes };

  if (estAppelInterne(req)) return null;

  const userId = await utilisateurConnecte(req);
  if (!userId) {
    return new Response(
      JSON.stringify({
        error:
          "Appel non autorisé : jeton interne (x-internal-token) ou session utilisateur valide requis.",
      }),
      { status: 401, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  if (options.adminRequis) {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: estAdmin } = await admin.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!estAdmin) {
      return new Response(JSON.stringify({ error: "Action réservée aux administrateurs." }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
  }

  return null;
}
