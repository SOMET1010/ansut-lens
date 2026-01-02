import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ManageUserRequest {
  userId: string;
  action: 'disable' | 'enable' | 'delete';
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to verify they're an admin
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the current user
    const { data: { user: currentUser }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !currentUser) {
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Non autorisé' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is admin
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData, error: roleError } = await adminClient
      .from('user_roles')
      .select('role')
      .eq('user_id', currentUser.id)
      .maybeSingle();

    if (roleError || roleData?.role !== 'admin') {
      console.error('User is not admin:', roleError);
      return new Response(
        JSON.stringify({ error: 'Accès refusé - droits administrateur requis' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, action } = await req.json() as ManageUserRequest;

    if (!userId || !action) {
      return new Response(
        JSON.stringify({ error: 'userId et action sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent admin from managing themselves
    if (userId === currentUser.id) {
      return new Response(
        JSON.stringify({ error: 'Vous ne pouvez pas modifier votre propre compte' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get target user name for audit
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle();

    const targetName = targetProfile?.full_name || 'Inconnu';

    console.log(`Processing action: ${action} for user: ${userId}`);

    // Helper function to log audit
    const logAudit = async (auditAction: string) => {
      const { error: auditError } = await adminClient
        .from('admin_audit_logs')
        .insert({
          admin_id: currentUser.id,
          target_user_id: userId,
          action: auditAction,
          details: { target_name: targetName },
        });

      if (auditError) {
        console.error('Audit log error:', auditError);
      }
    };

    switch (action) {
      case 'disable': {
        // Update profile to disabled
        const { error: profileError } = await adminClient
          .from('profiles')
          .update({ disabled: true })
          .eq('id', userId);

        if (profileError) {
          console.error('Error disabling profile:', profileError);
          throw new Error('Erreur lors de la désactivation du profil');
        }

        // Ban the user (prevents login)
        const { error: banError } = await adminClient.auth.admin.updateUserById(
          userId,
          { ban_duration: '876000h' } // ~100 years
        );

        if (banError) {
          console.error('Error banning user:', banError);
          throw new Error('Erreur lors du bannissement de la session');
        }

        await logAudit('user_disabled');
        console.log(`User ${userId} disabled successfully`);
        return new Response(
          JSON.stringify({ success: true, message: 'Utilisateur désactivé' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'enable': {
        // Update profile to enabled
        const { error: profileError } = await adminClient
          .from('profiles')
          .update({ disabled: false })
          .eq('id', userId);

        if (profileError) {
          console.error('Error enabling profile:', profileError);
          throw new Error('Erreur lors de la réactivation du profil');
        }

        // Unban the user
        const { error: unbanError } = await adminClient.auth.admin.updateUserById(
          userId,
          { ban_duration: 'none' }
        );

        if (unbanError) {
          console.error('Error unbanning user:', unbanError);
          throw new Error('Erreur lors de la levée du bannissement');
        }

        await logAudit('user_enabled');
        console.log(`User ${userId} enabled successfully`);
        return new Response(
          JSON.stringify({ success: true, message: 'Utilisateur réactivé' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        // Log audit before deletion (user will be deleted)
        await logAudit('user_deleted');

        // Delete the user completely (cascade will handle profiles and user_roles)
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);

        if (deleteError) {
          console.error('Error deleting user:', deleteError);
          throw new Error('Erreur lors de la suppression de l\'utilisateur');
        }

        console.log(`User ${userId} deleted successfully`);
        return new Response(
          JSON.stringify({ success: true, message: 'Utilisateur supprimé définitivement' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Action non valide' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in manage-user function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erreur interne du serveur';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
