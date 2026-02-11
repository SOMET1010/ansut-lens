import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Tente d'envoyer la requête en HTTPS, puis en HTTP (sans suivre les redirections) si SSL échoue.
 */
async function fetchWithSSLFallback(
  url: string,
  body: string
): Promise<{ ok: boolean; status: number; text: () => Promise<string> }> {
  // Essai 1: HTTPS normal
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    return response;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(`HTTPS échoué (${errMsg}), tentative en HTTP...`);

    // Essai 2: Fallback HTTP sans suivre les redirections
    const httpUrl = url.replace(/^https:\/\//, "http://");
    const response = await fetch(httpUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      redirect: "manual",
    });

    // Si c'est une redirection, on la signale mais on considère l'envoi comme tenté
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location") || "unknown";
      console.warn(`HTTP redirigé vers ${location} (status ${response.status})`);
      // Tenter de suivre la redirection en HTTP aussi
      if (location.startsWith("https://")) {
        throw new Error(
          `Le serveur redirige vers HTTPS (${location}). Impossible de contourner le certificat SSL. Contactez le fournisseur SMS pour obtenir un certificat valide.`
        );
      }
      const redirectResponse = await fetch(location, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      return redirectResponse;
    }

    return response;
  }
}

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const smsBaseUrl = Deno.env.get("AZURE_SMS_URL");
    const smsUsername = Deno.env.get("AZURE_SMS_USERNAME");
    const smsPassword = Deno.env.get("AZURE_SMS_PASSWORD");
    const smsFrom = Deno.env.get("AZURE_SMS_FROM") || "ANSUT";

    if (!smsBaseUrl || !smsUsername || !smsPassword) {
      throw new Error("Configuration SMS manquante (URL, USERNAME ou PASSWORD)");
    }

    // Build the SendSMS endpoint URL
    const smsApiUrl = smsBaseUrl.endsWith("/")
      ? `${smsBaseUrl}api/SendSMS`
      : `${smsBaseUrl}/api/SendSMS`;

    const payload: SmsPayload = await req.json();
    let message = "";
    let destinataires: string[] = [];
    let alerteId: string | null = null;

    // Mode 1: alerte automatique
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

      // Récupérer les destinataires actifs
      const { data: dests, error: destError } = await supabase
        .from("sms_destinataires")
        .select("numero")
        .eq("actif", true);

      if (destError) {
        throw new Error(`Erreur récupération destinataires: ${destError.message}`);
      }

      destinataires = (dests || []).map((d) => d.numero);
    }
    // Mode 2: envoi direct
    else if (payload.message && payload.destinataires?.length) {
      message = payload.message;
      destinataires = payload.destinataires;
    } else {
      throw new Error(
        "Payload invalide: fournir alerteId ou message + destinataires"
      );
    }

    if (destinataires.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Aucun destinataire SMS actif",
          stats: { envoyes: 0, echecs: 0, total: 0 },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Tronquer le message à 160 caractères pour le SMS
    const smsMessage = message.length > 160 ? message.substring(0, 157) + "..." : message;

    // Join all recipients with semicolons as per ANSUT API format
    const toField = destinataires.join(";");

    console.log(`Envoi SMS à ${destinataires.length} destinataire(s) via ${smsApiUrl}`);

    const results: SmsResult[] = [];

    try {
      const bodyPayload = JSON.stringify({
        to: toField,
        from: smsFrom,
        text: smsMessage,
        username: smsUsername,
        password: smsPassword,
      });

      const response = await fetchWithSSLFallback(smsApiUrl, bodyPayload);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Erreur SMS API: ${response.status} - ${errorText}`);
        // Mark all recipients as failed
        for (const numero of destinataires) {
          results.push({
            destinataire: numero,
            statut: "failed",
            erreur: `HTTP ${response.status}: ${errorText}`,
          });
        }
      } else {
        const responseData = await response.text();
        console.log(`SMS envoyé avec succès:`, responseData);
        // Mark all recipients as sent
        for (const numero of destinataires) {
          results.push({ destinataire: numero, statut: "sent" });
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`Exception SMS: ${errMsg}`);
      for (const numero of destinataires) {
        results.push({
          destinataire: numero,
          statut: "failed",
          erreur: errMsg,
        });
      }
    }

    // Enregistrer les logs dans sms_logs
    const logsToInsert = results.map((r) => ({
      alerte_id: alerteId,
      destinataire: r.destinataire,
      message: smsMessage,
      statut: r.statut,
      erreur: r.erreur || null,
    }));

    const { error: logError } = await supabase
      .from("sms_logs")
      .insert(logsToInsert);

    if (logError) {
      console.error("Erreur insertion sms_logs:", logError.message);
    }

    const envoyes = results.filter((r) => r.statut === "sent").length;
    const echecs = results.filter((r) => r.statut === "failed").length;

    return new Response(
      JSON.stringify({
        success: true,
        stats: { envoyes, echecs, total: destinataires.length },
        details: results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Erreur envoyer-sms:", errMsg);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
