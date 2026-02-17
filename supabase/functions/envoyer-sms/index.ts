import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SmsPayload {
  alerteId?: string;
  message?: string;
  destinataires?: string[];
}

interface SmsResult {
  destinataire: string;
  statut: "sent" | "failed";
  erreur?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Authentication (admin only) ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;

    // Verify admin role
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: isAdmin } = await adminClient.rpc('has_role', { _user_id: userId, _role: 'admin' });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Droits administrateur requis' }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // --- End Authentication ---

    const supabase = adminClient;

    const smsBaseUrl = Deno.env.get("AZURE_SMS_URL");
    const smsUsername = Deno.env.get("AZURE_SMS_USERNAME");
    const smsPassword = Deno.env.get("AZURE_SMS_PASSWORD");
    const smsFrom = Deno.env.get("AZURE_SMS_FROM") || "ANSUT";

    if (!smsBaseUrl || !smsUsername || !smsPassword) {
      throw new Error("Configuration SMS manquante (URL, USERNAME ou PASSWORD)");
    }

    const smsApiUrl = smsBaseUrl.replace(/\/+$/, "");

    const payload: SmsPayload = await req.json();
    let message = "";
    let destinataires: string[] = [];
    let alerteId: string | null = null;

    if (payload.alerteId) {
      alerteId = payload.alerteId;

      const { data: alerte, error: alerteError } = await supabase
        .from("alertes")
        .select("*")
        .eq("id", payload.alerteId)
        .single();

      if (alerteError || !alerte) {
        throw new Error(`Alerte introuvable: ${alerteError?.message || "ID invalide"}`);
      }

      message = `🚨 ALERTE ${alerte.niveau?.toUpperCase()} - ${alerte.titre}\n${alerte.message || ""}`.trim();

      const { data: dests, error: destError } = await supabase
        .from("sms_destinataires")
        .select("numero")
        .eq("actif", true);

      if (destError) {
        throw new Error(`Erreur récupération destinataires: ${destError.message}`);
      }

      destinataires = (dests || []).map((d) => d.numero);
    } else if (payload.message && payload.destinataires?.length) {
      message = payload.message;
      destinataires = payload.destinataires;
    } else {
      throw new Error("Payload invalide: fournir alerteId ou message + destinataires");
    }

    if (destinataires.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucun destinataire SMS actif", stats: { envoyes: 0, echecs: 0, total: 0 } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const smsMessage = message.length > 160 ? message.substring(0, 157) + "..." : message;
    const cleanedDestinataires = destinataires.map(n => n.replace(/^\+/, ""));
    const toField = cleanedDestinataires.join(";");

    console.log(`Envoi SMS à ${destinataires.length} destinataire(s) via ${smsApiUrl}`);

    const results: SmsResult[] = [];

    try {
      const response = await fetch(smsApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: toField, from: smsFrom, text: smsMessage, username: smsUsername, password: smsPassword }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erreur SMS API: ${response.status} - ${errorText}`);
        for (const numero of destinataires) {
          results.push({ destinataire: numero, statut: "failed", erreur: `HTTP ${response.status}` });
        }
      } else {
        for (const numero of destinataires) {
          results.push({ destinataire: numero, statut: "sent" });
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Exception SMS: ${errMsg}`);
      for (const numero of destinataires) {
        results.push({ destinataire: numero, statut: "failed", erreur: errMsg });
      }
    }

    const logsToInsert = results.map((r) => ({
      alerte_id: alerteId,
      destinataire: r.destinataire,
      message: smsMessage,
      statut: r.statut,
      erreur: r.erreur || null,
    }));

    const { error: logError } = await supabase.from("sms_logs").insert(logsToInsert);
    if (logError) {
      console.error("Erreur insertion sms_logs:", logError.message);
    }

    const envoyes = results.filter((r) => r.statut === "sent").length;
    const echecs = results.filter((r) => r.statut === "failed").length;

    return new Response(
      JSON.stringify({ success: true, stats: { envoyes, echecs, total: destinataires.length }, details: results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Erreur envoyer-sms:", errMsg);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
