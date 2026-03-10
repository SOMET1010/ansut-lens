// Using native Deno.serve
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function getGatewayConfig() {
  const baseUrl = Deno.env.get("AZURE_SMS_URL")!;
  const username = Deno.env.get("AZURE_SMS_USERNAME")!;
  const password = Deno.env.get("AZURE_SMS_PASSWORD")!;
  const unifiedUrl = baseUrl.replace(/\/api\/SendSMS\/?$/i, "") + "/api/message/send";
  return { unifiedUrl, username, password };
}

async function sendEmailViaGateway(to: string, subject: string, htmlContent: string, config: ReturnType<typeof getGatewayConfig>) {
  const response = await fetch(config.unifiedUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to,
      subject,
      content: htmlContent,
      ishtml: true,
      username: config.username,
      password: config.password,
      channel: "Email",
    }),
  });
  return response;
}

interface SendRequest {
  newsletterId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { newsletterId }: SendRequest = await req.json();

    if (!newsletterId) {
      return new Response(
        JSON.stringify({ error: "newsletterId requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: newsletter, error: fetchError } = await adminClient
      .from('newsletters')
      .select('*')
      .eq('id', newsletterId)
      .single();

    if (fetchError || !newsletter) {
      console.error('Newsletter not found:', fetchError);
      return new Response(
        JSON.stringify({ error: "Newsletter non trouvée" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (newsletter.statut !== 'valide') {
      return new Response(
        JSON.stringify({ error: "La newsletter doit être validée avant envoi" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: destinataires, error: destError } = await adminClient
      .from('newsletter_destinataires')
      .select('email, nom')
      .eq('actif', true)
      .or(`type.eq.${newsletter.cible},type.eq.externe`);

    if (destError) {
      console.error('Error fetching destinataires:', destError);
      throw destError;
    }

    if (!destinataires || destinataires.length === 0) {
      return new Response(
        JSON.stringify({ error: "Aucun destinataire trouvé pour cette cible" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Sending newsletter to ${destinataires.length} recipients`);

    const dateDebut = new Date(newsletter.date_debut);
    const mois = dateDebut.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    const subject = `📰 Newsletter ANSUT RADAR #${newsletter.numero} - ${mois}`;

    const gwConfig = getGatewayConfig();

    const results = [];
    for (const dest of destinataires) {
      try {
        const response = await sendEmailViaGateway(dest.email, subject, newsletter.html_court, gwConfig);
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to send to ${dest.email}:`, errorText);
          results.push({ email: dest.email, success: false, error: errorText });
        } else {
          await response.text();
          results.push({ email: dest.email, success: true });
        }
      } catch (error) {
        console.error(`Error sending to ${dest.email}:`, error);
        results.push({ email: dest.email, success: false, error: String(error) });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`Sent: ${successCount}, Failed: ${failCount}`);

    const { error: updateError } = await adminClient
      .from('newsletters')
      .update({
        statut: 'envoye',
        date_envoi: new Date().toISOString(),
        nb_destinataires: successCount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', newsletterId);

    if (updateError) {
      console.error('Error updating newsletter status:', updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        failed: failCount,
        details: results.filter(r => !r.success),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Erreur inconnue';
    console.error('Error sending newsletter:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
