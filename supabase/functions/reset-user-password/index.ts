import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.error("RESEND_API_KEY non configuré");
      return new Response(
        JSON.stringify({ error: "Service email non configuré" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email }: { email: string } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Email valide requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Generate recovery link using admin API
    const PRODUCTION_URL = "https://ansut-lens.lovable.app";
    const redirectUrl = `${PRODUCTION_URL}/auth/reset-password`;

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: email.trim().toLowerCase(),
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (linkError) {
      // Don't reveal if user exists or not for security
      console.error("Generate link error:", linkError.message);
      // Always return success to prevent email enumeration
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hashedToken = linkData?.properties?.hashed_token;
    if (!hashedToken) {
      console.error("No hashed_token in response");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const resetLink = `${PRODUCTION_URL}/auth/reset-password?token_hash=${hashedToken}&type=recovery`;

    // Get user profile name for personalization
    let userName = "Utilisateur";
    if (linkData?.user?.id) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("full_name")
        .eq("id", linkData.user.id)
        .single();
      if (profile?.full_name) {
        userName = profile.full_name;
      }
    }

    // Send email via Resend
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ANSUT RADAR <no-reply@notifications.ansut.ci>",
        to: email.trim().toLowerCase(),
        subject: "🔐 Réinitialisation de votre mot de passe ANSUT RADAR",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #1a365d; margin: 0;">ANSUT RADAR</h1>
              <p style="color: #666; margin-top: 5px;">Système de veille stratégique</p>
            </div>
            
            <h2 style="color: #1a365d;">Bonjour ${userName},</h2>
            
            <p style="color: #333; line-height: 1.6;">
              Vous avez demandé la réinitialisation de votre mot de passe pour votre compte ANSUT RADAR.
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

    if (!emailResponse.ok) {
      const errText = await emailResponse.text();
      console.error("Resend error:", errText);
      return new Response(
        JSON.stringify({ error: "Erreur lors de l'envoi de l'email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Password reset email sent to ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé." 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erreur serveur inattendue" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
