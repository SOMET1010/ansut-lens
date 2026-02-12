import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DiffuserPayload {
  canal: "sms" | "telegram" | "email";
  contenu_type?: "briefing" | "newsletter" | "alerte";
  message?: string; // optionnel: message personnalisé
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const gatewayBaseUrl = Deno.env.get("AZURE_SMS_URL")!;
    const username = Deno.env.get("AZURE_SMS_USERNAME")!;
    const password = Deno.env.get("AZURE_SMS_PASSWORD")!;
    const smsFrom = Deno.env.get("AZURE_SMS_FROM") || "ANSUT RADAR";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!gatewayBaseUrl || !username || !password) {
      throw new Error("Configuration passerelle manquante");
    }

    const payload: DiffuserPayload = await req.json();
    const { canal, contenu_type = "briefing" } = payload;

    if (!canal || !["sms", "telegram", "email"].includes(canal)) {
      throw new Error("Canal invalide. Utilisez: sms, telegram, email");
    }

    // 1. Récupérer la config du canal
    const { data: config, error: configError } = await supabase
      .from("diffusion_programmation")
      .select("*")
      .eq("canal", canal)
      .single();

    if (configError || !config) {
      throw new Error(`Configuration canal ${canal} introuvable`);
    }

    const destinataires = (config.destinataires as any[]) || [];
    if (destinataires.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucun destinataire configuré", stats: { envoyes: 0, echecs: 0, total: 0 } }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Récupérer ou générer le message
    let message = payload.message || "";
    if (!message) {
      // Appeler generer-briefing pour obtenir le contenu
      const briefingResponse = await fetch(`${supabaseUrl}/functions/v1/generer-briefing`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (briefingResponse.ok) {
        const briefingData = await briefingResponse.json();
        message = briefingData.briefing || briefingData.text || "Briefing quotidien ANSUT RADAR";
      } else {
        message = "Briefing quotidien ANSUT RADAR - Erreur de génération";
      }
    }

    // 3. Dispatcher vers le bon canal
    let succes_count = 0;
    let echec_count = 0;
    const details: any[] = [];

    // Construire l'URL unifiée (endpoint /api/message/send)
    const unifiedUrl = gatewayBaseUrl.replace(/\/api\/SendSMS\/?$/i, "") + "/api/message/send";

    if (canal === "sms") {
      // SMS via endpoint unifié (pas de channel)
      const toField = destinataires.map((d: any) => (d.numero || d).replace(/^\+/, "")).join(";");
      const smsMessage = message.length > 160 ? message.substring(0, 157) + "..." : message;

      try {
        const response = await fetch(unifiedUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: toField,
            from: smsFrom,
            content: smsMessage,
            username,
            password,
          }),
        });

        if (response.ok) {
          succes_count = destinataires.length;
          destinataires.forEach((d: any) => details.push({ destinataire: d.numero || d, statut: "sent" }));
        } else {
          const errorText = await response.text();
          echec_count = destinataires.length;
          destinataires.forEach((d: any) => details.push({ destinataire: d.numero || d, statut: "failed", erreur: errorText }));
        }
      } catch (err) {
        echec_count = destinataires.length;
        destinataires.forEach((d: any) => details.push({ destinataire: d.numero || d, statut: "failed", erreur: String(err) }));
      }
    } else if (canal === "telegram") {
      // Telegram via endpoint unifié avec channel: "Telegram"
      for (const dest of destinataires) {
        const chatId = dest.chat_id || dest;
        try {
          const response = await fetch(unifiedUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: String(chatId),
              from: smsFrom,
              content: message,
              username,
              password,
              channel: "Telegram",
            }),
          });

          if (response.ok) {
            succes_count++;
            details.push({ destinataire: chatId, statut: "sent" });
          } else {
            const errorText = await response.text();
            echec_count++;
            details.push({ destinataire: chatId, statut: "failed", erreur: errorText });
          }
        } catch (err) {
          echec_count++;
          details.push({ destinataire: chatId, statut: "failed", erreur: String(err) });
        }
      }
    } else if (canal === "email") {
      // Email via passerelle ANSUT (channel: "Email")
      for (const dest of destinataires) {
        const email = dest.email || dest;
        try {
          const response = await fetch(unifiedUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: email,
              cc: null,
              bcc: null,
              subject: `📰 Briefing ANSUT RADAR - ${new Date().toLocaleDateString("fr-FR")}`,
              content: message,
              ishtml: true,
              username,
              password,
              channel: "Email",
            }),
          });

          if (response.ok) {
            succes_count++;
            details.push({ destinataire: email, statut: "sent" });
          } else {
            const errorText = await response.text();
            echec_count++;
            details.push({ destinataire: email, statut: "failed", erreur: errorText });
          }
        } catch (err) {
          echec_count++;
          details.push({ destinataire: email, statut: "failed", erreur: String(err) });
        }
      }
    }

    // 4. Enregistrer le log
    await supabase.from("diffusion_logs").insert({
      canal,
      contenu_type,
      message: message.substring(0, 5000),
      destinataires_count: destinataires.length,
      succes_count,
      echec_count,
      details,
    });

    // 5. Mettre à jour dernier_envoi
    await supabase
      .from("diffusion_programmation")
      .update({ dernier_envoi: new Date().toISOString() })
      .eq("canal", canal);

    return new Response(
      JSON.stringify({
        success: true,
        canal,
        stats: { envoyes: succes_count, echecs: echec_count, total: destinataires.length },
        details: details.filter(d => d.statut === "failed"),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Erreur diffuser-resume:", errMsg);
    return new Response(
      JSON.stringify({ success: false, error: errMsg }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
