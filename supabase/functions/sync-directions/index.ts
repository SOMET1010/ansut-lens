// Edge Function: sync-directions
// Synchronise la table miroir locale public.ref_directions depuis l'API
// Référentiels du Cockpit (source maître). Lecture seule côté RADAR.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const JSON_HEADERS = {
  ...corsHeaders,
  "Content-Type": "application/json; charset=utf-8",
};

const FETCH_TIMEOUT_MS = 15_000;

interface DirectionPayload {
  code?: string;
  libelle?: string;
  type?: string | null;
  niveau?: number | null;
  parent_code?: string | null;
  ordre?: number | null;
  actif?: boolean | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ status: "error", message: "Méthode non autorisée" }),
      { status: 405, headers: JSON_HEADERS },
    );
  }

  const startedAt = Date.now();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cockpitUrl = Deno.env.get("COCKPIT_REFERENTIELS_URL");
  const radarApiKey = Deno.env.get("RADAR_API_KEY");

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (!cockpitUrl || !radarApiKey) {
    return new Response(
      JSON.stringify({
        status: "error",
        message:
          "Secrets manquants : COCKPIT_REFERENTIELS_URL et/ou RADAR_API_KEY ne sont pas configurés.",
      }),
      { status: 500, headers: JSON_HEADERS },
    );
  }

  const endpoint = `${cockpitUrl.replace(/\/+$/, "")}/directions`;

  // 1. Créer la ligne de run
  const { data: runRow, error: runError } = await supabase
    .from("ref_sync_runs")
    .insert({
      referentiel: "directions",
      source_url: endpoint,
      started_at: new Date().toISOString(),
      success: false,
    })
    .select("id")
    .single();

  if (runError || !runRow) {
    console.error("[sync-directions] Impossible de créer le run:", runError);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Impossible de journaliser la synchronisation",
      }),
      { status: 500, headers: JSON_HEADERS },
    );
  }

  const runId = runRow.id as string;

  const failRun = async (
    message: string,
    httpStatus: number | null,
    responseStatus = 502,
  ) => {
    await supabase
      .from("ref_sync_runs")
      .update({
        success: false,
        http_status: httpStatus,
        error: message,
        duration_ms: Date.now() - startedAt,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return new Response(
      JSON.stringify({
        status: "error",
        http_status: httpStatus,
        message,
        run_id: runId,
      }),
      { status: responseStatus, headers: JSON_HEADERS },
    );
  };

  try {
    // 2. Appel de l'API Cockpit
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "X-Client-Id": "radar",
          "X-API-Key": radarApiKey,
          Accept: "application/json",
        },
        signal: controller.signal,
      });
    } catch (fetchErr) {
      const isAbort = (fetchErr as Error)?.name === "AbortError";
      return await failRun(
        isAbort
          ? `Délai dépassé (${FETCH_TIMEOUT_MS} ms) lors de l'appel à l'API Référentiels`
          : `Échec de l'appel à l'API Référentiels : ${(fetchErr as Error).message}`,
        null,
      );
    } finally {
      clearTimeout(timeout);
    }

    // 3. Réponse non 200 -> aucune écriture dans ref_directions
    if (response.status !== 200) {
      const body = await response.text().catch(() => "");
      return await failRun(
        `Réponse ${response.status} de l'API Référentiels : ${body.slice(0, 500)}`,
        response.status,
        502,
      );
    }

    // 4. Lecture + validation du corps
    let payload: {
      meta?: { version?: string; generated_at?: string; count?: number };
      data?: DirectionPayload[];
    };
    try {
      payload = await response.json();
    } catch {
      return await failRun("Corps de réponse illisible (JSON invalide)", 200);
    }

    const data = payload?.data;
    if (!Array.isArray(data)) {
      return await failRun(
        "Champ 'data' absent ou non conforme (tableau attendu)",
        200,
      );
    }

    const invalid = data.filter(
      (d) => !d || typeof d.code !== "string" || d.code.trim() === "",
    );
    if (invalid.length > 0) {
      return await failRun(
        `${invalid.length} direction(s) sans code valide dans la réponse`,
        200,
      );
    }

    const syncedAt = new Date().toISOString();
    const rows = data.map((d) => ({
      code: d.code!.trim(),
      libelle: d.libelle ?? d.code!.trim(),
      type: d.type ?? null,
      niveau: d.niveau ?? null,
      parent_code: d.parent_code ?? null,
      ordre: d.ordre ?? null,
      actif: d.actif ?? true,
      synced_at: syncedAt,
      last_sync_run_id: runId,
    }));

    let upsertedCount = 0;
    if (rows.length > 0) {
      // UPSERT sur la clé "code" — aucune suppression / désactivation ici.
      const { data: upserted, error: upsertError } = await supabase
        .from("ref_directions")
        .upsert(rows, { onConflict: "code" })
        .select("code");

      if (upsertError) {
        return await failRun(
          `Échec de l'écriture dans ref_directions : ${upsertError.message}`,
          200,
          500,
        );
      }
      upsertedCount = upserted?.length ?? rows.length;
    }

    const fetchedCount = payload?.meta?.count ?? data.length;

    // 5. Clôture du run
    await supabase
      .from("ref_sync_runs")
      .update({
        success: true,
        http_status: 200,
        fetched_count: fetchedCount,
        upserted_count: upsertedCount,
        duration_ms: Date.now() - startedAt,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    console.log(
      `[sync-directions] OK run=${runId} fetched=${fetchedCount} upserted=${upsertedCount}`,
    );

    // 6. Compte-rendu
    return new Response(
      JSON.stringify({
        status: "ok",
        fetched: fetchedCount,
        upserted: upsertedCount,
        run_id: runId,
      }),
      { status: 200, headers: JSON_HEADERS },
    );
  } catch (error) {
    const message = (error as Error)?.message ?? "Erreur inattendue";
    console.error("[sync-directions] Erreur inattendue:", message);
    return await failRun(message, null, 500);
  }
});
