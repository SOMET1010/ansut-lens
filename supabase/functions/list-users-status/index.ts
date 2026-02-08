import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface UserStatus {
  id: string;
  email: string;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  last_active_at: string | null;
  password_set_at: string | null;
  created_at: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify the caller is authenticated and is an admin
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "admin") {
      console.error("User is not admin:", user.id);
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // List all users using admin API
    console.log("Fetching all users status...");
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();

    if (listError) {
      console.error("Error listing users:", listError);
      return new Response(
        JSON.stringify({ error: "Failed to list users" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch last_active_at and password_set_at from profiles
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, last_active_at, password_set_at');

    const profilesMap: Record<string, { last_active_at: string | null; password_set_at: string | null }> = {};
    if (profiles) {
      for (const p of profiles) {
        profilesMap[p.id] = {
          last_active_at: (p as any).last_active_at || null,
          password_set_at: (p as any).password_set_at || null,
        };
      }
    }

    // Build a map of user statuses
    const usersStatus: Record<string, UserStatus> = {};
    for (const u of users) {
      usersStatus[u.id] = {
        id: u.id,
        email: u.email || "",
        email_confirmed_at: u.email_confirmed_at || null,
        last_sign_in_at: u.last_sign_in_at || null,
        last_active_at: profilesMap[u.id]?.last_active_at || null,
        password_set_at: profilesMap[u.id]?.password_set_at || null,
        created_at: u.created_at,
      };
    }

    console.log(`Retrieved status for ${users.length} users`);

    return new Response(
      JSON.stringify({ usersStatus }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
