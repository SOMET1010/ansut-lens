// Using native Deno.serve
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendViaGateway(to: string, subject: string, htmlContent: string) {
  const baseUrl = Deno.env.get("AZURE_SMS_URL")!;
  const username = Deno.env.get("AZURE_SMS_USERNAME")!;
  const password = Deno.env.get("AZURE_SMS_PASSWORD")!;
  const unifiedUrl = baseUrl.replace(/\/api\/SendSMS\/?$/i, "") + "/api/message/send";

  const response = await fetch(unifiedUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, subject, content: htmlContent, ishtml: true, username, password, channel: "Email" }),
  });
  return response;
}

interface FluxVeille {
  id: string;
  user_id: string;
  nom: string;
  description: string | null;
  mots_cles: string[];
  alerte_email: boolean;
  frequence_digest: string;
  actif: boolean;
}

interface FluxActualite {
  id: string;
  flux_id: string;
  actualite_id: string;
  notifie: boolean;
  created_at: string;
  actualites: {
    id: string;
    titre: string;
    resume: string | null;
    source_nom: string | null;
    source_url: string | null;
    date_publication: string | null;
    importance: number | null;
  } | null;
}

interface Profile {
  id: string;
  full_name: string | null;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("=== Send Flux Digest Started ===");
  
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let digestType = "quotidien";
    try {
      const body = await req.json();
      if (body.type === "hebdo") digestType = "hebdo";
    } catch { /* default */ }

    console.log(`Processing ${digestType} digest emails...`);

    const { data: fluxList, error: fluxError } = await supabase
      .from("flux_veille")
      .select("*")
      .eq("actif", true)
      .eq("alerte_email", true)
      .eq("frequence_digest", digestType);

    if (fluxError) throw fluxError;

