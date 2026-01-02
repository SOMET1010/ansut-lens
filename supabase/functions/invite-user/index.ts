import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InviteUserRequest {
  email: string;
  fullName: string;
  role: "admin" | "user" | "council_user" | "guest";
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
    const { email, fullName, role }: InviteUserRequest = await req.json();

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

    // Inviter l'utilisateur via l'API admin
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${req.headers.get("origin")}/auth/reset-password`,
    });

    if (inviteError) {
      console.error("Invite error:", inviteError);
      return new Response(
        JSON.stringify({ error: inviteError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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
