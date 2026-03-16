import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth: accept either user JWT (admin check) or service role key
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const token = authHeader?.replace("Bearer ", "") || "";
    const isServiceRole = token === serviceRoleKey;

    if (!isServiceRole) {
      if (!authHeader?.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Non authentifié" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
      if (claimsError || !claimsData?.claims) {
        return new Response(JSON.stringify({ error: "Non authentifié" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const userId = claimsData.claims.sub;
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: isAdmin } = await adminClient.rpc("has_role", { _user_id: userId, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Droits administrateur requis" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { destinataires, sujet, contenu_html } = await req.json();

    if (!destinataires || !Array.isArray(destinataires) || destinataires.length === 0) {
      throw new Error("Liste de destinataires vide");
    }
    if (!contenu_html) {
      throw new Error("Contenu HTML requis");
    }

    const gatewayBaseUrl = Deno.env.get("AZURE_SMS_URL")!;
    const username = Deno.env.get("AZURE_SMS_USERNAME")!;
    const password = Deno.env.get("AZURE_SMS_PASSWORD")!;

    const unifiedUrl = gatewayBaseUrl.replace(/\/api\/SendSMS\/?$/i, "") + "/api/message/send";

    let succes = 0;
    let echecs = 0;

    for (const email of destinataires) {
      try {
        const response = await fetch(unifiedUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: email,
            cc: null,
            bcc: null,
            subject: sujet || "📊 Fiche Crédibilité des Sources - ANSUT RADAR",
            content: contenu_html,
            ishtml: true,
            username,
            password,
            channel: "Email",
          }),
        });
        if (response.ok) { succes++; } else { echecs++; console.error(`Échec pour ${email}:`, await response.text()); }
      } catch (err) { echecs++; console.error(`Erreur pour ${email}:`, err); }
    }

    return new Response(
      JSON.stringify({ success: true, stats: { envoyes: succes, echecs, total: destinataires.length } }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
