import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteUserRequest {
  email: string;
  fullName: string;
  role: "admin" | "user" | "council_user" | "guest";
  redirectUrl?: string;
}

// Générer le HTML de l'email d'invitation en français
function generateInvitationEmailHtml(inviteLink: string, userName: string, baseUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation ANSUT RADAR</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f6f9fc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Ubuntu, sans-serif;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
          <tr>
            <td style="padding: 40px 40px 24px;">
              <!-- Logo ANSUT -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <img src="${baseUrl}/images/logo-ansut.jpg" width="120" alt="ANSUT" style="border-radius: 8px; display: block;">
                  </td>
                </tr>
              </table>
              
              <!-- Séparateur -->
              <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 0 0 24px;">
              
              <!-- Titre -->
              <h1 style="color: #1e40af; font-size: 24px; font-weight: 700; text-align: center; margin: 0 0 24px; padding: 0;">
                Bienvenue sur ANSUT RADAR
              </h1>
              
              <!-- Corps du message -->
              <p style="color: #374151; font-size: 16px; line-height: 26px; margin: 0 0 16px;">
                Bonjour ${userName},
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 26px; margin: 0 0 16px;">
                Vous avez été invité(e) à rejoindre <strong>ANSUT RADAR</strong>, la plateforme 
                de veille stratégique de l'Agence Nationale du Service Universel des 
                Télécommunications de Côte d'Ivoire.
              </p>
              
              <p style="color: #374151; font-size: 16px; line-height: 26px; margin: 0 0 24px;">
                Cliquez sur le bouton ci-dessous pour créer votre compte et définir 
                votre mot de passe :
              </p>
              
              <!-- Bouton d'action -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center" style="padding: 16px 0 32px;">
                    <a href="${inviteLink}" style="background-color: #1e40af; border-radius: 8px; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; text-align: center; display: inline-block; padding: 14px 32px;">
                      Accepter l'invitation
                    </a>
                  </td>
                </tr>
              </table>
              
              <p style="color: #6b7280; font-size: 14px; line-height: 22px; margin: 0 0 8px;">
                Ce lien expire dans 24 heures. Si le bouton ne fonctionne pas, 
                copiez et collez ce lien dans votre navigateur :
              </p>
              
              <p style="margin: 0 0 24px; word-break: break-all;">
                <a href="${inviteLink}" style="color: #1e40af; font-size: 14px; text-decoration: underline;">
                  ${inviteLink}
                </a>
              </p>
              
              <!-- Séparateur -->
              <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 0 0 24px;">
              
              <!-- Footer -->
              <p style="color: #6b7280; font-size: 13px; line-height: 20px; text-align: center; margin: 0 0 16px;">
                Si vous n'attendiez pas cette invitation, vous pouvez ignorer cet email 
                en toute sécurité.
              </p>
              
              <p style="color: #9ca3af; font-size: 12px; line-height: 18px; text-align: center; margin: 0;">
                © ${new Date().getFullYear()} ANSUT - Agence Nationale du Service Universel 
                des Télécommunications<br>
                Côte d'Ivoire
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Vérifier l'authentification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Créer le client Supabase avec le token de l'utilisateur
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Client avec le token de l'utilisateur pour vérifier ses droits
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Vérifier que l'utilisateur est admin
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Vérifier le rôle admin via la fonction has_role
    const { data: isAdmin } = await userClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });

    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Accès réservé aux administrateurs" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parser la requête
    const { email, fullName, role, redirectUrl }: InviteUserRequest = await req.json();

    if (!email || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: "Email, nom et rôle requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Client admin pour créer l'utilisateur
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Construire l'URL de redirection - priorité au paramètre, sinon fallback
    const finalRedirectUrl = redirectUrl 
      || `${req.headers.get("origin")}/auth/reset-password`
      || "https://ansut-lens.lovable.app/auth/reset-password";

    // Base URL pour les assets (logo)
    const baseUrl = req.headers.get("origin") || "https://ansut-lens.lovable.app";

    console.log("Redirect URL for invitation:", finalRedirectUrl);
    console.log("Base URL for assets:", baseUrl);

    let inviteData: any;

    // Vérifier si Resend est configuré pour les emails personnalisés
    if (resendApiKey) {
      console.log("Using custom email template with Resend");
      
      // Générer le lien d'invitation sans envoyer l'email par défaut
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: 'invite',
        email: email,
        options: {
          redirectTo: finalRedirectUrl,
          data: { full_name: fullName },
        },
      });

      if (linkError) {
        console.error("Generate link error:", linkError);
        return new Response(
          JSON.stringify({ error: linkError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      inviteData = { user: linkData.user };
      const inviteLink = linkData.properties.action_link;

      console.log("Generated invite link:", inviteLink);

      // Générer le HTML de l'email
      const html = generateInvitationEmailHtml(inviteLink, fullName, baseUrl);

      // Envoyer l'email via Resend
      const resend = new Resend(resendApiKey);
      const { error: emailError } = await resend.emails.send({
        from: "ANSUT RADAR <onboarding@resend.dev>",
        to: [email],
        subject: "Invitation à rejoindre ANSUT RADAR",
        html,
      });

      if (emailError) {
        console.error("Resend email error:", emailError);
        // L'utilisateur est créé mais l'email n'a pas été envoyé
        // On continue quand même pour créer le rôle et le profil
      } else {
        console.log("Custom invitation email sent successfully to:", email);
      }
    } else {
      console.log("Using default Supabase email (RESEND_API_KEY not configured)");
      
      // Fallback: utiliser l'email par défaut de Supabase
      const { data, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: fullName },
        redirectTo: finalRedirectUrl,
      });

      if (inviteError) {
        console.error("Invite error:", inviteError);
        return new Response(
          JSON.stringify({ error: inviteError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      inviteData = data;
    }

    // Attribuer le rôle à l'utilisateur
    if (inviteData.user) {
      const { error: roleError } = await adminClient
        .from("user_roles")
        .upsert({
          user_id: inviteData.user.id,
          role: role,
        }, { onConflict: "user_id,role" });

      if (roleError) {
        console.error("Role assignment error:", roleError);
        // L'utilisateur est créé mais le rôle n'a pas été attribué
      }

      // Créer le profil
      const { error: profileError } = await adminClient
        .from("profiles")
        .upsert({
          id: inviteData.user.id,
          full_name: fullName,
        }, { onConflict: "id" });

      if (profileError) {
        console.error("Profile creation error:", profileError);
      }

      // Log the invitation in audit
      const { error: auditError } = await adminClient
        .from("admin_audit_logs")
        .insert({
          admin_id: user.id,
          target_user_id: inviteData.user.id,
          action: "user_invited",
          details: { email, role, full_name: fullName },
        });

      if (auditError) {
        console.error("Audit log error:", auditError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invitation envoyée à ${email}`,
        user: inviteData.user 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Erreur serveur" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
