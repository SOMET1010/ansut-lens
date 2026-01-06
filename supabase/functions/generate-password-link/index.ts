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
    const { userId, redirectUrl }: RequestBody = await req.json();

    if (!userId || !redirectUrl) {
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

    if (linkError || !linkData?.properties?.action_link) {
      console.error('Generate link error:', linkError);
      return new Response(
        JSON.stringify({ error: 'Impossible de générer le lien' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user name for audit log
    const { data: profile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();

    // Log action
    await adminClient.from('admin_audit_logs').insert({
      admin_id: caller.id,
      action: 'password_link_generated',
      target_user_id: userId,
      details: {
        target_email: email,
        target_name: profile?.full_name || 'Unknown',
      },
    });

    console.log(`Password link generated for ${email} by admin ${caller.email}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        link: linkData.properties.action_link 
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