    if (!fluxList || fluxList.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "Aucun flux à traiter", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const now = new Date();
    let sinceDate: Date;
    if (digestType === "quotidien") {
      sinceDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else {
      sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    let emailsSent = 0;
    const errors: string[] = [];

    const fluxByUser: Record<string, FluxVeille[]> = {};
    for (const flux of fluxList as FluxVeille[]) {
      if (!fluxByUser[flux.user_id]) fluxByUser[flux.user_id] = [];
      fluxByUser[flux.user_id].push(flux);
    }

    for (const [userId, userFluxList] of Object.entries(fluxByUser)) {
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        if (userError || !userData?.user?.email) continue;

        const userEmail = userData.user.email;

        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .single();

        const userName = (profile as Profile | null)?.full_name || "Utilisateur";

        const fluxDigests: { flux: FluxVeille; actualites: FluxActualite[] }[] = [];

        for (const flux of userFluxList) {
          const { data: actualites, error: actError } = await supabase
            .from("flux_actualites")
            .select(`id, flux_id, actualite_id, notifie, created_at, actualites (id, titre, resume, source_nom, source_url, date_publication, importance)`)
            .eq("flux_id", flux.id)
            .gte("created_at", sinceDate.toISOString())
            .order("created_at", { ascending: false })
            .limit(20);

          if (actError) continue;
          if (actualites && actualites.length > 0) {
            fluxDigests.push({ flux, actualites: actualites as any[] });
          }
        }

        if (fluxDigests.length === 0) continue;

        const emailHtml = generateDigestEmail(userName, fluxDigests, digestType);
        const periodLabel = digestType === "quotidien" ? "quotidien" : "hebdomadaire";

        try {
          const res = await sendViaGateway(userEmail, `📡 Votre digest ${periodLabel} - ANSUT Radar`, emailHtml);
          if (!res.ok) {
            const errText = await res.text();
            errors.push(`Email to ${userEmail}: ${errText}`);
            continue;
          }
          await res.text();
          emailsSent++;
        } catch (e) {
          errors.push(`Email to ${userEmail}: ${String(e)}`);
          continue;
        }

        // Mark as notified
        for (const { actualites } of fluxDigests) {
          const ids = actualites.map((a) => a.id);
          await supabase.from("flux_actualites").update({ notifie: true }).in("id", ids);
        }
      } catch (userError) {
        errors.push(`User ${userId}: ${String(userError)}`);
      }
    }

    console.log(`=== Digest Complete: ${emailsSent} emails sent ===`);

    return new Response(
      JSON.stringify({ success: true, emailsSent, errors: errors.length > 0 ? errors : undefined }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error in send-flux-digest:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

function generateDigestEmail(
  userName: string,
  fluxDigests: { flux: FluxVeille; actualites: FluxActualite[] }[],
  digestType: string
): string {
  const periodLabel = digestType === "quotidien" ? "des dernières 24 heures" : "de la semaine";
  const totalActualites = fluxDigests.reduce((sum, fd) => sum + fd.actualites.length, 0);

  let fluxSections = "";
  for (const { flux, actualites } of fluxDigests) {
    let actualiteItems = "";
    for (const item of actualites) {
      const actu = item.actualites;
      if (!actu) continue;
      const importance = actu.importance || 50;
      const importanceColor = importance >= 70 ? "#ef4444" : importance >= 50 ? "#f59e0b" : "#22c55e";
      const sourceUrl = actu.source_url || "#";
      actualiteItems += `
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <div style="margin-bottom: 4px;">
              <span style="display: inline-block; padding: 2px 8px; background: ${importanceColor}; color: white; border-radius: 4px; font-size: 11px; font-weight: 600;">${importance}%</span>
              <span style="color: #6b7280; font-size: 12px; margin-left: 8px;">${actu.source_nom || "Source inconnue"}</span>
            </div>
            <a href="${sourceUrl}" style="color: #1e40af; text-decoration: none; font-weight: 500; font-size: 15px;">${actu.titre}</a>
            ${actu.resume ? `<p style="color: #4b5563; font-size: 13px; margin: 6px 0 0 0; line-height: 1.4;">${actu.resume.substring(0, 150)}...</p>` : ""}
          </td>
        </tr>`;
    }
    fluxSections += `
      <div style="margin-bottom: 24px; background: #f9fafb; border-radius: 8px; padding: 16px;">
        <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px;">📡 ${flux.nom} <span style="font-weight: normal; color: #6b7280; font-size: 13px;">(${actualites.length} actualité${actualites.length > 1 ? "s" : ""})</span></h3>
        <table style="width: 100%; border-collapse: collapse;">${actualiteItems}</table>
      </div>`;
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
      <h1 style="margin: 0; color: white; font-size: 24px;">ANSUT Radar</h1>
      <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Votre digest ${digestType === "quotidien" ? "quotidien" : "hebdomadaire"}</p>
    </div>
    <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <p style="color: #374151; font-size: 15px; margin: 0 0 20px 0;">Bonjour <strong>${userName}</strong>,</p>
      <p style="color: #374151; font-size: 15px; margin: 0 0 20px 0;">Voici les <strong>${totalActualites} actualité${totalActualites > 1 ? "s" : ""}</strong> ${periodLabel} correspondant à vos flux de veille :</p>
      ${fluxSections}
      <div style="text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <a href="https://ansut-lens.lovable.app/flux" style="display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">Voir tous mes flux</a>
      </div>
      <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0; text-align: center;">Vous recevez cet email car vous avez activé les alertes email sur vos flux de veille.</p>
    </div>
    <div style="margin-top: 20px; padding: 24px; background: #1f2937; border-radius: 12px; text-align: center;">
      <h3 style="margin: 0 0 6px; color: white; font-size: 13px;">Agence Nationale du Service Universel des Télécommunications</h3>
      <p style="margin: 0; color: #9ca3af; font-size: 12px;">📍 Marcory, Abidjan • 📞 +225 27 22 52 95 05 • <a href="https://www.ansut.ci" style="color: #60a5fa; text-decoration: none;">www.ansut.ci</a></p>
      <p style="margin: 12px 0 0; color: #6b7280; font-size: 10px;">© 2025 ANSUT — Tous droits réservés</p>
    </div>
  </div>
</body></html>`;
}

Deno.serve(handler);
