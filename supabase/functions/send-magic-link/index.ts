import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function sendViaGateway(to: string, subject: string, htmlContent: string) {
  const baseUrl = Deno.env.get('AZURE_SMS_URL')!;
  const username = Deno.env.get('AZURE_SMS_USERNAME')!;
  const password = Deno.env.get('AZURE_SMS_PASSWORD')!;
  const unifiedUrl = baseUrl.replace(/\/api\/SendSMS\/?$/i, '') + '/api/message/send';

  const response = await fetch(unifiedUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to,
      subject,
      content: htmlContent,
      ishtml: true,
      username,
      password,
      channel: 'Email',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gateway error ${response.status}: ${errText}`);
  }
  return response;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "L'email est requis" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Check if user exists
    const { data: users, error: listError } = await adminClient.auth.admin.listUsers();
    const targetUser = users?.users?.find(u => u.email?.toLowerCase() === email.toLowerCase());

    if (!targetUser) {
      return new Response(
        JSON.stringify({ success: true, message: 'Si un compte existe avec cet email, un lien de connexion a été envoyé.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const PRODUCTION_URL = "https://ansut-lens.lovable.app";
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${PRODUCTION_URL}/radar`,
      },
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Generate magic link error:', linkError);
      return new Response(
        JSON.stringify({ error: 'Impossible de générer le lien' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const hashedToken = linkData.properties.hashed_token;
    const magicLink = `${supabaseUrl}/auth/v1/verify?token=${hashedToken}&type=magiclink&redirect_to=${PRODUCTION_URL}/radar`;

    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', targetUser.id)
      .maybeSingle();

    const userName = profile?.full_name || 'Utilisateur';

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a365d; margin: 0;">ANSUT RADAR</h1>
          <p style="color: #666; margin-top: 5px;">Système de veille stratégique</p>
        </div>
        <h2 style="color: #1a365d;">Bonjour ${userName},</h2>
        <p style="color: #333; line-height: 1.6;">
          Vous avez demandé un lien de connexion rapide pour accéder à ANSUT RADAR.
        </p>
        <div style="text-align: center; margin: 35px 0;">
          <a href="${magicLink}" 
             style="background-color: #2563eb; color: white; padding: 16px 32px; 
                    text-decoration: none; border-radius: 8px; font-weight: bold;
                    display: inline-block; font-size: 16px;">
            Se connecter à RADAR
          </a>
        </div>
        <p style="color: #666; font-size: 14px; line-height: 1.6;">
          <strong>⏱ Ce lien expire dans 1 heure.</strong><br>
          Si vous n'avez pas demandé ce lien, vous pouvez ignorer cet email en toute sécurité.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
        <p style="color: #999; font-size: 12px; text-align: center;">
          ANSUT RADAR — Agence Nationale du Service Universel des Télécommunications<br>
          Cet email a été envoyé automatiquement, merci de ne pas y répondre.
        </p>
      </div>
    `;

    await sendViaGateway(email, '🔗 Votre lien de connexion ANSUT RADAR', htmlContent);

    console.log(`Magic link sent to ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Lien de connexion envoyé ! Vérifiez votre boîte mail.' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erreur serveur inattendue' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
