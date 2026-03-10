import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

interface InviteUserRequest {
  email: string;
  fullName: string;
  role: "admin" | "user" | "council_user" | "guest";
  redirectUrl?: string;
  userId?: string;
  resend?: boolean;
}

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
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td align="center" style="padding-bottom: 24px;">
                    <img src="${baseUrl}/images/logo-ansut.jpg" width="120" alt="ANSUT" style="border-radius: 8px; display: block;">
                  </td>
                </tr>
              </table>
              <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 0 0 24px;">
              <h1 style="color: #1e40af; font-size: 24px; font-weight: 700; text-align: center; margin: 0 0 24px; padding: 0;">
                Bienvenue sur ANSUT RADAR
              </h1>
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
              <hr style="border: none; border-top: 1px solid #e6ebf1; margin: 0 0 24px;">
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Non autorisé" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: isAdmin } = await userClient.rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Accès réservé aux administrateurs" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { email, fullName, role, redirectUrl, userId, resend: isResend }: InviteUserRequest = await req.json();

    let targetEmail = email;
    let targetFullName = fullName;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (isResend && userId) {
      console.log("Resending invitation for user:", userId);
      const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(userId);
      if (authError || !authUser?.user?.email) {
        return new Response(
          JSON.stringify({ error: "Utilisateur non trouvé" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      targetEmail = authUser.user.email;
      targetFullName = fullName || authUser.user.user_metadata?.full_name || "Utilisateur";
    }

    if (!targetEmail || !targetFullName || !role) {
      return new Response(
        JSON.stringify({ error: "Email, nom et rôle requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const PRODUCTION_URL = "https://ansut-lens.lovable.app";
    const isPreviewUrl = redirectUrl && (redirectUrl.includes('id-preview--') || redirectUrl.includes('lovableproject.com'));
    const finalRedirectUrl = (!redirectUrl || isPreviewUrl) ? `${PRODUCTION_URL}/auth/reset-password` : redirectUrl;
    const baseUrl = PRODUCTION_URL;

    let inviteData: any;

    // Use gateway for custom email
    const linkType = isResend ? 'recovery' : 'invite';
    console.log(`Generating ${linkType} link for:`, targetEmail);

    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: linkType,
      email: targetEmail,
      options: {
        redirectTo: finalRedirectUrl,
        ...(linkType === 'invite' ? { data: { full_name: targetFullName } } : {}),
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
    const hashedToken = linkData.properties.hashed_token;
    const inviteLink = `${PRODUCTION_URL}/auth/reset-password?token_hash=${hashedToken}&type=${linkType}`;

    const html = generateInvitationEmailHtml(inviteLink, targetFullName, baseUrl);
    const subject = isResend ? "Rappel : Invitation à rejoindre ANSUT RADAR" : "Invitation à rejoindre ANSUT RADAR";

    try {
      const emailResponse = await sendViaGateway(targetEmail, subject, html);
      if (!emailResponse.ok) {
        const errText = await emailResponse.text();
        console.error("Gateway email error:", errText);
      } else {
        await emailResponse.text();
        console.log("Custom invitation email sent successfully to:", targetEmail);
      }
    } catch (err) {
      console.error("Exception sending email:", err);
    }

    // Assign role and profile
    if (inviteData.user) {
      await adminClient.from("user_roles").upsert({ user_id: inviteData.user.id, role }, { onConflict: "user_id,role" });
      await adminClient.from("profiles").upsert({ id: inviteData.user.id, full_name: targetFullName }, { onConflict: "id" });
      await adminClient.from("admin_audit_logs").insert({
        admin_id: user.id,
        target_user_id: inviteData.user.id,
        action: isResend ? "user_invitation_resent" : "user_invited",
        details: { email: targetEmail, role, full_name: targetFullName },
      });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Invitation ${isResend ? 'renvoyée' : 'envoyée'} à ${targetEmail}`,
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
