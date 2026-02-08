import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RequestBody {
  userId: string;
  redirectUrl: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user client to verify caller
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: userError } = await userClient.auth.getUser();
    if (userError || !caller) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Non authentifié' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin
    const { data: isAdmin } = await adminClient.rpc('has_role', {
      _user_id: caller.id,
      _role: 'admin',
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Droits administrateur requis' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { userId }: RequestBody = await req.json();
    const PRODUCTION_URL = "https://ansut-lens.lovable.app";
    const redirectUrl = `${PRODUCTION_URL}/auth/reset-password`;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId et redirectUrl requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user email
    const { data: targetUser, error: getUserError } = await adminClient.auth.admin.getUserById(userId);
    if (getUserError || !targetUser?.user) {
      console.error('Get user error:', getUserError);
      return new Response(
        JSON.stringify({ error: 'Utilisateur non trouvé' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const email = targetUser.user.email;
    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email utilisateur non disponible' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate password reset/recovery link
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkError || !linkData?.properties?.hashed_token) {
      console.error('Generate link error:', linkError);
      return new Response(
        JSON.stringify({ error: 'Impossible de générer le lien' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user name for audit log and email
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    const userName = profile?.full_name || 'Utilisateur';
    const hashedToken = linkData.properties.hashed_token;
    const resetLink = `${PRODUCTION_URL}/auth/reset-password?token_hash=${hashedToken}&type=recovery`;

    // Send email via Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    let emailSent = false;
    let emailError = '';

    if (resendApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'ANSUT RADAR <no-reply@notifications.ansut.ci>',
            to: email,
            subject: '🔐 Réinitialisation de votre mot de passe ANSUT RADAR',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                  <h1 style="color: #1a365d; margin: 0;">ANSUT RADAR</h1>
                  <p style="color: #666; margin-top: 5px;">Système de veille stratégique</p>
                </div>
                
                <h2 style="color: #1a365d;">Bonjour ${userName},</h2>
                
                <p style="color: #333; line-height: 1.6;">
                  Un administrateur a initié la réinitialisation de votre mot de passe pour votre compte ANSUT RADAR.
                </p>
                
                <p style="color: #333; line-height: 1.6;">
                  Cliquez sur le bouton ci-dessous pour définir un nouveau mot de passe :
                </p>
                
                <div style="text-align: center; margin: 35px 0;">
                  <a href="${resetLink}" 
                     style="background-color: #2563eb; color: white; padding: 16px 32px; 
                            text-decoration: none; border-radius: 8px; font-weight: bold;
                            display: inline-block; font-size: 16px;">
                    Réinitialiser mon mot de passe
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px; line-height: 1.6;">
                  <strong>⚠️ Ce lien expire dans 24 heures.</strong><br>
                  Si vous n'avez pas demandé cette réinitialisation, vous pouvez ignorer cet email en toute sécurité.
                </p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                
                <p style="color: #999; font-size: 12px; text-align: center;">
                  ANSUT RADAR - Autorité Nationale de la Sécurité des Transports<br>
                  Cet email a été envoyé automatiquement, merci de ne pas y répondre.
                </p>
              </div>
            `,
          }),
        });

        emailSent = emailResponse.ok;
        if (!emailSent) {
          emailError = await emailResponse.text();
          console.error('Erreur envoi email Resend:', emailError);
        } else {
          console.log(`Email de réinitialisation envoyé à ${email}`);
        }
      } catch (err) {
        console.error('Exception envoi email:', err);
        emailError = err instanceof Error ? err.message : 'Erreur inconnue';
      }
    } else {
      console.warn('RESEND_API_KEY non configuré - email non envoyé');
      emailError = 'RESEND_API_KEY non configuré';
    }

    // Log action
    await adminClient.from('admin_audit_logs').insert({
      admin_id: caller.id,
      action: 'password_reset_requested',
      target_user_id: userId,
      details: {
        target_email: email,
        target_name: userName,
        email_sent: emailSent,
      },
    });

    console.log(`Password link generated for ${email} by admin ${caller.email}, email_sent: ${emailSent}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        link: resetLink,
        emailSent,
        message: emailSent 
          ? `Email de réinitialisation envoyé à ${email}` 
          : `Lien généré (email non envoyé: ${emailError})`
      }),
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
