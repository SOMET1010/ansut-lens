import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

interface UserEmail {
  email: string;
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

    // Parse request body for digest type (quotidien or hebdo)
    let digestType = "quotidien";
    try {
      const body = await req.json();
      if (body.type === "hebdo") {
        digestType = "hebdo";
      }
    } catch {
      // Default to quotidien if no body
    }

    console.log(`Processing ${digestType} digest emails...`);

    // Get all active flux with email alerts enabled for this frequency
    const { data: fluxList, error: fluxError } = await supabase
      .from("flux_veille")
      .select("*")
      .eq("actif", true)
      .eq("alerte_email", true)
      .eq("frequence_digest", digestType);

    if (fluxError) {
      console.error("Error fetching flux:", fluxError);
      throw fluxError;
    }

    if (!fluxList || fluxList.length === 0) {
      console.log("No flux found for digest type:", digestType);
      return new Response(
        JSON.stringify({ success: true, message: "Aucun flux à traiter", count: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Found ${fluxList.length} flux to process`);

    // Calculate date range based on digest type
    const now = new Date();
    let sinceDate: Date;
    if (digestType === "quotidien") {
      sinceDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    } else {
      sinceDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    }

    let emailsSent = 0;
    const errors: string[] = [];

    // Group flux by user_id for efficiency
    const fluxByUser: Record<string, FluxVeille[]> = {};
    for (const flux of fluxList as FluxVeille[]) {
      if (!fluxByUser[flux.user_id]) {
        fluxByUser[flux.user_id] = [];
      }
      fluxByUser[flux.user_id].push(flux);
    }

    // Process each user
    for (const [userId, userFluxList] of Object.entries(fluxByUser)) {
      try {
        // Get user email from auth.users
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        
        if (userError || !userData?.user?.email) {
          console.error(`Could not get email for user ${userId}:`, userError);
          continue;
        }

        const userEmail = userData.user.email;

        // Get user profile for name
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .single();

        const userName = (profile as Profile | null)?.full_name || "Utilisateur";

        // Collect all actualites for all user's flux
        const fluxDigests: { flux: FluxVeille; actualites: FluxActualite[] }[] = [];

        for (const flux of userFluxList) {
          // Get unnotified actualites for this flux since the date range
          const { data: actualites, error: actError } = await supabase
            .from("flux_actualites")
            .select(`
              id,
              flux_id,
              actualite_id,
              notifie,
              created_at,
              actualites (
                id,
                titre,
                resume,
                source_nom,
                source_url,
                date_publication,
                importance
              )
            `)
            .eq("flux_id", flux.id)
            .gte("created_at", sinceDate.toISOString())
            .order("created_at", { ascending: false })
            .limit(20);

          if (actError) {
            console.error(`Error fetching actualites for flux ${flux.id}:`, actError);
            continue;
          }

          if (actualites && actualites.length > 0) {
            // deno-lint-ignore no-explicit-any
            fluxDigests.push({ flux, actualites: actualites as any[] });
          }
          console.log(`No new actualites for user ${userId}`);
          continue;
        }

        // Generate email HTML
        const emailHtml = generateDigestEmail(userName, fluxDigests, digestType);

        // Send email
        const periodLabel = digestType === "quotidien" ? "quotidien" : "hebdomadaire";
      const { error: emailError } = await resend.emails.send({
        from: "ANSUT Radar <no-reply@notifications.ansut.ci>",
          to: [userEmail],
          subject: `📡 Votre digest ${periodLabel} - ANSUT Radar`,
          html: emailHtml,
        });

        if (emailError) {
          console.error(`Error sending email to ${userEmail}:`, emailError);
          errors.push(`Email to ${userEmail}: ${emailError.message}`);
          continue;
        }

        console.log(`Email sent to ${userEmail}`);
        emailsSent++;

        // Mark actualites as notified
        for (const { actualites } of fluxDigests) {
          const ids = actualites.map((a) => a.id);
          await supabase
            .from("flux_actualites")
            .update({ notifie: true })
            .in("id", ids);
        }
      } catch (userError) {
        console.error(`Error processing user ${userId}:`, userError);
        errors.push(`User ${userId}: ${String(userError)}`);
      }
    }

    console.log(`=== Digest Complete: ${emailsSent} emails sent ===`);

    return new Response(
      JSON.stringify({
        success: true,
        emailsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
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
              <span style="display: inline-block; padding: 2px 8px; background: ${importanceColor}; color: white; border-radius: 4px; font-size: 11px; font-weight: 600;">
                ${importance}%
              </span>
              <span style="color: #6b7280; font-size: 12px; margin-left: 8px;">
                ${actu.source_nom || "Source inconnue"}
              </span>
            </div>
            <a href="${sourceUrl}" style="color: #1e40af; text-decoration: none; font-weight: 500; font-size: 15px;">
              ${actu.titre}
            </a>
            ${actu.resume ? `<p style="color: #4b5563; font-size: 13px; margin: 6px 0 0 0; line-height: 1.4;">${actu.resume.substring(0, 150)}...</p>` : ""}
          </td>
        </tr>
      `;
    }

    fluxSections += `
      <div style="margin-bottom: 24px; background: #f9fafb; border-radius: 8px; padding: 16px;">
        <h3 style="margin: 0 0 12px 0; color: #111827; font-size: 16px;">
          📡 ${flux.nom}
          <span style="font-weight: normal; color: #6b7280; font-size: 13px;">
            (${actualites.length} actualité${actualites.length > 1 ? "s" : ""})
          </span>
        </h3>
        <table style="width: 100%; border-collapse: collapse;">
          ${actualiteItems}
        </table>
      </div>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); border-radius: 12px 12px 0 0; padding: 24px; text-align: center;">
          <img src="https://lpkfwxisranmetbtgxrv.supabase.co/storage/v1/object/public/avatars/logo-ansut.png" 
               alt="ANSUT Logo" 
               style="width: 80px; height: 80px; border-radius: 12px; margin-bottom: 12px; object-fit: contain; background: white; padding: 8px;"
          />
          <h1 style="margin: 0; color: white; font-size: 24px;">ANSUT Radar</h1>
          <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">
            Votre digest ${digestType === "quotidien" ? "quotidien" : "hebdomadaire"}
          </p>
        </div>
        
        <div style="background: white; padding: 24px; border-radius: 0 0 12px 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <p style="color: #374151; font-size: 15px; margin: 0 0 20px 0;">
            Bonjour <strong>${userName}</strong>,
          </p>
          
          <p style="color: #374151; font-size: 15px; margin: 0 0 20px 0;">
            Voici les <strong>${totalActualites} actualité${totalActualites > 1 ? "s" : ""}</strong> ${periodLabel} correspondant à vos flux de veille :
          </p>
          
          ${fluxSections}
          
          <div style="text-align: center; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            <a href="https://lpkfwxisranmetbtgxrv.lovableproject.com/flux" 
               style="display: inline-block; padding: 12px 24px; background: #1e40af; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
              Voir tous mes flux
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; margin: 24px 0 0 0; text-align: center;">
            Vous recevez cet email car vous avez activé les alertes email sur vos flux de veille.<br>
            Pour modifier vos préférences, accédez à la gestion de vos flux.
          </p>
        </div>
        
        <!-- Footer ANSUT -->
        <div style="margin-top: 20px; padding: 24px; background: #1f2937; border-radius: 12px; text-align: center;">
          <img src="https://lpkfwxisranmetbtgxrv.supabase.co/storage/v1/object/public/avatars/logo-ansut.png" 
               alt="ANSUT Logo" 
               style="width: 50px; height: 50px; border-radius: 8px; margin-bottom: 12px; object-fit: contain; background: white; padding: 4px;"
          />
          <h3 style="margin: 0 0 8px 0; color: white; font-size: 14px; font-weight: 600;">
            Agence Nationale du Service Universel des Télécommunications
          </h3>
          
          <div style="color: #9ca3af; font-size: 13px; line-height: 1.8; margin: 16px 0;">
            <p style="margin: 0;">📍 Marcory, Abidjan - Côte d'Ivoire</p>
            <p style="margin: 4px 0;">📞 +225 27 22 52 95 05</p>
            <p style="margin: 4px 0;">
              ✉️ <a href="mailto:contact@ansut.ci" style="color: #60a5fa; text-decoration: none;">contact@ansut.ci</a>
            </p>
            <p style="margin: 4px 0;">
              🌐 <a href="https://www.ansut.ci" style="color: #60a5fa; text-decoration: none;">www.ansut.ci</a>
            </p>
          </div>
          
          <div style="margin: 16px 0;">
            <a href="https://www.facebook.com/ansutci" style="display: inline-block; margin: 0 8px; color: #60a5fa; text-decoration: none; font-size: 14px;">Facebook</a>
            <span style="color: #4b5563;">|</span>
            <a href="https://x.com/ansut_ci" style="display: inline-block; margin: 0 8px; color: #60a5fa; text-decoration: none; font-size: 14px;">X</a>
            <span style="color: #4b5563;">|</span>
            <a href="https://www.linkedin.com/company/ansut" style="display: inline-block; margin: 0 8px; color: #60a5fa; text-decoration: none; font-size: 14px;">LinkedIn</a>
          </div>
          
          <div style="border-top: 1px solid #374151; padding-top: 16px; margin-top: 16px;">
            <p style="margin: 0; color: #6b7280; font-size: 11px;">
              © 2025 ANSUT - Tous droits réservés
            </p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(handler);
